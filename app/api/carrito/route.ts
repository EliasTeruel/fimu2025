import { NextResponse } from 'next/server'
import {prisma} from '@/lib/prisma'

// GET - Obtener todos los items del carrito por sessionId o usuarioId
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const usuarioId = searchParams.get('usuarioId')

    console.log('📥 GET /api/carrito - Params:', { sessionId, usuarioId }) // Debug

    if (!sessionId && !usuarioId) {
      return NextResponse.json(
        { error: 'sessionId o usuarioId es requerido' },
        { status: 400 }
      )
    }

    // Priorizar usuarioId si está presente (usuario logueado)
    const whereClause = usuarioId 
      ? { usuarioId: parseInt(usuarioId) }
      : { sessionId, usuarioId: null } // Solo items sin usuario asignado

    console.log('🔍 Buscando items con:', whereClause) // Debug

    const items = await prisma.carritoItem.findMany({
      where: whereClause,
      include: {
        producto: {
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

    console.log(`✅ Encontrados ${items.length} items`) // Debug

    return NextResponse.json(items)
  } catch (error) {
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

    console.log('📥 POST /api/carrito recibido:', { productoId, cantidad, sessionId, usuarioId }) // Debug

    if (!productoId || !cantidad) {
      return NextResponse.json(
        { error: 'Producto ID y cantidad son requeridos' },
        { status: 400 }
      )
    }

    // Validar que al menos uno de los dos esté presente y no sea vacío
    const hasSessionId = sessionId && sessionId.trim() !== ''
    const hasUsuarioId = usuarioId && usuarioId > 0

    if (!hasSessionId && !hasUsuarioId) {
      console.error('❌ Validación falló: sessionId y usuarioId vacíos')
      return NextResponse.json(
        { error: 'sessionId o usuarioId es requerido', debug: { sessionId, usuarioId } },
        { status: 400 }
      )
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

    if (producto.stock < cantidad) {
      return NextResponse.json(
        { error: 'Stock insuficiente' },
        { status: 400 }
      )
    }

    // Verificar si el producto ya está en el carrito (por usuario o por sesión)
    const whereClause = usuarioId
      ? { productoId, usuarioId: parseInt(usuarioId) }
      : { productoId, sessionId, usuarioId: null }

    const itemExistente = await prisma.carritoItem.findFirst({
      where: whereClause
    })

    let item

    if (itemExistente) {
      // Actualizar cantidad
      const nuevaCantidad = itemExistente.cantidad + cantidad
      
      if (producto.stock < nuevaCantidad) {
        return NextResponse.json(
          { error: 'Stock insuficiente para agregar más unidades' },
          { status: 400 }
        )
      }

      item = await prisma.carritoItem.update({
        where: { id: itemExistente.id },
        data: { cantidad: nuevaCantidad },
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
    } else {
      // Crear nuevo item
      const createData: any = {
        productoId,
        cantidad,
        sessionId
      }
      
      if (usuarioId) {
        createData.usuarioId = parseInt(usuarioId)
      }

      item = await prisma.carritoItem.create({
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
    }

    return NextResponse.json(item, { status: 201 })
  } catch (error) {
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
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const usuarioId = searchParams.get('usuarioId')

    if (!sessionId && !usuarioId) {
      return NextResponse.json(
        { error: 'sessionId o usuarioId es requerido' },
        { status: 400 }
      )
    }

    const whereClause = usuarioId
      ? { usuarioId: parseInt(usuarioId) }
      : { sessionId, usuarioId: null }

    await prisma.carritoItem.deleteMany({
      where: whereClause
    })
    return NextResponse.json({ message: 'Carrito vaciado' })
  } catch (error) {
    console.error('Error al vaciar carrito:', error)
    return NextResponse.json(
      { error: 'Error al vaciar el carrito' },
      { status: 500 }
    )
  }
}
