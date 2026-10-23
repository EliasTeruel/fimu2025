/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { fixture, request } = require('./helpers.cjs')
const f = fixture()
const clock = f.load('lib/reserva-policy.ts')
const policy = { ...clock.initialPolicy, pausaDesdeMinuto: 21 * 60, pausaHastaMinuto: 12 * 60 }
const stamp = text => Date.parse(text + '-03:00')

test('hours and decimal input convert exactly to canonical integer minutes', () => {
  assert.equal(clock.durationMinutes('15', 'minutos'), 15)
  assert.equal(clock.durationMinutes('2', 'horas'), 120)
  assert.equal(clock.durationMinutes('1,5', 'horas'), 90)
  assert.equal(clock.durationMinutes('4.1', 'horas'), 246)
  assert.equal(clock.durationMinutes('168', 'horas'), 10080)
  for (const invalid of ['', '1.01', '-1', 'Infinity', 'NaN', '169']) assert.throws(() => clock.durationMinutes(invalid, 'horas'))
})

for (const [from, expected, minutes = 30] of [
  ['2026-10-22T15:00:00', '2026-10-22T15:30:00'],
  ['2026-10-22T20:50:00', '2026-10-23T12:20:00'],
  ['2026-10-22T21:00:00', '2026-10-23T12:30:00'],
  ['2026-10-22T02:00:00', '2026-10-22T12:30:00'],
  ['2026-10-22T12:00:00', '2026-10-22T12:30:00'],
  ['2026-10-22T20:30:00', '2026-10-23T13:30:00', 120],
  ['2026-10-22T20:30:00', '2026-10-22T21:00:00'],
  ['2026-10-22T20:30:00', '2026-10-24T13:30:00', 660],
]) test(`effective time: ${from} + ${minutes} minutes => ${expected}`, () => {
  const end = clock.addEffectiveTime(stamp(from), minutes * 60000, policy)
  assert.equal(end, stamp(expected))
  assert.equal(clock.effectiveTimeBetween(stamp(from), end, policy), minutes * 60000)
})

test('same-day pause and disabled pause', () => {
  const now = stamp('2026-10-22T12:50:00')
  const p = { ...policy, pausaDesdeMinuto: 780, pausaHastaMinuto: 840 }
  assert.equal(clock.addEffectiveTime(now, 1800000, p), stamp('2026-10-22T14:20:00'))
  assert.equal(clock.addEffectiveTime(now, 1800000, { ...p, pausaAutomaticaHabilitada: false }), stamp('2026-10-22T13:20:00'))
})

test('pause boundaries are inclusive/exclusive; milliseconds are preserved', () => {
  assert.equal(clock.automaticPause(stamp('2026-10-22T21:00:00'), policy), stamp('2026-10-23T12:00:00'))
  assert.equal(clock.automaticPause(stamp('2026-10-22T12:00:00'), policy), null)
  const now = stamp('2026-10-22T20:59:59.500')
  assert.equal(clock.addEffectiveTime(now, 1000, policy), stamp('2026-10-23T12:00:00.500'))
})

test('DST missing and repeated boundary hours use compatible disambiguation', () => {
  const p = { ...policy, zonaHoraria: 'America/New_York', pausaDesdeMinuto: 150, pausaHastaMinuto: 240 }
  assert.equal(clock.addEffectiveTime(Date.parse('2026-03-08T01:50:00-05:00'), 3600000, p), Date.parse('2026-03-08T04:20:00-04:00'))
  const autumn = { ...p, pausaDesdeMinuto: 90, pausaHastaMinuto: 150 }
  assert.equal(clock.addEffectiveTime(Date.parse('2026-11-01T01:20:00-04:00'), 1800000, autumn), Date.parse('2026-11-01T02:50:00-05:00'))
})

test('clock freezes effective balance throughout the automatic pause', () => {
  const p = { estado: 'reservado', reservaPolitica: policy, reservaExpiraEn: new Date(stamp('2026-10-23T12:20:00')), reservaPausada: false }
  for (const now of ['2026-10-22T21:00:00', '2026-10-23T02:00:00', '2026-10-23T11:59:59']) {
    const t = clock.reservationTiming(p, stamp(now))
    assert.equal(t.pause, 'automatica')
    assert.equal(t.remainingMs, 1200000)
  }
  assert.equal(clock.reservationTiming(p, stamp('2026-10-23T12:05:00')).remainingMs, 900000)
})

for (const bad of [0, -1, 10081, NaN, Infinity, '', '30', 1.5, null]) {
  test(`invalid duration ${String(bad)} is rejected`, () => assert.throws(() => clock.validatePolicy({ ...policy, duracionMinutos: bad })))
}
test('validation rejects equal times, malformed zones, offset zones and booleans', () => {
  for (const patch of [{ pausaHastaMinuto: 1260 }, { zonaHoraria: 'Mars/Base' }, { zonaHoraria: '+03:00' }, { pausaDesdeMinuto: 1440 }, { pausaAutomaticaHabilitada: 'true' }, { revision: 0 }])
    assert.throws(() => clock.validatePolicy({ ...policy, ...patch }))
  assert.equal(clock.validatePolicy({ ...policy, pausaAutomaticaHabilitada: false, pausaHastaMinuto: 1260 }).pausaAutomaticaHabilitada, false)
})

