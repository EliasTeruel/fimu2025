'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  isAdmin: boolean
  loading: boolean
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Verificar usuario inicial
    async function getUser() {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        setUser(currentUser)
        
        if (currentUser) {
          // Verificar si es admin
          try {
            const res = await fetch(`/api/usuarios?supabaseId=${currentUser.id}`)
            if (res.ok) {
              const usuario = await res.json()
              setIsAdmin(usuario.isAdmin)
            }
          } catch (error) {
            console.error('Error al verificar admin:', error)
          }
        }
      } catch (error) {
        console.error('Error al obtener usuario:', error)
      } finally {
        setLoading(false)
      }
    }

    getUser()

    // Suscribirse a cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        
        if (session?.user) {
          // Verificar si es admin cuando cambia la sesión
          try {
            const res = await fetch(`/api/usuarios?supabaseId=${session.user.id}`)
            if (res.ok) {
              const usuario = await res.json()
              setIsAdmin(usuario.isAdmin)
            }
          } catch (error) {
            console.error('Error al verificar admin:', error)
          }
        } else {
          setIsAdmin(false)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setIsAdmin(false)
  }

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider')
  }
  return context
}
