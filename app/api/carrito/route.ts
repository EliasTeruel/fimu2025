import { NextResponse } from 'next/server'
import {prisma} from '@/lib/prisma'

// GET - Obtener todos los items del carrito por sessionId
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId es requerido' },
        { status: 400 }
      )
    }

    const items = await prisma.carritoItem.findMany({
      where: { sessionId },
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
    const { productoId, cantidad, sessionId } = await request.json()

    if (!productoId || !cantidad || !sessionId) {
      return NextResponse.json(
        { error: 'Producto ID, cantidad y sessionId son requeridos' },
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

    // Verificar si el producto ya está en el carrito de esta sesión
    const itemExistente = await prisma.carritoItem.findFirst({
      where: { 
        productoId,
        sessionId 
      }
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
      item = await prisma.carritoItem.create({
        data: {
          productoId,
          cantidad,
          sessionId
        },
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

// DELETE - Vaciar carrito por sessionId
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId es requerido' },
        { status: 400 }
      )
    }

    await prisma.carritoItem.deleteMany({
      where: { sessionId }
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
