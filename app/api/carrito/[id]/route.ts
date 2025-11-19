import { NextResponse } from 'next/server'
import {prisma} from '@/lib/prisma'

// PUT - Actualizar cantidad de un item del carrito
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params
    const id = parseInt(idStr)
    const { cantidad } = await request.json()

    if (!cantidad || cantidad < 1) {
      return NextResponse.json(
        { error: 'Cantidad debe ser mayor a 0' },
        { status: 400 }
      )
    }

    // Verificar que el item existe
    const item = await prisma.carritoItem.findUnique({
      where: { id },
      include: { producto: true }
    })

    if (!item) {
      return NextResponse.json(
        { error: 'Item no encontrado en el carrito' },
        { status: 404 }
      )
    }

    // Verificar stock disponible
    if (item.producto.stock < cantidad) {
      return NextResponse.json(
        { error: 'Stock insuficiente' },
        { status: 400 }
      )
    }

    // Actualizar cantidad
    const itemActualizado = await prisma.carritoItem.update({
      where: { id },
      data: { cantidad },
      include: {
        producto: {
          include: {
            imagenes: {
              orderBy: { orden: 'asc' }
            }
          }
        }
      }
    })

    return NextResponse.json(itemActualizado)
  } catch (error) {
    console.error('Error al actualizar item del carrito:', error)
    return NextResponse.json(
      { error: 'Error al actualizar el item' },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar item del carrito
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params
    const id = parseInt(idStr)
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId es requerido' },
        { status: 400 }
      )
    }

    // Verificar que el item pertenece a esta sesión
    const item = await prisma.carritoItem.findFirst({
      where: { id, sessionId }
    })

    if (!item) {
      return NextResponse.json(
        { error: 'Item no encontrado en tu carrito' },
        { status: 404 }
      )
    }

    await prisma.carritoItem.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Item eliminado del carrito' })
  } catch (error) {
    console.error('Error al eliminar item del carrito:', error)
    return NextResponse.json(
      { error: 'Error al eliminar el item' },
      { status: 500 }
    )
  }
}