function adminFixture() { return fixture({ user: { id: 'admin' }, admin: true }) }
function product(overrides = {}) {
  return { id: 1, nombre: 'Test', estado: 'reservado', stock: 1, reservaVersion: 3,
    updatedAt: new Date('2026-10-20T00:00:00Z'), reservadoPorUsuarioId: 7, reservadoPorSessionId: null,
    reservaPolitica: policy, reservaPausada: false, reservaSaldoMs: null,
    reservaExpiraEn: new Date(Date.now() + 3600000), ...overrides }
}

for (const route of ['app/api/configuracion/reservas/route.ts', 'app/api/ventas/regularizar/route.ts']) {
  test(`${route} denies guest and ordinary user before business access`, async () => {
    for (const user of [null, { id: 'member' }]) {
      const x = fixture({ user })
      const method = route.includes('configuracion') ? 'PUT' : 'POST'
      const result = await x.load(route)[method](request('/test', method, policy))
      assert.equal(result.status, user ? 403 : 401)
      assert.equal(x.calls.filter(c => c.model !== 'usuario').length, 0)
    }
  })
}

test('settings read restricted; public policy omits admin identity', async () => {
  for (const user of [null, { id: 'member' }]) {
    const x = fixture({ user })
    assert.equal((await x.load('app/api/configuracion/reservas/route.ts').GET()).status, user ? 403 : 401)
  }
  const x = fixture()
  x.prisma.configuracionReserva.findUnique = async () => ({ ...policy, actualizadoPorUsuarioId: 99 })
  const response = await x.load('app/api/configuracion/reservas/publico/route.ts').GET()
  assert.equal(response.status, 200)
  assert.equal((await response.json()).actualizadoPorUsuarioId, undefined)
})

test('settings use verified author and optimistic revision; a stale write returns 409', async () => {
  const x = adminFixture()
  let revision = 1
  x.prisma.configuracionReserva.updateMany = async ({ where, data }) => {
    assert.equal(data.actualizadoPorUsuarioId, 7)
    if (where.revision !== revision) return { count: 0 }
    revision++; return { count: 1 }
  }
  const handler = x.load('app/api/configuracion/reservas/route.ts')
  assert.equal((await handler.PUT(request('/test', 'PUT', { ...policy, actualizadoPorUsuarioId: 88 }))).status, 200)
  assert.equal((await handler.PUT(request('/test', 'PUT', policy))).status, 409)
  assert.equal(revision, 2)
})

test('invalid settings and database failures do not report success', async () => {
  const x = adminFixture(), handler = x.load('app/api/configuracion/reservas/route.ts')
  assert.equal((await handler.PUT(request('/test', 'PUT', { ...policy, duracionMinutos: 0 }))).status, 400)
  assert.equal(x.calls.some(c => c.method === 'updateMany'), false)
  x.prisma.configuracionReserva.findUnique = async () => { throw new Error('private db error') }
  const r = await handler.GET()
  assert.equal(r.status, 500)
  assert.equal((await r.text()).includes('private'), false)
})

test('adding products preserves old snapshot and uses current policy only for new items', async () => {
  const x = fixture({ user: { id: 'member' } })
  x.prisma.carritoItem.findMany = async () => [{ productoId: 2 }]
  x.prisma.producto.findMany = async ({ where }) => where.id ? [product({ id: 2, estado: 'disponible', reservaPolitica: null })] : [product()]
  x.prisma.configuracionReserva.findUnique = async () => ({ ...policy, duracionMinutos: 90, revision: 2 })
  const writes = []
  x.prisma.producto.updateMany = async args => { writes.push(args); return { count: 1 } }
  const r = await x.load('app/api/ventas/reservar/route.ts').POST(request('/test', 'POST', { productosIds: [2] }))
  assert.equal(r.status, 200)
  assert.equal(writes.find(w => w.where.id === 1).data.reservaPolitica.duracionMinutos, 30)
  assert.equal(writes.find(w => w.where.id === 2).data.reservaPolitica.duracionMinutos, 90)
  assert.equal((await r.json()).reservas.length, 2)
})

