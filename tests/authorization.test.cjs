/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { createHash } = require('node:crypto')
const { fixture, request } = require('./helpers.cjs')

test('guest bootstrap issues a secret HttpOnly cookie and returns only its hash', async () => {
  const f = fixture({ token: null })
  const response = await f.load('app/api/sesion/route.ts').POST()
  const { sessionId } = await response.json()
  const cookie = f.cookieWrites[0]
  assert.equal(cookie.options.httpOnly, true)
  assert.equal(cookie.options.sameSite, 'lax')
  assert.equal(sessionId, createHash('sha256').update(cookie.value).digest('hex'))
  assert.notEqual(sessionId, cookie.value)
})

for (const method of ['GET', 'DELETE', 'POST']) {
  test(`cart ${method} rejects forged user IDs before accessing cart data`, async () => {
    const f = fixture({ user: { id: 'auth-user' } })
    const response = await f.load('app/api/carrito/route.ts')[method](request('/api/carrito?usuarioId=8', method,
      method === 'POST' ? { usuarioId: 8, productoId: 1, cantidad: 1 } : undefined))
    assert.equal(response.status, 403)
    assert.equal(f.calls.filter(c => c.model !== 'usuario').length, 0)
  })
}

test('a bare usuarioId cannot authenticate a guest', async () => {
  const f = fixture()
  const response = await f.load('app/api/carrito/route.ts').GET(request('/api/carrito?usuarioId=7'))
  assert.equal(response.status, 401)
  assert.equal(f.calls.length, 0)
})

test('a forged guest ID cannot read, count or empty a cart', async () => {
  for (const [file, method] of [['app/api/carrito/route.ts', 'GET'], ['app/api/carrito/route.ts', 'DELETE'], ['app/api/carrito/count/route.ts', 'GET']]) {
    const f = fixture()
    const response = await f.load(file)[method](request('/api/carrito?sessionId=victim', method))
    assert.equal(response.status, 403)
    assert.equal(f.calls.length, 0)
  }
})

test('known guest hash cannot be used as the secret cookie', async () => {
  const victim = fixture()
  const attacker = fixture({ token: victim.sessionId })
  const response = await attacker.load('app/api/carrito/route.ts').GET(request('/api/carrito?sessionId=' + victim.sessionId))
  assert.equal(response.status, 403)
})

test('guest reads exclude user-owned legacy rows; logged-in count uses the real user', async () => {
  const guest = fixture()
  await guest.load('app/api/carrito/route.ts').GET(request('/api/carrito'))
  assert.deepEqual(guest.calls[0].args.where, { sessionId: guest.sessionId, usuarioId: null })
  const member = fixture({ user: { id: 'auth-user' } })
  await member.load('app/api/carrito/count/route.ts').GET(request('/api/carrito/count'))
  assert.deepEqual(member.calls.at(-1).args.where, { usuarioId: 7 })
})

test('invalid authentication does not silently fall back to a guest', async () => {
  const f = fixture({ authError: { name: 'AuthApiError' } })
  const response = await f.load('app/api/carrito/route.ts').GET(request('/api/carrito'))
  assert.equal(response.status, 401)
  assert.equal(f.calls.length, 0)
})

for (const method of ['PUT', 'DELETE']) {
  test(`item ${method} scopes lookup to the caller and rejects an unrelated item`, async () => {
    const f = fixture({ user: { id: 'auth-user' } })
    const response = await f.load('app/api/carrito/[id]/route.ts')[method](request('/api/carrito/99', method, method === 'PUT' ? { cantidad: 1 } : undefined), { params: Promise.resolve({ id: '99' }) })
    assert.equal(response.status, 404)
    const lookups = f.calls.filter(c => c.model === 'carritoItem')
    assert.equal(lookups.length, 1)
    assert.deepEqual(lookups[0].args.where, { id: 99, usuarioId: 7 })
  })
}

test('migration requires both an authenticated destination and the proven guest cookie', async () => {
  for (const [options, body, status] of [
    [{}, { usuarioId: 7 }, 401],
    [{ user: { id: 'auth-user' } }, { usuarioId: 8 }, 403],
    [{ user: { id: 'auth-user' } }, { usuarioId: 7, sessionId: 'victim' }, 403],
  ]) {
    const f = fixture(options)
    const response = await f.load('app/api/carrito/migrar/route.ts').POST(request('/api/carrito/migrar', 'POST', body))
    assert.equal(response.status, status)
    assert.equal(f.calls.filter(c => c.model !== 'usuario').length, 0)
  }
})

