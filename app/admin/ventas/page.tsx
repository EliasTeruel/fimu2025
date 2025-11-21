'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Spinner from '../../components/Spinner'
import Alert from '../../components/Alert'
import Confirm from '../../components/Confirm'

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
  imagenUrl: string | null
  imagenes?: ProductoImagen[]
  estado: string
  reservadoEn: Date | null
  compradorInfo: string | null
}

interface CarritoItem {
  id: number
  productoId: number
  cantidad: number
  producto: Producto
}

export default function VentasAdminPage() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [productosEnCarrito, setProductosEnCarrito] = useState<CarritoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [vistaActual, setVistaActual] = useState<'todos' | 'carrito' | 'enCarritos' | 'reservados' | 'vendidos'>('todos')
  const [confirmandoVenta, setConfirmandoVenta] = useState<number | null>(null)
  const [cancelandoReserva, setCancelandoReserva] = useState<number | null>(null)
  const [alertConfig, setAlertConfig] = useState<{ show: boolean; message: string; type: 'info' | 'success' | 'error' | 'warning'; title?: string } | null>(null)
  const [confirmConfig, setConfirmConfig] = useState<{ show: boolean; message: string; onConfirm: () => void; title?: string } | null>(null)

  useEffect(() => {
    cargarProductos()
    cargarProductosEnCarrito()
    verificarReservasExpiradas()
    // Verificar reservas expiradas cada minuto
    const interval = setInterval(() => {
      verificarReservasExpiradas()
    }, 60000)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cargarProductos = async () => {
    try {
      const res = await fetch('/api/productos')
      if (res.ok) {
        const data = await res.json()
        setProductos(data)
      }
    } catch (error) {
      console.error('Error al cargar productos:', error)
    } finally {
      setLoading(false)
    }
  }

  const cargarProductosEnCarrito = async () => {
    try {
      const res = await fetch('/api/carrito')
      if (res.ok) {
        const data = await res.json()
        setProductosEnCarrito(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Error al cargar productos en carrito:', error)
      setProductosEnCarrito([])
    }
  }

  const verificarReservasExpiradas = async () => {
    try {
      await fetch('/api/ventas/cancelar')
      cargarProductos()
    } catch (error) {
      console.error('Error al verificar reservas expiradas:', error)
    }
  }

  const confirmarVenta = async (productoId: number) => {
    setConfirmConfig({
      show: true,
      message: '¿Confirmar que se recibió el pago de este producto?',
      onConfirm: async () => {
        setConfirmConfig(null)
        setConfirmandoVenta(productoId)
        try {
          const res = await fetch('/api/ventas/confirmar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productoId })
          })

          if (res.ok) {
            setAlertConfig({ show: true, message: '✅ Venta confirmada', type: 'success' })
            cargarProductos()
          } else {
            const error = await res.json()
            setAlertConfig({ show: true, message: error.error || 'Error al confirmar venta', type: 'error' })
          }
        } catch (error) {
          console.error('Error:', error)
          setAlertConfig({ show: true, message: 'Error al confirmar venta', type: 'error' })
        } finally {
          setConfirmandoVenta(null)
        }
      }
    })
  }

  const cancelarReserva = async (productoId: number) => {
    setConfirmConfig({
      show: true,
      message: '¿Cancelar la reserva y devolver el producto a disponible?',
      onConfirm: async () => {
        setConfirmConfig(null)
        setCancelandoReserva(productoId)
        try {
          const res = await fetch('/api/ventas/cancelar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productoId })
          })

          if (res.ok) {
            setAlertConfig({ show: true, message: '✅ Reserva cancelada', type: 'success' })
            cargarProductos()
          } else {
            const error = await res.json()
            setAlertConfig({ show: true, message: error.error || 'Error al cancelar reserva', type: 'error' })
          }
        } catch (error) {
          console.error('Error:', error)
          setAlertConfig({ show: true, message: 'Error al cancelar reserva', type: 'error' })
        } finally {
          setCancelandoReserva(null)
        }
      }
    })
  }

  const obtenerImagenPrincipal = (producto: Producto): string => {
    const imagenPrincipal = producto.imagenes?.find(img => img.esPrincipal)
    if (imagenPrincipal) return imagenPrincipal.url
    if (producto.imagenes?.length) return producto.imagenes[0].url
    return producto.imagenUrl || '/placeholder.jpg'
  }

  const calcularTiempoRestante = (reservadoEn: Date | null): string => {
    if (!reservadoEn) return ''
    
    const ahora = new Date()
    const reserva = new Date(reservadoEn)
    const expira = new Date(reserva.getTime() + 3 * 60 * 60 * 1000) // 3 horas
    const diferencia = expira.getTime() - ahora.getTime()
    
    if (diferencia <= 0) return '⏰ Expirado'
    
    const horas = Math.floor(diferencia / (1000 * 60 * 60))
    const minutos = Math.floor((diferencia % (1000 * 60 * 60)) / (1000 * 60))
    
    return `⏱️ ${horas}h ${minutos}m restantes`
  }

  const productosFiltrados = productos.filter(p => {
    if (vistaActual === 'todos') return true
    if (vistaActual === 'carrito') return p.estado === 'disponible'
    if (vistaActual === 'reservados') return p.estado === 'reservado'
    if (vistaActual === 'vendidos') return p.estado === 'vendido'
    return true
  })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FFC3E5' }}>
        <p className="text-xl font-semibold" style={{ color: '#1F0354' }}>Cargando...</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen p-6" style={{ backgroundColor: '#FFC3E5' }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <Spinner size="lg" color="#5E18EB" />
              <p className="mt-4 text-xl font-semibold" style={{ color: '#1F0354' }}>
                Cargando productos...
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: '#FFC3E5' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold" style={{ color: '#1F0354' }}>
            📊 Gestión de Ventas
          </h1>
          <div className="flex gap-3">
            <Link
              href="/admin"
              className="px-4 py-2 rounded-lg font-semibold text-white hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#5E18EB' }}
            >
              ← Productos
            </Link>
            <Link
              href="/"
              className="px-4 py-2 rounded-lg font-semibold text-white hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#FF5BC7' }}
            >
              🏠 Tienda
            </Link>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg p-4 mb-6 shadow-md">
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => setVistaActual('todos')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                vistaActual === 'todos' ? 'text-white' : 'bg-gray-100'
              }`}
              style={vistaActual === 'todos' ? { backgroundColor: '#5E18EB' } : { color: '#5E18EB' }}
            >
              Todos ({productos.length})
            </button>
            <button
              onClick={() => setVistaActual('enCarritos')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                vistaActual === 'enCarritos' ? 'text-white' : 'bg-gray-100'
              }`}
              style={vistaActual === 'enCarritos' ? { backgroundColor: '#D1ECFF', color: '#1F0354' } : { color: '#5E18EB' }}
            >
              🛒 En Carritos ({productosEnCarrito.length})
            </button>
            <button
              onClick={() => setVistaActual('carrito')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                vistaActual === 'carrito' ? 'text-white' : 'bg-gray-100'
              }`}
              style={vistaActual === 'carrito' ? { backgroundColor: '#5E18EB' } : { color: '#5E18EB' }}
            >
              Disponibles ({productos.filter(p => p.estado === 'disponible').length})
            </button>
            <button
              onClick={() => setVistaActual('reservados')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                vistaActual === 'reservados' ? 'text-white' : 'bg-gray-100'
              }`}
              style={vistaActual === 'reservados' ? { backgroundColor: '#FF6012' } : { color: '#FF6012' }}
            >
              Reservados ({productos.filter(p => p.estado === 'reservado').length})
            </button>
            <button
              onClick={() => setVistaActual('vendidos')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                vistaActual === 'vendidos' ? 'text-white' : 'bg-gray-100'
              }`}
              style={vistaActual === 'vendidos' ? { backgroundColor: '#00A86B' } : { color: '#00A86B' }}
            >
              Vendidos ({productos.filter(p => p.estado === 'vendido').length})
            </button>
          </div>
        </div>

        {/* Contenido según vista */}
        {vistaActual === 'enCarritos' ? (
          /* Vista de productos en carritos */
          <div className="space-y-4">
            {productosEnCarrito.length === 0 ? (
              <div className="bg-white rounded-lg p-8 text-center shadow-md">
                <p style={{ color: '#5E18EB' }}>No hay productos en carritos</p>
              </div>
            ) : (
              productosEnCarrito.map((item) => (
                <div key={item.id} className="bg-white rounded-lg p-4 shadow-md">
                  <div className="flex gap-4 items-start">
                    {/* Imagen */}
                    <div 
                      className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden"
                      style={{ backgroundColor: '#D1ECFF' }}
                    >
                      <Image
                        src={obtenerImagenPrincipal(item.producto)}
                        alt={item.producto.nombre}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                      <h3 className="font-bold text-lg" style={{ color: '#1F0354' }}>
                        {item.producto.nombre}
                      </h3>
                      <p className="text-xl font-bold" style={{ color: '#FF5BC7' }}>
                        ${item.producto.precio.toFixed(2)}
                      </p>
                      <p className="text-sm mt-2" style={{ color: '#5E18EB' }}>
                        🛒 En carrito de un cliente
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* Vista normal de productos */
          <div className="space-y-4">
            {productosFiltrados.length === 0 ? (
            <div className="bg-white rounded-lg p-8 text-center shadow-md">
              <p style={{ color: '#5E18EB' }}>No hay productos en esta categoría</p>
            </div>
          ) : (
            productosFiltrados.map((producto) => (
              <div key={producto.id} className="bg-white rounded-lg p-4 shadow-md">
                <div className="flex gap-4 items-start">
                  {/* Imagen */}
                  <div 
                    className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden"
                    style={{ backgroundColor: '#D1ECFF' }}
                  >
                    <Image
                      src={obtenerImagenPrincipal(producto)}
                      alt={producto.nombre}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-bold text-lg" style={{ color: '#1F0354' }}>
                          {producto.nombre}
                        </h3>
                        <p className="text-xl font-bold" style={{ color: '#FF5BC7' }}>
                          ${producto.precio.toFixed(2)}
                        </p>
                      </div>
                      
                      <div className="flex flex-col gap-1 items-end">
                        {/* Badge de Estado */}
                        <span
                          className="px-3 py-1 rounded-full text-sm font-semibold"
                          style={{
                            backgroundColor: 
                              producto.estado === 'disponible' ? '#D1ECFF' :
                              producto.estado === 'reservado' ? '#FFF4E6' :
                              '#E6FFE6',
                            color:
                              producto.estado === 'disponible' ? '#5E18EB' :
                              producto.estado === 'reservado' ? '#FF6012' :
                              '#00A86B'
                          }}
                        >
                          {producto.estado === 'disponible' && '✅ Disponible'}
                          {producto.estado === 'reservado' && '⏱️ Reservado'}
                          {producto.estado === 'vendido' && '💰 Vendido'}
                        </span>
                        
                        {/* Badge de En Carrito (solo en vista Todos y si está disponible) */}
                        {vistaActual === 'todos' && 
                         producto.estado === 'disponible' && 
                         productosEnCarrito.some(item => item.productoId === producto.id) && (
                          <span
                            className="px-2 py-1 rounded-full text-xs font-semibold"
                            style={{
                              backgroundColor: '#FFF0FB',
                              color: '#FF5BC7'
                            }}
                          >
                            🛒 En carrito
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Info de Reserva */}
                    {producto.estado === 'reservado' && producto.reservadoEn && (
                      <div className="mb-3 p-2 rounded" style={{ backgroundColor: '#FFF4E6' }}>
                        <p className="text-sm font-semibold" style={{ color: '#FF6012' }}>
                          {calcularTiempoRestante(producto.reservadoEn)}
                        </p>
                        {producto.compradorInfo && (
                          <p className="text-sm" style={{ color: '#5E18EB' }}>
                            Comprador: {producto.compradorInfo}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Acciones */}
                    <div className="flex gap-2">
                      {producto.estado === 'reservado' && (
                        <>
                          <button
                            onClick={() => confirmarVenta(producto.id)}
                            disabled={confirmandoVenta === producto.id}
                            className="px-4 py-2 rounded-lg font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                            style={{ backgroundColor: '#00A86B' }}
                          >
                            {confirmandoVenta === producto.id ? (
                              <>
                                <Spinner size="sm" color="#ffffff" />
                                Confirmando...
                              </>
                            ) : (
                              '✅ Confirmar Pago'
                            )}
                          </button>
                          <button
                            onClick={() => cancelarReserva(producto.id)}
                            disabled={cancelandoReserva === producto.id}
                            className="px-4 py-2 rounded-lg font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                            style={{ backgroundColor: '#FF6012' }}
                          >
                            {cancelandoReserva === producto.id ? (
                              <>
                                <Spinner size="sm" color="#ffffff" />
                                Cancelando...
                              </>
                            ) : (
                              '❌ Cancelar Reserva'
                            )}
                          </button>
                        </>
                      )}
                      {producto.estado === 'disponible' && (
                        <span className="text-sm" style={{ color: '#5E18EB' }}>
                          Stock: {producto.stock} unidades
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
            )}
          </div>
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
