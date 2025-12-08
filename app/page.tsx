'use client'

import Link from "next/link"
import { useEffect, useState, useCallback, useRef } from "react"
import ProductoModal from "./components/ProductoModal"
import ProductoSkeleton from "./components/ProductoSkeleton"
import ProductoCard, { Producto } from "./components/ProductoCard"
import ProductoGrid from "./components/ProductoGrid"
import MantenimientoScreen from "./components/MantenimientoScreen"
import Navbar from "./components/Navbar"
import Spinner from "./components/Spinner"
import { getSessionId } from "@/lib/session"

// 🔧 CONFIGURACIÓN: Cantidad de productos por página (scroll infinito)
const PRODUCTOS_POR_PAGINA = 6 // Cambiá este número: 3, 5, 10, 20, etc.

export default function Home() {
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
  const [categoriaActual, setCategoriaActual] = useState<'fimu' | 'perchero'>('fimu')
  const [categoriasVisibles, setCategoriasVisibles] = useState<Array<{
    categoria: string
    nombreMostrar: string
    icono: string | null
  }>>([])
  const [categoriasCargadas, setCategoriasCargadas] = useState(false)

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
          setCategoriasCargadas(true)
          // Si la categoría actual no está visible, cambiar a la primera visible
          if (visibles.length > 0 && !visibles.find((c: { categoria: string }) => c.categoria === categoriaActual)) {
            setCategoriaActual(visibles[0].categoria)
          }
        }
      } catch (error) {
        console.error('Error al cargar categorías:', error)
        setCategoriasCargadas(true)
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

  return (
    <div className="min-h-screen bg-white">
      {/* Usar componente Navbar reutilizable */}
      <Navbar cantidadCarrito={cantidadCarrito} />

      {/* Main Content con padding-top para compensar el header fijo */}
      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 bg-white" style={{ paddingTop: '120px' }}>
        <div className="mb-12">
          <h2 className="text-3xl font-bold mb-6 text-center text-black uppercase tracking-wider border-b-2 border-black pb-4 font-title">
            Tienda de ropa vintage, retro y segunda mano
          </h2>
          
          {/* Botones de Categoría */}
          {categoriasVisibles.length > 1 && (
            <div className="mb-8">
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
                  className="w-full py-8 text-white font-bold transition-all hover:bg-gray-800 relative uppercase tracking-widest text-lg border-black font-title"
                  style={{
                    backgroundColor: cat.categoria === 'perchero' ? '#ffc3e5' : '#D1ECFF',
                    color: cat.categoria === 'perchero' ? '#ff5bc7' : '#1F0354'
                  }}
                >
                  <div className="flex flex-col items-center gap-3">
                    <span className="text-base">
                      {cat.categoria === 'fimu' 
                        ? 'VER COLECCIÓN FIMU'
                        : 'VER PERCHERO'
                      }
                    </span>
                    <span className="text-xs tracking-normal opacity-80 font-body">
                      {cat.categoria === 'fimu'
                        ? 'Piezas únicas · Estilo propio'
                        : 'Looks vintage · Segunda mano'
                      }
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
          
          <div className="text-center text-sm text-gray-600 space-y-1 font-body">
            <p className="uppercase tracking-wide">Entregas zona sur • Envíos a todo el país</p>
            <p className="uppercase tracking-wide">Ropa vintage, retro y segunda mano</p>
            <p className="uppercase tracking-wide">💫Te llevarás joyitas unicas💫
</p>
            <p className="uppercase tracking-wide">👉🏽No se hacen cambios ni devoluciones
</p>
          </div>
  
        </div>

        {/* Modo Mantenimiento - Si no hay categorías visibles */}
        {categoriasCargadas && categoriasVisibles.length === 0 ? (
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
            <div className="flex items-center gap-2 font-body text-black">
              <Spinner size="md" color="#000000" />
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
