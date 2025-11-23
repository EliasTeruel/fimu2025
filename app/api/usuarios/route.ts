import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, supabaseId, nombre, apellido, redSocial, nombreRedSocial, whatsapp } = body

    // Validar campos requeridos
    if (!email || !supabaseId || !nombre || !apellido) {
      return NextResponse.json(
        { error: 'Email, supabaseId, nombre y apellido son requeridos' },
        { status: 400 }
      )
    }

    // Verificar si el usuario ya existe
    const existingUser = await prisma.usuario.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'El usuario ya existe' },
        { status: 409 }
      )
    }

    // Crear usuario
    const usuario = await prisma.usuario.create({
      data: {
        email,
        supabaseId,
        nombre,
        apellido,
        redSocial: redSocial || 'instagram',
        nombreRedSocial: nombreRedSocial || '',
        whatsapp: whatsapp || '',
        isAdmin: false
      }
    })

    return NextResponse.json(usuario, { status: 201 })
  } catch (error) {
    console.error('❌ Error al crear usuario:', error)
    return NextResponse.json(
      { error: 'Error al crear usuario', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const supabaseId = searchParams.get('supabaseId')

    if (!supabaseId) {
      return NextResponse.json(
        { error: 'supabaseId es requerido' },
        { status: 400 }
      )
    }

    const usuario = await prisma.usuario.findUnique({
      where: { supabaseId }
    })

    if (!usuario) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(usuario)
  } catch (error) {
    console.error('❌ Error al obtener usuario:', error)
    return NextResponse.json(
      { error: 'Error al obtener usuario', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
