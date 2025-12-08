import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calcularExpiracionReserva } from '@/lib/reserva-utils'

// POST - Reservar productos al hacer click en "Pagar"
export async function POST(request: Request) {
  try {
    const { productosIds, compradorInfo, sessionId, usuarioId } = await request.json()

    if (!productosIds || !Array.isArray(productosIds) || productosIds.length === 0) {
      return NextResponse.json(
        { error: 'Se requiere un array de IDs de productos' },
        { status: 400 }
      )
    }

    if (!sessionId && !usuarioId) {
      return NextResponse.json(
        { error: 'sessionId o usuarioId es requerido' },
        { status: 400 }
      )
    }

    // Verificar que los productos estén disponibles O ya estén reservados por este mismo cliente
    const productos = await prisma.producto.findMany({
      where: {
        id: { in: productosIds }
      }
    })

    const noDisponibles = productos.filter((p: typeof productos[0]) => {
      // Permitir si está disponible o si ya está reservado por este cliente
      const esDisponible = p.estado === 'disponible'
      const esReservadoPorEsteCliente = p.estado === 'reservado' && p.compradorInfo === compradorInfo
      return !esDisponible && !esReservadoPorEsteCliente
    })
    
    if (noDisponibles.length > 0) {
      return NextResponse.json(
        { 
          error: 'Algunos productos ya no están disponibles',
          productosNoDisponibles: noDisponibles.map((p: typeof productos[0]) => ({ id: p.id, nombre: p.nombre, estado: p.estado }))
        },
        { status: 400 }
      )
    }

    // Buscar si ya hay productos reservados por este cliente
    const productosReservadosExistentes = await prisma.producto.findMany({
      where: {
        estado: 'reservado',
        compradorInfo: compradorInfo
      }
    })

    // Definir el nuevo tiempo de reserva usando lógica inteligente
    const ahora = new Date()
    const tiempoExpiracion = calcularExpiracionReserva(ahora) // Expira según horario de atención

    // Reservar/actualizar todos los productos (nuevos y existentes del mismo cliente)
    const todosLosIds = [...new Set([
      ...productosIds,
      ...productosReservadosExistentes.map(p => p.id)
    ])]

    // 🔑 CLAVE: Guardar quién reservó (sessionId o usuarioId)
    await prisma.producto.updateMany({
      where: {
        id: { in: todosLosIds }
      },
      data: {
        estado: 'reservado',
        reservadoEn: ahora,
        compradorInfo: compradorInfo || null,
        reservadoPorSessionId: sessionId || null,      // 🔑 Guardar sessionId
        reservadoPorUsuarioId: usuarioId ? parseInt(usuarioId) : null  // 🔑 Guardar usuarioId
      }
    })

    const mensajeExtra = productosReservadosExistentes.length > 0 
      ? ` Se extendió la reserva de ${productosReservadosExistentes.length} producto(s) existente(s).`
      : ''

    return NextResponse.json({ 
      message: `Productos reservados exitosamente.${mensajeExtra}`,
      reservadoEn: ahora,
      expiresAt: tiempoExpiracion,
      productosReservados: todosLosIds.length,
      productosNuevos: productosIds.length,
      productosExtendidos: productosReservadosExistentes.length
    })
  } catch (error) {
    console.error('Error al reservar productos:', error)
    return NextResponse.json(
      { error: 'Error al reservar los productos' },
      { status: 500 }
    )
  }
}
