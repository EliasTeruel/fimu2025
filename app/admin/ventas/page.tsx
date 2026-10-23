'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Spinner from '../../components/Spinner'

import ReservaClock from '@/app/components/ReservaClock'
import type { ReservationTiming } from '@/lib/reserva-policy'
import Image from 'next/image'
import Alert from '../../components/Alert'
import Confirm from '../../components/Confirm'
import Navbar from '../../components/Navbar'
import LoadingScreen from '../../components/LoadingScreen'

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
  reservaTiempo?: ReservationTiming | null
  reservadoEn: Date | null
  compradorInfo: string | null
  reservaPausada?: boolean
  pausadoEn?: Date | null
}

interface CarritoItem {
  id: number
  productoId: number
  cantidad: number
  producto: Producto
}

export default function VentasAdminPage() {
  const router = useRouter()
  const supabase = createClient()
  const [productos, setProductos] = useState<Producto[]>([])
  const [productosEnCarrito, setProductosEnCarrito] = useState<CarritoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [vistaActual, setVistaActual] = useState<'todos' | 'carrito' | 'enCarritos' | 'reservados' | 'vendidos'>('todos')
  const [confirmandoVenta, setConfirmandoVenta] = useState<number | null>(null)
  const [cancelandoReserva, setCancelandoReserva] = useState<number | null>(null)
  const [pausandoReserva, setPausandoReserva] = useState<number | null>(null)
  const [marcandoVendido, setMarcandoVendido] = useState<number | null>(null)
  const [volviendoDisponible, setVolviendoDisponible] = useState<number | null>(null)
  const [alertConfig, setAlertConfig] = useState<{ show: boolean; message: string; type: 'info' | 'success' | 'error' | 'warning'; title?: string } | null>(null)
  const [confirmConfig, setConfirmConfig] = useState<{ show: boolean; message: string; onConfirm: () => void; title?: string } | null>(null)

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined
    let cancelled = false
    async function verificarAdmin() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      // Verificar si el usuario es admin
      try {
        const res = await fetch(`/api/usuarios?supabaseId=${user.id}`)
        if (res.ok) {
          const usuario = await res.json()
          if (!usuario.isAdmin) {
            setAlertConfig({
              show: true,
              message: 'No tienes permisos para acceder a esta página.',
              type: 'error',
              title: 'Acceso denegado'
            })
            setTimeout(() => {
              router.push('/')
            }, 2000)
            return
          }
        } else {
          setAlertConfig({
            show: true,
            message: 'Usuario no encontrado en el sistema.',
            type: 'error',
            title: 'Error'
          })
          setTimeout(() => {
            router.push('/')
          }, 2000)
          return
        }
      } catch (error) {
        console.error('Error al verificar permisos:', error)
        setAlertConfig({
          show: true,
          message: 'Error al verificar permisos.',
          type: 'error',
          title: 'Error'
        })
        setTimeout(() => {
          router.push('/')
        }, 2000)
        return
      }

      if (cancelled) return
      // Si es admin, cargar datos
      cargarProductos()
      cargarProductosEnCarrito()
      verificarReservasExpiradas()
      // Verificar reservas expiradas cada minuto
      timer = setInterval(() => { void cargarProductos() }, 10000)
    }

    verificarAdmin()
    return () => { cancelled = true; if (timer) clearInterval(timer) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, supabase])

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
      const res = await fetch('/api/carrito?scope=all')
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

  const regularizarReserva = (productoId: number) => {
    setConfirmConfig({ show: true,
      message: 'Esta reserva no tiene una política registrada. ¿Asignarle desde ahora el plazo completo de la configuración vigente? Su pausa manual se conservará. Revisa antes el acuerdo con el cliente.',
      onConfirm: async () => {
        setConfirmConfig(null)
        try {
          const response = await fetch('/api/ventas/regularizar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productoId, confirmar: true }) })
          const data = await response.json()
          setAlertConfig({ show: true, message: data.message || data.error, type: response.ok ? 'success' : 'error' })
          await cargarProductos()
        } catch { setAlertConfig({ show: true, message: 'No se pudo regularizar la reserva', type: 'error' }) }
      },
    })
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

  const togglePausarReserva = (productoId: number, nombreProducto: string, pausado: boolean) => {
    const accion = pausado ? 'reanudar' : 'pausar'
    setConfirmConfig({
      show: true,
      title: pausado ? '▶️ Reanudar cronómetro' : '⏸️ Pausar cronómetro',
      message: `¿Deseas ${accion} el cronómetro de "${nombreProducto}" y las reservas vigentes del mismo comprador que estén en el mismo estado de pausa?`,
      onConfirm: async () => {
        setConfirmConfig(null)
        setPausandoReserva(productoId)
        try {
          const res = await fetch('/api/ventas/pausar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productoId })
          })

          if (res.ok) {
            const data = await res.json()
            setAlertConfig({ 
              show: true, 
              message: data.message,
              type: 'success' 
            })
            cargarProductos()
          } else {
            const error = await res.json()
            setAlertConfig({ show: true, message: error.error || 'Error al pausar/reanudar', type: 'error' })
          }
        } catch (error) {
          console.error('Error:', error)
          setAlertConfig({ show: true, message: 'Error al pausar/reanudar', type: 'error' })
        } finally {
          setPausandoReserva(null)
        }
      }
    })
  }

  const marcarComoVendido = (productoId: number, nombreProducto: string) => {
    setConfirmConfig({
      show: true,
      title: '💰 Marcar como vendido',
      message: `¿Confirmar venta externa de "${nombreProducto}"?\n\nEsto marcará el producto como vendido sin pasar por el proceso de reserva.`,
      onConfirm: async () => {
        setConfirmConfig(null)
        setMarcandoVendido(productoId)
        try {
          const res = await fetch('/api/ventas/marcar-vendido', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productoId })
          })

          if (res.ok) {
            setAlertConfig({ 
              show: true, 
              message: '✅ Producto marcado como vendido', 
              type: 'success' 
            })
            cargarProductos()
          } else {
            const error = await res.json()
            setAlertConfig({ show: true, message: error.error || 'Error al marcar como vendido', type: 'error' })
          }
        } catch (error) {
          console.error('Error:', error)
          setAlertConfig({ show: true, message: 'Error al marcar como vendido', type: 'error' })
        } finally {
          setMarcandoVendido(null)
        }
      }
    })
  }

  const volverADisponible = (productoId: number, nombreProducto: string) => {
    setConfirmConfig({
      show: true,
      title: '🔄 Volver a disponible',
      message: `¿Liberar "${nombreProducto}" y volverlo a disponible?\n\nEsto eliminará toda la información de reserva/venta.`,
      onConfirm: async () => {
        setConfirmConfig(null)
        setVolviendoDisponible(productoId)
        try {
          const res = await fetch('/api/ventas/disponible', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productoId })
          })

          if (res.ok) {
            setAlertConfig({ 
              show: true, 
              message: '🔄 Producto vuelto a disponible', 
              type: 'success' 
            })
            cargarProductos()
          } else {
            const error = await res.json()
            setAlertConfig({ show: true, message: error.error || 'Error al volver a disponible', type: 'error' })
          }
        } catch (error) {
          console.error('Error:', error)
          setAlertConfig({ show: true, message: 'Error al volver a disponible', type: 'error' })
        } finally {
          setVolviendoDisponible(null)
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

  const productosFiltrados = productos.filter(p => {
    if (vistaActual === 'todos') return true
    if (vistaActual === 'carrito') return p.estado === 'disponible'
    if (vistaActual === 'reservados') return p.estado === 'reservado'
    if (vistaActual === 'vendidos') return p.estado === 'vendido'
    return true
  })

  if (loading) {
    return <LoadingScreen message="Cargando ventas..." />
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen p-6 bg-white" style={{ paddingTop: '120px' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold font-title uppercase tracking-wide text-black">
            📊 Gestión de Ventas
          </h1>
        </div>

        {/* Filtros */}
        <div className="bg-white p-4 mb-6 border-2 border-black">
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => setVistaActual('todos')}
              className={`px-4 py-2 font-semibold transition-all font-body uppercase tracking-wide ${
                vistaActual === 'todos' ? 'bg-black text-white' : 'bg-gray-100 text-black'
              }`}
            >
              Todos ({productos.length})
            </button>
            <button
              onClick={() => setVistaActual('enCarritos')}
              className={`px-4 py-2 font-semibold transition-all font-body uppercase tracking-wide ${
                vistaActual === 'enCarritos' ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              🛒 En Carritos ({productosEnCarrito.length})
            </button>
            <button
              onClick={() => setVistaActual('carrito')}
              className={`px-4 py-2 font-semibold transition-all font-body uppercase tracking-wide ${
                vistaActual === 'carrito' ? 'bg-black text-white' : 'bg-gray-100 text-black'
              }`}
            >
              Disponibles ({productos.filter(p => p.estado === 'disponible').length})
            </button>
            <button
              onClick={() => setVistaActual('reservados')}
              className={`px-4 py-2 font-semibold transition-all font-body uppercase tracking-wide ${
                vistaActual === 'reservados' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              Reservados ({productos.filter(p => p.estado === 'reservado').length})
            </button>
            <button
              onClick={() => setVistaActual('vendidos')}
              className={`px-4 py-2 font-semibold transition-all font-body uppercase tracking-wide ${
                vistaActual === 'vendidos' ? 'bg-black text-white' : 'bg-gray-100 text-black'
              }`}
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
              <div className="bg-white p-8 text-center border-2 border-black">
                <p className="font-body text-gray-700">No hay productos en carritos</p>
              </div>
            ) : (
              productosEnCarrito.map((item) => (
                <div key={item.id} className="bg-white p-4 border-2 border-black">
                  <div className="flex gap-4 items-start">
                    {/* Imagen */}
                    <div 
                      className="relative w-24 h-24 flex-shrink-0 overflow-hidden bg-gray-50"
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
            <div className="bg-white p-8 text-center border-2 border-black">
              <p className="font-body text-gray-700">No hay productos en esta categoría</p>
            </div>
          ) : (
            productosFiltrados.map((producto) => (
              <div key={producto.id} className="bg-white p-4 border-2 border-black">
                <div className="flex gap-4 items-start">
                  {/* Imagen */}
                  <div 
                    className="relative w-24 h-24 flex-shrink-0 overflow-hidden bg-gray-50"
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
                        <h3 className="font-body text-lg font-title uppercase text-black">
                          {producto.nombre}
                        </h3>
                        <p className="text-xl font-body font-title text-black">
                          ${producto.precio.toFixed(2)}
                        </p>
                      </div>
                      
                      <div className="flex flex-col gap-1 items-end">
                        {/* Badge de Estado */}
                        <span
                          className="px-3 py-1 text-sm font-semibold font-body uppercase tracking-wide"
                          style={{
                            backgroundColor: 
                              producto.estado === 'disponible' ? '#F5F5F5' :
                              producto.estado === 'reservado' ? '#E5E5E5' :
                              '#CCCCCC',
                            color: '#000000'
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
                            className="px-2 py-1 text-xs font-semibold font-body uppercase bg-gray-200 text-black"
                          >
                            🛒 En carrito
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Info de Reserva */}
                    {producto.estado === 'reservado' && (
                      <div className="mb-3 p-2 bg-gray-100 border-2 border-black">
                        <p className="text-sm font-semibold font-body text-black">
                          <ReservaClock timing={producto.reservaTiempo} />
                          {producto.reservaTiempo?.pause === 'revision' && <button className="block underline mt-2" onClick={() => regularizarReserva(producto.id)}>Revisar y asignar nuevo plazo</button>}
                        </p>
                        {producto.compradorInfo && (
                          <p className="text-sm font-body text-gray-700">
                            Comprador: {producto.compradorInfo}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Acciones */}
                    <div className="flex gap-2 flex-wrap">
                      {producto.estado === 'reservado' && (
                        <>
                          <button
                            onClick={() => confirmarVenta(producto.id)}
                            disabled={confirmandoVenta === producto.id}
                            className="px-4 py-2 font-semibold text-white hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 bg-black font-body uppercase tracking-wide"
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
                            onClick={() => togglePausarReserva(producto.id, producto.nombre, producto.reservaPausada || false)}
                            disabled={pausandoReserva === producto.id}
                            className="px-4 py-2 font-semibold text-white hover:bg-gray-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 font-body uppercase tracking-wide"
                            style={{ backgroundColor: producto.reservaPausada ? '#000000' : '#666666' }}
                          >
                            {pausandoReserva === producto.id ? (
                              <>
                                <Spinner size="sm" color="#ffffff" />
                                {producto.reservaPausada ? 'Reanudando...' : 'Pausando...'}
                              </>
                            ) : (
                              producto.reservaPausada ? '▶️ Reanudar' : '⏸️ Pausar'
                            )}
                          </button>
                          <button
                            onClick={() => cancelarReserva(producto.id)}
                            disabled={cancelandoReserva === producto.id}
                            className="px-4 py-2 font-semibold text-white hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 bg-black font-body uppercase tracking-wide"
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
                        <>
                          <button
                            onClick={() => marcarComoVendido(producto.id, producto.nombre)}
                            disabled={marcandoVendido === producto.id}
                            className="px-4 py-2 font-semibold text-white hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 bg-black font-body uppercase tracking-wide"
                          >
                            {marcandoVendido === producto.id ? (
                              <>
                                <Spinner size="sm" color="#ffffff" />
                                Marcando...
                              </>
                            ) : (
                              '💰 Marcar Vendido'
                            )}
                          </button>
                          <span className="text-sm self-center font-body text-gray-700">
                            Stock: {producto.stock} unidades
                          </span>
                        </>
                      )}
                      {producto.estado === 'vendido' && (
                        <button
                          onClick={() => volverADisponible(producto.id, producto.nombre)}
                          disabled={volviendoDisponible === producto.id}
                          className="px-4 py-2 font-semibold text-white hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 bg-black font-body uppercase tracking-wide"
                        >
                          {volviendoDisponible === producto.id ? (
                            <>
                              <Spinner size="sm" color="#ffffff" />
                              Liberando...
                            </>
                          ) : (
                            '🔄 Volver Disponible'
                          )}
                        </button>
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
    </>
  )
}
