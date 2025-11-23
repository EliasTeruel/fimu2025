import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST - Volver producto a disponible (cancelar venta externa o liberar reserva)
export async function POST(request: Request) {
  try {
    const { productoId } = await request.json()

    if (!productoId) {
      return NextResponse.json(
        { error: 'Se requiere el ID del producto' },
        { status: 400 }
      )
    }

    // Obtener el producto
    const producto = await prisma.producto.findUnique({
      where: { id: productoId }
    })

    if (!producto) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      )
    }

    // Volver a disponible (limpiando toda la info de reserva/venta)
    await prisma.producto.update({
      where: { id: productoId },
      data: {
        estado: 'disponible',
        reservadoEn: null,
        compradorInfo: null,
        reservaPausada: false,
        pausadoEn: null
      }
    })

    console.log(`🔄 Producto ${productoId} vuelto a disponible`)

    return NextResponse.json({
      message: 'Producto vuelto a disponible',
      productoId
    })
  } catch (error) {
    console.error('Error al volver a disponible:', error)
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    )
  }
}
