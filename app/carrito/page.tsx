'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import Image from 'next/image'
import Spinner from '../components/Spinner'
import Alert from '../components/Alert'
import Confirm from '../components/Confirm'
import ContactoModal, { ContactoData } from '../components/ContactoModal'
import LoadingScreen from '../components/LoadingScreen'
import { calcularTiempoRestante, obtenerMensajeExpiracion } from '@/lib/reserva-utils'
import { getSessionId } from '@/lib/session'
import { CloudinaryPresets } from '@/lib/cloudinary-utils'
import Navbar from '../components/Navbar'

// ============================================================================
// INTERFACES - Definición de tipos de datos
// ============================================================================

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
  estado?: string                    // 'disponible' | 'reservado' | 'vendido'
  reservadoEn?: Date | null          // Fecha/hora cuando se reservó
  reservaPausada?: boolean           // Si el admin pausó la reserva
  pausadoEn?: Date | null
  compradorInfo?: string | null      // "Nombre Apellido | Tel: XXX | red: @user"
  reservadoPorSessionId?: string | null   // 🔑 Session ID de quien reservó
  reservadoPorUsuarioId?: number | null   // 🔑 User ID de quien reservó
}

// 🔑 CLAVE: CarritoItem ahora incluye sessionId y usuarioId
// Estos campos nos permiten saber quién es el DUEÑO de cada item en el carrito
interface CarritoItem {
  id: number                         // ID único del item en el carrito
  productoId: number                 // ID del producto
  cantidad: number                   // Cantidad (siempre 1)
  sessionId?: string | null          // 🔑 Session ID del DUEÑO de este item
  usuarioId?: number | null          // 🔑 User ID del DUEÑO de este item (si está logueado)
  producto: Producto                 // Producto completo
}

