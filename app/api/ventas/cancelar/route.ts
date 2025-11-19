import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST - Cancelar reserva (admin o expiración automática)
export async function POST(request: Request) {
  try {
    const { productoId } = await request.json()

    if (!productoId) {
      return NextResponse.json(
        { error: 'Se requiere el ID del producto' },
        { status: 400 }
      )
    }

    const producto = await prisma.producto.findUnique({
      where: { id: productoId }
    })

    if (!producto) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      )
    }

    // Restaurar a disponible
    await prisma.producto.update({
      where: { id: productoId },
      data: {
        estado: 'disponible',
        reservadoEn: null,
        compradorInfo: null
      }
    })

    // Eliminar del carrito al cancelar la reserva
    await prisma.carritoItem.deleteMany({
      where: {
        productoId: productoId
      }
    })

    return NextResponse.json({ 
      message: 'Reserva cancelada, producto disponible nuevamente'
    })
  } catch (error) {
    console.error('Error al cancelar reserva:', error)
    return NextResponse.json(
      { error: 'Error al cancelar la reserva' },
      { status: 500 }
    )
  }
}

// GET - Verificar y cancelar reservas expiradas (3 horas)
export async function GET() {
  try {
    const treHorasAtras = new Date(Date.now() - 3 * 60 * 60 * 1000)

    // Buscar productos reservados hace más de 3 horas
    const productosExpirados = await prisma.producto.findMany({
      where: {
        estado: 'reservado',
        reservadoEn: {
          lt: treHorasAtras
        }
      }
    })

    if (productosExpirados.length > 0) {
      const productosIds = productosExpirados.map((p: typeof productosExpirados[0]) => p.id)
      
      // Cancelar las reservas expiradas
      await prisma.producto.updateMany({
        where: {
          id: { in: productosIds }
        },
        data: {
          estado: 'disponible',
          reservadoEn: null,
          compradorInfo: null
        }
      })

      // Eliminar productos expirados del carrito
      await prisma.carritoItem.deleteMany({
        where: {
          productoId: { in: productosIds }
        }
      })

      return NextResponse.json({
        message: `${productosExpirados.length} reservas expiradas fueron canceladas`,
        productosLiberados: productosExpirados.map((p: typeof productosExpirados[0]) => ({ id: p.id, nombre: p.nombre }))
      })
    }

    return NextResponse.json({
      message: 'No hay reservas expiradas'
    })
  } catch (error) {
    console.error('Error al verificar reservas expiradas:', error)
    return NextResponse.json(
      { error: 'Error al verificar reservas expiradas' },
      { status: 500 }
    )
  }
}
