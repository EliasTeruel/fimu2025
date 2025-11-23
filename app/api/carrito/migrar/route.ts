import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST - Migrar carrito de sessionId a usuarioId cuando el usuario se loguea
export async function POST(request: Request) {
  try {
    const { sessionId, usuarioId } = await request.json()

    if (!sessionId || !usuarioId) {
      return NextResponse.json(
        { error: 'sessionId y usuarioId son requeridos' },
        { status: 400 }
      )
    }

    const usuarioIdInt = parseInt(usuarioId)

    // 1. Obtener items del carrito de invitado (sessionId)
    const itemsInvitado = await prisma.carritoItem.findMany({
      where: { 
        sessionId,
        usuarioId: null // Solo items sin usuario asignado
      }
    })

    if (itemsInvitado.length === 0) {
      return NextResponse.json({ 
        message: 'No hay items para migrar',
        itemsMigrados: 0 
      })
    }

    // 2. Obtener items del carrito del usuario logueado
    const itemsUsuario = await prisma.carritoItem.findMany({
      where: { usuarioId: usuarioIdInt }
    })

    const productosUsuario = new Set(itemsUsuario.map(item => item.productoId))
    let itemsMigrados = 0
    let itemsActualizados = 0

    // 3. Migrar cada item
    for (const item of itemsInvitado) {
      if (productosUsuario.has(item.productoId)) {
        // El producto ya existe en el carrito del usuario - eliminar el duplicado del invitado
        await prisma.carritoItem.delete({
          where: { id: item.id }
        })
        itemsActualizados++
      } else {
        // Producto nuevo - asignar al usuario y limpiar sessionId
        await prisma.carritoItem.update({
          where: { id: item.id },
          data: { 
            usuarioId: usuarioIdInt,
            sessionId: null // Limpiar sessionId al migrar
          }
        })
        itemsMigrados++
      }
    }

    return NextResponse.json({ 
      message: 'Carrito migrado exitosamente',
      itemsMigrados,
      itemsActualizados,
      totalItems: itemsMigrados + itemsActualizados
    })
  } catch (error) {
    console.error('Error al migrar carrito:', error)
    return NextResponse.json(
      { error: 'Error al migrar el carrito' },
      { status: 500 }
    )
  }
}