export default function CarritoPage() {
  const supabase = createClient()
  
  // ============================================================================
  // ESTADOS
  // ============================================================================
  const [items, setItems] = useState<CarritoItem[]>([])
  const [cargando, setCargando] = useState(true)
  const [procesandoPago, setProcesandoPago] = useState(false)
  const [vaciandoCarrito, setVaciandoCarrito] = useState(false)
  const [eliminandoItem, setEliminandoItem] = useState<number | null>(null)
  const [tiemposRestantes, setTiemposRestantes] = useState<Record<number, string>>({})
  
  // 🔑 sessionId: Identificador único para usuarios invitados (no logueados)
  const [sessionId, setSessionId] = useState<string>('')
  
  const [alertConfig, setAlertConfig] = useState<{ show: boolean; message: string; type: 'info' | 'success' | 'error' | 'warning'; title?: string } | null>(null)
  const [confirmConfig, setConfirmConfig] = useState<{ show: boolean; message: string; onConfirm: () => void; title?: string } | null>(null)
  const [mostrarContactoModal, setMostrarContactoModal] = useState(false)
  
  // Estados de usuario
  const [userLoggedIn, setUserLoggedIn] = useState(false)
  const [datosUsuario, setDatosUsuario] = useState<ContactoData | null>(null)
  
  // 🔑 miUsuarioId: ID del usuario logueado (null si es invitado)
  // Este ID es fundamental para comparar ownership de productos
  const [miUsuarioId, setMiUsuarioId] = useState<number | null>(null)

  // ============================================================================
  // FUNCIÓN CLAVE: esDeOtroUsuario
  // ============================================================================
  // Esta función determina si un CarritoItem pertenece a OTRO usuario
  // Es el corazón de la lógica para diferenciar "mis productos" vs "productos de otros"
  // ============================================================================
  const esDeOtroUsuario = useCallback((item: CarritoItem): boolean => {
    // Si el producto NO está reservado, entonces NO es de otro usuario
    // (está disponible para todos)
    if (item.producto.estado !== 'reservado') return false
    
    // -------- MÉTODO 1: Comparar por usuarioId (MÁS CONFIABLE) --------
    // Comparar con el usuarioId que está en el PRODUCTO (quién lo reservó)
    if (miUsuarioId && item.producto.reservadoPorUsuarioId) {
      const esDiferente = item.producto.reservadoPorUsuarioId !== miUsuarioId
      console.log(`🔍 Método 1 (usuarioId del PRODUCTO): producto.reservadoPorUsuarioId=${item.producto.reservadoPorUsuarioId}, miUsuarioId=${miUsuarioId}, esDeOtro=${esDiferente}`)
      return esDiferente
    }
    
    // -------- MÉTODO 2: Comparar por sessionId (PARA INVITADOS) --------
    // Comparar con el sessionId que está en el PRODUCTO (quién lo reservó)
    if (!miUsuarioId && sessionId && item.producto.reservadoPorSessionId) {
      const esDiferente = item.producto.reservadoPorSessionId !== sessionId
      console.log(`🔍 Método 2 (sessionId del PRODUCTO): producto.reservadoPorSessionId=${item.producto.reservadoPorSessionId}, miSessionId=${sessionId}, esDeOtro=${esDiferente}`)
      return esDiferente
    }
    
    // -------- MÉTODO 3: Fallback - Comparar por nombre en compradorInfo --------
    // Si no tenemos los nuevos campos, usar el nombre del compradorInfo
    if (datosUsuario) {
      const nombreEnCompradorInfo = item.producto.compradorInfo?.split(' | ')[0] || ''
      const miNombreCompleto = `${datosUsuario.nombre} ${datosUsuario.apellido}`.trim()
      const esDiferente = nombreEnCompradorInfo !== miNombreCompleto && nombreEnCompradorInfo !== ''
      console.log(`🔍 Método 3 (nombre): compradorInfo="${nombreEnCompradorInfo}", miNombre="${miNombreCompleto}", esDeOtro=${esDiferente}`)
      return esDiferente
    }
    
    // Si no hay forma de verificar, asumir que NO es mío (mostrar como de otro)
    console.log('🔍 Sin método de comparación - asumiendo que es de otro usuario')
    return true
  }, [miUsuarioId, sessionId, datosUsuario])

  // Inicializar sessionId
  useEffect(() => {
    const id = getSessionId()
    setSessionId(id)
  }, [])

  // Verificar si el usuario está logueado y obtener sus datos
  useEffect(() => {
    async function verificarUsuario() {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        setUserLoggedIn(true)
        
        // Obtener datos del usuario desde la base de datos
        try {
          const res = await fetch(`/api/usuarios?supabaseId=${user.id}`)
          if (res.ok) {
            const usuario = await res.json()
            setMiUsuarioId(usuario.id) // Guardar el ID del usuario logueado
            setDatosUsuario({
              nombre: usuario.nombre || '',
              apellido: usuario.apellido || '',
              telefono: usuario.whatsapp || '',
              redSocial: usuario.redSocial || 'instagram',
              nombreRedSocial: usuario.nombreRedSocial || ''
            })

            // Migrar carrito de invitado a usuario logueado
            if (sessionId) {
              try {
                const resMigrar = await fetch('/api/carrito/migrar', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    sessionId,
                    usuarioId: usuario.id
                  })
                })
                if (resMigrar.ok) {
                  const dataMigrar = await resMigrar.json()
                  console.log('✅ Carrito migrado:', dataMigrar)
                  // Recargar carrito después de migrar
                  cargarCarrito()
                }
              } catch (error) {
                console.error('Error al migrar carrito:', error)
              }
            }
          }
        } catch (error) {
          console.error('Error al obtener datos del usuario:', error)
        }
      } else {
        setUserLoggedIn(false)
        setDatosUsuario(null)
        setMiUsuarioId(null)
      }
    }
    
    verificarUsuario()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, sessionId])

  // ============================================================================
  // useEffect: Calcular tiempo restante de reservas
  // ============================================================================
  // Este efecto calcula y actualiza el cronómetro cada segundo
  // SOLO para productos que YO reservé (no muestra cronómetro de otros usuarios)
  // ============================================================================
  useEffect(() => {
    const calcularTiempos = () => {
      const nuevos: Record<number, string> = {}
      
      items.forEach(item => {
        // Solo procesar productos reservados con fecha de reserva
        if (item.producto.estado === 'reservado' && item.producto.reservadoEn) {
          
          // 🔑 CLAVE: Usar esDeOtroUsuario para filtrar
          // Si el producto fue reservado por OTRO usuario, NO mostrar cronómetro
          if (esDeOtroUsuario(item)) {
            console.log(`⏭️ Saltando cronómetro de item ${item.id} - es de otro usuario`)
            return // No calcular cronómetro para productos reservados por otros
          }
          
          console.log(`⏱️ Calculando cronómetro para item ${item.id} - es MÍO`)
          
          // Si está pausado por admin, mostrar mensaje especial
          if (item.producto.reservaPausada) {
            nuevos[item.id] = '⏸️ PAUSADO POR ADMIN'
            return
          }

          const reserva = new Date(item.producto.reservadoEn)
          
          // Calcular expiración usando la misma lógica inteligente que el backend
          const expira = new Date(reserva)
          const horaReserva = reserva.getHours()
          
          // Caso especial: 22:XX → 30 minutos normales
          if (horaReserva === 22) {
            expira.setTime(reserva.getTime() + 30 * 60 * 1000)
          }
          // Madrugada/noche (23:00 - 10:00) → Empieza a contar desde las 10:00
          else if (horaReserva >= 23 || horaReserva < 10) {
            if (horaReserva >= 23) {
              expira.setDate(expira.getDate() + 1)
            }
            expira.setHours(10, 30, 0, 0)
          }
          // Horario normal (10:00 - 21:59) → 30 minutos
          else {
            expira.setTime(reserva.getTime() + 30 * 60 * 1000)
          }
          
          // Usar función de la librería para formatear (item.id es único por CarritoItem)
          nuevos[item.id] = calcularTiempoRestante(reserva, expira)
        }
      })
      setTiemposRestantes(nuevos)
    }
    
    calcularTiempos()
    const interval = setInterval(calcularTiempos, 1000)
    return () => clearInterval(interval)
  }, [items, esDeOtroUsuario]) // Agregar esDeOtroUsuario a las dependencias

  const cargarCarrito = useCallback(async () => {
    if (!sessionId) {
      console.log('⚠️ No hay sessionId, no se puede cargar carrito')
      return
    }
    
    try {
      // Verificar si el usuario está logueado en tiempo real
      const { data: { user } } = await supabase.auth.getUser()
      let url = `/api/carrito?sessionId=${sessionId}`
      
      if (user) {
        // Usuario logueado - buscar por usuarioId
        const resUsuario = await fetch(`/api/usuarios?supabaseId=${user.id}`)
        if (resUsuario.ok) {
          const usuario = await resUsuario.json()
          if (usuario && usuario.id) {
            url = `/api/carrito?usuarioId=${usuario.id}`
            console.log('👤 Cargando carrito por usuarioId:', usuario.id)
          }
        }
      } else {
        console.log('👤 Cargando carrito por sessionId:', sessionId)
      }
      
      console.log('📡 Fetching:', url)
      const response = await fetch(url)
      const data = await response.json()
      
      console.log('📦 Carrito recibido:', data)
      
      // Si hay un error en el API, data será un objeto con error, no un array
      if (Array.isArray(data)) {
        setItems(data)
        console.log(`✅ ${data.length} items cargados en el carrito`)
      } else {
        console.error('❌ Error del API:', data)
        setItems([])
      }
    } catch (error) {
      console.error('❌ Error al cargar carrito:', error)
      setItems([])
    } finally {
      setCargando(false)
    }
  }, [sessionId, supabase])

  useEffect(() => {
    if (sessionId) {
      cargarCarrito()
    }
  }, [sessionId, userLoggedIn, cargarCarrito]) // Recargar cuando cambia el estado de login

  // Recargar carrito cada 10 segundos para actualizar estados (pausas, expiraciones, etc)
  useEffect(() => {
    if (!sessionId) return

    const interval = setInterval(() => {
      cargarCarrito()
    }, 10000) // Cada 10 segundos

    return () => clearInterval(interval)
  }, [sessionId, cargarCarrito])

  // Eliminar automáticamente productos vendidos del carrito
  useEffect(() => {
    const productosVendidos = items.filter(item => item.producto.estado === 'vendido')
    
    if (productosVendidos.length > 0) {
      productosVendidos.forEach(async (item) => {
        try {
          await fetch(`/api/carrito/${item.id}`, {
            method: 'DELETE'
          })
        } catch (error) {
          console.error('Error al eliminar producto vendido:', error)
        }
      })
      
      // Recargar carrito después de eliminar
      setTimeout(() => cargarCarrito(), 1000)
    }
  }, [items, cargarCarrito])

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
    // Contar productos no reservados
    const productosNoReservados = items.filter(item => item.producto.estado !== 'reservado')
    const mensaje = productosNoReservados.length === items.length
      ? '¿Vaciar todo el carrito?'
      : `¿Eliminar ${productosNoReservados.length} producto(s) del carrito? (Los productos reservados se mantendrán)`

    setConfirmConfig({
      show: true,
      message: mensaje,
      onConfirm: async () => {
        setConfirmConfig(null)
        setVaciandoCarrito(true)
        try {
          // Eliminar solo productos no reservados
          const idsAEliminar = productosNoReservados.map(item => item.id)
          
          for (const id of idsAEliminar) {
            const response = await fetch(`/api/carrito/${id}`, {
              method: 'DELETE'
            })

            if (!response.ok) {
              console.error(`Error al eliminar item ${id}`)
            }
          }

          await cargarCarrito()
          
          if (productosNoReservados.length > 0) {
            setAlertConfig({ 
              show: true, 
              message: `${productosNoReservados.length} producto(s) eliminado(s)`, 
              type: 'success' 
            })
          }
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
    // Excluir productos reservados por OTROS clientes
    return items.reduce((total, item) => {
      // No sumar productos reservados por otros
      if (esDeOtroUsuario(item)) return total
      
      return total + item.producto.precio
    }, 0)
  }

  const procederAlPago = async () => {
    if (items.length === 0) return

    // Si el usuario está logueado y tiene datos completos, proceder directamente
    if (userLoggedIn && datosUsuario && datosUsuario.telefono) {
      await confirmarReservaConDatos(datosUsuario)
    } else {
      // Si no está logueado o no tiene teléfono, mostrar modal
      setMostrarContactoModal(true)
    }
  }

  const confirmarReservaConDatos = async (contactoData: ContactoData) => {
    setMostrarContactoModal(false)
    setProcesandoPago(true)

    try {
      // Separar productos: nuevos (disponibles) vs ya reservados POR MÍ
      const productosNuevos = items.filter(item => item.producto.estado === 'disponible')
      
      const productosYaReservados = items.filter(item => {
        if (item.producto.estado !== 'reservado') return false
        // Solo contar como "ya reservado" si LO RESERVÉ YO (no es de otro usuario)
        return !esDeOtroUsuario(item)
      })
      
      // Solo reservar si hay productos nuevos
      if (productosNuevos.length > 0) {
        const productosNuevosIds = productosNuevos.map(item => item.productoId)
        const compradorInfo = `${contactoData.nombre} ${contactoData.apellido} | Tel: ${contactoData.telefono} | ${contactoData.redSocial}: ${contactoData.nombreRedSocial || 'N/A'}`

        // 1. Reservar productos nuevos (y extender los existentes)
        const responseReserva = await fetch('/api/ventas/reservar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productosIds: productosNuevosIds,
            compradorInfo,
            sessionId,
            usuarioId: miUsuarioId  // 🔑 Enviar usuarioId si está logueado
          })
        })

        const dataReserva = await responseReserva.json()

        if (!responseReserva.ok) {
          setAlertConfig({ show: true, message: dataReserva.error || 'Error al reservar productos', type: 'error' })
          return
        }

        console.log('📦 Reserva actualizada:', {
          nuevos: dataReserva.productosNuevos,
          extendidos: dataReserva.productosExtendidos,
          total: dataReserva.productosReservados
        })
      }

      // 2. Enviar notificación por WhatsApp (con TODOS los productos)
      // ⚠️ TEMPORALMENTE COMENTADO PARA TESTING
      /*
      const adminPhone = process.env.NEXT_PUBLIC_ADMIN_WHATSAPP || '+5491123882449'
      
      try {
        const responseWhatsApp = await fetch('/api/notificaciones/whatsapp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            adminPhone,
            clienteNombre: `${contactoData.nombre} ${contactoData.apellido}`,
            clienteTelefono: contactoData.telefono,
            clienteRedSocial: contactoData.nombreRedSocial ? `${contactoData.redSocial}: ${contactoData.nombreRedSocial}` : null,
            productos: items.map(item => ({
              nombre: item.producto.nombre,
              precio: item.producto.precio
            })),
            total: calcularTotal()
          })
        })

        const dataWhatsApp = await responseWhatsApp.json()
        
        if (!responseWhatsApp.ok) {
          console.error('Error al enviar WhatsApp:', dataWhatsApp)
          // No bloqueamos la reserva si falla el WhatsApp
        } else {
          console.log('✅ Notificación WhatsApp enviada:', dataWhatsApp)
        }
      } catch (errorWhatsApp) {
        console.error('Error al enviar notificación WhatsApp:', errorWhatsApp)
        // No bloqueamos la reserva si falla el WhatsApp
      }
      */

      const mensajeExtra = productosYaReservados.length > 0
        ? `\n\n(${productosYaReservados.length} producto(s) ya estaban reservados - tiempo extendido)`
        : ''

      // Obtener mensaje de expiración inteligente
      const mensajeExpiracion = obtenerMensajeExpiracion(new Date())

      setAlertConfig({ 
        show: true, 
        title: '✅ Reserva confirmada!',
        message: `Gracias ${contactoData.nombre}! ${mensajeExpiracion}${mensajeExtra}\n\n💰 TOTAL A PAGAR: $${calcularTotal().toFixed(2)}\n\n📸 DATOS DE PAGO:\nAlias: fimu.vintage\nNombre: Elias Teruel\n\n📱 Enviá el comprobante por:\n• WhatsApp: ${process.env.NEXT_PUBLIC_ADMIN_WHATSAPP}\n• Instagram: @fimu_vintage\n\n⏰ Si no se confirma el pago antes de que expire la reserva, se cancelará automáticamente.`, 
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

  if (cargando) {
    return <LoadingScreen message="Cargando carrito..." />
  }

  return (
    <>
      <Navbar cantidadCarrito={items.length} />
      <div className="min-h-screen p-4 bg-white" style={{ paddingTop: '120px' }}>
        {/* Header */}
        <div className="max-w-4xl mx-auto mb-6">
        <div className="flex items-center justify-between mb-4">
          <Link 
            href="/"
            className="px-4 py-2 font-semibold text-white hover:bg-gray-700 transition-colors bg-black font-body uppercase tracking-wide"
          >
            ← Volver
          </Link>
          {items.length > 0 && items.some(item => item.producto.estado !== 'reservado') && (
            <button
              onClick={vaciarCarrito}
              disabled={vaciandoCarrito}
              className="px-4 py-2 font-semibold text-white hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 bg-black font-body uppercase tracking-wide"
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
        <h2 className="text-3xl font-bold font-title uppercase tracking-wide text-black">
           Mi Carrito
        </h2>
      </div>

      {/* Contenido */}
      <div className="max-w-4xl mx-auto">
        {items.length === 0 ? (
          <div className="bg-gray-50 p-8 text-center border-2 border-black">
            <p className="text-xl mb-4 font-body text-black">
              Tu carrito está vacío
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-3 font-semibold text-white hover:bg-gray-700 transition-colors bg-black font-body uppercase tracking-wide"
            >
              Ir a comprar
            </Link>
          </div>
        ) : (
          <>
            {/* ============================================================ */}
            {/* RENDERIZADO DE ITEMS DEL CARRITO */}
            {/* ============================================================ */}
            <div className="space-y-4 mb-6">
              {items.map((item) => {
                // 🔑 CLAVE: Determinar si este item pertenece a OTRO usuario
                const reservadoPorOtro = esDeOtroUsuario(item)
                
                console.log(`🎨 Renderizando item ${item.id}:`, {
                  productoId: item.producto.id,
                  nombre: item.producto.nombre,
                  estado: item.producto.estado,
                  itemSessionId: item.sessionId,
                  itemUsuarioId: item.usuarioId,
                  reservadoPorOtro
                })
                
                return (
                <div
                  key={item.id}
                  className="bg-white p-4 border-2"
                  style={{ 
                    // Borde ROJO si es de otro, GRIS si es mío y reservado, NEGRO si disponible
                    borderColor: reservadoPorOtro ? '#DC2626' : item.producto.estado === 'reservado' ? '#666666' : '#000000',
                    backgroundColor: reservadoPorOtro ? '#FEE2E2' : item.producto.estado === 'reservado' ? '#F5F5F5' : '#fff'
                  }}
                >
                  {/* -------- CARTEL ROJO: Producto reservado por OTRO -------- */}
                  {reservadoPorOtro && (
                    <div className="mb-3 p-4 border-2 border-red-600 bg-red-50">
                      <p className="font-bold text-xl mb-2 font-title uppercase text-red-600">
                        ⚠️ Producto Ya Reservado
                      </p>
                      <p className="text-sm mb-2 font-body text-gray-700">
                        Este producto fue reservado por otro comprador mientras estaba en tu carrito.
                      </p>
                      <p className="text-sm font-semibold font-body text-gray-700">
                        Ya no está disponible para compra. Por favor, elimínalo de tu carrito.
                      </p>
                    </div>
                  )}
                  
                  {/* -------- CRONÓMETRO Y INFO DE PAGO: Solo si LO RESERVÉ YO -------- */}
                  {/* 🔑 Condición: producto reservado Y NO es de otro usuario */}
                  {item.producto.estado === 'reservado' && !reservadoPorOtro && (
                    <div className="mb-3 p-4 border-2 border-black bg-gray-100">
                      <p className="font-bold text-xl mb-2 font-title uppercase text-black">
                        Producto Reservado
                      </p>
                      
                      {/* Mostrar cronómetro (calculado en useEffect) */}
                      {tiemposRestantes[item.id] && (
                        <p className="font-semibold text-lg mb-2 font-body text-gray-700">
                          {tiemposRestantes[item.id]}
                        </p>
                      )}
                      
                      <p className="text-sm mb-1 font-body text-gray-600">
                        Tu producto está reservado y esperando confirmación del pago.
                      </p>
                      <p className="text-sm font-semibold font-body text-black">
                        Si no se confirma la venta en el tiempo indicado, la reserva se cancelará automáticamente y el producto volverá a estar disponible.
                      </p>
                       <p className="text-sm font-semibold font-body text-black">
                        Para confirmar tu compra, realizá la transferencia a:
                      </p>
                      <div className="mt-2 p-3 bg-white border-2 border-black">
                        <p className="text-sm font-bold mb-1 font-title uppercase text-black">
                          💳 Mercado Pago
                        </p>
                        <p className="text-sm font-semibold font-body text-gray-700">
                          Alias: <span className="text-black">fimu.vintage</span>
                        </p>
                        <p className="text-sm font-semibold font-body text-gray-700">
                          Nombre: <span className="text-black">Elias Teruel</span>
                        </p>
                        <p className="text-xs mt-2 font-body text-gray-600">
                          📸 Una vez realizada la transferencia, enviá el comprobante por Instagram o WhatsApp
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-4">
                    {/* Imagen */}
                    <div className="relative w-24 h-24 flex-shrink-0 overflow-hidden bg-gray-50">
                      <Image
                        src={CloudinaryPresets.thumbnail(obtenerImagenPrincipal(item.producto))}
                        alt={item.producto.nombre}
                        fill
                        className="object-cover"
                        loading="lazy"
                        unoptimized
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-body text-lg mb-1 truncate font-title uppercase text-black">
                        {item.producto.nombre}
                      </h3>
                      <p className="text-xl font-body mb-2 font-title text-black">
                        ${item.producto.precio.toFixed(2)}
                      </p>
                    </div>

                    {/* Eliminar - Solo si no está reservado o si está reservado por otro */}
                    {(item.producto.estado !== 'reservado' || reservadoPorOtro) && (
                      <div className="flex flex-col items-end justify-between">
                        <button
                          onClick={() => eliminarItem(item.id)}
                          disabled={eliminandoItem === item.id}
                          className="px-3 py-1 font-semibold text-white hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center gap-2 bg-black font-body uppercase tracking-wide"
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
              )})}
            </div>

            {/* Total y Checkout */}
            <div className="bg-white p-6 border-2 border-black">
              {/* Separar productos por estado */}
              {(() => {
                const productosDisponibles = items.filter(item => item.producto.estado === 'disponible')
                const productosReservados = items.filter(item => {
                  if (item.producto.estado !== 'reservado') return false
                  // Solo contar como reservados si son MIS reservas (no es de otro usuario)
                  return !esDeOtroUsuario(item)
                })
                const hayDisponibles = productosDisponibles.length > 0
                const hayReservados = productosReservados.length > 0
                const totalComprable = calcularTotal()
                const hayProductosComprables = totalComprable > 0

                return (
                  <>
                    {/* Mostrar total solo si hay productos comprables */}
                    {hayProductosComprables && (
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xl font-bold font-title uppercase text-black">
                          Total:
                        </span>
                        <span className="text-3xl font-bold font-title text-black">
                          ${totalComprable.toFixed(2)}
                        </span>
                      </div>
                    )}
                    
                    {/* Botón para reservar productos disponibles */}
                    {hayDisponibles && (
                      <button
                        onClick={procederAlPago}
                        disabled={procesandoPago}
                        className="w-full py-4 font-bold text-white text-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-4 bg-black font-title uppercase tracking-wide"
                      >
                        {procesandoPago ? (
                          <>
                            <Spinner size="sm" color="#ffffff" />
                            <span>Procesando...</span>
                          </>
                        ) : `💳 Reservar ${productosDisponibles.length} Producto${productosDisponibles.length > 1 ? 's' : ''}`}
                      </button>
                    )}

                    {/* Mensaje de productos reservados */}
                    {hayReservados && (
                      <div className="p-4 text-center bg-gray-100 border-2 border-black">
                        <p className="font-bold font-title uppercase text-black">⏱️ {productosReservados.length} Producto{productosReservados.length > 1 ? 's' : ''} Reservado{productosReservados.length > 1 ? 's' : ''}</p>
                        <p className="text-sm mt-1 font-body text-gray-700">
                          Esperando confirmación del pago por parte del vendedor
                        </p>
                        {hayDisponibles && (
                          <p className="text-sm mt-2 font-semibold font-body text-black">
                            ⬆️ Podés agregar más productos a tu reserva
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )
              })()}
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

      {mostrarContactoModal && (
        <ContactoModal
          onClose={() => setMostrarContactoModal(false)}
          onSubmit={confirmarReservaConDatos}
        />
      )}
      </div>
    </>
  )
}
