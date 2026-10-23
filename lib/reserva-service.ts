import { Prisma, type Producto } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { AccessError } from '@/lib/api-identity'
import { addEffectiveTime, readPolicy, reservationTiming, validatePolicy } from '@/lib/reserva-policy'
import { notifyExpiration } from '@/lib/reserva-notifications'

export const clearReservation = {
  reservadoEn: null, compradorInfo: null, reservadoPorSessionId: null, reservadoPorUsuarioId: null,
  reservaPausada: false, pausadoEn: null, reservaPolitica: Prisma.DbNull,
  reservaExpiraEn: null, reservaSaldoMs: null, reservaVersion: { increment: 1 },
}

export function productId(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 1) throw new AccessError(400, 'Producto inválido')
  return value as number
}

export async function currentPolicy(tx: Prisma.TransactionClient = prisma) {
  const row = await tx.configuracionReserva.findUnique({ where: { id: 1 } })
  if (!row) throw new AccessError(503, 'Falta inicializar la configuración de reservas')
  return validatePolicy(row)
}

export function reservationGuard(p: Producto) {
  return { id: p.id, estado: p.estado, reservaVersion: p.reservaVersion, updatedAt: p.updatedAt }
}

export function expired(p: Producto, now: Date) {
  return p.estado === 'reservado' && !!readPolicy(p.reservaPolitica) &&
    !p.reservaPausada && !!p.reservaExpiraEn && p.reservaExpiraEn <= now
}

export function assertLive(p: Producto, now: Date) {
  if (p.estado !== 'reservado') throw new AccessError(409, 'El producto ya no está reservado')
  if (reservationTiming(p, now.getTime())?.pause === 'revision')
    throw new AccessError(409, 'Esta reserva antigua requiere revisión administrativa')
  if (expired(p, now)) throw new AccessError(409, 'La reserva ya venció; actualiza la pantalla')
}

export async function expireOne(tx: Prisma.TransactionClient, p: Producto, now: Date) {
  if (!expired(p, now)) return false
  const changed = await tx.producto.updateMany({
    where: { ...reservationGuard(p), reservaPausada: false, reservaExpiraEn: { lte: now } },
    data: { ...clearReservation, estado: 'disponible' },
  })
  if (!changed.count) return false
  await tx.carritoItem.deleteMany({ where: { productoId: p.id } })
  return true
}

export async function expireReservations(now = new Date()) {
  // Short transactions and a bounded batch permit safe retries and overlapping workers.
  const candidates = await prisma.producto.findMany({
    where: { estado: 'reservado', reservaPausada: false, reservaExpiraEn: { lte: now } },
    orderBy: { reservaExpiraEn: 'asc' }, take: 200,
  })
  let released = 0
  let reviewed = 0
  const deadline = Date.now() + 20000
  for (const p of candidates) {
    if (Date.now() >= deadline) break
    reviewed++
    if (await prisma.$transaction(tx => expireOne(tx, p, now))) {
      released++
      await notifyExpiration(p)
    }
  }
  return { revisadas: reviewed, liberadas: released, hayMas: reviewed < candidates.length || candidates.length === 200 }
}

export async function adminTransition(id: number, action: 'confirmar' | 'cancelar' | 'disponible' | 'marcar-vendido') {
  return prisma.$transaction(async tx => {
    const p = await tx.producto.findUnique({ where: { id } })
    if (!p) throw new AccessError(404, 'Producto no encontrado')
    if (action === 'confirmar') assertLive(p, new Date())
    if (action === 'cancelar' && p.estado !== 'reservado') throw new AccessError(409, 'El producto ya no está reservado')
    if (action === 'marcar-vendido' && p.estado === 'vendido') return
    const sold = action === 'confirmar' || action === 'marcar-vendido'
    const changed = await tx.producto.updateMany({
      where: reservationGuard(p),
      data: { ...clearReservation, estado: sold ? 'vendido' : 'disponible',
        ...(sold ? { compradorInfo: p.compradorInfo || 'Venta externa' } : {}),
        ...(action === 'confirmar' ? { stock: Math.max(0, p.stock - 1) } : {}),
      },
    })
    if (changed.count !== 1) throw new AccessError(409, 'El producto cambió; actualiza la pantalla')
    await tx.carritoItem.deleteMany({ where: { productoId: id } })
  })
}

export async function pauseReservations(id: number) {
  return prisma.$transaction(async tx => {
    const p = await tx.producto.findUnique({ where: { id } })
    if (!p) throw new AccessError(404, 'Producto no encontrado')
    const now = new Date()
    assertLive(p, now)
    const owner = p.reservadoPorUsuarioId !== null
      ? { reservadoPorUsuarioId: p.reservadoPorUsuarioId }
      : p.reservadoPorSessionId ? { reservadoPorUsuarioId: null, reservadoPorSessionId: p.reservadoPorSessionId } : { id }
    const group = await tx.producto.findMany({ where: { estado: 'reservado', ...owner } })
    let changedCount = 0
    for (const item of group) {
      // Mixed groups can contain legacy or expired items; never revive those implicitly.
      const timing = reservationTiming(item, now.getTime())
      if (timing?.pause === 'revision' || expired(item, now) || item.reservaPausada !== p.reservaPausada) continue
      const policy = readPolicy(item.reservaPolitica)!
      const changed = await tx.producto.updateMany({ where: reservationGuard(item), data: {
        reservaPausada: !p.reservaPausada, pausadoEn: p.reservaPausada ? null : now,
        reservaSaldoMs: p.reservaPausada ? null : timing!.remainingMs,
        reservaExpiraEn: p.reservaPausada ? new Date(addEffectiveTime(now.getTime(), item.reservaSaldoMs!, policy)) : null,
        reservaVersion: { increment: 1 },
      } })
      if (changed.count !== 1) throw new AccessError(409, 'Una reserva cambió; vuelve a intentar')
      changedCount++
    }
    return { pausado: !p.reservaPausada, message: `Se actualizaron ${changedCount} reservas` }
  }, { isolationLevel: 'Serializable' })
}

export function reservationError(error: unknown) {
  if (error instanceof SyntaxError) return new AccessError(400, 'JSON inválido')
  if (error && typeof error === 'object' && 'code' in error && error.code === 'P2034')
    return new AccessError(409, 'Hubo un cambio simultáneo; actualiza e intenta nuevamente')
  return error
}
