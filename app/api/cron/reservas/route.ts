import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { expireReservations } from '@/lib/reserva-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || secret.length < 32) return NextResponse.json({ error: 'Tarea no configurada' }, { status: 503 })
  const expected = Buffer.from(`Bearer ${secret}`)
  const received = Buffer.from(request.headers.get('authorization') || '')
  if (received.length !== expected.length || !timingSafeEqual(received, expected))
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  try { return NextResponse.json(await expireReservations(), { headers: { 'Cache-Control': 'no-store' } }) }
  catch { return NextResponse.json({ error: 'No se pudo ejecutar la limpieza; reintentar' }, { status: 500 }) }
}
