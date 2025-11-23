import { User } from '@supabase/supabase-js'
import { prisma } from './prisma'

/**
 * Verifica si un usuario tiene rol de administrador
 * @param user Usuario de Supabase Auth
 * @returns true si el usuario es admin, false en caso contrario
 */
export async function isAdmin(user: User | null): Promise<boolean> {
  if (!user) {
    return false
  }

  try {
    const usuario = await prisma.usuario.findUnique({
      where: { supabaseId: user.id },
      select: { isAdmin: true }
    })

    return usuario?.isAdmin || false
  } catch (error) {
    console.error('❌ Error al verificar rol de admin:', error)
    return false
  }
}

/**
 * Verifica si un usuario existe en la base de datos
 * @param supabaseId ID del usuario en Supabase
 * @returns true si el usuario existe, false en caso contrario
 */
export async function userExists(supabaseId: string): Promise<boolean> {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { supabaseId },
      select: { id: true }
    })

    return !!usuario
  } catch (error) {
    console.error('❌ Error al verificar existencia de usuario:', error)
    return false
  }
}
