import { identity, cartOwner, queryClaims, accessResponse, ownsReservation, publicProduct, AccessError } from '@/lib/api-identity'
import { NextResponse } from 'next/server'
import {prisma} from '@/lib/prisma'

// GET - Obtener únicamente el carrito del propietario verificado.
export async function GET(request: Request) {
  try {
    const allCarts = new URL(request.url).searchParams.get('scope') === 'all'
    const actor = await identity(queryClaims(request))
    if (allCarts && !actor.isAdmin) throw new AccessError(403, 'Se requiere permiso de administrador')
    const whereClause = allCarts ? {} : cartOwner(actor)

    const items = await prisma.carritoItem.findMany({
      where: whereClause,
      select: {
        id: true,                    // ID único del item en el carrito
        productoId: true,            // ID del producto
        cantidad: true,              // Cantidad (siempre 1 en este caso)
        sessionId: true,             // 🔑 SESSION ID del dueño de este item
        usuarioId: true,             // 🔑 USER ID del dueño de este item
        createdAt: true,             // Fecha de creación
        producto: {                  // Producto completo con todas sus propiedades
          include: {
            imagenes: {
              orderBy: {
                orden: 'asc'
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log(`✅ Encontrados ${items.length} items`)

    const safeItems = items.map(item => ({
      ...item,
      producto: { ...publicProduct(item.producto), reservadoPorMi: ownsReservation(actor, item.producto) },
    }))
    return NextResponse.json(safeItems, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    const denied = accessResponse(error)
    if (denied) return denied
    console.error('Error al obtener carrito:', error)
    return NextResponse.json(
      { error: 'Error al obtener el carrito' },
      { status: 500 }
    )
  }
}

// POST - Agregar producto al carrito
export async function POST(request: Request) {
  try {
    const { productoId, cantidad, sessionId, usuarioId } = await request.json()

    const actor = await identity({ sessionId, usuarioId })
    if (!Number.isSafeInteger(productoId) || productoId <= 0 || !Number.isSafeInteger(cantidad) || cantidad < 1) {
      return NextResponse.json({ error: 'Producto y cantidad inválidos' }, { status: 400 })
    }

    // Verificar si el producto existe y tiene stock
    const producto = await prisma.producto.findUnique({
      where: { id: productoId }
    })

    if (!producto) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      )
    }

    // Verificar el estado del producto
    if (producto.estado === 'reservado') {
      return NextResponse.json(
        { error: 'Este producto está reservado por otro comprador' },
        { status: 400 }
      )
    }

    if (producto.estado === 'vendido') {
      return NextResponse.json(
        { error: 'Este producto ya fue vendido' },
        { status: 400 }
      )
    }

    // No validar stock aquí - permitir que múltiples usuarios agreguen el mismo producto
    // La validación de disponibilidad se hace al momento de RESERVAR
    
    // Verificar si el producto ya está en el carrito (por usuario o por sesión)
    const whereClause = { productoId, ...cartOwner(actor) }

    const itemExistente = await prisma.carritoItem.findFirst({
      where: whereClause
    })

    // Si el producto ya está en el carrito, no permitir agregarlo de nuevo
    if (itemExistente) {
      return NextResponse.json(
        { error: 'Este producto ya está en tu carrito', yaEnCarrito: true },
        { status: 400 }
      )
    }

    // Crear nuevo item
    const createData = {
      productoId, cantidad, ...cartOwner(actor),
      sessionId: actor.usuarioId ? null : actor.sessionId,
    }

    const item = await prisma.carritoItem.create({
      data: createData,
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

    return NextResponse.json({ ...item, producto: publicProduct(item.producto) }, { status: 201 })
  } catch (error) {
    const denied = accessResponse(error)
    if (denied) return denied
    console.error('Error al agregar al carrito:', error)
    return NextResponse.json(
      { error: 'Error al agregar producto al carrito' },
      { status: 500 }
    )
  }
}

// DELETE - Vaciar carrito por sessionId o usuarioId
export async function DELETE(request: Request) {
  try {
    const actor = await identity(queryClaims(request))
    const whereClause = cartOwner(actor)

    await prisma.carritoItem.deleteMany({
      where: whereClause
    })
    return NextResponse.json({ message: 'Carrito vaciado' })
  } catch (error) {
    const denied = accessResponse(error)
    if (denied) return denied
    console.error('Error al vaciar carrito:', error)
    return NextResponse.json(
      { error: 'Error al vaciar el carrito' },
      { status: 500 }
    )
  }
}
