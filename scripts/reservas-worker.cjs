/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv').config({ quiet: true })
const base = process.env.RESERVAS_BASE_URL
const secret = process.env.CRON_SECRET
if (!base || !secret || secret.length < 32) {
  console.error('Configura RESERVAS_BASE_URL y CRON_SECRET (mínimo 32 caracteres).')
  process.exit(1)
}
const url = new URL('/api/cron/reservas', base)
if (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) {
  console.error('Usa HTTPS fuera de localhost.'); process.exit(1)
}
let stopped = false
let wake
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { stopped = true; if (wake) wake() })
async function main() {
  while (!stopped) {
    const started = Date.now()
    try {
      const response = await fetch(url, { headers: { Authorization: `Bearer ${secret}` }, redirect: 'error', signal: AbortSignal.timeout(45000) })
      if (!response.ok) console.error(`Limpieza: HTTP ${response.status}; se reintentará en el próximo ciclo.`)
      else {
        const result = await response.json()
        console.log(JSON.stringify({ fecha: new Date().toISOString(), liberadas: result.liberadas, hayMas: result.hayMas }))
      }
    } catch { console.error('Limpieza no disponible; se reintentará en el próximo ciclo.') }
    if (!stopped) await new Promise(resolve => {
      const timer = setTimeout(resolve, Math.max(1000, 60000 - (Date.now() - started)))
      wake = () => { clearTimeout(timer); resolve() }
    })
  }
}
main().catch(() => { process.exitCode = 1 })
