'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Spinner from './Spinner'
import Alert from './Alert'
import { getSessionId } from '@/lib/session'
import { createClient } from '@/lib/supabase/client'

interface ProductoImagen {
  id: number
  url: string
  esPrincipal: boolean
  orden: number
}

interface Producto {
  id: number
  nombre: string
  descripcion: string | null
  precio: number
  stock: number
  imagenUrl: string | null
  imagenes?: ProductoImagen[]
  estado?: string
  reservadoEn?: Date | null
  compradorInfo?: string | null
  reservaPausada?: boolean
  pausadoEn?: Date | null
}

interface ProductoModalProps {
  producto: Producto
  isOpen: boolean
  onClose: () => void
}

export default function ProductoModal({ producto, isOpen, onClose }: ProductoModalProps) {
  const [imagenActual, setImagenActual] = useState(0)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const [agregando, setAgregando] = useState(false)
  const [imagenesCargadas, setImagenesCargadas] = useState(false)
  const [tiempoRestante, setTiempoRestante] = useState<string>('')
  const [alertConfig, setAlertConfig] = useState<{ show: boolean; message: string; type: 'info' | 'success' | 'error' | 'warning'; title?: string } | null>(null)

  // Distancia mínima para considerar un swipe
  const minSwipeDistance = 50

  // Calcular tiempo restante para productos reservados
  useEffect(() => {
    if (producto.estado === 'reservado' && producto.reservadoEn) {
      const calcularTiempo = () => {
        // Si está pausado, mostrar mensaje y NO actualizar
        if (producto.reservaPausada) {
          setTiempoRestante('⏸️ PAUSADO POR ADMIN')
          return
        }

        const ahora = new Date()
        const reserva = new Date(producto.reservadoEn!)
        const horaReserva = reserva.getHours()
        
        // Calcular expiración con lógica inteligente (30 min, 10:00-23:00)
        let expira = new Date(reserva)
        
        // Caso especial: 22:XX → 30 minutos normales
        if (horaReserva === 22) {
          expira = new Date(reserva.getTime() + 30 * 60 * 1000)
        }
        // Madrugada/noche (23:00 - 10:00) → Empieza a contar desde las 10:00
        else if (horaReserva >= 23 || horaReserva < 10) {
          if (horaReserva >= 23) {
            expira.setDate(expira.getDate() + 1)
          }
          expira.setHours(10, 30, 0, 0)
        }
        // Horario normal (10:00 - 21:59) → 30 minutos
        else {
          expira = new Date(reserva.getTime() + 30 * 60 * 1000)
        }
        
        const diferencia = expira.getTime() - ahora.getTime()
        
        if (diferencia <= 0) {
          setTiempoRestante('⏰ Reserva expirada')
          return
        }
        
        const horas = Math.floor(diferencia / (1000 * 60 * 60))
        const minutos = Math.floor((diferencia % (1000 * 60 * 60)) / (1000 * 60))
        const segundos = Math.floor((diferencia % (1000 * 60)) / 1000)
        
        if (horas > 0) {
          setTiempoRestante(`⏱️ ${horas}h ${minutos}m ${segundos}s restantes`)
        } else {
          setTiempoRestante(`⏱️ ${minutos}m ${segundos}s restantes`)
        }
      }
      
      calcularTiempo()
      const interval = setInterval(calcularTiempo, 1000)
      return () => clearInterval(interval)
    }
  }, [producto.estado, producto.reservadoEn, producto.reservaPausada])

  // Reset carga de imágenes al cambiar producto
  useEffect(() => {
    setImagenesCargadas(false)
    setImagenActual(0)
  }, [producto.id])

  if (!isOpen) return null

  // Obtener imágenes ordenadas o usar imagenUrl como fallback
  const imagenes = producto.imagenes && producto.imagenes.length > 0
    ? producto.imagenes.sort((a, b) => a.orden - b.orden)
    : producto.imagenUrl
    ? [{ id: 0, url: producto.imagenUrl, esPrincipal: true, orden: 0 }]
    : []

  console.log('Modal - Producto:', producto)
  console.log('Modal - Imágenes procesadas:', imagenes)
  console.log('Modal - Total de imágenes:', imagenes.length)

  const handleAgregarCarrito = async () => {
    // Verificar estado del producto
    if (producto.estado === 'reservado') {
      setAlertConfig({ show: true, message: 'Este producto está reservado por otro comprador', type: 'warning' })
      return
    }

    if (producto.estado === 'vendido') {
      setAlertConfig({ show: true, message: 'Este producto ya fue vendido', type: 'error' })
      return
    }

    setAgregando(true)

    try {
      const sessionId = getSessionId()
      
      // Verificar si el usuario está logueado
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      let usuarioId = null
      if (user) {
        // Buscar el usuario en la base de datos por supabaseId
        const responseUsuario = await fetch(`/api/usuarios?supabaseId=${user.id}`)
        if (responseUsuario.ok) {
          const dataUsuario = await responseUsuario.json()
          if (dataUsuario) {
            usuarioId = dataUsuario.id
          }
        }
      }

      const body: any = {
        productoId: producto.id,
        cantidad: 1, // Siempre 1 unidad
        sessionId: sessionId || undefined // Evitar enviar string vacío
      }
      
      if (usuarioId) {
        body.usuarioId = usuarioId
      }

      console.log('📦 Agregando al carrito:', body) // Debug

      const response = await fetch('/api/carrito', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('❌ Error del servidor:', error) // Debug
        setAlertConfig({ show: true, message: error.error || 'Error al agregar al carrito', type: 'error' })
        return
      }

      setAlertConfig({ show: true, message: `✅ ${producto.nombre} agregado al carrito`, type: 'success' })
      onClose()
    } catch (error) {
      console.error('Error al agregar al carrito:', error)
      setAlertConfig({ show: true, message: 'Error al agregar al carrito', type: 'error' })
    } finally {
      setAgregando(false)
    }
  }

  const siguienteImagen = () => {
    setImagenActual((prev) => (prev + 1) % imagenes.length)
  }

  const anteriorImagen = () => {
    setImagenActual((prev) => (prev - 1 + imagenes.length) % imagenes.length)
  }

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe) {
      siguienteImagen()
    }
    if (isRightSwipe) {
      anteriorImagen()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex justify-between items-center p-4 border-b-2" style={{ backgroundColor: '#1F0354', borderColor: '#FFC3E5' }}>
          <h2 className="text-xl font-bold" style={{ color: '#D1ECFF' }}>{producto.nombre}</h2>
          <button
            onClick={onClose}
            className="text-2xl font-bold hover:opacity-80 transition-opacity"
            style={{ color: '#FF5BC7' }}
          >
            ×
          </button>
        </div>

        {/* Carrusel de Imágenes */}
        {imagenes.length > 0 && (
          <div 
            className="relative" 
            style={{ backgroundColor: '#D1ECFF' }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            {!imagenesCargadas && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <Spinner size="lg" color="#5E18EB" />
              </div>
            )}
            <div className="relative h-80 w-full">
              <Image
                src={imagenes[imagenActual].url}
                alt={producto.nombre}
                fill
                className="object-contain p-4"
                sizes="(max-width: 768px) 100vw, 50vw"
                onLoadingComplete={() => setImagenesCargadas(true)}
              />
            </div>

            {/* Controles del carrusel */}
            {imagenes.length > 1 && (
              <>
                <button
                  onClick={anteriorImagen}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center font-bold text-xl hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: '#5E18EB', color: 'white' }}
                >
                  ‹
                </button>
                <button
                  onClick={siguienteImagen}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center font-bold text-xl hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: '#5E18EB', color: 'white' }}
                >
                  ›
                </button>

                {/* Indicadores */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {imagenes.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setImagenActual(index)}
                      className="w-2 h-2 rounded-full transition-all"
                      style={{
                        backgroundColor: index === imagenActual ? '#FF5BC7' : '#FFC3E5',
                        width: index === imagenActual ? '24px' : '8px'
                      }}
                      aria-label={`Ir a imagen ${index + 1}`}
                    />
                  ))}
                </div>
                
                {/* Contador de imágenes */}
                <div className="absolute top-4 right-4 px-3 py-1 rounded-full font-semibold text-sm" style={{ backgroundColor: 'rgba(31, 3, 84, 0.8)', color: '#D1ECFF' }}>
                  {imagenActual + 1} / {imagenes.length}
                </div>
              </>
            )}
          </div>
        )}

        {/* Contenido */}
        <div className="p-6 space-y-4">
          {/* Estado del Producto */}
          {producto.estado && producto.estado !== 'disponible' && (
            <div 
              className="p-4 rounded-lg text-center"
              style={{ 
                backgroundColor: producto.estado === 'reservado' ? '#FFF4E6' : '#E6FFE6',
                border: `2px solid ${producto.estado === 'reservado' ? '#FF6012' : '#00A86B'}`
              }}
            >
              {producto.estado === 'reservado' && (
                <div>
                  <div className="text-xl font-bold mb-2" style={{ color: '#FF6012' }}>
                    ⏱️ Producto Reservado
                  </div>
                  {tiempoRestante && (
                    <div className="text-lg font-semibold mb-2" style={{ color: '#FF6012' }}>
                      {tiempoRestante}
                    </div>
                  )}
                  <p className="text-sm" style={{ color: '#1F0354' }}>
                    Este producto está reservado por otro comprador.
                  </p>
                  <p className="text-sm font-semibold mt-2" style={{ color: '#FF6012' }}>
                    Si no se confirma la venta en el tiempo indicado, el producto volverá a estar disponible automáticamente.
                  </p>
                </div>
              )}
              {producto.estado === 'vendido' && (
                <div>
                  <div className="text-xl font-bold mb-2" style={{ color: '#00A86B' }}>
                    ✅ Producto Vendido
                  </div>
                  <p className="text-sm" style={{ color: '#1F0354' }}>
                    Este producto ya ha sido vendido y no está disponible.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Precio */}
          <div className="flex justify-between items-center">
            <span className="text-3xl font-bold" style={{ color: '#5E18EB' }}>
              ${producto.precio.toFixed(2)}
            </span>
          </div>

          {/* Descripción */}
          {producto.descripcion && (
            <div>
              <h3 className="font-semibold mb-2" style={{ color: '#1F0354' }}>Descripción</h3>
              <p style={{ color: '#5E18EB' }}>{producto.descripcion}</p>
            </div>
          )}

          {/* Selector de Cantidad - Comentado: Solo 1 unidad por producto */}
          {/* {producto.stock > 0 && (
            <div>
              <h3 className="font-semibold mb-2" style={{ color: '#1F0354' }}>Cantidad</h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCantidad(Math.max(1, cantidad - 1))}
                  className="w-10 h-10 rounded-md font-bold text-white hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: '#5E18EB' }}
                >
                  -
                </button>
                <span className="text-xl font-semibold w-12 text-center" style={{ color: '#1F0354' }}>
                  {cantidad}
                </span>
                <button
                  onClick={() => setCantidad(Math.min(producto.stock, cantidad + 1))}
                  className="w-10 h-10 rounded-md font-bold text-white hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: '#5E18EB' }}
                >
                  +
                </button>
              </div>
            </div>
          )} */}

          {/* Botón Agregar al Carrito */}
          <button
            onClick={handleAgregarCarrito}
            disabled={agregando || producto.estado !== 'disponible'}
            className="w-full py-3 rounded-lg font-bold text-white text-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ backgroundColor: '#FF5BC7' }}
          >
            {agregando ? (
              <>
                <Spinner size="sm" color="#ffffff" />
                <span>Agregando...</span>
              </>
            ) : 
             producto.estado === 'reservado' ? '⏱️ Producto Reservado' :
             producto.estado === 'vendido' ? '✅ Ya Vendido' :
             '🛒 Agregar al Carrito'}
          </button>
        </div>
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
