'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Spinner from '../components/Spinner'
import Alert from '../components/Alert'
import Confirm from '../components/Confirm'
import { getSessionId } from '@/lib/session'

interface ProductoImagen {
  id: number
  url: string
  esPrincipal: boolean
  orden: number
}

interface Producto {
  id: number
  nombre: string
  precio: number
  stock: number
  imagenUrl?: string
  imagenes: ProductoImagen[]
  estado?: string
  reservadoEn?: Date | null
}

interface CarritoItem {
  id: number
  productoId: number
  cantidad: number
  producto: Producto
}

export default function CarritoPage() {
  const [items, setItems] = useState<CarritoItem[]>([])
  const [cargando, setCargando] = useState(true)
  const [procesandoPago, setProcesandoPago] = useState(false)
  const [vaciandoCarrito, setVaciandoCarrito] = useState(false)
  const [eliminandoItem, setEliminandoItem] = useState<number | null>(null)
  const [tiemposRestantes, setTiemposRestantes] = useState<Record<number, string>>({})
  const [sessionId, setSessionId] = useState<string>('')
  const [alertConfig, setAlertConfig] = useState<{ show: boolean; message: string; type: 'info' | 'success' | 'error' | 'warning'; title?: string } | null>(null)
  const [confirmConfig, setConfirmConfig] = useState<{ show: boolean; message: string; onConfirm: () => void; title?: string } | null>(null)

  // Inicializar sessionId
  useEffect(() => {
    const id = getSessionId()
    setSessionId(id)
  }, [])

  // Calcular tiempo restante para productos reservados
  useEffect(() => {
    const calcularTiempos = () => {
      const nuevos: Record<number, string> = {}
      items.forEach(item => {
        if (item.producto.estado === 'reservado' && item.producto.reservadoEn) {
          const ahora = new Date()
          const reserva = new Date(item.producto.reservadoEn)
          const expira = new Date(reserva.getTime() + 3 * 60 * 60 * 1000) // 3 horas
          const diferencia = expira.getTime() - ahora.getTime()
          
          if (diferencia <= 0) {
            nuevos[item.producto.id] = '⏰ Expirado'
          } else {
            const horas = Math.floor(diferencia / (1000 * 60 * 60))
            const minutos = Math.floor((diferencia % (1000 * 60 * 60)) / (1000 * 60))
            const segundos = Math.floor((diferencia % (1000 * 60)) / 1000)
            nuevos[item.producto.id] = `⏱️ ${horas}h ${minutos}m ${segundos}s`
          }
        }
      })
      setTiemposRestantes(nuevos)
    }
    
    calcularTiempos()
    const interval = setInterval(calcularTiempos, 1000)
    return () => clearInterval(interval)
  }, [items])

  useEffect(() => {
    if (sessionId) {
      cargarCarrito()
    }
  }, [sessionId])

  const cargarCarrito = async () => {
    if (!sessionId) return
    
    try {
      const response = await fetch(`/api/carrito?sessionId=${sessionId}`)
      const data = await response.json()
      // Si hay un error en el API, data será un objeto con error, no un array
      if (Array.isArray(data)) {
        setItems(data)
      } else {
        console.error('Error del API:', data)
        setItems([])
      }
    } catch (error) {
      console.error('Error al cargar carrito:', error)
      setItems([])
    } finally {
      setCargando(false)
    }
  }

  const obtenerImagenPrincipal = (producto: Producto): string => {
    const imagenPrincipal = producto.imagenes?.find(img => img.esPrincipal)
    if (imagenPrincipal) return imagenPrincipal.url
    if (producto.imagenes?.length > 0) return producto.imagenes[0].url
    return producto.imagenUrl || '/placeholder.jpg'
  }

  // Comentado: No se necesita actualizar cantidad - solo 1 unidad
  /*
  const actualizarCantidad = async (itemId: number, nuevaCantidad: number) => {
    if (nuevaCantidad < 1) return

    try {
      const response = await fetch(`/api/carrito/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cantidad: nuevaCantidad })
      })

      if (!response.ok) {
        const error = await response.json()
        alert(error.error || 'Error al actualizar cantidad')
        return
      }

      await cargarCarrito()
    } catch (error) {
      console.error('Error al actualizar cantidad:', error)
      alert('Error al actualizar la cantidad')
    }
  }
  */

  const eliminarItem = async (itemId: number) => {
    setConfirmConfig({
      show: true,
      message: '¿Eliminar este producto del carrito?',
      onConfirm: async () => {
        setConfirmConfig(null)
        setEliminandoItem(itemId)
        try {
          const response = await fetch(`/api/carrito/${itemId}?sessionId=${sessionId}`, {
            method: 'DELETE'
          })

          if (!response.ok) {
            setAlertConfig({ show: true, message: 'Error al eliminar el producto', type: 'error' })
            return
          }

          await cargarCarrito()
        } catch (error) {
          console.error('Error al eliminar item:', error)
          setAlertConfig({ show: true, message: 'Error al eliminar el producto', type: 'error' })
        } finally {
          setEliminandoItem(null)
        }
      }
    })
  }

  const vaciarCarrito = async () => {
    setConfirmConfig({
      show: true,
      message: '¿Vaciar todo el carrito?',
      onConfirm: async () => {
        setConfirmConfig(null)
        setVaciandoCarrito(true)
        try {
          const response = await fetch(`/api/carrito?sessionId=${sessionId}`, {
            method: 'DELETE'
          })

          if (!response.ok) {
            setAlertConfig({ show: true, message: 'Error al vaciar el carrito', type: 'error' })
            return
          }

          await cargarCarrito()
        } catch (error) {
          console.error('Error al vaciar carrito:', error)
          setAlertConfig({ show: true, message: 'Error al vaciar el carrito', type: 'error' })
        } finally {
          setVaciandoCarrito(false)
        }
      }
    })
  }

  const calcularTotal = () => {
    // Suma simple de precios - 1 unidad por producto
    return items.reduce((total, item) => {
      return total + item.producto.precio
    }, 0)
  }

  const procederAlPago = async () => {
    if (items.length === 0) return

    setConfirmConfig({
      show: true,
      message: '¿Confirmar la reserva de estos productos?\n\nLos productos quedarán reservados por 3 horas. Si no se completa el pago en ese tiempo, la reserva se cancelará automáticamente.',
      onConfirm: async () => {
        setConfirmConfig(null)
        setProcesandoPago(true)

        try {
          const productosIds = items.map(item => item.productoId)

          const response = await fetch('/api/ventas/reservar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              productosIds,
              compradorInfo: null, // Puedes agregar info del comprador aquí
              sessionId
            })
          })

          const data = await response.json()

          if (!response.ok) {
            setAlertConfig({ show: true, message: data.error || 'Error al reservar productos', type: 'error' })
            return
          }

          setAlertConfig({ 
            show: true, 
            title: '✅ Productos reservados exitosamente!',
            message: 'Los productos permanecerán en tu carrito por 3 horas. Contacta al vendedor para confirmar tu pago.\n\nSi el pago se confirma, los productos serán marcados como vendidos. Si no se confirma en 3 horas, la reserva se cancelará automáticamente.', 
            type: 'success' 
          })

          // Recargar el carrito para actualizar el estado
          await cargarCarrito()
        } catch (error) {
          console.error('Error al proceder al pago:', error)
          setAlertConfig({ show: true, message: 'Error al procesar la reserva', type: 'error' })
        } finally {
          setProcesandoPago(false)
        }
      }
    })
  }

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FFC3E5' }}>
        <p className="text-xl font-semibold" style={{ color: '#1F0354' }}>Cargando carrito...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4" style={{ backgroundColor: '#FFC3E5' }}>
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className="flex items-center justify-between mb-4">
          <Link 
            href="/"
            className="px-4 py-2 rounded-lg font-semibold text-white hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#5E18EB' }}
          >
            ← Volver
          </Link>
          {items.length > 0 && (
            <button
              onClick={vaciarCarrito}
              disabled={vaciandoCarrito}
              className="px-4 py-2 rounded-lg font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ backgroundColor: '#FF6012' }}
            >
              {vaciandoCarrito ? (
                <>
                  <Spinner size="sm" color="#ffffff" />
                  Vaciando...
                </>
              ) : (
                'Vaciar Carrito'
              )}
            </button>
          )}
        </div>
        <h1 className="text-3xl font-bold" style={{ color: '#1F0354' }}>
          🛒 Mi Carrito
        </h1>
      </div>

      {/* Contenido */}
      <div className="max-w-4xl mx-auto">
        {items.length === 0 ? (
          <div className="bg-white rounded-lg p-8 text-center shadow-md">
            <p className="text-xl mb-4" style={{ color: '#5E18EB' }}>
              Tu carrito está vacío
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-3 rounded-lg font-semibold text-white hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#FF5BC7' }}
            >
              Ir a comprar
            </Link>
          </div>
        ) : (
          <>
            {/* Lista de Items */}
            <div className="space-y-4 mb-6">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-lg p-4 shadow-md border-2"
                  style={{ 
                    borderColor: item.producto.estado === 'reservado' ? '#FF6012' : '#FFC3E5',
                    backgroundColor: item.producto.estado === 'reservado' ? '#FFF4E6' : '#fff'
                  }}
                >
                  {/* Badge de Estado Reservado */}
                  {item.producto.estado === 'reservado' && (
                    <div className="mb-3 p-4 rounded-lg border-2" style={{ backgroundColor: '#FFF4E6', borderColor: '#FF6012' }}>
                      <p className="font-bold text-xl mb-2" style={{ color: '#FF6012' }}>
                        ⏱️ Producto Reservado
                      </p>
                      {tiemposRestantes[item.producto.id] && (
                        <p className="font-semibold text-lg mb-2" style={{ color: '#FF6012' }}>
                          {tiemposRestantes[item.producto.id]}
                        </p>
                      )}
                      <p className="text-sm mb-1" style={{ color: '#1F0354' }}>
                        Tu producto está reservado y esperando confirmación del pago.
                      </p>
                      <p className="text-sm font-semibold" style={{ color: '#FF6012' }}>
                        Si no se confirma la venta en el tiempo indicado, la reserva se cancelará automáticamente y el producto volverá a estar disponible.
                      </p>
                    </div>
                  )}
                  
                  <div className="flex gap-4">
                    {/* Imagen */}
                    <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden" style={{ backgroundColor: '#D1ECFF' }}>
                      <Image
                        src={obtenerImagenPrincipal(item.producto)}
                        alt={item.producto.nombre}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg mb-1 truncate" style={{ color: '#1F0354' }}>
                        {item.producto.nombre}
                      </h3>
                      <p className="text-xl font-bold mb-2" style={{ color: '#FF5BC7' }}>
                        ${item.producto.precio.toFixed(2)}
                      </p>
                    </div>

                    {/* Eliminar - Solo si no está reservado */}
                    {item.producto.estado !== 'reservado' && (
                      <div className="flex flex-col items-end justify-between">
                        <button
                          onClick={() => eliminarItem(item.id)}
                          disabled={eliminandoItem === item.id}
                          className="px-3 py-1 rounded-md font-semibold text-white hover:opacity-80 transition-opacity disabled:opacity-50 flex items-center gap-2"
                          style={{ backgroundColor: '#FF6012' }}
                        >
                          {eliminandoItem === item.id ? (
                            <>
                              <Spinner size="sm" color="#ffffff" />
                              Eliminando...
                            </>
                          ) : (
                            '🗑️ Eliminar'
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Total y Checkout */}
            <div className="bg-white rounded-lg p-6 shadow-md">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xl font-bold" style={{ color: '#1F0354' }}>
                  Total:
                </span>
                <span className="text-3xl font-bold" style={{ color: '#FF5BC7' }}>
                  ${calcularTotal().toFixed(2)}
                </span>
              </div>
              
              {/* Verificar si hay productos ya reservados */}
              {items.some(item => item.producto.estado === 'reservado') ? (
                <div className="p-4 rounded-lg text-center" style={{ backgroundColor: '#FFF4E6', color: '#FF6012' }}>
                  <p className="font-bold">⏱️ Productos Reservados</p>
                  <p className="text-sm mt-1">
                    Esperando confirmación del pago por parte del vendedor
                  </p>
                </div>
              ) : (
                <button
                  onClick={procederAlPago}
                  disabled={procesandoPago}
                  className="w-full py-4 rounded-lg font-bold text-white text-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ backgroundColor: '#5E18EB' }}
                >
                  {procesandoPago ? (
                    <>
                      <Spinner size="sm" color="#ffffff" />
                      <span>Procesando...</span>
                    </>
                  ) : '💳 Reservar Productos'}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {alertConfig?.show && (
        <Alert
          title={alertConfig.title}
          message={alertConfig.message}
          type={alertConfig.type}
          onClose={() => setAlertConfig(null)}
        />
      )}

      {confirmConfig?.show && (
        <Confirm
          title={confirmConfig.title}
          message={confirmConfig.message}
          onConfirm={confirmConfig.onConfirm}
          onCancel={() => setConfirmConfig(null)}
        />
      )}
    </div>
  )
}
