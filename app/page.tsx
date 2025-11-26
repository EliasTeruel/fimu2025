'use client'

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState, useCallback, useRef } from "react"
import ProductoModal from "./components/ProductoModal"
import ProductoSkeleton from "./components/ProductoSkeleton"
import { getSessionId } from "@/lib/session"
import { CloudinaryPresets } from "@/lib/cloudinary-utils"
import { useAuth } from './contexts/AuthContext'

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

// 🔧 CONFIGURACIÓN: Cantidad de productos por página (scroll infinito)
const PRODUCTOS_POR_PAGINA = 3 // Cambiá este número: 3, 5, 10, 20, etc.

export default function Home() {
  const { user, isAdmin, logout } = useAuth()
  const [productos, setProductos] = useState<Producto[]>([])
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [cantidadCarrito, setCantidadCarrito] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [cargandoMas, setCargandoMas] = useState(false)
  const [sessionId, setSessionId] = useState<string>('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const observerTarget = useRef<HTMLDivElement>(null)
  const [menuAbierto, setMenuAbierto] = useState(false)

  // Inicializar sessionId al montar el componente
  useEffect(() => {
    const id = getSessionId()
    setSessionId(id)
  }, [])

  useEffect(() => {
    async function cargarDatos() {
      if (!sessionId) return // Esperar a que sessionId esté disponible
      
      try {
        setCargando(true)
        // Cargar productos y contador en paralelo para ser más rápido
        const [productosRes, carritoRes] = await Promise.all([
          fetch(`/api/productos/publico?page=1&limit=${PRODUCTOS_POR_PAGINA}`, { 
            cache: 'no-store' // Sin caché para obtener todos los productos
          }),
          fetch(`/api/carrito/count?sessionId=${sessionId}`, {
            cache: 'no-store' // El contador siempre debe ser fresco
          })
        ])
        
        if (productosRes.ok) {
          const data = await productosRes.json()
          setProductos(data.productos)
          setHasMore(data.pagination.hasMore)
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

  // Cargar más productos (scroll infinito)
  const cargarMasProductos = useCallback(async () => {
    if (cargandoMas || !hasMore) return

    try {
      setCargandoMas(true)
      const nextPage = page + 1
      const res = await fetch(`/api/productos/publico?page=${nextPage}&limit=${PRODUCTOS_POR_PAGINA}`)
      
      if (res.ok) {
        const data = await res.json()
        setProductos(prev => [...prev, ...data.productos])
        setPage(nextPage)
        setHasMore(data.pagination.hasMore)
      }
    } catch (error) {
      console.error('Error al cargar más productos:', error)
    } finally {
      setCargandoMas(false)
    }
  }, [page, hasMore, cargandoMas])

  // Intersection Observer para scroll infinito
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !cargandoMas) {
          cargarMasProductos()
        }
      },
      { threshold: 0.1 }
    )

    const currentTarget = observerTarget.current
    if (currentTarget) {
      observer.observe(currentTarget)
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
  }, [hasMore, cargandoMas, cargarMasProductos])

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
    await logout()
    window.location.reload()
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FFC3E5' }}>
      {/* Header fijo */}
      <header className="fixed top-0 left-0 right-0 shadow-lg z-30" style={{ backgroundColor: '#1F0354' }}>
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: '#D1ECFF' }}>Fimu Vintage</h1>
            
            {/* Botón hamburguesa - solo móvil, oculto cuando el menú está abierto */}
            {!menuAbierto && (
              <button
                onClick={() => setMenuAbierto(true)}
                className="md:hidden p-2 rounded-md hover:opacity-80 transition-opacity"
                style={{ color: '#D1ECFF' }}
                aria-label="Menú"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}

            {/* Nav Desktop - oculto en móvil */}
            <nav className="hidden md:flex gap-4 items-center">
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
              {user && (
                <Link
                  href="/perfil"
                  className="px-4 py-2 text-sm font-medium hover:opacity-80 transition-opacity"
                  style={{ color: '#D1ECFF' }}
                >
                  Mi Perfil
                </Link>
              )}
              
              {/* Iniciar Sesión - solo si NO está logueado */}
              {!user && (
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
              {user && (
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
        </div>
      </header>

      {/* Menú lateral derecho - móvil */}
      {menuAbierto && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0  bg-opacity-50 z-40 md:hidden"
            onClick={() => setMenuAbierto(false)}
          />
          
          {/* Panel lateral */}
          <div className="fixed top-0 right-0 h-full w-64 shadow-xl z-50 md:hidden overflow-y-auto transition-transform duration-300" style={{ backgroundColor: '#5e18eb82' }}>
            <div className="p-4">
              {/* Botón cerrar */}
              <button
                onClick={() => setMenuAbierto(false)}
                className="absolute top-4 right-4 p-2 rounded-md hover:opacity-80 transition-opacity"
                style={{ color: '#D1ECFF' }}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <h2 className="text-xl font-bold mb-6 mt-2" style={{ color: '#D1ECFF' }}>Menú</h2>

              <div className="flex flex-col gap-3">
                {/* Botón Carrito */}
                <Link
                  href="/carrito"
                  onClick={() => setMenuAbierto(false)}
                  className="relative px-4 py-3 text-base font-medium text-white rounded-md hover:opacity-90 transition-opacity flex items-center gap-2"
                  style={{ backgroundColor: '#FF5BC7' }}
                >
                  🛒 Carrito
                  {cantidadCarrito > 0 && (
                    <span 
                      className="ml-auto w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold text-white"
                      style={{ backgroundColor: '#FF6012' }}
                    >
                      {cantidadCarrito}
                    </span>
                  )}
                </Link>
                
                {/* Mi Perfil */}
                {user && (
                  <Link
                    href="/perfil"
                    onClick={() => setMenuAbierto(false)}
                    className="px-4 py-3 text-base font-medium rounded-md hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: '#1f0354ff', color: 'rgba(241, 238, 246, 1)' }}
                  >
                    👤 Mi Perfil
                  </Link>
                )}
                
                {/* Iniciar Sesión */}
                {!user && (
                  <Link
                    href="/login"
                    onClick={() => setMenuAbierto(false)}
                    className="px-4 py-3 text-base font-medium rounded-md hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: '#D1ECFF', color: '#1F0354' }}
                  >
                    🔐 Iniciar Sesión
                  </Link>
                )}
                
                {/* Admin */}
                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setMenuAbierto(false)}
                    className="px-4 py-3 text-base font-medium text-white rounded-md hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: '#5E18EB' }}
                  >
                    ⚙️ Admin
                  </Link>
                )}
                
                {/* Cerrar Sesión */}
                {user && (
                  <button
                    onClick={() => {
                      setMenuAbierto(false)
                      handleLogout()
                    }}
                    className="px-4 py-3 text-base font-medium text-white rounded-md hover:opacity-90 transition-opacity text-left"
                    style={{ backgroundColor: '#FF6012' }}
                  >
                    🚪 Cerrar Sesión
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Main Content con padding-top para compensar el header fijo */}
      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8" style={{ paddingTop: '120px' }}>
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
                    src={CloudinaryPresets.productCard(obtenerImagenPrincipal(producto))}
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

        {/* Indicador de carga para scroll infinito */}
        {cargandoMas && (
          <div className="flex justify-center py-8">
            <div className="flex items-center gap-2" style={{ color: '#5E18EB' }}>
              <div className="w-6 h-6 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#5E18EB' }}></div>
              <span>Cargando más productos...</span>
            </div>
          </div>
        )}

        {/* Elemento observador para scroll infinito */}
        <div ref={observerTarget} className="h-4" />
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
