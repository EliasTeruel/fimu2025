import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

// GET /api/configuracion/categorias - Obtener configuración de categorías
export async function GET() {
  try {
    const categorias = await prisma.configuracionCategoria.findMany({
      orderBy: { orden: 'asc' }
    })
    
    return NextResponse.json(categorias)
  } catch (error) {
    console.error('Error al obtener configuración de categorías:', error)
    return NextResponse.json(
      { error: 'Error al obtener configuración' },
      { status: 500 }
    )
  }
}

// PUT /api/configuracion/categorias - Actualizar visibilidad de categoría
export async function PUT(request: Request) {
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
    const { categoria, visible } = body

    if (!categoria || visible === undefined) {
      return NextResponse.json(
        { error: 'Categoría y visible son requeridos' },
        { status: 400 }
      )
    }

    const config = await prisma.configuracionCategoria.update({
      where: { categoria },
      data: { visible }
    })

    return NextResponse.json(config)
  } catch (error) {
    console.error('Error al actualizar configuración:', error)
    return NextResponse.json(
      { error: 'Error al actualizar configuración' },
      { status: 500 }
    )
  }
}
