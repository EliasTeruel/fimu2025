import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AccessError, accessResponse, requireAdmin } from '@/lib/api-identity'
import { addEffectiveTime, reservationTiming } from '@/lib/reserva-policy'
import { currentPolicy, productId, reservationGuard, reservationError } from '@/lib/reserva-service'

// Explicit decision for legacy records with unknown process timezone/pause history.
export async function POST(request: Request) {
  try {
    await requireAdmin()
    const body = await request.json()
    const id = productId(body.productoId)
    if (body.confirmar !== true) throw new AccessError(400, 'Confirma asignar un nuevo plazo completo')
    await prisma.$transaction(async tx => {
      const p = await tx.producto.findUnique({ where: { id } })
      if (!p) throw new AccessError(404, 'Producto no encontrado')
      if (reservationTiming(p)?.pause !== 'revision') throw new AccessError(409, 'La reserva no requiere regularización')
      const policy = await currentPolicy(tx), now = new Date()
      const changed = await tx.producto.updateMany({ where: reservationGuard(p), data: {
        reservaPolitica: { ...policy },
        reservaExpiraEn: p.reservaPausada ? null : new Date(addEffectiveTime(now.getTime(), policy.duracionMinutos * 60000, policy)),
        reservaSaldoMs: p.reservaPausada ? policy.duracionMinutos * 60000 : null,
        reservaVersion: { increment: 1 },
      } })
      if (changed.count !== 1) throw new AccessError(409, 'La reserva cambió; vuelve a intentar')
    }, { isolationLevel: 'Serializable' })
    return NextResponse.json({ message: 'Nuevo plazo asignado; la pausa manual se conserva' })
  } catch (error) {
    return accessResponse(reservationError(error)) ?? NextResponse.json({ error: 'No se pudo regularizar la reserva' }, { status: 500 })
  }
}
