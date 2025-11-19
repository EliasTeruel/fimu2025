import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Intentar una consulta simple
    await prisma.$queryRaw`SELECT 1`
    
    return NextResponse.json({ 
      status: 'ok',
      message: 'Conexión a base de datos exitosa' 
    })
  } catch (error: any) {
    console.error('Error de conexión:', error)
    return NextResponse.json({ 
      status: 'error',
      message: error.message || 'Error al conectar con la base de datos',
      details: error.toString()
    }, { status: 500 })
  }
}
