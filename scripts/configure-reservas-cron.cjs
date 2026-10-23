/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('node:fs')
const path = require('node:path')
const { randomBytes } = require('node:crypto')
const dotenv = require('dotenv')
const root = path.resolve(__dirname, '..')
dotenv.config({ path: path.join(root, '.env'), quiet: true })
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient({ log: [] })
const JOB = 'fimu-expirar-reservas'
const command = `SELECT net.http_get(
  url := rtrim((SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'fimu_reservas_base_url'), '/') || '/api/cron/reservas',
  headers := jsonb_build_object('Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'fimu_reservas_cron_secret')),
  timeout_milliseconds := 45000
);`

async function status() {
  const extensions = await prisma.$queryRaw`SELECT name, installed_version IS NOT NULL AS installed FROM pg_available_extensions WHERE name IN ('pg_cron','pg_net','supabase_vault') ORDER BY name`
  const jobs = extensions.some(e => e.name === 'pg_cron' && e.installed)
    ? await prisma.$queryRaw`SELECT jobid::int, jobname, schedule, active FROM cron.job WHERE jobname = ${JOB}` : []
  const secrets = extensions.some(e => e.name === 'supabase_vault' && e.installed)
    ? await prisma.$queryRaw`SELECT name FROM vault.secrets WHERE name IN ('fimu_reservas_base_url','fimu_reservas_cron_secret') ORDER BY name` : []
  console.log(JSON.stringify({ extensions, jobs, vaultNames: secrets.map(s => s.name), localSecretConfigured: !!process.env.CRON_SECRET }, null, 2))
}

async function prepare(origin) {
  const url = new URL(origin)
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('INVALID_PRODUCTION_ORIGIN')
  const envPath = path.join(root, '.env')
  const envText = fs.readFileSync(envPath, 'utf8')
  const env = dotenv.parse(envText)
  if (env.CRON_SECRET && env.CRON_SECRET.length < 32) throw new Error('EXISTING_SECRET_TOO_SHORT')
  const secret = env.CRON_SECRET || randomBytes(32).toString('hex')
  // Save locally first so the same value can be entered in Vercel without printing it.
  if (!env.CRON_SECRET) fs.appendFileSync(envPath, `\n# Reservas: secreto privado para el ejecutor periódico\nCRON_SECRET=${secret}\n`)
  process.env.CRON_SECRET = secret
  if (!env.RESERVAS_BASE_URL) fs.appendFileSync(envPath, 'RESERVAS_BASE_URL=http://localhost:3000\n')
  for (const ext of ['pg_cron', 'pg_net', 'supabase_vault']) await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS ${ext}`)
  await prisma.$transaction(async tx => {
    for (const [name, value] of [['fimu_reservas_base_url', url.origin], ['fimu_reservas_cron_secret', secret]]) {
      const rows = await tx.$queryRaw`SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = ${name}`
      if (rows.length > 1 || (rows.length && rows[0].decrypted_secret !== value)) throw new Error('EXISTING_VAULT_VALUE_DIFFERS')
      if (!rows.length) await tx.$queryRaw`SELECT vault.create_secret(${value}, ${name}, 'Fimu: tarea de expiración de reservas')::text AS id`
    }
    const existing = await tx.$queryRaw`SELECT jobid::int, active FROM cron.job WHERE jobname = ${JOB}`
    if (existing.some(j => j.active)) throw new Error('JOB_ALREADY_ACTIVE_USE_STATUS')
    const [job] = await tx.$queryRaw`SELECT cron.schedule(${JOB}, '* * * * *', ${command})::int AS id`
    // Scheduling and deactivation commit together: no intermediate live job.
    await tx.$executeRaw`SELECT cron.alter_job(${BigInt(job.id)}, active := false)`
  }, { timeout: 30000 })
  console.log(JSON.stringify({ prepared: true, active: false, origin: url.origin, secretLocation: '.env (CRON_SECRET)', next: 'Set CRON_SECRET in Vercel, deploy the new code, then run this script with --activate.' }))
}

async function activate() {
  const rows = await prisma.$queryRaw`SELECT name, decrypted_secret FROM vault.decrypted_secrets WHERE name IN ('fimu_reservas_base_url','fimu_reservas_cron_secret')`
  const values = Object.fromEntries(rows.map(r => [r.name, r.decrypted_secret]))
  const origin = values.fimu_reservas_base_url, secret = values.fimu_reservas_cron_secret
  if (!origin || !secret || secret.length < 32) throw new Error('VAULT_NOT_PREPARED')
  const url = new URL('/api/cron/reservas', origin)
  if (url.protocol !== 'https:') throw new Error('HTTPS_REQUIRED')
  const response = await fetch(url, { headers: { Authorization: `Bearer ${secret}` }, redirect: 'error', signal: AbortSignal.timeout(45000) })
  if (response.status !== 200) throw new Error(`DEPLOYMENT_NOT_READY_HTTP_${response.status}`)
  const data = await response.json()
  if (!Number.isInteger(data.liberadas) || !Number.isInteger(data.revisadas) || typeof data.hayMas !== 'boolean') throw new Error('WRONG_ENDPOINT_RESPONSE')
  const jobs = await prisma.$queryRaw`SELECT jobid::int FROM cron.job WHERE jobname = ${JOB}`
  if (jobs.length !== 1) throw new Error('JOB_NOT_PREPARED')
  await prisma.$executeRaw`SELECT cron.alter_job(${BigInt(jobs[0].jobid)}, active := true)`
  console.log(JSON.stringify({ active: true, verifiedHttpStatus: 200, liberadas: data.liberadas, job: JOB }))
}

async function main() {
  const mode = process.argv[2] || '--status'
  if (mode === '--prepare') await prepare(process.argv[3] || '')
  else if (mode === '--activate') await activate()
  else if (mode !== '--status') throw new Error('UNKNOWN_MODE')
  await status()
}
main().catch(error => {
  const code = /^[A-Z_0-9]+$/.test(error.message || '') ? error.message : 'CRON_CONFIGURATION_FAILED'
  const prismaCode = error.code || error.errorCode
  console.error(JSON.stringify({ error: code, type: /^[A-Za-z]+$/.test(error.name || '') ? error.name : undefined, prismaCode: /^P\d+$/.test(prismaCode || '') ? prismaCode : undefined, postgresCode: /^[A-Z0-9]{5}$/.test(error.meta?.code || '') ? error.meta.code : undefined }))
  process.exitCode = 1
}).finally(() => prisma.$disconnect())
