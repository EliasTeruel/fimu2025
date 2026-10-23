import { identity, cartOwner, queryClaims, accessResponse, publicProduct, ownsReservation } from '@/lib/api-identity'
import { NextResponse } from 'next/server'
import {prisma} from '@/lib/prisma'

// PUT - Actualizar cantidad de un item del carrito
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params
    const id = Number(idStr)
    if (!Number.isSafeInteger(id) || id <= 0) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    const { cantidad, usuarioId, sessionId } = await request.json()
    const actor = await identity({ ...queryClaims(request), ...(usuarioId != null ? { usuarioId } : {}), ...(sessionId != null ? { sessionId } : {}) })

    if (!Number.isSafeInteger(cantidad) || cantidad < 1) {
      return NextResponse.json(
        { error: 'Cantidad debe ser mayor a 0' },
        { status: 400 }
      )
    }

    // Verificar que el item existe
    const item = await prisma.carritoItem.findFirst({
      where: { id, ...cartOwner(actor) },
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
      where: { id, ...cartOwner(actor) },
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

    return NextResponse.json({
      ...itemActualizado,
      producto: { ...publicProduct(itemActualizado.producto), reservadoPorMi: ownsReservation(actor, itemActualizado.producto) },
    })
  } catch (error) {
    const denied = accessResponse(error)
    if (denied) return denied
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
    const id = Number(idStr)
    if (!Number.isSafeInteger(id) || id <= 0) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    const actor = await identity(queryClaims(request))

    // Verificar que el item pertenece a esta sesión
    const item = await prisma.carritoItem.findFirst({
      where: { id, ...cartOwner(actor) }
    })

    if (!item) {
      return NextResponse.json(
        { error: 'Item no encontrado en tu carrito' },
        { status: 404 }
      )
    }

    await prisma.carritoItem.delete({
      where: { id, ...cartOwner(actor) }
    })

    return NextResponse.json({ message: 'Item eliminado del carrito' })
  } catch (error) {
    const denied = accessResponse(error)
    if (denied) return denied
    console.error('Error al eliminar item del carrito:', error)
    return NextResponse.json(
      { error: 'Error al eliminar el item' },
      { status: 500 }
    )
  }
}
