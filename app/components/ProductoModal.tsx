'use client'

import { useState, useEffect } from 'react'
import ReservaClock from './ReservaClock'
import type { ReservationTiming } from '@/lib/reserva-policy'
import Image from 'next/image'
import Spinner from './Spinner'
import Alert from './Alert'
import { getSessionId } from '@/lib/session'
import { createClient } from '@/lib/supabase/client'
import { CloudinaryPresets } from '@/lib/cloudinary-utils'

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
  reservaTiempo?: ReservationTiming | null
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

export default function ProductoModal({ producto: initialProduct, isOpen, onClose }: ProductoModalProps) {
  const [producto, setProducto] = useState(initialProduct)
  useEffect(() => {
    setProducto(initialProduct)
    if (!isOpen) return
    const controller = new AbortController()
    const refresh = () => fetch(`/api/productos/${initialProduct.id}`, { cache: 'no-store', signal: controller.signal }).then(async r => { if (r.ok) setProducto(await r.json()) }).catch(() => {})
    void refresh()
    const timer = setInterval(refresh, 10000)
    return () => { controller.abort(); clearInterval(timer) }
  }, [initialProduct, isOpen])
  const [imagenActual, setImagenActual] = useState(0)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const [agregando, setAgregando] = useState(false)
  const [imagenesCargadas, setImagenesCargadas] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [alertConfig, setAlertConfig] = useState<{ show: boolean; message: string; type: 'info' | 'success' | 'error' | 'warning'; title?: string } | null>(null)
  const [yaEnCarrito, setYaEnCarrito] = useState(false)

  // Distancia mínima para considerar un swipe
  const minSwipeDistance = 50

  // Reset carga de imágenes al cambiar producto
  useEffect(() => {
    setImagenesCargadas(false)
    setImagenActual(0)
    setYaEnCarrito(false) // Reset estado del carrito
  }, [producto.id])

  // Verificar si el producto ya está en el carrito
  useEffect(() => {
    const verificarEnCarrito = async () => {
      try {
        const sessionId = await getSessionId()
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        let url = `/api/carrito?sessionId=${sessionId}`
        
        if (user) {
          const resUsuario = await fetch(`/api/usuarios?supabaseId=${user.id}`)
          if (resUsuario.ok) {
            const usuario = await resUsuario.json()
            if (usuario?.id) {
              url = `/api/carrito?usuarioId=${usuario.id}`
            }
          }
        }
        
        const response = await fetch(url)
        if (response.ok) {
          const carrito = await response.json()
          const estaEnCarrito = Array.isArray(carrito) && carrito.some(item => item.productoId === producto.id)
          setYaEnCarrito(estaEnCarrito)
        }
      } catch (error) {
        console.error('Error verificando carrito:', error)
      }
    }
    
    if (isOpen) {
      verificarEnCarrito()
    }
  }, [isOpen, producto.id])

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
      const sessionId = await getSessionId()
      
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

      const body: {
        productoId: number;
        cantidad: number;
        sessionId?: string;
        usuarioId?: number;
      } = {
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
        
        // Si el producto ya está en el carrito, actualizar el estado
        if (error.yaEnCarrito) {
          setYaEnCarrito(true)
          setAlertConfig({ show: true, message: 'Este producto ya está en tu carrito', type: 'info' })
        } else {
          setAlertConfig({ show: true, message: error.error || 'Error al agregar al carrito', type: 'error' })
        }
        return
      }

      setYaEnCarrito(true) // Actualizar estado después de agregar
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
    <>
      {/* Modal principal */}
      {!fullscreen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}
          onClick={onClose}
        >
          <div
            className="bg-white max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
        {/* Header */}
        <div className="sticky top-0 z-10 flex justify-between items-center p-4 border-b-4 border-black bg-white">
          <h2 className="text-xl font-bold font-title uppercase tracking-wide text-black">{producto.nombre}</h2>
          <button
            onClick={onClose}
            className="text-3xl font-bold hover:opacity-60 transition-opacity text-black"
          >
            ×
          </button>
        </div>

        {/* Carrusel de Imágenes */}
        {imagenes.length > 0 && (
          <div 
            className="relative bg-gray-50" 
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            {!imagenesCargadas && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <Spinner size="lg" color="#000000" />
              </div>
            )}
            <div 
              className="relative h-80 w-full cursor-zoom-in" 
              onClick={() => setFullscreen(true)}
              title="Click para ver en pantalla completa"
            >
              <Image
                src={CloudinaryPresets.productModal(imagenes[imagenActual].url)}
                alt={producto.nombre}
                fill
                className="object-contain p-4"
                sizes="(max-width: 768px) 100vw, 50vw"
                loading="lazy"
                onLoadingComplete={() => setImagenesCargadas(true)}
                unoptimized
              />
            </div>

            {/* Controles del carrusel */}
            {imagenes.length > 1 && (
              <>
                <button
                  onClick={anteriorImagen}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center font-bold text-xl hover:bg-gray-700 transition-colors bg-black text-white"
                >
                  ‹
                </button>
                <button
                  onClick={siguienteImagen}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center font-bold text-xl hover:bg-gray-700 transition-colors bg-black text-white"
                >
                  ›
                </button>

                {/* Indicadores */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {imagenes.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setImagenActual(index)}
                      className="h-2 transition-all"
                      style={{
                        backgroundColor: index === imagenActual ? '#000000' : '#CCCCCC',
                        width: index === imagenActual ? '24px' : '8px'
                      }}
                      aria-label={`Ir a imagen ${index + 1}`}
                    />
                  ))}
                </div>
                
                {/* Contador de imágenes */}
                <div className="absolute top-4 right-4 px-3 py-1 font-semibold text-sm font-body bg-black text-white">
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
              className="p-4 text-center border-2"
              style={{ 
                backgroundColor: producto.estado === 'reservado' ? '#F5F5F5' : '#F5F5F5',
                borderColor: producto.estado === 'reservado' ? '#666666' : '#000000'
              }}
            >
              {producto.estado === 'reservado' && (
                <div>
                  <div className="text-xl font-bold mb-2 font-title uppercase" style={{ color: '#5E18EB' }}>
                    ⏱️ Producto Reservado
                  </div>
                  {producto.estado === 'reservado' && (
                    <div className="text-lg font-semibold mb-2 font-body text-gray-700">
                      <ReservaClock timing={producto.reservaTiempo} />
                    </div>
                  )}
                  <p className="text-sm font-body text-gray-600">
                    Este producto está reservado por otro comprador.
                  </p>
                  <p className="text-sm font-semibold mt-2 font-body text-black">
                    Si no se confirma la venta en el tiempo indicado, el producto volverá a estar disponible automáticamente.
                  </p>
                </div>
              )}
              {producto.estado === 'vendido' && (
                <div>
                  <div className="text-xl font-bold mb-2 font-title uppercase text-black">
                    ✅ Producto Vendido
                  </div>
                  <p className="text-sm font-body text-gray-600">
                    Este producto ya ha sido vendido y no está disponible.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Descripción */}
          {producto.descripcion && (
            <div>
              <p className="font-body text-gray-700 whitespace-pre-line">{producto.descripcion}</p>
            </div>
          )}
          {/* Precio */}
          <div className="flex justify-between items-center">
            <span className="text-3xl font-body font-title text-black">
              ${producto.precio.toFixed(2)}
            </span>
          </div>


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
            disabled={agregando || producto.estado !== 'disponible' || yaEnCarrito}
            className="w-full py-3 font-bold text-white text-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-title uppercase tracking-wide bg-black"
          >
            {agregando ? (
              <>
                <Spinner size="sm" color="#ffffff" />
                <span>Agregando...</span>
              </>
            ) : 
             yaEnCarrito ? '✓ Ya en tu Carrito' :
             producto.estado === 'reservado' ? '⏱️ Producto Reservado' :
             producto.estado === 'vendido' ? '✅ Ya Vendido' :
             '🛒 Agregar al Carrito'}
          </button>
        </div>
          </div>
        </div>
      )}

      {/* Modal de pantalla completa */}
      {fullscreen && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black"
          onClick={() => setFullscreen(false)}
        >
          {/* Botón cerrar */}
          <button
            onClick={() => setFullscreen(false)}
            className="absolute top-4 right-4 z-10 w-12 h-12 flex items-center justify-center text-3xl font-bold hover:bg-gray-700 transition-colors bg-black text-white"
          >
            ×
          </button>

          {/* Contador de imágenes */}
          {imagenes.length > 1 && (
            <div className="absolute top-4 left-4 z-10 px-4 py-2 font-semibold text-lg font-body bg-white text-black">
              {imagenActual + 1} / {imagenes.length}
            </div>
          )}

          {/* Imagen en pantalla completa */}
          <div 
            className="relative w-full h-full"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <Image
              src={imagenes[imagenActual].url}
              alt={producto.nombre}
              fill
              className="object-contain"
              sizes="100vw"
              quality={100}
              unoptimized
            />
          </div>

          {/* Controles de navegación */}
          {imagenes.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  anteriorImagen()
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-14 h-14 flex items-center justify-center font-bold text-3xl hover:bg-gray-700 transition-colors z-10 bg-black text-white"
              >
                ‹
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  siguienteImagen()
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-14 h-14 flex items-center justify-center font-bold text-3xl hover:bg-gray-700 transition-colors z-10 bg-black text-white"
              >
                ›
              </button>

              {/* Indicadores */}
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                {imagenes.map((_, index) => (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation()
                      setImagenActual(index)
                    }}
                    className="h-3 transition-all"
                    style={{
                      backgroundColor: index === imagenActual ? '#FFFFFF' : '#666666',
                      width: index === imagenActual ? '32px' : '12px'
                    }}
                    aria-label={`Ir a imagen ${index + 1}`}
                  />
                ))}
              </div>
            </>
          )}

          {/* Hint de cerrar */}
          <div className="absolute bottom-4 right-4 px-4 py-2 text-sm font-medium z-10 font-body bg-white text-black">
            Click para cerrar
          </div>
        </div>
      )}

      {alertConfig?.show && (
        <Alert
          title={alertConfig.title}
          message={alertConfig.message}
          type={alertConfig.type}
          onClose={() => setAlertConfig(null)}
        />
      )}
    </>
  )
}
