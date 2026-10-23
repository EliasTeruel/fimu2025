import { requireAdmin, accessResponse } from '@/lib/api-identity'
import { NextResponse } from 'next/server'
import { productId, pauseReservations, reservationError } from '@/lib/reserva-service'

export async function POST(request: Request) {
  try {
    await requireAdmin()
    return NextResponse.json(await pauseReservations(productId((await request.json()).productoId)))
  } catch (error) {
    return accessResponse(reservationError(error)) ?? NextResponse.json({ error: 'Error al pausar/reanudar la reserva' }, { status: 500 })
  }
}
