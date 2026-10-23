import { requireAdmin, accessResponse } from '@/lib/api-identity'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    await requireAdmin()
    // Intentar una consulta simple
    await prisma.$queryRaw`SELECT 1`
    
    return NextResponse.json({ 
      status: 'ok',
      message: 'Conexión a base de datos exitosa' 
    })
  } catch (error) {
    const denied = accessResponse(error)
    if (denied) return denied
    return NextResponse.json({ 
      status: 'error',
      message: 'Error al conectar con la base de datos'
    }, { status: 500 })
  }
}
