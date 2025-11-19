import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST - Confirmar venta (solo admin)
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

    if (producto.estado !== 'reservado') {
      return NextResponse.json(
        { error: 'Solo se pueden confirmar productos reservados' },
        { status: 400 }
      )
    }

    // Marcar como vendido y reducir stock
    await prisma.producto.update({
      where: { id: productoId },
      data: {
        estado: 'vendido',
        stock: Math.max(0, producto.stock - 1)
      }
    })

    // Eliminar el producto del carrito después de confirmar la venta
    await prisma.carritoItem.deleteMany({
      where: {
        productoId: productoId
      }
    })

    return NextResponse.json({ 
      message: 'Venta confirmada exitosamente'
    })
  } catch (error) {
    console.error('Error al confirmar venta:', error)
    return NextResponse.json(
      { error: 'Error al confirmar la venta' },
      { status: 500 }
    )
  }
}
