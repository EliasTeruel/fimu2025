'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Alert from '../components/Alert'
import Navbar from '../components/Navbar'
import LoadingScreen from '../components/LoadingScreen'
import Spinner from '../components/Spinner'

interface Usuario {
  id: number
  email: string
  nombre: string
  apellido: string
  redSocial: string
  nombreRedSocial: string
  whatsapp: string
  isAdmin: boolean
  createdAt: string
}

export default function PerfilPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [alertConfig, setAlertConfig] = useState<{ show: boolean; message: string; type: 'info' | 'success' | 'error' | 'warning'; title?: string } | null>(null)

  // Form state
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [redSocial, setRedSocial] = useState('instagram')
  const [nombreRedSocial, setNombreRedSocial] = useState('')
  const [whatsapp, setWhatsapp] = useState('')

  useEffect(() => {
    async function cargarPerfil() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      try {
        const res = await fetch(`/api/usuarios?supabaseId=${user.id}`)
        if (res.ok) {
          const data = await res.json()
          setUsuario(data)
          setNombre(data.nombre)
          setApellido(data.apellido)
          setRedSocial(data.redSocial || 'instagram')
          setNombreRedSocial(data.nombreRedSocial || '')
          setWhatsapp(data.whatsapp || '')
        } else {
          setAlertConfig({
            show: true,
            message: 'No se pudo cargar tu perfil.',
            type: 'error',
            title: 'Error'
          })
        }
      } catch (error) {
        console.error('Error al cargar perfil:', error)
        setAlertConfig({
          show: true,
          message: 'Error al cargar tu perfil.',
          type: 'error',
          title: 'Error'
        })
      } finally {
        setLoading(false)
      }
    }

    cargarPerfil()
  }, [router, supabase])

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!nombre.trim() || !apellido.trim()) {
      setAlertConfig({
        show: true,
        message: 'Nombre y apellido son requeridos.',
        type: 'warning',
        title: 'Datos incompletos'
      })
      return
    }

    setGuardando(true)

    try {
      const res = await fetch(`/api/usuarios/${usuario!.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          apellido,
          redSocial,
          nombreRedSocial,
          whatsapp
        })
      })

      if (res.ok) {
        const data = await res.json()
        setUsuario(data)
        setAlertConfig({
          show: true,
          message: 'Perfil actualizado correctamente.',
          type: 'success',
          title: 'Guardado'
        })
      } else {
        const error = await res.json()
        setAlertConfig({
          show: true,
          message: error.error || 'Error al guardar los cambios.',
          type: 'error',
          title: 'Error'
        })
      }
    } catch (error) {
      console.error('Error al guardar perfil:', error)
      setAlertConfig({
        show: true,
        message: 'Error al guardar los cambios.',
        type: 'error',
        title: 'Error'
      })
    } finally {
      setGuardando(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-white" style={{ paddingTop: '100px' }}>
        {/* Alert */}
      {alertConfig?.show && (
        <Alert
          message={alertConfig.message}
          type={alertConfig.type}
          title={alertConfig.title}
          onClose={() => setAlertConfig(null)}
        />
      )}

      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold font-title uppercase tracking-wide text-black">
            Mi Perfil
          </h1>
          <div className="flex gap-4">
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 text-white font-semibold hover:bg-gray-700 transition-colors bg-black font-body uppercase tracking-wide"
            >
              Volver a Inicio
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-white font-semibold hover:bg-gray-700 transition-colors bg-black font-body uppercase tracking-wide"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>

        {/* Información del perfil */}
        <div className="bg-white p-6 mb-6 border-2 border-black">
          <div className="border-b pb-4 mb-4 border-black">
            <h2 className="text-2xl font-semibold font-title uppercase text-black">
              Información de la Cuenta
            </h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 font-body text-black">
                Email
              </label>
              <input
                type="text"
                value={usuario?.email || ''}
                disabled
                className="w-full px-3 py-2 border-2 bg-gray-100 border-black text-black font-body"
              />
              <p className="text-sm mt-1 text-gray-500 font-body">
                El email no se puede modificar
              </p>
            </div>

            

            <div>
              <label className="block text-sm font-medium mb-1 font-body text-black">
                Miembro desde
              </label>
              <input
                type="text"
                value={usuario?.createdAt ? new Date(usuario.createdAt).toLocaleDateString('es-AR') : ''}
                disabled
                className="w-full px-3 py-2 border-2 bg-gray-100 border-black text-black font-body"
              />
            </div>
          </div>
        </div>

        {/* Formulario de edición */}
        <form onSubmit={handleGuardar} className="bg-white p-6 border-2 border-black">
          <div className="border-b pb-4 mb-6 border-black">
            <h2 className="text-2xl font-semibold font-title uppercase text-black">
              Datos Personales
            </h2>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="nombre" className="block text-sm font-medium mb-1 font-body text-black">
                  Nombre *
                </label>
                <input
                  id="nombre"
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-3 py-2 border-2 focus:outline-none focus:ring-2 focus:ring-black border-black text-black font-body"
                />
              </div>

              <div>
                <label htmlFor="apellido" className="block text-sm font-medium mb-1 font-body text-black">
                  Apellido *
                </label>
                <input
                  id="apellido"
                  type="text"
                  required
                  value={apellido}
                  onChange={(e) => setApellido(e.target.value)}
                  className="w-full px-3 py-2 border-2 focus:outline-none focus:ring-2 focus:ring-black border-black text-black font-body"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="redSocial" className="block text-sm font-medium mb-1 font-body text-black">
                  Red Social
                </label>
                <select
                  id="redSocial"
                  value={redSocial}
                  onChange={(e) => setRedSocial(e.target.value)}
                  className="w-full px-3 py-2 border-2 focus:outline-none focus:ring-2 focus:ring-black border-black text-black font-body"
                >
                  <option value="instagram">Instagram</option>
                  <option value="facebook">Facebook</option>
                  <option value="tiktok">TikTok</option>
                  <option value="otro">Otro</option>
                </select>
              </div>

              <div>
                <label htmlFor="nombreRedSocial" className="block text-sm font-medium mb-1 font-body text-black">
                  Usuario
                </label>
                <input
                  id="nombreRedSocial"
                  type="text"
                  value={nombreRedSocial}
                  onChange={(e) => setNombreRedSocial(e.target.value)}
                  className="w-full px-3 py-2 border-2 focus:outline-none focus:ring-2 focus:ring-black border-black text-black font-body"
                  placeholder="@usuario"
                />
              </div>
            </div>

            <div>
              <label htmlFor="whatsapp" className="block text-sm font-medium mb-1 font-body text-black">
                WhatsApp (opcional)
              </label>
              <input
                id="whatsapp"
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="w-full px-3 py-2 border-2 focus:outline-none focus:ring-2 focus:ring-black border-black text-black font-body"
                placeholder="+54 9 11 1234-5678"
              />
            </div>
          </div>

          <div className="flex justify-end gap-4 mt-6">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="px-6 py-2 font-semibold hover:bg-gray-200 transition bg-gray-100 text-black font-body uppercase tracking-wide"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="px-6 py-2 text-white font-semibold hover:bg-gray-700 transition disabled:opacity-50 flex items-center gap-2 bg-black font-body uppercase tracking-wide"
            >
              {guardando && <Spinner size="sm" color="#ffffff" />}
              {guardando ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
      </div>
    </>
  )
}
