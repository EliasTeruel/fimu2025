/* eslint-disable @typescript-eslint/no-require-imports */
// Explicit deployment tool: snapshot app tables, apply only the reviewed additive SQL,
// and verify that existing rows were preserved, all under one database transaction.
require('dotenv').config({ quiet: true })
const { PrismaClient } = require('@prisma/client')
const fs = require('node:fs')
const path = require('node:path')
const { createHash } = require('node:crypto')
const { execFileSync } = require('node:child_process')
const prisma = new PrismaClient({ log: [] })
const root = path.resolve(__dirname, '..')
const tables = ['carrito_items', 'configuracion_categorias', 'configuracion_reservas', 'producto_imagenes', 'productos', 'usuarios']
const hash = data => createHash('sha256').update(data).digest('hex')

async function main() {
  if (!process.argv.includes('--apply')) throw new Error('REQUIRES_APPLY_FLAG')
  execFileSync('git', ['check-ignore', '-q', '.backups/probe.json'], { cwd: root })
  const sqlPath = path.join(root, 'prisma/migrations/add_configuracion_reservas.sql')
  const sql = fs.readFileSync(sqlPath, 'utf8')
  const statements = sql.replace(/^\s*--.*$/gm, '').split(';').map(s => s.trim()).filter(s => s && !/^(BEGIN|COMMIT)$/i.test(s))
  // This reviewed migration uses simple SQL only. Do not use this parser for DO blocks.
  if (sql.includes('$$') || statements.some(s => !/^(CREATE|ALTER|INSERT|REVOKE)\b/i.test(s))) throw new Error('UNEXPECTED_MIGRATION')
  const backupPath = path.join(root, '.backups', `reservas-before-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  fs.mkdirSync(path.dirname(backupPath), { recursive: true })
  const summary = await prisma.$transaction(async tx => {
    await tx.$executeRawUnsafe("SET LOCAL lock_timeout = '5s'")
    await tx.$queryRawUnsafe("SELECT 1 FROM pg_advisory_xact_lock(hashtext('fimu-configuracion-reservas-v2'))")
    const known = await tx.$queryRawUnsafe("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'")
    const existing = tables.filter(name => known.some(t => t.table_name === name))
    if (!existing.includes('productos') || !existing.includes('usuarios')) throw new Error('WRONG_DATABASE_SCHEMA')
    // Fixed allowlisted identifiers, never user input. Short lock protects the snapshot.
    await tx.$executeRawUnsafe(`LOCK TABLE ${existing.map(t => `public."${t}"`).join(', ')} IN SHARE MODE`)
    const snapshotQuery = `SELECT jsonb_build_object(${existing.map(t => `'${t}', COALESCE((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.id) FROM public."${t}" r), '[]'::jsonb)`).join(', ')}) AS data`
    const [{ data: before }] = await tx.$queryRawUnsafe(snapshotQuery)
    const schema = await tx.$queryRawUnsafe("SELECT table_name, column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema = 'public' ORDER BY table_name, ordinal_position")
    const backup = JSON.stringify({ format: 1, createdAt: new Date().toISOString(), scope: 'Application tables only; excludes Supabase Auth and Storage', migrationSha256: hash(sql), schema, data: before }, null, 2)
    fs.writeFileSync(backupPath, backup, { flag: 'wx', mode: 0o600 })
    const readback = fs.readFileSync(backupPath)
    if (hash(readback) !== hash(backup)) throw new Error('BACKUP_VERIFICATION_FAILED')
    fs.writeFileSync(backupPath + '.sha256', hash(readback) + '\n', { flag: 'wx', mode: 0o600 })
    for (const statement of statements) await tx.$executeRawUnsafe(statement)
    const [{ data: after }] = await tx.$queryRawUnsafe(snapshotQuery)
    for (const table of existing) {
      if (after[table].length !== before[table].length) throw new Error('ROW_COUNT_CHANGED')
      for (let i = 0; i < before[table].length; i++) {
        for (const [key, value] of Object.entries(before[table][i])) {
          if (JSON.stringify(after[table][i][key]) !== JSON.stringify(value)) throw new Error('EXISTING_DATA_CHANGED')
        }
      }
    }
    const [config] = await tx.$queryRawUnsafe('SELECT id, duracion_minutos, pausa_desde_minuto, pausa_hasta_minuto, zona_horaria, revision FROM configuracion_reservas WHERE id = 1')
    if (!config) throw new Error('CONFIGURATION_MISSING')
    return { tablasRespaldadas: Object.fromEntries(existing.map(t => [t, before[t].length])), configuracion: config }
  }, { isolationLevel: 'Serializable', timeout: 60000, maxWait: 10000 })
  console.log(JSON.stringify({ aplicada: true, datosExistentesConservados: true, respaldoLocal: path.relative(root, backupPath), ...summary }, null, 2))
}
main().catch(error => {
  // No raw Prisma messages: these can contain connection details or customer data.
  const ownCode = /^[A-Z_]+$/.test(error.message || '') ? error.message : 'MIGRATION_FAILED'
  console.error(JSON.stringify({ aplicada: false, error: ownCode, prismaCode: typeof error.code === 'string' && /^P\d+$/.test(error.code) ? error.code : undefined }))
  process.exitCode = 1
}).finally(() => prisma.$disconnect())
