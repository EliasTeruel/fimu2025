'use client'

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState, useCallback } from "react"
import { createClient } from '@/lib/supabase/client'
import ProductoModal from "./components/ProductoModal"
import ProductoSkeleton from "./components/ProductoSkeleton"
import { getSessionId } from "@/lib/session"

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
  createdAt: Date
}

export default function Home() {
  const supabase = createClient()
  const [productos, setProductos] = useState<Producto[]>([])
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [cantidadCarrito, setCantidadCarrito] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [sessionId, setSessionId] = useState<string>('')
  const [userLoggedIn, setUserLoggedIn] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  // Inicializar sessionId al montar el componente
  useEffect(() => {
    const id = getSessionId()
    setSessionId(id)
  }, [])

  // Verificar si hay usuario logueado y si es admin
  useEffect(() => {
    async function verificarUsuario() {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        setUserLoggedIn(true)
        
        // Verificar si es admin
        try {
          const res = await fetch(`/api/usuarios?supabaseId=${user.id}`)
          if (res.ok) {
            const usuario = await res.json()
            setIsAdmin(usuario.isAdmin)
          }
        } catch (error) {
          console.error('Error al verificar admin:', error)
        }
      } else {
        setUserLoggedIn(false)
        setIsAdmin(false)
      }
    }
    
    verificarUsuario()
  }, [supabase])

  useEffect(() => {
    async function cargarDatos() {
      if (!sessionId) return // Esperar a que sessionId esté disponible
      
      try {
        setCargando(true)
        // Cargar productos y contador en paralelo para ser más rápido
        const [productosRes, carritoRes] = await Promise.all([
          fetch('/api/productos', { 
            cache: 'force-cache' // Usar caché agresivo
          }),
          fetch(`/api/carrito/count?sessionId=${sessionId}`, {
            cache: 'no-store' // El contador siempre debe ser fresco
          })
        ])
        
        if (productosRes.ok) {
          const data = await productosRes.json()
          // Separar productos por estado
          const disponibles = data.filter((p: Producto) => 
            !p.estado || p.estado === 'disponible'
          )
          const reservados = data.filter((p: Producto) => p.estado === 'reservado')
          const vendidos = data.filter((p: Producto) => p.estado === 'vendido')
          
          // Ordenar: disponibles primero, luego reservados, luego vendidos al final
          setProductos([...disponibles, ...reservados, ...vendidos])
        }
        
        if (carritoRes.ok) {
          const carritoData = await carritoRes.json()
          setCantidadCarrito(carritoData.count)
        }
      } catch (error) {
        console.error('Error al cargar datos:', error)
      } finally {
        setCargando(false)
      }
    }
    cargarDatos()
  }, [sessionId])

  const abrirModal = useCallback((producto: Producto) => {
    setProductoSeleccionado(producto)
    setModalAbierto(true)
  }, [])

  const cerrarModal = useCallback(async () => {
    setModalAbierto(false)
    setProductoSeleccionado(null)
    // Recargar solo el contador (más rápido que toda la función)
    if (sessionId) {
      try {
        const res = await fetch(`/api/carrito/count?sessionId=${sessionId}`)
        if (res.ok) {
          const data = await res.json()
          setCantidadCarrito(data.count)
        }
      } catch (error) {
        console.error('Error al actualizar contador:', error)
      }
    }
  }, [sessionId])

  // Obtener imagen principal o la primera imagen disponible (memoizada)
  const obtenerImagenPrincipal = useCallback((producto: Producto): string => {
    if (producto.imagenes && producto.imagenes.length > 0) {
      const imagenPrincipal = producto.imagenes.find(img => img.esPrincipal)
      return imagenPrincipal?.url || producto.imagenes[0].url
    }
    return producto.imagenUrl || '/placeholder.png'
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUserLoggedIn(false)
    setIsAdmin(false)
    window.location.reload() // Recargar la página para reflejar cambios
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FFC3E5' }}>
      {/* Header */}
      <header className="shadow-lg" style={{ backgroundColor: '#1F0354' }}>
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold" style={{ color: '#D1ECFF' }}>Fimu Vintage</h1>
          <nav className="flex gap-4 items-center">
            {/* Botón Carrito */}
            <Link
              href="/carrito"
              className="relative px-4 py-2 text-sm font-medium text-white rounded-md hover:opacity-90 transition-opacity flex items-center gap-2"
              style={{ backgroundColor: '#FF5BC7' }}
            >
              🛒 Carrito
              {cantidadCarrito > 0 && (
                <span 
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ backgroundColor: '#FF6012' }}
                >
                  {cantidadCarrito}
                </span>
              )}
            </Link>
            
            {/* Mi Perfil - solo si está logueado */}
            {userLoggedIn && (
              <Link
                href="/perfil"
                className="px-4 py-2 text-sm font-medium hover:opacity-80 transition-opacity"
                style={{ color: '#D1ECFF' }}
              >
                Mi Perfil
              </Link>
            )}
            
            {/* Iniciar Sesión - solo si NO está logueado */}
            {!userLoggedIn && (
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-medium hover:opacity-80 transition-opacity"
                style={{ color: '#D1ECFF' }}
              >
                Iniciar Sesión
              </Link>
            )}
            
            {/* Admin - solo si es admin */}
            {isAdmin && (
              <Link
                href="/admin"
                className="px-4 py-2 text-sm font-medium text-white rounded-md hover:opacity-90 transition-opacity"
                style={{ backgroundColor: '#5E18EB' }}
              >
                Admin
              </Link>
            )}
            
            {/* Cerrar Sesión - solo si está logueado */}
            {userLoggedIn && (
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-white rounded-md hover:opacity-90 transition-opacity"
                style={{ backgroundColor: '#FF6012' }}
              >
                Cerrar Sesión
              </button>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-2" style={{ color: '#1F0354' }}>
            🍂Tienda de ropa vintage,retro y segunda hand🍂
          </h2>
          <p style={{ color: '#5E18EB' }}>
            🚀 ENTREGAS zona sur y envíos a todo el pais
          </p>
            <p style={{ color: '#5E18EB' }}>
♻️Pilchitas vintage,retro y 2hand

            </p>
            <p style={{ color: '#5E18EB' }}>
💫Te llevarás joyitas unicas💫

            </p>
            <p style={{ color: '#5E18EB' }}>

👉🏽No se hacen cambios ni devoluciones
            </p>
        </div>

        {cargando ? (
          /* Skeletons de carga */
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <ProductoSkeleton key={i} />
            ))}
          </div>
        ) : productos.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg" style={{ color: '#5E18EB' }}>
              No hay productos disponibles aún.
            </p>
            <Link
              href="/admin"
              className="mt-4 inline-block hover:opacity-80 transition-opacity"
              style={{ color: '#1F0354' }}
            >
              Ir al panel de administración para agregar productos
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {productos.map((producto, index) => (
              <div
                key={producto.id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 border-2"
                style={{ borderColor: '#FF5BC7' }}
              >
                <div className="relative h-48" style={{ backgroundColor: '#D1ECFF' }}>
                  <Image
                    src={obtenerImagenPrincipal(producto)}
                    alt={producto.nombre}
                    fill
                    className="object-contain p-2"
                    sizes="(max-width: 768px) 50vw, 25vw"
                    priority={index < 4} // Cargar primeros 4 con prioridad
                    loading={index < 4 ? undefined : 'lazy'} // Lazy load para el resto
                    unoptimized
                  />
                </div>
                <div className="p-3">
                  <h3 className="text-base font-semibold mb-1 line-clamp-1" style={{ color: '#1F0354' }}>
                    {producto.nombre}
                  </h3>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xl font-bold" style={{ color: '#5E18EB' }}>
                      ${producto.precio.toFixed(2)}
                    </span>
                    
                    {/* Badge de Estado */}
                    <span
                      className="text-xs px-2 py-1 rounded-full font-semibold"
                      style={{ 
                        backgroundColor: 
                          producto.estado === 'reservado' ? '#FFF4E6' : 
                          producto.estado === 'vendido' ? '#E6FFE6' : 
                          '#D1ECFF',
                        color: 
                          producto.estado === 'reservado' ? '#FF6012' : 
                          producto.estado === 'vendido' ? '#00A86B' : 
                          '#5E18EB'
                      }}
                    >
                      {producto.estado === 'reservado' && '⏱️ Reservado'}
                      {producto.estado === 'vendido' && '✅ Vendido'}
                      {(!producto.estado || producto.estado === 'disponible') && '✓ Disponible'}
                    </span>
                    
                    {/* Stock comentado - Solo 1 unidad por producto */}
                    {/* <span
                      className={`text-xs px-2 py-1 rounded-full font-semibold ${
                        producto.stock > 0
                          ? 'bg-green-100'
                          : 'bg-red-100'
                      }`}
                      style={{ color: producto.stock > 0 ? '#5E18EB' : '#FF6012' }}
                    >
                      {producto.stock > 0 ? `Stock: ${producto.stock}` : 'Sin stock'}
                    </span> */}
                  </div>
                  <button
                    onClick={() => abrirModal(producto)}
                    className="w-full py-2 rounded-md text-white font-semibold text-sm hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: '#5E18EB' }}
                  >
                    Ver más info
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal de Detalle de Producto */}
      {productoSeleccionado && (
        <ProductoModal
          producto={productoSeleccionado}
          isOpen={modalAbierto}
          onClose={cerrarModal}
        />
      )}

      {/* Footer */}
      <footer className="border-t mt-12" style={{ backgroundColor: '#1F0354' }}>
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm" style={{ color: '#D1ECFF' }}>
            Fimu Vintage - Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  )
}
