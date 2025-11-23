import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/carrito/count - Solo contar items por sessionId (más rápido)
export async function GET(request: Request) {
  console.log('🔍 [GET /api/carrito/count] Iniciando request...')
  
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    
    console.log('📝 [GET /api/carrito/count] sessionId:', sessionId)

    if (!sessionId) {
      console.warn('⚠️ [GET /api/carrito/count] sessionId faltante')
      return NextResponse.json(
        { error: 'sessionId es requerido' },
        { status: 400 }
      )
    }

    console.log('📊 [GET /api/carrito/count] Consultando Prisma...')
    const count = await prisma.carritoItem.count({
      where: { sessionId }
    })
    
    console.log(`✅ [GET /api/carrito/count] Count: ${count}`)
    
    return NextResponse.json({ count }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0'
      }
    })
  } catch (error) {
    console.error('❌ [GET /api/carrito/count] Error:', error)
    console.error('❌ [GET /api/carrito/count] Error message:', error instanceof Error ? error.message : error)
    return NextResponse.json(
      { 
        error: 'Error al contar items del carrito',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
