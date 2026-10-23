import { requireAdmin, accessResponse } from '@/lib/api-identity'
import { NextResponse } from 'next/server'
import { productId, adminTransition, reservationError, expireReservations } from '@/lib/reserva-service'

export async function POST(request: Request) {
  try {
    await requireAdmin()
    await adminTransition(productId((await request.json()).productoId), 'cancelar')
    return NextResponse.json({ message: 'Producto actualizado' })
  } catch (error) {
    return accessResponse(reservationError(error)) ?? NextResponse.json({ error: 'No se pudo actualizar el producto' }, { status: 500 })
  }
}

export async function GET() {
  try {
    await requireAdmin()
    return NextResponse.json(await expireReservations(), { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return accessResponse(reservationError(error)) ?? NextResponse.json({ error: 'No se pudo ejecutar la limpieza' }, { status: 500 })
  }
}
