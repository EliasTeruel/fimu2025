/* eslint-disable @typescript-eslint/no-require-imports */
const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')
const { createHash } = require('node:crypto')
const Module = require('node:module')
const ts = require('typescript')

// Execute the real handlers with isolated Supabase, cookie and database boundaries.
function fixture({ user = null, admin = false, token = 'a'.repeat(64), authError = null } = {}) {
  const calls = []
  const cookieValues = new Map(token ? [['fimu_guest', token]] : [])
  const cookieWrites = []
  const prisma = {}
  for (const model of ['usuario', 'carritoItem', 'producto', 'productoImagen', 'configuracionCategoria', 'configuracionReserva']) {
    prisma[model] = {}
    for (const method of ['findUnique', 'findFirst', 'findMany', 'create', 'update', 'updateMany', 'delete', 'deleteMany', 'count']) {
      prisma[model][method] = async args => {
        calls.push({ model, method, args })
        if (model === 'configuracionReserva' && method === 'findUnique') return { id: 1, duracionMinutos: 30, pausaAutomaticaHabilitada: true, pausaDesdeMinuto: 1380, pausaHastaMinuto: 600, zonaHoraria: 'America/Argentina/Buenos_Aires', revision: 1 }
        if (model === 'usuario') return user ? { id: 7, isAdmin: admin } : null
        if (method === 'findMany') return []
        if (method === 'findFirst' || method === 'findUnique') return null
        return { count: 0 }
      }
    }
  }
  prisma.$transaction = async callback => callback(prisma)
  const mocks = {
    '@/lib/prisma': { prisma },
    '@/lib/supabase/server': { createClient: async () => ({ auth: { getUser: async () => ({ data: { user }, error: authError }) } }) },
    'next/headers': { cookies: async () => ({
      get: name => cookieValues.has(name) ? { value: cookieValues.get(name) } : undefined,
      set: (name, value, options) => { cookieValues.set(name, value); cookieWrites.push({ name, value, options }) },
    }) },
    'next/server': { NextResponse: { json: (body, options) => Response.json(body, options) } },
    'next/navigation': { redirect: location => { throw new Error('REDIRECT:' + location) } },
  }
  const cache = new Map()
  function load(file) {
    const path = resolve(file)
    if (cache.has(path)) return cache.get(path).exports
    const mod = new Module(path, module)
    cache.set(path, mod)
    mod.filename = path
    mod.paths = module.paths
    mod.require = name => {
      if (mocks[name]) return mocks[name]
      if (name.startsWith('@/')) return load(name.slice(2) + '.ts')
      return require(name)
    }
    const compiled = ts.transpileModule(readFileSync(path, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    })
    mod._compile(compiled.outputText, path)
    return mod.exports
  }
  return { load, prisma, calls, cookieWrites, sessionId: token && createHash('sha256').update(token).digest('hex') }
}

function request(path, method = 'GET', body) {
  return new Request('http://localhost' + path, { method, ...(body ? { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } } : {}) })
}


module.exports = { fixture, request }
