'use client'

import { useEffect, useState, useCallback, useRef } from "react"
import ProductoModal from "../components/ProductoModal"
import ProductoSkeleton from "../components/ProductoSkeleton"
import ProductoCard, { Producto } from "../components/ProductoCard"
import ProductoGrid from "../components/ProductoGrid"
import Navbar from "../components/Navbar"
import { getSessionId } from "@/lib/session"

// 🔧 CONFIGURACIÓN: Cantidad de productos por página
const PRODUCTOS_POR_PAGINA = 6

export default function AccesoriosPage() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [cargandoMas, setCargandoMas] = useState(false)
  const [sessionId, setSessionId] = useState<string>('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const observerTarget = useRef<HTMLDivElement>(null)

  // Inicializar sessionId
  useEffect(() => {
    const id = getSessionId()
    setSessionId(id)
  }, [])

  // Cargar productos (filtrados por categoría "accesorios")
  useEffect(() => {
    async function cargarDatos() {
      if (!sessionId) return
      
      try {
        setCargando(true)
        // 📝 Aquí podrías filtrar por categoría en el futuro
        const res = await fetch(`/api/productos/publico?page=1&limit=${PRODUCTOS_POR_PAGINA}&categoria=accesorios`, { 
          cache: 'no-store'
        })
        
        if (res.ok) {
          const data = await res.json()
          setProductos(data.productos)
          setHasMore(data.pagination.hasMore)
        }
      } catch (error) {
        console.error('Error al cargar productos:', error)
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
      const res = await fetch(`/api/productos/publico?page=${nextPage}&limit=${PRODUCTOS_POR_PAGINA}&categoria=accesorios`)
      
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

  const cerrarModal = useCallback(() => {
    setModalAbierto(false)
    setProductoSeleccionado(null)
  }, [])

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#D1ECFF' }}>
      <Navbar />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8" style={{ paddingTop: '120px' }}>
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-2" style={{ color: '#1F0354' }}>
            ✨ Accesorios Vintage ✨
          </h2>
          <p style={{ color: '#5E18EB' }}>
            Encuentra los mejores accesorios vintage y retro
          </p>
        </div>

        {cargando ? (
          // Skeletons de carga
          <ProductoGrid columns={{ mobile: 2, tablet: 3, desktop: 4 }} gap={4}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <ProductoSkeleton key={i} />
            ))}
          </ProductoGrid>
        ) : productos.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg" style={{ color: '#5E18EB' }}>
              No hay accesorios disponibles aún.
            </p>
          </div>
        ) : (
          // Grid de productos - COMPONENTE REUTILIZABLE
          <ProductoGrid columns={{ mobile: 2, tablet: 3, desktop: 4 }} gap={4}>
            {productos.map((producto, index) => (
              <ProductoCard
                key={producto.id}
                producto={producto}
                index={index}
                onClick={abrirModal}
                showStock={false}
                // 🎨 Puedes personalizar los colores por categoría
                customColors={{
                  border: '#FF5BC7',
                  imageBg: '#FFF0FB',
                  title: '#1F0354',
                  price: '#5E18EB',
                  button: '#FF5BC7',
                }}
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
