'use client'

import Link from "next/link"
import { useEffect, useState, useCallback, useRef } from "react"
import ProductoModal from "./components/ProductoModal"
import ProductoSkeleton from "./components/ProductoSkeleton"
import ProductoCard, { Producto } from "./components/ProductoCard"
import ProductoGrid from "./components/ProductoGrid"
import MantenimientoScreen from "./components/MantenimientoScreen"
import { getSessionId } from "@/lib/session"
import { useAuth } from './contexts/AuthContext'

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
  const [categoriaActual, setCategoriaActual] = useState<'fimu' | 'perchero'>('fimu')
  const [categoriasVisibles, setCategoriasVisibles] = useState<Array<{
    categoria: string
    nombreMostrar: string
    icono: string | null
  }>>([])

  // Inicializar sessionId al montar el componente
  useEffect(() => {
    const id = getSessionId()
    setSessionId(id)
  }, [])

  // Cargar categorías visibles
  useEffect(() => {
    async function cargarCategorias() {
      try {
        const res = await fetch('/api/configuracion/categorias')
        if (res.ok) {
          const data = await res.json()
          const visibles = data.filter((cat: { visible: boolean }) => cat.visible)
          setCategoriasVisibles(visibles)
          // Si la categoría actual no está visible, cambiar a la primera visible
          if (visibles.length > 0 && !visibles.find((c: { categoria: string }) => c.categoria === categoriaActual)) {
            setCategoriaActual(visibles[0].categoria)
          }
        }
      } catch (error) {
        console.error('Error al cargar categorías:', error)
      }
    }
    cargarCategorias()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    async function cargarDatos() {
      if (!sessionId) return // Esperar a que sessionId esté disponible
      
      try {
        setCargando(true)
        // Cargar productos y contador en paralelo para ser más rápido
        const [productosRes, carritoRes] = await Promise.all([
          fetch(`/api/productos/publico?page=1&limit=${PRODUCTOS_POR_PAGINA}&categoria=${categoriaActual}`, { 
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
  }, [sessionId, categoriaActual]) // Recargar cuando cambie la categoría

  // Cargar más productos (scroll infinito)
  const cargarMasProductos = useCallback(async () => {
    if (cargandoMas || !hasMore) return

    try {
      setCargandoMas(true)
      const nextPage = page + 1
      const res = await fetch(`/api/productos/publico?page=${nextPage}&limit=${PRODUCTOS_POR_PAGINA}&categoria=${categoriaActual}`)
      
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
  }, [page, hasMore, cargandoMas, categoriaActual])

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
          <h2 className="text-2xl font-semibold mb-2 text-center" style={{ color: '#1F0354' }}>
            🍂Tienda de ropa vintage,retro y segunda hand🍂
          </h2>
          
          {/* Botones de Categoría - Solo mostrar botones de categorías no activas */}
          {categoriasVisibles.length > 1 && (
            <div className="mb-6">
              {categoriasVisibles
                .filter((cat) => cat.categoria !== categoriaActual)
                .map((cat) => (
                <button
                  key={cat.categoria}
                  onClick={() => {
                    setCategoriaActual(cat.categoria as 'fimu' | 'perchero')
                    setPage(1)
                    setProductos([])
                  }}
                  className="w-full py-6 rounded-xl font-bold transition-all hover:scale-[1.02] hover:shadow-2xl relative overflow-hidden group"
                  style={{ 
                    background: cat.categoria === 'fimu' 
                      ? 'linear-gradient(135deg, #D1ECFF 0%, #5E18EB 100%)'
                      : 'linear-gradient(135deg, #FFF0FB 0%, #FF5BC7 100%)',
                    color: 'white'
                  }}
                >
                  {/* Efecto de brillo al hover */}
                  <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity" />
                  
                  <div className="relative z-10 flex flex-col items-center gap-2">
                    <span className="text-4xl">{cat.icono}</span>
                    <span className="text-2xl">
                      {cat.categoria === 'fimu' 
                        ? '✨ Descubrí nuestra colección Fimu ✨'
                        : '👗 Explorá el Perchero de tesoros 👗'
                      }
                    </span>
                    <span className="text-sm opacity-90 font-normal">
                      {cat.categoria === 'fimu'
                        ? '🔥 Piezas únicas que cuentan historias'
                        : '💕 Looks increíbles esperándote'
                      }
                    </span>
                    {/* Indicador de click/tap */}
                    <span className="text-sm opacity-80 font-normal mt-1 flex items-center gap-1">
                      👆 Tocá para ver
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
          
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

        {/* Modo Mantenimiento - Si no hay categorías visibles */}
        {categoriasVisibles.length === 0 ? (
          <MantenimientoScreen />
        ) : cargando ? (
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
          <ProductoGrid columns={{ mobile: 2, tablet: 3, desktop: 4 }} gap={4}>
            {productos.map((producto, index) => (
              <ProductoCard
                key={producto.id}
                producto={producto}
                index={index}
                onClick={abrirModal}
                showStock={false}
              />
            ))}
          </ProductoGrid>
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
