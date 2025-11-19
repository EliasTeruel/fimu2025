import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/carrito/count - Solo contar items por sessionId (más rápido)
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

    const count = await prisma.carritoItem.count({
      where: { sessionId }
    })
    
    return NextResponse.json({ count }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0'
      }
    })
  } catch (error) {
    console.error('Error al contar carrito:', error)
    return NextResponse.json(
      { error: 'Error al contar items del carrito' },
      { status: 500 }
    )
  }
}