test('migration transfers only proven guest reservations to the authenticated user', async () => {
  const f = fixture({ user: { id: 'auth-user' } })
  const response = await f.load('app/api/carrito/migrar/route.ts').POST(request('/api/carrito/migrar', 'POST', { sessionId: f.sessionId, usuarioId: 7 }))
  assert.equal(response.status, 200)
  const update = f.calls.find(c => c.model === 'producto' && c.method === 'updateMany')
  assert.deepEqual(update.args.where, { estado: 'reservado', reservadoPorSessionId: f.sessionId, reservadoPorUsuarioId: null })
  assert.deepEqual(update.args.data, { reservadoPorSessionId: null, reservadoPorUsuarioId: 7, reservaVersion: { increment: 1 } })
})

test('reservation rejects products outside the caller cart', async () => {
  const f = fixture({ user: { id: 'auth-user' } })
  const response = await f.load('app/api/ventas/reservar/route.ts').POST(request('/api/ventas/reservar', 'POST', { productosIds: [1] }))
  assert.equal(response.status, 403)
  assert.equal(f.calls.some(c => c.model === 'producto'), false)
})

test('matching buyer text does not grant ownership of another reservation', async () => {
  const f = fixture({ user: { id: 'auth-user' } })
  f.prisma.carritoItem.findMany = async () => [{ productoId: 1 }]
  f.prisma.producto.findMany = async () => [{ id: 1, estado: 'reservado', compradorInfo: 'Same name', reservadoPorUsuarioId: 8, reservadoPorSessionId: null }]
  const response = await f.load('app/api/ventas/reservar/route.ts').POST(request('/api/ventas/reservar', 'POST', { productosIds: [1], compradorInfo: 'Same name' }))
  assert.equal(response.status, 409)
  assert.equal(f.calls.some(c => c.method === 'updateMany'), false)
})

test('a successful reservation uses verified ownership in the write', async () => {
  const f = fixture({ user: { id: 'auth-user' } })
  f.prisma.carritoItem.findMany = async () => [{ productoId: 1 }]
  f.prisma.producto.findMany = async ({ where }) => where.id ? [{ id: 1, estado: 'disponible' }] : []
  let update
  f.prisma.producto.updateMany = async args => { update = args; return { count: 1 } }
  const response = await f.load('app/api/ventas/reservar/route.ts').POST(request('/api/ventas/reservar', 'POST', { productosIds: [1] }))
  assert.equal(response.status, 200)
  assert.equal(update.data.reservadoPorUsuarioId, 7)
  assert.equal(update.data.reservadoPorSessionId, null)
  assert.equal(update.where.estado, 'disponible')
  assert.equal(update.where.id, 1)
  assert.ok(update.data.reservaExpiraEn)
})

for (const route of ['confirmar', 'cancelar', 'disponible', 'pausar', 'marcar-vendido']) {
  test(`sales ${route} rejects guests and non-admin users`, async () => {
    for (const user of [null, { id: 'auth-user' }]) {
      const f = fixture({ user })
      const response = await f.load(`app/api/ventas/${route}/route.ts`).POST(request('/api/ventas/' + route, 'POST', { productoId: 1 }))
      assert.equal(response.status, user ? 403 : 401)
      assert.equal(f.calls.filter(c => c.model !== 'usuario').length, 0)
    }
  })
}

test('expiration cannot release another user reservation or a paused/unexpired own reservation', async () => {
  for (const product of [
    { reservadoPorUsuarioId: 8 },
    { reservadoPorUsuarioId: 7, reservaPausada: true },
    { reservadoPorUsuarioId: 7, reservadoEn: new Date() },
  ]) {
    const f = fixture({ user: { id: 'auth-user' } })
    f.prisma.producto.findUnique = async () => ({ id: 1, estado: 'reservado', reservadoPorSessionId: null, reservadoEn: new Date(0), ...product })
    const response = await f.load('app/api/ventas/expirar/route.ts').POST(request('/api/ventas/expirar', 'POST', { productoId: 1 }))
    assert.equal(response.status, product.reservadoPorUsuarioId === 8 ? 403 : 409)
    assert.equal(f.calls.some(c => c.model === 'producto'), false)
  }
})

