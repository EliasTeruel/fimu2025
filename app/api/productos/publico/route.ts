import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/productos/publico - Versión optimizada con paginación
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const categoria = searchParams.get('categoria') || 'fimu' // Default: fimu
    const skip = (page - 1) * limit

    console.log('🔍 [GET /api/productos/publico] Params:', { page, limit, categoria, skip })

    // Filtro base por categoría
    const whereClause = {
      categoria: categoria
    }

    // Obtener todos los productos ordenados por disponibilidad
    const [productosRaw, total] = await Promise.all([
      prisma.producto.findMany({
        where: whereClause,
        select: {
          id: true,
          nombre: true,
          descripcion: true,
          precio: true,
          imagenUrl: true,
          estado: true,
          categoria: true,
          imagenes: {
            select: {
              id: true,
              url: true,
              esPrincipal: true,
              orden: true
            },
            orderBy: { orden: 'asc' },
            take: 3
          },
          createdAt: true
        },
        // Traer TODOS los productos de esta categoría para ordenar correctamente
        orderBy: { createdAt: 'desc' }
      }),
      prisma.producto.count({ where: whereClause })
    ])

    // Ordenar: disponibles primero, luego por fecha
    const productos = productosRaw
      .sort((a, b) => {
        // 1. Disponibles primero
        const estadoA = !a.estado || a.estado === 'disponible' ? 0 : 1
        const estadoB = !b.estado || b.estado === 'disponible' ? 0 : 1
        if (estadoA !== estadoB) return estadoA - estadoB
        
        // 2. Luego por fecha (más recientes primero)
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
      .slice(skip, skip + limit)
      .map(({ createdAt, ...producto }) => producto) // Remover createdAt del resultado
    
    console.log('📊 [GET /api/productos/publico] Total encontrados:', productosRaw.length)
    console.log('📦 [GET /api/productos/publico] Productos paginados:', productos.length)
    console.log('🔢 [GET /api/productos/publico] IDs devueltos:', productos.map(p => p.id))
    
    return NextResponse.json({
      productos: productos, // Devolver TODOS los productos (no filtrar)
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + productos.length < total
      }
    }, {
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
