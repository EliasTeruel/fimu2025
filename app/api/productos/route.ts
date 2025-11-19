import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

// GET /api/productos - Listar todos los productos
export async function GET() {
  try {
    const productos = await prisma.producto.findMany({
      include: {
        imagenes: {
          orderBy: { orden: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' },
    })
    
    // Agregar headers de caché para mejorar rendimiento
    return NextResponse.json(productos, {
      headers: {
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30'
      }
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al obtener productos' },
      { status: 500 }
    )
  }
}

// POST /api/productos - Crear nuevo producto
export async function POST(request: Request) {
  try {
    // Verificar autenticación
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { nombre, descripcion, precio, stock, imagenUrl, imagenes } = body

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
    console.error('Error al crear producto:', error)
    return NextResponse.json(
      { error: 'Error al crear producto' },
      { status: 500 }
    )
  }
}
