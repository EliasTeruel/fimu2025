import { withReservationTiming } from '@/lib/reserva-policy'
import { canReadSales, publicProduct, accessResponse, requireAdmin } from '@/lib/api-identity'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/productos - Listar todos los productos
export async function GET() {
  console.log('🔍 [GET /api/productos] Iniciando request...')
  
  try {
    console.log('📊 [GET /api/productos] Conectando a Prisma...')
    
    const salesAccess = await canReadSales()
    const productos = await prisma.producto.findMany({
      include: {
        imagenes: {
          orderBy: { orden: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' },
    })
    
    console.log(`✅ [GET /api/productos] ${productos.length} productos encontrados`)
    
    // Agregar headers de caché para mejorar rendimiento
    return NextResponse.json(salesAccess ? productos.map(withReservationTiming) : productos.map(publicProduct), {
      headers: {
        'Cache-Control': 'private, no-store'
      }
    })
  } catch (error) {
    const denied = accessResponse(error)
    if (denied) return denied
    console.error('❌ [GET /api/productos] Error:', error)
    console.error('❌ [GET /api/productos] Error stack:', error instanceof Error ? error.stack : 'No stack')
    console.error('❌ [GET /api/productos] Error message:', error instanceof Error ? error.message : error)
    
    return NextResponse.json(
      { 
        error: 'Error al obtener productos',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

// POST /api/productos - Crear nuevo producto
export async function POST(request: Request) {
  try {
    await requireAdmin()

    const body = await request.json()
    const { nombre, descripcion, precio, stock, imagenUrl, imagenes, categoria } = body

    // Validaciones
    if (!nombre || precio === undefined) {
      return NextResponse.json(
        { error: 'Nombre y precio son requeridos' },
        { status: 400 }
      )
    }

    const producto = await prisma.producto.create({
      data: {
        nombre,
        descripcion,
        precio: parseFloat(precio),
        stock: parseInt(stock) || 0,
        imagenUrl,
        categoria: categoria || 'fimu',
        imagenes: imagenes?.length ? {
          create: imagenes.map((img: { url: string; esPrincipal: boolean; orden: number }) => ({
            url: img.url,
            esPrincipal: img.esPrincipal || false,
            orden: img.orden || 0
          }))
        } : undefined
      },
      include: {
        imagenes: true
      }
    })

    return NextResponse.json(producto, { status: 201 })
  } catch (error) {
    const denied = accessResponse(error)
    if (denied) return denied
    console.error('Error al crear producto:', error)
    return NextResponse.json(
      { error: 'Error al crear producto' },
      { status: 500 }
    )
  }
}
