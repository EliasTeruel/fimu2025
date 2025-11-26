'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '../components/Navbar'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        // Traducir mensajes de error comunes de Supabase
        let mensajeError = 'Error al iniciar sesión'
        
        if (error.message.includes('Invalid login credentials')) {
          mensajeError = 'Email o contraseña incorrectos. Verifica tus datos o regístrate si no tienes cuenta.'
        } else if (error.message.includes('Email not confirmed')) {
          mensajeError = 'Por favor confirma tu email antes de iniciar sesión. Revisa tu bandeja de entrada.'
        } else if (error.message.includes('User not found')) {
          mensajeError = 'No existe una cuenta con este email. ¿Quieres registrarte?'
        } else if (error.message.includes('Invalid email')) {
          mensajeError = 'El formato del email no es válido.'
        } else if (error.message.includes('Password')) {
          mensajeError = 'La contraseña es incorrecta.'
        } else {
          mensajeError = error.message
        }
        
        throw new Error(mensajeError)
      }

      router.push('/admin')
      router.refresh()
    } catch (error: unknown) {
      const err = error as { message?: string }
      setError(err.message || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: '#D1ECFF', paddingTop: '120px' }}>
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold" style={{ color: '#1F0354' }}>
            Iniciar Sesión
          </h2>
          <p className="mt-2 text-center text-sm" style={{ color: '#5E18EB' }}>
            ¿No tienes cuenta?{' '}
            <Link
              href="/registro"
              className="font-medium hover:opacity-80 transition-opacity"
              style={{ color: '#FF5BC7' }}
            >
              Regístrate aquí
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="rounded-md p-4 border-2" style={{ backgroundColor: '#ffe6e6', borderColor: '#FF6012' }}>
              <div className="text-sm" style={{ color: '#FF6012' }}>{error}</div>
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border-2 placeholder-gray-500 rounded-t-md focus:outline-none focus:ring-2 focus:z-10 sm:text-sm"
                style={{ borderColor: '#FFC3E5', color: '#1F0354' }}
                placeholder="Email"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border-2 placeholder-gray-500 rounded-b-md focus:outline-none focus:ring-2 focus:z-10 sm:text-sm"
                style={{ borderColor: '#FFC3E5', color: '#1F0354' }}
                placeholder="Contraseña"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50"
              style={{ backgroundColor: '#5E18EB' }}
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </div>
        </form>
      </div>
      </div>
    </>
  )
}
