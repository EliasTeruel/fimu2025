import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AccessError, accessResponse, requireAdmin } from '@/lib/api-identity'
import { validatePolicy } from '@/lib/reserva-policy'
import { reservationError } from '@/lib/reserva-service'

export async function GET() {
  try {
    await requireAdmin()
    const config = await prisma.configuracionReserva.findUnique({ where: { id: 1 } })
    if (!config) throw new AccessError(503, 'Aplica la migración de reservas antes de configurar')
    return NextResponse.json(config, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    return accessResponse(error) ?? NextResponse.json({ error: 'No se pudo leer la configuración' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const actor = await requireAdmin()
    const body = await request.json()
    let policy
    try { policy = validatePolicy(body) } catch (error) { throw new AccessError(400, (error as Error).message) }
    const { algoritmo: _algorithm, ...data } = policy
    void _algorithm
    const updated = await prisma.configuracionReserva.updateMany({
      where: { id: 1, revision: policy.revision },
      data: { ...data, revision: { increment: 1 }, actualizadoPorUsuarioId: actor.usuarioId },
    })
    if (updated.count !== 1) throw new AccessError(409, 'Otro administrador cambió la configuración. Recarga antes de guardar.')
    return NextResponse.json({ ...data, revision: policy.revision + 1 })
  } catch (error) {
    return accessResponse(reservationError(error)) ?? NextResponse.json({ error: 'No se pudo guardar la configuración' }, { status: 500 })
  }
}
