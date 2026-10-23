import { NextResponse } from 'next/server'
import { currentPolicy } from '@/lib/reserva-service'

export async function GET() {
  try { return NextResponse.json(await currentPolicy(), { headers: { 'Cache-Control': 'no-store' } }) }
  catch { return NextResponse.json({ error: 'Configuración no disponible' }, { status: 503 }) }
}
