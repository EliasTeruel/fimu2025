/* eslint-disable @typescript-eslint/no-require-imports */
// Read-only diagnostics. Never print secrets, URLs or raw provider errors.
const fs = require('node:fs')
const path = require('node:path')
const dotenv = require('dotenv')

const file = path.resolve(__dirname, '../.env')
if (fs.existsSync(file)) {
  const values = dotenv.parse(fs.readFileSync(file))
  for (const [key, value] of Object.entries(values)) process.env[key] ??= value
}

async function main() {
  const keys = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'DATABASE_URL', 'DIRECT_URL']
  const missing = keys.filter(key => !process.env[key]?.trim())
  if (missing.length) {
    console.log('Faltan variables: ' + missing.join(', '))
    process.exitCode = 1
    return
  }

  try {
    const url = new URL('/auth/v1/settings', process.env.NEXT_PUBLIC_SUPABASE_URL)
    const response = await fetch(url, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
      signal: AbortSignal.timeout(15000),
    })
    console.log('Supabase Auth: HTTP ' + response.status)
    if (!response.ok) process.exitCode = 1
  } catch {
    console.log('Supabase Auth: no se pudo completar la conexion')
    process.exitCode = 1
  }

  let prisma
  try {
    if (!fs.existsSync(path.resolve(__dirname, '../node_modules/.prisma/client/index.js'))) {
      console.log('PostgreSQL: pendiente; falta generar el cliente de Prisma')
      process.exitCode = 1
      return
    }
    const { PrismaClient } = require('@prisma/client')
    const url = new URL(process.env.DATABASE_URL)
    url.searchParams.set('connect_timeout', '10')
    url.searchParams.set('pool_timeout', '10')
    prisma = new PrismaClient({ log: [], datasources: { db: { url: url.toString() } } })
    await prisma.$queryRaw`SELECT 1`
    console.log('PostgreSQL: conexion correcta (SELECT 1)')
    const [admins, users] = await Promise.all([
      prisma.usuario.count({ where: { isAdmin: true, supabaseId: { not: null } } }),
      prisma.usuario.count({ where: { isAdmin: false, supabaseId: { not: null } } }),
    ])
    console.log('Perfil administrador vinculado: ' + (admins > 0 ? 'si' : 'no'))
    console.log('Perfil comun vinculado: ' + (users > 0 ? 'si' : 'no'))
  } catch (error) {
    const code = typeof error.code === 'string' && /^P\d{4}$/.test(error.code) ? ' (' + error.code + ')' : ''
    console.log('PostgreSQL: no se pudo completar la verificacion' + code)
    process.exitCode = 1
  } finally {
    if (prisma) await prisma.$disconnect()
  }
}

main().catch(() => { console.log('No se pudo completar la verificacion'); process.exitCode = 1 })
