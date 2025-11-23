'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Alert from '../components/Alert'

export default function RegistroPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [redSocial, setRedSocial] = useState('instagram')
  const [nombreRedSocial, setNombreRedSocial] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [alertConfig, setAlertConfig] = useState<{ show: boolean; message: string; type: 'info' | 'success' | 'error' | 'warning'; title?: string } | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validaciones del lado del cliente
    if (!nombre.trim()) {
      setError('El nombre es obligatorio')
      return
    }

    if (!apellido.trim()) {
      setError('El apellido es obligatorio')
      return
    }

    if (!email.trim()) {
      setError('El email es obligatorio')
      return
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Por favor ingresa un email válido (ejemplo: usuario@email.com)')
      return
    }

    if (!password) {
      setError('La contraseña es obligatoria')
      return
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)

    try {
      // 1. Registrar en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (authError) {
        // Traducir mensajes de error comunes de Supabase
        let mensajeError = 'Error al crear la cuenta'
        
        if (authError.message.includes('User already registered')) {
          mensajeError = 'Ya existe una cuenta con este email. ¿Quieres iniciar sesión?'
        } else if (authError.message.includes('Password should be at least')) {
          mensajeError = 'La contraseña debe tener al menos 6 caracteres.'
        } else if (authError.message.includes('Invalid email')) {
          mensajeError = 'El formato del email no es válido.'
        } else if (authError.message.includes('Signup requires a valid password')) {
          mensajeError = 'Debes ingresar una contraseña válida.'
        } else if (authError.message.includes('email')) {
          mensajeError = 'Hay un problema con el email ingresado.'
        } else {
          mensajeError = authError.message
        }
        
        throw new Error(mensajeError)
      }

      // 2. Crear usuario en nuestra tabla
      const response = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          supabaseId: authData.user?.id,
          nombre,
          apellido,
          redSocial,
          nombreRedSocial: nombreRedSocial || null,
          whatsapp: whatsapp || null,
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        let mensajeError = 'Error al crear el perfil de usuario'
        
        if (errorData.error.includes('ya existe')) {
          mensajeError = 'Ya existe un perfil con este email.'
        } else if (errorData.error.includes('requeridos')) {
          mensajeError = 'Todos los campos obligatorios deben estar completos.'
        } else {
          mensajeError = errorData.error
        }
        
        throw new Error(mensajeError)
      }

      setAlertConfig({ 
        show: true, 
        title: '¡Cuenta creada exitosamente!',
        message: 'Por favor revisa tu email para confirmar tu cuenta. Luego podrás iniciar sesión.', 
        type: 'success' 
      })
      
      // Esperar un momento antes de redirigir
      setTimeout(() => {
        router.push('/login')
      }, 3000)
    } catch (error: unknown) {
      const err = error as { message?: string }
      setError(err.message || 'Error al crear la cuenta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: '#D1ECFF' }}>
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold" style={{ color: '#1F0354' }}>
            Crear Cuenta
          </h2>
          <p className="mt-2 text-center text-sm" style={{ color: '#5E18EB' }}>
            ¿Ya tienes cuenta?{' '}
            <Link
              href="/login"
              className="font-medium hover:opacity-80 transition-opacity"
              style={{ color: '#FF5BC7' }}
            >
              Inicia Sesión
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleRegister}>
          {error && (
            <div className="rounded-md p-4 border-2" style={{ backgroundColor: '#ffe6e6', borderColor: '#FF6012' }}>
              <div className="text-sm" style={{ color: '#FF6012' }}>{error}</div>
            </div>
          )}
          <div className="rounded-md shadow-sm space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="nombre" className="block text-sm font-medium mb-1" style={{ color: '#1F0354' }}>
                  Nombre *
                </label>
                <input
                  id="nombre"
                  type="text"
                  required
                  minLength={2}
                  maxLength={50}
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="appearance-none relative block w-full px-3 py-2 border-2 placeholder-gray-500 rounded-md focus:outline-none focus:ring-2 focus:z-10 sm:text-sm"
                  style={{ borderColor: '#FFC3E5', color: '#1F0354' }}
                  placeholder="Tu nombre"
                />
              </div>
              <div>
                <label htmlFor="apellido" className="block text-sm font-medium mb-1" style={{ color: '#1F0354' }}>
                  Apellido *
                </label>
                <input
                  id="apellido"
                  type="text"
                  required
                  minLength={2}
                  maxLength={50}
                  value={apellido}
                  onChange={(e) => setApellido(e.target.value)}
                  className="appearance-none relative block w-full px-3 py-2 border-2 placeholder-gray-500 rounded-md focus:outline-none focus:ring-2 focus:z-10 sm:text-sm"
                  style={{ borderColor: '#FFC3E5', color: '#1F0354' }}
                  placeholder="Tu apellido"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1" style={{ color: '#1F0354' }}>
                Email *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none relative block w-full px-3 py-2 border-2 placeholder-gray-500 rounded-md focus:outline-none focus:ring-2 focus:z-10 sm:text-sm"
                style={{ borderColor: '#FFC3E5', color: '#1F0354' }}
                placeholder="tu@email.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="redSocial" className="block text-sm font-medium mb-1" style={{ color: '#1F0354' }}>
                  Red Social (opcional)
                </label>
                <select
                  id="redSocial"
                  value={redSocial}
                  onChange={(e) => setRedSocial(e.target.value)}
                  className="appearance-none relative block w-full px-3 py-2 border-2 rounded-md focus:outline-none focus:ring-2 focus:z-10 sm:text-sm"
                  style={{ borderColor: '#FFC3E5', color: '#1F0354' }}
                >
                  <option value="instagram">Instagram</option>
                  <option value="facebook">Facebook</option>
                  <option value="tiktok">TikTok</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div>
                <label htmlFor="nombreRedSocial" className="block text-sm font-medium mb-1" style={{ color: '#1F0354' }}>
                  Usuario (opcional)
                </label>
                <input
                  id="nombreRedSocial"
                  type="text"
                  maxLength={50}
                  value={nombreRedSocial}
                  onChange={(e) => setNombreRedSocial(e.target.value)}
                  className="appearance-none relative block w-full px-3 py-2 border-2 placeholder-gray-500 rounded-md focus:outline-none focus:ring-2 focus:z-10 sm:text-sm"
                  style={{ borderColor: '#FFC3E5', color: '#1F0354' }}
                  placeholder="@usuario"
                />
              </div>
            </div>

            <div>
              <label htmlFor="whatsapp" className="block text-sm font-medium mb-1" style={{ color: '#1F0354' }}>
                WhatsApp (opcional)
              </label>
              <input
                id="whatsapp"
                type="tel"
                maxLength={20}
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="appearance-none relative block w-full px-3 py-2 border-2 placeholder-gray-500 rounded-md focus:outline-none focus:ring-2 focus:z-10 sm:text-sm"
                style={{ borderColor: '#FFC3E5', color: '#1F0354' }}
                placeholder="+54 9 11 1234-5678"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1" style={{ color: '#1F0354' }}>
                Contraseña *
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none relative block w-full px-3 py-2 border-2 placeholder-gray-500 rounded-md focus:outline-none focus:ring-2 focus:z-10 sm:text-sm"
                style={{ borderColor: '#FFC3E5', color: '#1F0354' }}
                placeholder="Contraseña (mínimo 6 caracteres)"
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium mb-1" style={{ color: '#1F0354' }}>
                Confirmar Contraseña *
              </label>
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="appearance-none relative block w-full px-3 py-2 border-2 placeholder-gray-500 rounded-md focus:outline-none focus:ring-2 focus:z-10 sm:text-sm"
                style={{ borderColor: '#FFC3E5', color: '#1F0354' }}
                placeholder="Confirmar contraseña"
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
              {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
            </button>
          </div>
        </form>
      </div>

      {alertConfig?.show && (
        <Alert
          title={alertConfig.title}
          message={alertConfig.message}
          type={alertConfig.type}
          onClose={() => setAlertConfig(null)}
        />
      )}
    </div>
  )
}
