import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = parseInt(id)
    
    if (isNaN(userId)) {
      return NextResponse.json(
        { error: 'ID de usuario inválido' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { nombre, apellido, redSocial, nombreRedSocial, whatsapp } = body

    // Validar campos requeridos
    if (!nombre || !apellido) {
      return NextResponse.json(
        { error: 'Nombre y apellido son requeridos' },
        { status: 400 }
      )
    }

    // Verificar que el usuario existe
    const usuarioExistente = await prisma.usuario.findUnique({
      where: { id: userId }
    })

    if (!usuarioExistente) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // Actualizar usuario (no permitir cambiar email, supabaseId ni isAdmin)
    const usuarioActualizado = await prisma.usuario.update({
      where: { id: userId },
      data: {
        nombre,
        apellido,
        redSocial: redSocial || 'instagram',
        nombreRedSocial: nombreRedSocial || '',
        whatsapp: whatsapp || ''
      }
    })

    return NextResponse.json(usuarioActualizado)
  } catch (error) {
    console.error('❌ Error al actualizar usuario:', error)
    return NextResponse.json(
      { error: 'Error al actualizar usuario', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = parseInt(id)
    
    if (isNaN(userId)) {
      return NextResponse.json(
        { error: 'ID de usuario inválido' },
        { status: 400 }
      )
    }

    // Verificar que el usuario existe
    const usuarioExistente = await prisma.usuario.findUnique({
      where: { id: userId }
    })

    if (!usuarioExistente) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // Eliminar usuario
    await prisma.usuario.delete({
      where: { id: userId }
    })

    return NextResponse.json({ message: 'Usuario eliminado correctamente' })
  } catch (error) {
    console.error('❌ Error al eliminar usuario:', error)
    return NextResponse.json(
      { error: 'Error al eliminar usuario', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
