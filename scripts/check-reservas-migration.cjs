/* eslint-disable @typescript-eslint/no-require-imports */
// Read-only preflight. Never emits connection strings or buyer information.
require('dotenv').config({ quiet: true })
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient({ log: [] })
async function main() {
  const tables = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema() AND table_name IN ('productos', 'usuarios', 'configuracion_reservas', '_prisma_migrations')`
  const columns = await prisma.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'productos' AND column_name IN ('reserva_politica','reserva_expira_en','reserva_saldo_ms','reserva_version')`
  const counts = await prisma.$queryRaw`SELECT estado, reserva_pausada, COUNT(*)::int AS cantidad FROM productos GROUP BY estado, reserva_pausada ORDER BY estado, reserva_pausada`
  console.log(JSON.stringify({ tablas: tables, columnasNuevas: columns, inventarioSinDatosPersonales: counts }, null, 2))
}
main().catch(() => { console.error('No se pudo inspeccionar la base; no se modificó ningún dato.'); process.exitCode = 1 }).finally(() => prisma.$disconnect())
