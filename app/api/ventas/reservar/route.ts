import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { addEffectiveTime, readPolicy, reservationTiming } from '@/lib/reserva-policy'
import { currentPolicy, assertLive, reservationGuard, reservationError, expired } from '@/lib/reserva-service'
import { identity, cartOwner, reservationOwner, ownsReservation, AccessError, accessResponse } from '@/lib/api-identity'

export async function POST(request: Request) {
  try {
    const { productosIds, compradorInfo, sessionId, usuarioId } = await request.json()
    const actor = await identity({ sessionId, usuarioId })
    if (!Array.isArray(productosIds) || !productosIds.length || productosIds.length > 200 ||
        productosIds.some(id => !Number.isSafeInteger(id) || id <= 0) ||
        (compradorInfo != null && (typeof compradorInfo !== 'string' || compradorInfo.length > 2000)))
      throw new AccessError(400, 'Datos de reserva inválidos')
    const ids: number[] = [...new Set<number>(productosIds)]
    const owner = reservationOwner(actor)
    const result = await prisma.$transaction(async tx => {
      const now = new Date()
      const items = await tx.carritoItem.findMany({ where: { ...cartOwner(actor), productoId: { in: ids } }, select: { productoId: true } })
      if (new Set(items.map(item => item.productoId)).size !== ids.length)
        throw new AccessError(403, 'Solo puedes reservar productos de tu carrito')
      const products = await tx.producto.findMany({ where: { id: { in: ids } } })
      if (products.length !== ids.length) throw new AccessError(404, 'Producto no encontrado')
      for (const p of products) {
        if (p.estado !== 'disponible') {
          if (!ownsReservation(actor, p)) throw new AccessError(409, 'Algunos productos ya no están disponibles')
          assertLive(p, now)
        }
      }
      const existing = await tx.producto.findMany({ where: { estado: 'reservado', ...owner } })
      const all = new Map(products.map(p => [p.id, p]))
      for (const p of existing) {
        // Adding a product never revives expired reservations or changes legacy/manual pauses.
        if (readPolicy(p.reservaPolitica) && !expired(p, now) && !p.reservaPausada) all.set(p.id, p)
      }
      const current = await currentPolicy(tx)
      const reservas = []
      let extended = 0, created = 0
      for (const p of all.values()) {
        if (p.estado === 'reservado' && p.reservaPausada) {
          reservas.push({ productoId: p.id, reservaTiempo: reservationTiming(p, now.getTime()) })
          continue
        }
        const policy = p.estado === 'reservado' ? readPolicy(p.reservaPolitica)! : current
        const data = {
          estado: 'reservado', reservadoEn: now, compradorInfo: compradorInfo || p.compradorInfo || null,
          ...owner, reservadoPorSessionId: actor.usuarioId ? null : actor.sessionId,
          reservaPolitica: { ...policy }, reservaPausada: false, pausadoEn: null, reservaSaldoMs: null,
          reservaExpiraEn: new Date(addEffectiveTime(now.getTime(), policy.duracionMinutos * 60000, policy)),
          reservaVersion: { increment: 1 },
        }
        const updated = await tx.producto.updateMany({ where: reservationGuard(p), data })
        if (updated.count !== 1) throw new AccessError(409, 'La disponibilidad cambió; vuelve a intentar')
        if (p.estado === 'reservado') extended++; else created++
        reservas.push({ productoId: p.id, reservaTiempo: reservationTiming({ ...p, ...data }, now.getTime()) })
      }
      return { productosReservados: reservas.length, productosNuevos: created, productosExtendidos: extended, reservas, serverNow: now.toISOString() }
    }, { isolationLevel: 'Serializable' })
    return NextResponse.json({ message: 'Productos reservados exitosamente', ...result })
  } catch (error) {
    return accessResponse(reservationError(error)) ?? NextResponse.json({ error: 'Error al reservar los productos' }, { status: 500 })
  }
}
