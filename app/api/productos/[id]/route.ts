import { withReservationTiming } from '@/lib/reserva-policy'
import { canReadSales, publicProduct, accessResponse, requireAdmin } from '@/lib/api-identity'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/productos/[id] - Obtener un producto por ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const salesAccess = await canReadSales()
    const producto = await prisma.producto.findUnique({
      where: { id: parseInt(id) },
      include: {
        imagenes: {
          orderBy: { orden: 'asc' }
        }
      }
    })

    if (!producto) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(salesAccess ? withReservationTiming(producto) : publicProduct(producto), { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    const denied = accessResponse(error)
    if (denied) return denied
    return NextResponse.json(
      { error: 'Error al obtener producto' },
      { status: 500 }
    )
  }
}

// PUT /api/productos/[id] - Actualizar producto
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()

    const { id } = await params
    const body = await request.json()
    const { nombre, descripcion, precio, stock, imagenUrl, imagenes, categoria } = body

    // Primero eliminar imágenes existentes si se envían nuevas
    if (imagenes) {
      await prisma.productoImagen.deleteMany({
        where: { productoId: parseInt(id) }
      })
    }

    const producto = await prisma.producto.update({
      where: { id: parseInt(id) },
      data: {
        nombre,
        descripcion,
        precio: parseFloat(precio),
        stock: parseInt(stock),
        imagenUrl,
        categoria: categoria || 'fimu',
        imagenes: imagenes?.length ? {
          create: imagenes.map((img: { url: string; esPrincipal: boolean; orden: number }) => ({
            url: img.url,
            esPrincipal: img.esPrincipal || false,
            orden: img.orden || 0
          }))
        } : undefined
      },
      include: {
        imagenes: true
      }
    })

    return NextResponse.json(publicProduct(producto))
  } catch (error) {
    const denied = accessResponse(error)
    if (denied) return denied
    return NextResponse.json(
      { error: 'Error al actualizar producto' },
      { status: 500 }
    )
  }
}

// DELETE /api/productos/[id] - Eliminar producto
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()

    const { id } = await params
    await prisma.producto.delete({
      where: { id: parseInt(id) },
    })

    return NextResponse.json({ message: 'Producto eliminado' })
  } catch (error) {
    const denied = accessResponse(error)
    if (denied) return denied
    return NextResponse.json(
      { error: 'Error al eliminar producto' },
      { status: 500 }
    )
  }
}
