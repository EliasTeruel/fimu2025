'use client'

import Link from "next/link"
import { useState } from "react"
import { usePathname } from "next/navigation"
import { useAuth } from '../contexts/AuthContext'

interface NavbarProps {
  cantidadCarrito?: number
}

export default function Navbar({ cantidadCarrito = 0 }: NavbarProps) {
  const { user, isAdmin, logout } = useAuth()
  const [menuAbierto, setMenuAbierto] = useState(false)
  const pathname = usePathname()

  const handleLogout = async () => {
    await logout()
    window.location.href = '/'
  }

  return (
    <>
      {/* Header fijo */}
      <header className="fixed top-0 left-0 right-0 shadow-lg z-30" style={{ backgroundColor: '#1F0354' }}>
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <Link href="/">
              <h1 className="text-2xl sm:text-3xl font-bold cursor-pointer" style={{ color: '#D1ECFF' }}>
                Fimu Vintage
              </h1>
            </Link>
            
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
              {/* Botón Tienda - solo si NO estás en home y eres admin */}
              {isAdmin && pathname !== '/' && (
                <Link
                  href="/"
                  className="px-4 py-2 text-sm font-medium text-white rounded-md hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: '#FF5BC7' }}
                >
                  🏪 Tienda
                </Link>
              )}

              {/* Botón Productos (Admin) - solo si eres admin y NO estás en /admin */}
              {isAdmin && pathname !== '/admin' && (
                <Link
                  href="/admin"
                  className="px-4 py-2 text-sm font-medium text-white rounded-md hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: '#5E18EB' }}
                >
                  📦 Productos
                </Link>
              )}

              {/* Botón Ventas - solo si eres admin y NO estás en /admin/ventas */}
              {isAdmin && pathname !== '/admin/ventas' && (
                <Link
                  href="/admin/ventas"
                  className="px-4 py-2 text-sm font-medium text-white rounded-md hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: '#FF5BC7' }}
                >
                  📊 Ventas
                </Link>
              )}

              {/* Botón Carrito - ocultar si estás en /carrito */}
              {pathname !== '/carrito' && (
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
              )}
              
              {/* Mi Perfil - solo si está logueado y NO estás en /perfil */}
              {user && pathname !== '/perfil' && (
                <Link
                  href="/perfil"
                  className="px-4 py-2 text-sm font-medium hover:opacity-80 transition-opacity"
                  style={{ color: '#D1ECFF' }}
                >
                  Mi Perfil
                </Link>
              )}
              
              {/* Iniciar Sesión - solo si NO está logueado y NO estás en /login */}
              {!user && pathname !== '/login' && (
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm font-medium hover:opacity-80 transition-opacity"
                  style={{ color: '#D1ECFF' }}
                >
                  Iniciar Sesión
                </Link>
              )}
              
              {/* Admin - solo si es admin y NO estás en /admin o /admin/ventas */}
              {isAdmin && !pathname?.startsWith('/admin') && (
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
                {/* Botón Tienda - solo si NO estás en home y eres admin */}
                {isAdmin && pathname !== '/' && (
                  <Link
                    href="/"
                    onClick={() => setMenuAbierto(false)}
                    className="px-4 py-3 text-base font-medium text-white rounded-md hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: '#FF5BC7' }}
                  >
                    🏪 Tienda
                  </Link>
                )}

                {/* Botón Productos (Admin) - solo si eres admin y NO estás en /admin */}
                {isAdmin && pathname !== '/admin' && (
                  <Link
                    href="/admin"
                    onClick={() => setMenuAbierto(false)}
                    className="px-4 py-3 text-base font-medium text-white rounded-md hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: '#5E18EB' }}
                  >
                    📦 Productos
                  </Link>
                )}

                {/* Botón Ventas - solo si eres admin y NO estás en /admin/ventas */}
                {isAdmin && pathname !== '/admin/ventas' && (
                  <Link
                    href="/admin/ventas"
                    onClick={() => setMenuAbierto(false)}
                    className="px-4 py-3 text-base font-medium text-white rounded-md hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: '#FF5BC7' }}
                  >
                    📊 Ventas
                  </Link>
                )}

                {/* Botón Carrito - ocultar si estás en /carrito */}
                {pathname !== '/carrito' && (
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
                )}
                
                {/* Mi Perfil - ocultar si estás en /perfil */}
                {user && pathname !== '/perfil' && (
                  <Link
                    href="/perfil"
                    onClick={() => setMenuAbierto(false)}
                    className="px-4 py-3 text-base font-medium rounded-md hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: '#D1ECFF', color: '#1F0354' }}
                  >
                    👤 Mi Perfil
                  </Link>
                )}
                
                {/* Iniciar Sesión - ocultar si estás en /login */}
                {!user && pathname !== '/login' && (
                  <Link
                    href="/login"
                    onClick={() => setMenuAbierto(false)}
                    className="px-4 py-3 text-base font-medium rounded-md hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: '#D1ECFF', color: '#1F0354' }}
                  >
                    🔐 Iniciar Sesión
                  </Link>
                )}
                
                {/* Admin - ocultar si estás en /admin o /admin/ventas */}
                {isAdmin && !pathname?.startsWith('/admin') && (
                  <Link
                    href="/admin"
                    onClick={() => setMenuAbierto(false)}
                    className="px-4 py-3 text-base font-medium text-white rounded-md hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: '#5E18EB' }}
                  >
                    ⚙️ Admin
                  </Link>
                )}
                
                {/* Cerrar Sesión - siempre visible si está logueado */}
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
    </>
  )
}
