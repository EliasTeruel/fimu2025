import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { identity, AccessError, accessResponse } from '@/lib/api-identity'

export async function POST(request: Request) {
  try {
    const { sessionId, usuarioId } = await request.json()
    const actor = await identity({ sessionId, usuarioId }, true)
    if (!actor.sessionId) throw new AccessError(401, 'Falta la sesión de invitado')
    const guest = { sessionId: actor.sessionId, usuarioId: null }
    const result = await prisma.$transaction(async tx => {
      const items = await tx.carritoItem.findMany({ where: guest })
      const existing = await tx.carritoItem.findMany({ where: { usuarioId: actor.usuarioId! } })
      const products = new Set(existing.map(item => item.productoId))
      let itemsMigrados = 0
      let itemsActualizados = 0
      for (const item of items) {
        if (products.has(item.productoId)) {
          await tx.carritoItem.deleteMany({ where: { id: item.id, ...guest } })
          itemsActualizados++
        } else {
          await tx.carritoItem.updateMany({
            where: { id: item.id, ...guest },
            data: { usuarioId: actor.usuarioId!, sessionId: null },
          })
          products.add(item.productoId)
          itemsMigrados++
        }
      }
      // Transfer only reservations proven to belong to this browser.
      await tx.producto.updateMany({
        where: { estado: 'reservado', reservadoPorSessionId: actor.sessionId, reservadoPorUsuarioId: null },
        data: { reservadoPorSessionId: null, reservadoPorUsuarioId: actor.usuarioId!, reservaVersion: { increment: 1 } },
      })
      return { itemsMigrados, itemsActualizados, totalItems: itemsMigrados + itemsActualizados }
    }, { isolationLevel: 'Serializable' })
    return NextResponse.json({ message: 'Carrito migrado exitosamente', ...result })
  } catch (error) {
    return accessResponse(error) ?? NextResponse.json({ error: 'Error al migrar el carrito; vuelve a intentar' }, { status: 500 })
  }
}
