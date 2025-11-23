'use client'

import { useState } from 'react'
import Spinner from './Spinner'

interface ContactoModalProps {
  onClose: () => void
  onSubmit: (datos: ContactoData) => Promise<void>
}

export interface ContactoData {
  nombre: string
  apellido: string
  telefono: string
  redSocial: string
  nombreRedSocial: string
}

export default function ContactoModal({ onClose, onSubmit }: ContactoModalProps) {
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [telefono, setTelefono] = useState('')
  const [redSocial, setRedSocial] = useState('instagram')
  const [nombreRedSocial, setNombreRedSocial] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!nombre.trim() || !apellido.trim()) {
      setError('Nombre y apellido son obligatorios')
      return
    }

    if (!telefono.trim()) {
      setError('El teléfono es obligatorio para contactarte')
      return
    }

    // Validar formato de teléfono (al menos 8 dígitos)
    const telefonoLimpio = telefono.replace(/\D/g, '')
    if (telefonoLimpio.length < 8) {
      setError('El teléfono debe tener al menos 8 dígitos')
      return
    }

    setEnviando(true)
    try {
      await onSubmit({
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        telefono: telefono.trim(),
        redSocial,
        nombreRedSocial: nombreRedSocial.trim()
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold" style={{ color: '#1F0354' }}>
            Datos de Contacto
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        <p className="mb-4 text-sm" style={{ color: '#5E18EB' }}>
          Para confirmar tu reserva, necesitamos tus datos de contacto.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-md border-2" style={{ backgroundColor: '#ffe6e6', borderColor: '#FF6012' }}>
            <p className="text-sm" style={{ color: '#FF6012' }}>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
                className="w-full px-3 py-2 border-2 rounded-md focus:outline-none focus:ring-2"
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
                className="w-full px-3 py-2 border-2 rounded-md focus:outline-none focus:ring-2"
                style={{ borderColor: '#FFC3E5', color: '#1F0354' }}
                placeholder="Tu apellido"
              />
            </div>
          </div>

          <div>
            <label htmlFor="telefono" className="block text-sm font-medium mb-1" style={{ color: '#1F0354' }}>
              Teléfono / WhatsApp *
            </label>
            <input
              id="telefono"
              type="tel"
              required
              maxLength={20}
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="w-full px-3 py-2 border-2 rounded-md focus:outline-none focus:ring-2"
              style={{ borderColor: '#FFC3E5', color: '#1F0354' }}
              placeholder="+54 9 11 1234-5678"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="redSocial" className="block text-sm font-medium mb-1" style={{ color: '#1F0354' }}>
                Red Social
              </label>
              <select
                id="redSocial"
                value={redSocial}
                onChange={(e) => setRedSocial(e.target.value)}
                className="w-full px-3 py-2 border-2 rounded-md focus:outline-none focus:ring-2"
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
                className="w-full px-3 py-2 border-2 rounded-md focus:outline-none focus:ring-2"
                style={{ borderColor: '#FFC3E5', color: '#1F0354' }}
                placeholder="@usuario"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={enviando}
              className="flex-1 px-4 py-2 rounded-md font-semibold hover:opacity-90 transition disabled:opacity-50"
              style={{ backgroundColor: '#FFC3E5', color: '#1F0354' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando}
              className="flex-1 px-4 py-2 rounded-md text-white font-semibold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ backgroundColor: '#FF5BC7' }}
            >
              {enviando && <Spinner />}
              {enviando ? 'Procesando...' : 'Confirmar Reserva'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
