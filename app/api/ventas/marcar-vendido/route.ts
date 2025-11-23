import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST - Marcar producto como vendido manualmente (ventas externas)
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

    // Marcar como vendido (sin importar el estado actual)
    await prisma.producto.update({
      where: { id: productoId },
      data: {
        estado: 'vendido',
        reservadoEn: null,
        compradorInfo: producto.compradorInfo || 'Venta externa',
        reservaPausada: false,
        pausadoEn: null
      }
    })

    console.log(`✅ Producto ${productoId} marcado como vendido manualmente`)

    return NextResponse.json({
      message: 'Producto marcado como vendido',
      productoId
    })
  } catch (error) {
    console.error('Error al marcar como vendido:', error)
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    )
  }
}
