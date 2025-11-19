import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/productos/publico - Versión optimizada para vista del cliente
export async function GET() {
  try {
    const productos = await prisma.producto.findMany({
      select: {
        id: true,
        nombre: true,
        precio: true,
        imagenUrl: true,
        estado: true,
        imagenes: {
          select: {
            id: true,
            url: true,
            esPrincipal: true,
            orden: true
          },
          orderBy: { orden: 'asc' },
          take: 3
        }
      },
      orderBy: { createdAt: 'desc' },
    })
    
    // Filtrar en JavaScript para evitar problemas con valores NULL
    const productosDisponibles = productos.filter((p: typeof productos[0]) => 
      !p.estado || p.estado === 'disponible'
    )
    
    return NextResponse.json(productosDisponibles, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60'
      }
    })
  } catch (error) {
    console.error('Error al obtener productos públicos:', error)
    return NextResponse.json(
      { error: 'Error al obtener productos' },
      { status: 500 }
    )
  }
}
