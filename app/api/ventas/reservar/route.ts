import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST - Reservar productos al hacer click en "Pagar"
export async function POST(request: Request) {
  try {
    const { productosIds, compradorInfo, sessionId } = await request.json()

    if (!productosIds || !Array.isArray(productosIds) || productosIds.length === 0) {
      return NextResponse.json(
        { error: 'Se requiere un array de IDs de productos' },
        { status: 400 }
      )
    }

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId es requerido' },
        { status: 400 }
      )
    }

    // Verificar que todos los productos estén disponibles
    const productos = await prisma.producto.findMany({
      where: {
        id: { in: productosIds }
      }
    })

    const noDisponibles = productos.filter((p: typeof productos[0]) => p.estado !== 'disponible')
    
    if (noDisponibles.length > 0) {
      return NextResponse.json(
        { 
          error: 'Algunos productos ya no están disponibles',
          productosNoDisponibles: noDisponibles.map((p: typeof productos[0]) => ({ id: p.id, nombre: p.nombre, estado: p.estado }))
        },
        { status: 400 }
      )
    }

    // Reservar todos los productos
    const ahora = new Date()
    await prisma.producto.updateMany({
      where: {
        id: { in: productosIds }
      },
      data: {
        estado: 'reservado',
        reservadoEn: ahora,
        compradorInfo: compradorInfo || null
      }
    })

    // NO vaciar el carrito - los productos permanecen hasta que se confirme la venta o expire
    // Los items del carrito se eliminarán automáticamente cuando se confirme la venta o se cancele

    return NextResponse.json({ 
      message: 'Productos reservados exitosamente',
      reservadoEn: ahora,
      expiresAt: new Date(ahora.getTime() + 3 * 60 * 60 * 1000) // 3 horas después
    })
  } catch (error) {
    console.error('Error al reservar productos:', error)
    return NextResponse.json(
      { error: 'Error al reservar los productos' },
      { status: 500 }
    )
  }
}