test('manual pause and resume retain exact effective balance, including automatic overlap', async () => {
  const x = adminFixture()
  let p = product({ reservaPolitica: { ...policy, pausaAutomaticaHabilitada: false } })
  x.prisma.producto.findUnique = async () => p
  x.prisma.producto.findMany = async ({ where }) => { assert.equal(where.reservadoPorUsuarioId, 7); assert.equal(where.compradorInfo, undefined); return [p] }
  x.prisma.producto.updateMany = async ({ data }) => { p = { ...p, ...data, reservaVersion: p.reservaVersion + 1 }; return { count: 1 } }
  const service = x.load('lib/reserva-service.ts')
  await service.pauseReservations(1)
  const saldo = p.reservaSaldoMs
  assert.ok(saldo > 3590000 && saldo <= 3600000)
  assert.equal(p.reservaExpiraEn, null)
  p.reservaPolitica = policy
  await service.pauseReservations(1)
  assert.equal(p.reservaPausada, false)
  assert.ok(Math.abs(clock.effectiveTimeBetween(Date.now(), p.reservaExpiraEn.getTime(), policy) - saldo) < 2000)
})

test('legacy rows, manual pauses and future expiry cannot be released', async () => {
  const x = adminFixture(), service = x.load('lib/reserva-service.ts')
  for (const p of [product({ reservaPolitica: null }), product({ reservaPausada: true, reservaExpiraEn: new Date(0) }), product()])
    assert.equal(await service.expireOne(x.prisma, p, new Date()), false)
  assert.equal(x.calls.length, 0)
})

test('only the winner of an expiry transition removes carts; retries are idempotent', async () => {
  const x = adminFixture(), service = x.load('lib/reserva-service.ts')
  const p = product({ reservaExpiraEn: new Date(0) })
  let state = 'reservado'
  x.prisma.producto.updateMany = async ({ where }) => {
    assert.equal(where.reservaVersion, 3)
    assert.equal(where.reservaPausada, false)
    if (state !== where.estado) return { count: 0 }
    state = 'disponible'; return { count: 1 }
  }
  const result = await Promise.all([service.expireOne(x.prisma, p, new Date()), service.expireOne(x.prisma, p, new Date())])
  assert.deepEqual(result.sort(), [false, true])
  assert.equal(x.calls.filter(c => c.model === 'carritoItem' && c.method === 'deleteMany').length, 1)
})

test('stale expiry after renewal or sale cannot delete a cart', async () => {
  const x = adminFixture(), service = x.load('lib/reserva-service.ts')
  x.prisma.producto.updateMany = async ({ where }) => { assert.equal(where.reservaVersion, 3); return { count: 0 } }
  assert.equal(await service.expireOne(x.prisma, product({ reservaExpiraEn: new Date(0) }), new Date()), false)
  assert.equal(x.calls.length, 0)
})

test('confirmation of expired or legacy reservation is rejected, external sale is explicit', async () => {
  for (const patch of [{ reservaExpiraEn: new Date(0) }, { reservaPolitica: null }]) {
    const x = adminFixture()
    x.prisma.producto.findUnique = async () => product(patch)
    const r = await x.load('app/api/ventas/confirmar/route.ts').POST(request('/test', 'POST', { productoId: 1 }))
    assert.equal(r.status, 409)
    assert.equal(x.calls.some(c => c.method === 'updateMany'), false)
  }
})

test('legacy regularization requires explicit confirmation and retains a manual pause', async () => {
  const x = adminFixture()
  x.prisma.producto.findUnique = async () => product({ reservaPolitica: null, reservaPausada: true })
  x.prisma.producto.updateMany = async ({ data }) => {
    assert.equal(data.reservaExpiraEn, null); assert.equal(data.reservaSaldoMs, 1800000)
    assert.equal(data.reservaPausada, undefined); return { count: 1 }
  }
  const handler = x.load('app/api/ventas/regularizar/route.ts')
  assert.equal((await handler.POST(request('/test', 'POST', { productoId: 1 }))).status, 400)
  assert.equal((await handler.POST(request('/test', 'POST', { productoId: 1, confirmar: true }))).status, 200)
})

test('cron uses independent secret authentication and never needs browser cookies', async () => {
  const previous = process.env.CRON_SECRET
  try {
    const x = fixture({ token: null }), handler = x.load('app/api/cron/reservas/route.ts')
    delete process.env.CRON_SECRET
    assert.equal((await handler.GET(request('/test'))).status, 503)
    process.env.CRON_SECRET = 'test-secret-'.repeat(4)
    assert.equal((await handler.GET(request('/test'))).status, 401)
    assert.equal(x.calls.length, 0)
    const r = await handler.GET(new Request('http://localhost/test', { headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` } }))
    assert.equal(r.status, 200)
    assert.equal((await r.json()).liberadas, 0)
    assert.equal(x.calls.some(c => c.model === 'usuario'), false)
  } finally { if (previous === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = previous }
})

test('notification endpoint denies guests/customers before invoking any provider', async () => {
  for (const user of [null, { id: 'member' }]) {
    const x = fixture({ user })
    const response = await x.load('app/api/notificaciones/whatsapp/route.ts').POST(request('/test', 'POST', {}))
    assert.equal(response.status, user ? 403 : 401)
    assert.equal(x.calls.filter(c => c.model !== 'usuario').length, 0)
  }
})
