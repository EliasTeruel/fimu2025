import { requireAdmin, accessResponse } from '@/lib/api-identity'
import { NextResponse } from 'next/server'
import { productId, adminTransition, reservationError } from '@/lib/reserva-service'

export async function POST(request: Request) {
  try {
    await requireAdmin()
    await adminTransition(productId((await request.json()).productoId), 'confirmar')
    return NextResponse.json({ message: 'Producto actualizado' })
  } catch (error) {
    return accessResponse(reservationError(error)) ?? NextResponse.json({ error: 'No se pudo actualizar el producto' }, { status: 500 })
  }
}
