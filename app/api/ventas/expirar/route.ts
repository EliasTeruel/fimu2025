import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { identity, ownsReservation, AccessError, accessResponse } from '@/lib/api-identity'
import { productId, expireOne, reservationError } from '@/lib/reserva-service'
import { notifyExpiration } from '@/lib/reserva-notifications'

export async function POST(request: Request) {
  try {
    const actor = await identity()
    const id = productId((await request.json()).productoId)
    const released = await prisma.$transaction(async tx => {
      const p = await tx.producto.findUnique({ where: { id } })
      if (!p) throw new AccessError(404, 'Producto no encontrado')
      if (!actor.isAdmin && !ownsReservation(actor, p)) throw new AccessError(403, 'No puedes modificar una reserva ajena')
      return await expireOne(tx, p, new Date()) ? p : null
    })
    if (!released) throw new AccessError(409, 'La reserva no venció o ya fue modificada')
    await notifyExpiration(released)
    return NextResponse.json({ success: true, message: 'Producto liberado' })
  } catch (error) {
    return accessResponse(reservationError(error)) ?? NextResponse.json({ error: 'Error al procesar expiración' }, { status: 500 })
  }
}