test('public product responses hide buyer data and reservation identifiers', async () => {
  const f = fixture()
  f.prisma.producto.findMany = async () => [{ id: 1, compradorInfo: 'Private phone', reservadoPorSessionId: 'private', reservadoPorUsuarioId: 8 }]
  const response = await f.load('app/api/productos/route.ts').GET()
  const [product] = await response.json()
  assert.equal(product.compradorInfo, null)
  assert.equal(product.reservadoPorUsuarioId, null)
  assert.equal(product.reservadoPorSessionId, null)
  assert.equal(response.headers.get('cache-control'), 'private, no-store')
})

test('an administrator can confirm a sale after server-side role verification', async () => {
  const f = fixture({ user: { id: 'auth-admin' }, admin: true })
  f.prisma.producto.findUnique = async () => ({ id: 1, estado: 'reservado', stock: 1, reservaPolitica: f.load('lib/reserva-policy.ts').initialPolicy, reservaExpiraEn: new Date(Date.now() + 60000), reservaVersion: 2 })
  f.prisma.producto.updateMany = async args => { f.calls.push({ method: 'updateMany', args }); return { count: 1 } }
  const response = await f.load('app/api/ventas/confirmar/route.ts').POST(request('/api/ventas/confirmar', 'POST', { productoId: 1 }))
  assert.equal(response.status, 200)
  assert.deepEqual(f.calls[0].args.where, { supabaseId: 'auth-admin' })
  assert.equal(f.calls.find(c => c.method === 'updateMany').args.data.estado, 'vendido')
})

test('an authenticated owner can update their own cart item', async () => {
  const f = fixture({ user: { id: 'auth-user' } })
  f.prisma.carritoItem.findFirst = async () => ({ id: 1, producto: { stock: 3 } })
  f.prisma.carritoItem.update = async args => {
    assert.deepEqual(args.where, { id: 1, usuarioId: 7 })
    return { id: 1, cantidad: args.data.cantidad, producto: { compradorInfo: null, reservadoPorSessionId: null, reservadoPorUsuarioId: null } }
  }
  const response = await f.load('app/api/carrito/[id]/route.ts').PUT(request('/api/carrito/1', 'PUT', { cantidad: 2 }), { params: Promise.resolve({ id: '1' }) })
  assert.equal(response.status, 200)
  assert.equal((await response.json()).cantidad, 2)
})

test('profile update and deletion reject a different user ID', async () => {
  for (const method of ['PUT', 'DELETE']) {
    const f = fixture({ user: { id: 'auth-user' } })
    const response = await f.load('app/api/usuarios/[id]/route.ts')[method](request('/api/usuarios/8', method), { params: Promise.resolve({ id: '8' }) })
    assert.equal(response.status, 403)
    assert.equal(f.calls.length, 1)
  }
})

test('automatic cancellation endpoint requires an administrator', async () => {
  const f = fixture({ user: { id: 'auth-user' } })
  assert.equal((await f.load('app/api/ventas/cancelar/route.ts').GET()).status, 403)
  assert.equal(f.calls.filter(c => c.model !== 'usuario').length, 0)
})

test('without authentication or a guest cookie no cart data is queried', async () => {
  const f = fixture({ token: null })
  const response = await f.load('app/api/carrito/route.ts').GET(request('/api/carrito'))
  assert.equal(response.status, 401)
  assert.equal(f.calls.length, 0)
})

test('guest addition persists only the verified cookie hash', async () => {
  const f = fixture()
  f.prisma.producto.findUnique = async () => ({ id: 1, estado: 'disponible' })
  let created
  f.prisma.carritoItem.create = async ({ data }) => {
    created = data
    return { ...data, producto: { compradorInfo: null, reservadoPorUsuarioId: null, reservadoPorSessionId: null } }
  }
  const response = await f.load('app/api/carrito/route.ts').POST(request('/api/carrito', 'POST', { productoId: 1, cantidad: 1, sessionId: f.sessionId }))
  assert.equal(response.status, 201)
  assert.deepEqual(created, { productoId: 1, cantidad: 1, sessionId: f.sessionId, usuarioId: null })
})

