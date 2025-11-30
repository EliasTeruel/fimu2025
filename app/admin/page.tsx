'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { CldUploadWidget } from 'next-cloudinary'
import Alert from '../components/Alert'
import Confirm from '../components/Confirm'
import Navbar from '../components/Navbar'
import LoadingScreen from '../components/LoadingScreen'
import Spinner from '../components/Spinner'

interface ProductoImagen {
  id?: number
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
  categoria?: string
}

export default function AdminPage() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [eliminandoId, setEliminandoId] = useState<number | null>(null)
  const [alertConfig, setAlertConfig] = useState<{ show: boolean; message: string; type: 'info' | 'success' | 'error' | 'warning'; title?: string } | null>(null)
  const [confirmConfig, setConfirmConfig] = useState<{ show: boolean; message: string; onConfirm: () => void; title?: string } | null>(null)
  const router = useRouter()
  const supabase = createClient()

  // Form state
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [precio, setPrecio] = useState('')
  const [stock, setStock] = useState('1')
  const [imagenUrl, setImagenUrl] = useState('')
  const [imagenes, setImagenes] = useState<ProductoImagen[]>([])
  const [categoria, setCategoria] = useState('fimu')
  
  // Configuración de categorías
  const [categoriasConfig, setCategoriasConfig] = useState<Array<{
    id: number
    categoria: string
    visible: boolean
    nombreMostrar: string
    icono: string | null
  }>>([])
  const [mostrarConfig, setMostrarConfig] = useState(false)

  useEffect(() => {
    async function init() {
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
          // Usuario no encontrado en la base de datos
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

      setLoading(false)

      try {
        const res = await fetch('/api/productos')
        if (res.ok) {
          const data = await res.json()
          setProductos(Array.isArray(data) ? data : [])
        } else {
          setProductos([])
        }
      } catch (error) {
        console.error('Error al cargar productos:', error)
        setProductos([])
      }
      
      // Cargar configuración de categorías
      try {
        const res = await fetch('/api/configuracion/categorias')
        if (res.ok) {
          const data = await res.json()
          setCategoriasConfig(data)
        }
      } catch (error) {
        console.error('Error al cargar configuración de categorías:', error)
      }
    }
    init()
  }, [router, supabase])

  const fetchProductos = async () => {
    try {
      const res = await fetch('/api/productos')
      if (res.ok) {
        const data = await res.json()
        console.log('Productos cargados:', data)
        setProductos(Array.isArray(data) ? data : [])
      } else {
        setProductos([])
      }
    } catch (error) {
      console.error('Error al cargar productos:', error)
      setProductos([])
    }
  }



  const resetForm = () => {
    setNombre('')
    setDescripcion('')
    setPrecio('')
    setStock('1') // Stock por defecto en 1
    setImagenUrl('')
    setImagenes([])
    setCategoria('fimu')
    setEditingId(null)
    setShowForm(false)
  }

  const handleEdit = (producto: Producto) => {
    console.log('Editando producto:', producto)
    console.log('Imágenes del producto:', producto.imagenes)
    setEditandoId(producto.id)
    setEditingId(producto.id)
    setNombre(producto.nombre)
    setDescripcion(producto.descripcion || '')
    setPrecio(producto.precio.toString())
    setStock(producto.stock.toString())
    setImagenUrl(producto.imagenUrl || '')
    setImagenes(producto.imagenes || [])
    setCategoria(producto.categoria || 'fimu')
    setShowForm(true)
    setEditandoId(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const agregarImagen = (url: string) => {
    // Verificar que la URL no exista ya
    if (imagenes.some(img => img.url === url)) {
      console.log('Imagen ya existe, no se agrega duplicada:', url)
      return
    }
    
    console.log('Agregando nueva imagen:', url)
    console.log('Total de imágenes antes de agregar:', imagenes.length)
    
    setImagenes(prev => {
      const nuevaImagen: ProductoImagen = {
        url,
        esPrincipal: prev.length === 0, // Primera imagen es principal por defecto
        orden: prev.length
      }
      const nuevasImagenes = [...prev, nuevaImagen]
      console.log('Total de imágenes después de agregar:', nuevasImagenes.length)
      console.log('Nueva imagen:', nuevaImagen)
      return nuevasImagenes
    })
  }


  const marcarComoPrincipal = (index: number) => {
    console.log('Marcando imagen', index, 'como principal')
    const nuevasImagenes = imagenes.map((img, i) => ({
      ...img,
      esPrincipal: i === index
    }))
    console.log('Nuevas imágenes con principal:', nuevasImagenes)
    setImagenes(nuevasImagenes)
  }

  const eliminarImagen = (index: number) => {
    const nuevasImagenes = imagenes.filter((_, i) => i !== index)
    // Si eliminamos la imagen principal, marcar la primera como principal
    if (imagenes[index].esPrincipal && nuevasImagenes.length > 0) {
      nuevasImagenes[0].esPrincipal = true
    }
    setImagenes(nuevasImagenes)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const productoData = {
      nombre,
      descripcion,
      precio: parseFloat(precio),
      stock: parseInt(stock),
      imagenUrl,
      imagenes: imagenes.length > 0 ? imagenes : undefined,
      categoria
    }

    setGuardando(true)
    try {
      if (editingId) {
        // Actualizar
        await fetch(`/api/productos/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(productoData),
        })
      } else {
        // Crear
        await fetch('/api/productos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(productoData),
        })
      }

      resetForm()
      fetchProductos()
      setAlertConfig({
        show: true,
        message: editingId ? 'Producto actualizado exitosamente' : 'Producto creado exitosamente',
        type: 'success'
      })
    } catch (error) {
      console.error('Error al guardar producto:', error)
      setAlertConfig({
        show: true,
        message: 'Error al guardar el producto',
        type: 'error',
        title: 'Error'
      })
    } finally {
      setGuardando(false)
    }
  }

  const toggleCategoriaVisible = async (categoria: string, visible: boolean) => {
    try {
      const res = await fetch('/api/configuracion/categorias', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoria, visible })
      })

      if (res.ok) {
        // Actualizar estado local
        setCategoriasConfig(prev =>
          prev.map(cat => cat.categoria === categoria ? { ...cat, visible } : cat)
        )
        setAlertConfig({
          show: true,
          message: `Categoría ${visible ? 'mostrada' : 'ocultada'} exitosamente`,
          type: 'success'
        })
      }
    } catch (error) {
      console.error('Error al actualizar categoría:', error)
      setAlertConfig({
        show: true,
        message: 'Error al actualizar categoría',
        type: 'error'
      })
    }
  }

  const handleDelete = async (id: number) => {
    setConfirmConfig({
      show: true,
      message: 'Esta acción no se puede deshacer',
      title: '¿Eliminar producto?',
      onConfirm: async () => {
        setConfirmConfig(null)
        setEliminandoId(id)
        try {
          await fetch(`/api/productos/${id}`, {
            method: 'DELETE',
          })
          fetchProductos()
          setAlertConfig({
            show: true,
            message: 'Producto eliminado exitosamente',
            type: 'success'
          })
        } catch (error) {
          console.error('Error al eliminar producto:', error)
          setAlertConfig({
            show: true,
            message: 'Error al eliminar el producto',
            type: 'error',
            title: 'Error'
          })
        } finally {
          setEliminandoId(null)
        }
      }
    })
  }

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-white" style={{ paddingTop: '100px' }}>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 pt-6">
          <h1 className="text-3xl font-bold font-title uppercase tracking-wide text-black">
            📊 Productos
          </h1>
          <button
            onClick={() => setMostrarConfig(!mostrarConfig)}
            className="px-4 py-2 text-white font-medium hover:bg-gray-700 transition-colors bg-black font-body uppercase tracking-wide"
          >
            ⚙️ {mostrarConfig ? 'Ocultar' : 'Configurar'} Categorías
          </button>
        </div>

        {/* Panel de Configuración de Categorías */}
        {mostrarConfig && (
          <div className="mb-6 bg-white p-6 border-2 border-black">
            <h2 className="text-xl font-semibold mb-4 font-title uppercase text-black">
              ⚙️ Configuración de Categorías
            </h2>
            <p className="text-sm mb-4 font-body text-gray-700">
              Controla qué categorías se muestran en la página principal de la tienda
            </p>
            <div className="space-y-3">
              {categoriasConfig.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-4 border-2"
                  style={{ 
                    borderColor: cat.visible ? '#000000' : '#666666',
                    backgroundColor: cat.visible ? '#F5F5F5' : '#FFFFFF'
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{cat.icono}</span>
                    <div>
                      <h3 className="font-semibold font-title uppercase text-black">
                        {cat.nombreMostrar}
                      </h3>
                      <p className="text-sm font-body text-gray-700">
                        {cat.visible ? '✓ Visible en la tienda' : '✗ Oculta de la tienda'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleCategoriaVisible(cat.categoria, !cat.visible)}
                    className="px-4 py-2 text-white font-medium hover:bg-gray-700 transition-colors bg-black font-body uppercase tracking-wide"
                  >
                    {cat.visible ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Botón para mostrar formulario */}
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="mb-8 px-8 py-3 text-white hover:bg-gray-700 transition-colors font-semibold text-lg flex items-center gap-2 bg-black font-title uppercase tracking-wide"
          >
            <span className="text-2xl">+</span>
            <span>Agregar Nuevo Producto</span>
          </button>
        )}

        {/* Formulario */}
        {showForm && (
          <div className="mb-8 bg-white p-6 border-2 border-black">
            <h2 className="text-xl font-semibold mb-4 font-title uppercase text-black">
              {editingId ? 'Editar Producto' : 'Nuevo Producto'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 font-body text-black">
                  Nombre *
                </label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-3 py-2 border-2 focus:outline-none focus:ring-2 focus:ring-black font-body text-black border-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 font-body text-black">
                  Descripción
                </label>
                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border-2 focus:outline-none focus:ring-2 focus:ring-black font-body text-black border-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 font-body text-black">
                    Precio *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={precio}
                    onChange={(e) => setPrecio(e.target.value)}
                    className="w-full px-3 py-2 border-2 focus:outline-none focus:ring-2 focus:ring-black font-body text-black border-black"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 font-body text-black">
                    Stock *
                  </label>
                  <input
                    type="number"
                    required
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full px-3 py-2 border-2 focus:outline-none focus:ring-2 focus:ring-black font-body text-black border-black"
                  />
                </div>
              </div>

              {/* Campo de Categoría */}
              <div>
                <label className="block text-sm font-medium mb-2 font-body text-black">
                  Categoría *
                </label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="categoria"
                      value="fimu"
                      checked={categoria === 'fimu'}
                      onChange={(e) => setCategoria(e.target.value)}
                      className="w-4 h-4 cursor-pointer"
                      style={{ accentColor: '#5E18EB' }}
                    />
                    <span className="text-sm font-medium" style={{ color: '#1F0354' }}>
                      🛍️ Fimu (Tienda principal)
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="categoria"
                      value="perchero"
                      checked={categoria === 'perchero'}
                      onChange={(e) => setCategoria(e.target.value)}
                      className="w-4 h-4 cursor-pointer"
                      style={{ accentColor: '#FF5BC7' }}
                    />
                    <span className="text-sm font-medium" style={{ color: '#1F0354' }}>
                      👗 Perchero (Categoría especial)
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#1F0354' }}>
                  Imágenes del Producto ({imagenes.length})
                </label>
                
                {/* Debug info */}
                {imagenes.length > 0 && (
                  <div className="text-xs mb-2 p-2 rounded" style={{ backgroundColor: '#D1ECFF', color: '#1F0354' }}>
                    Estado: {imagenes.map((img, i) => `#${i+1}=${img.esPrincipal ? '★' : '○'}`).join(', ')}
                  </div>
                )}
                
                {/* Galería de imágenes */}
                {imagenes.length > 0 && (
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    {imagenes.map((imagen, index) => (
                      <div key={index} className="relative border-2 rounded-lg p-2" style={{ borderColor: imagen.esPrincipal ? '#FF5BC7' : '#FFC3E5', backgroundColor: imagen.esPrincipal ? '#FFF0FB' : '#fff' }}>
                        <div className="absolute top-1 right-1 z-10 bg-white rounded-full px-2 py-0.5 text-xs font-bold" style={{ color: '#5E18EB' }}>
                          #{index + 1}
                        </div>
                        <div className="relative h-24 w-full mb-2">
                          <Image
                            src={imagen.url}
                            alt={`Imagen ${index + 1}`}
                            fill
                            className="object-contain rounded"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          {!imagen.esPrincipal ? (
                            <button
                              type="button"
                              onClick={() => marcarComoPrincipal(index)}
                              className="w-full text-xs py-1 hover:bg-gray-800 transition-colors bg-black text-white font-body uppercase tracking-wide"
                            >
                              ★ Marcar Principal
                            </button>
                          ) : (
                            <span className="w-full text-xs py-1 text-center font-semibold bg-gray-100 text-black border-2 border-black font-body uppercase tracking-wide">
                              ★ PRINCIPAL
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => eliminarImagen(index)}
                            className="w-full py-1 text-xs hover:bg-gray-200 transition-colors border-2 border-black bg-white text-black font-body uppercase tracking-wide"
                          >
                            🗑️ Eliminar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Botón para agregar imágenes */}
                <CldUploadWidget
                  uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET}
                  options={{
                    multiple: true,
                    maxFiles: 10,
                    sources: ['local', 'url', 'camera'],
                  }}
                  onSuccess={(result: { info?: unknown }) => {
                    if (result?.info && typeof result.info === 'object' && 'secure_url' in result.info && typeof result.info.secure_url === 'string') {
                      console.log('Imagen subida:', result.info.secure_url)
                      agregarImagen(result.info.secure_url)
                    }
                  }}
                >
                  {({ open }: { open: () => void }) => (
                    <button
                      type="button"
                      onClick={() => open()}
                      className="w-full py-3 hover:bg-gray-100 transition-colors text-black font-medium text-lg border-2 border-black font-body uppercase tracking-wide bg-white"
                    >
                      📸 Agregar Imagen(es) ({imagenes.length}/10)
                    </button>
                  )}
                </CldUploadWidget>
                <p className="text-xs mt-2 text-gray-600 font-body">
                  💡 Puedes seleccionar múltiples imágenes a la vez. La primera se marca como principal automáticamente.
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={guardando}
                  className="px-6 py-2 text-white hover:bg-gray-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-body uppercase tracking-wide bg-black"
                >
                  {guardando ? (
                    <>
                      <Spinner size="sm" color="#ffffff" />
                      <span>{editingId ? 'Actualizando...' : 'Creando...'}</span>
                    </>
                  ) : (
                    editingId ? 'Actualizar' : 'Crear'
                  )}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={guardando}
                  className="px-6 py-2 hover:bg-gray-200 transition-colors font-medium disabled:opacity-50 border-2 border-black text-black font-body uppercase tracking-wide bg-white"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de productos */}
        <div className="bg-white overflow-hidden border-2 border-black">
          {/* <div className="px-6 py-4 border-b" style={{ borderColor: '#FFC3E5', backgroundColor: '#D1ECFF' }}>
            <h2 className="text-lg font-semibold" style={{ color: '#1F0354' }}>Productos</h2>
          </div> */}
          {productos.length === 0 && !loading ? (
            <div className="p-6 text-center font-body text-gray-700">
              No hay productos. Agrega tu primer producto.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-black">
                <thead className="bg-black">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-white font-body">
                      Imagen
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-white font-body">
                      Nombre
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-white font-body">
                      Precio
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-white font-body">
                      Stock
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-white font-body">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {productos.map((producto) => (
                    <tr key={producto.id} className="hover:bg-gray-50 transition-colors bg-white">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="relative h-16 w-16 bg-gray-50">
                          {(() => {
                            // Buscar imagen principal o usar la primera disponible
                            const imagenPrincipal = producto.imagenes?.find(img => img.esPrincipal)?.url
                              || producto.imagenes?.[0]?.url
                              || producto.imagenUrl
                            
                            return imagenPrincipal ? (
                              <Image
                                src={imagenPrincipal}
                                alt={producto.nombre}
                                fill
                                className="object-contain p-1"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-2xl text-gray-400">
                                📦
                              </div>
                            )
                          })()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-black font-title uppercase">
                          {producto.nombre}
                        </div>
                        {/* {producto.descripcion && (
                          <div className="text-sm" style={{ color: '#5E18EB' }}>
                            {producto.descripcion.substring(0, 50)}
                            {producto.descripcion.length > 50 ? '...' : ''}
                          </div>
                        )} */}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-black font-title">
                        ${producto.precio.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold font-body uppercase ${
                            producto.stock > 0
                              ? 'bg-gray-100 text-black'
                              : 'bg-gray-800 text-white'
                          }`}
                        >
                          {producto.stock}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleEdit(producto)}
                          disabled={editandoId === producto.id || eliminandoId === producto.id}
                          className="mr-4 hover:opacity-60 transition-opacity font-semibold disabled:opacity-50 inline-flex items-center gap-1 text-black font-body uppercase tracking-wide"
                        >
                          {editandoId === producto.id ? (
                            <>
                              <Spinner size="sm" color="#000000" />
                              Cargando...
                            </>
                          ) : (
                            'Editar'
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(producto.id)}
                          disabled={editandoId === producto.id || eliminandoId === producto.id}
                          className="hover:opacity-60 transition-opacity font-semibold disabled:opacity-50 inline-flex items-center gap-1 text-black font-body uppercase tracking-wide"
                        >
                          {eliminandoId === producto.id ? (
                            <>
                              <Spinner size="sm" color="#000000" />
                              Eliminando...
                            </>
                          ) : (
                            'Eliminar'
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Modales de Alert y Confirm */}
      {alertConfig && alertConfig.show && (
        <Alert
          title={alertConfig.title}
          message={alertConfig.message}
          type={alertConfig.type}
          onClose={() => setAlertConfig(null)}
        />
      )}
      
      {confirmConfig && confirmConfig.show && (
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