test('a lost reservation race returns conflict instead of reporting success', async () => {
  const f = fixture({ user: { id: 'auth-user' } })
  f.prisma.carritoItem.findMany = async () => [{ productoId: 1 }]
  f.prisma.producto.findMany = async ({ where }) => where.id ? [{ id: 1, estado: 'disponible' }] : []
  f.prisma.producto.updateMany = async () => ({ count: 0 })
  const response = await f.load('app/api/ventas/reservar/route.ts').POST(request('/api/ventas/reservar', 'POST', { productosIds: [1] }))
  assert.equal(response.status, 409)
})

test('global cart inspection is restricted to administrators', async () => {
  for (const admin of [false, true]) {
    const f = fixture({ user: { id: 'auth-user' }, admin })
    const response = await f.load('app/api/carrito/route.ts').GET(request('/api/carrito?scope=all'))
    assert.equal(response.status, admin ? 200 : 403)
    const lookup = f.calls.find(c => c.model === 'carritoItem')
    if (admin) assert.deepEqual(lookup.args.where, {})
    else assert.equal(lookup, undefined)
  }
})

const adminOperations = [
  ['app/api/productos/route.ts', 'POST', { nombre: 'Test', precio: 10, stock: 1 }],
  ['app/api/productos/[id]/route.ts', 'PUT', { nombre: 'Test', precio: 10, stock: 1, imagenes: [] }],
  ['app/api/productos/[id]/route.ts', 'DELETE'],
  ['app/api/configuracion/categorias/route.ts', 'PUT', { categoria: 'fimu', visible: false }],
  ['app/api/test-db/route.ts', 'GET'],
]

for (const [file, method, body] of adminOperations) {
  test(`${method} ${file} blocks guests and normal users before any business query`, async () => {
    for (const user of [null, { id: 'normal', user_metadata: { isAdmin: true }, app_metadata: { isAdmin: true } }]) {
      const f = fixture({ user })
      const response = await f.load(file)[method](request('/test', method, body && { ...body, isAdmin: true }), { params: Promise.resolve({ id: '1' }) })
      assert.equal(response.status, user ? 403 : 401)
      assert.equal(f.calls.filter(c => c.model !== 'usuario').length, 0)
    }
  })

  test(`${method} ${file} allows the administrator verified in the database`, async () => {
    const f = fixture({ user: { id: 'admin' }, admin: true })
    f.prisma.$queryRaw = async () => [{ value: 1 }]
    const response = await f.load(file)[method](request('/test', method, body), { params: Promise.resolve({ id: '1' }) })
    assert.equal(response.status, method === 'POST' ? 201 : 200)
    assert.deepEqual(f.calls[0].args.where, { supabaseId: 'admin' })
  })
}

test('admin pages redirect guests and users without a database admin role', async () => {
  for (const [user, destination] of [[null, '/login'], [{ id: 'normal' }, '/']]) {
    const f = fixture({ user })
    await assert.rejects(f.load('app/admin/layout.tsx').default({ children: 'private content' }), {
      message: 'REDIRECT:' + destination,
    })
  }
})

test('admin pages render only after successful role verification', async () => {
  const f = fixture({ user: { id: 'admin' }, admin: true })
  assert.equal(await f.load('app/admin/layout.tsx').default({ children: 'private content' }), 'private content')
  assert.deepEqual(f.calls[0].args.where, { supabaseId: 'admin' })
})

test('database failure and missing profile never grant administrative access', async () => {
  for (const unavailable of [false, true]) {
    const f = fixture({ user: { id: 'admin', user_metadata: { isAdmin: true } }, admin: true })
    f.prisma.usuario.findUnique = async () => {
      if (unavailable) throw new Error('Database unavailable')
      return null
    }
    const response = await f.load('app/api/productos/route.ts').POST(request('/test', 'POST', { nombre: 'Test', precio: 10 }))
    assert.equal(response.status, unavailable ? 500 : 403)
    assert.equal(f.calls.length, 0)
    await assert.rejects(f.load('app/admin/layout.tsx').default({ children: 'private content' }), {
      message: unavailable ? 'Database unavailable' : 'REDIRECT:/',
    })
  }
})
