'use client'

import Link from "next/link"
import { useState, useMemo } from "react"
import { usePathname } from "next/navigation"
import { useAuth } from '../contexts/AuthContext'

interface NavLink {
  href: string
  label: string
  showWhen: 'always' | 'admin' | 'user' | 'guest'
  hideOnPath?: string | string[]
  variant?: 'primary' | 'secondary' | 'ghost'
}

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

  // Configuración dinámica de links
  const navLinks: NavLink[] = useMemo(() => [
    {
      href: '/',
      label: 'Tienda',
      showWhen: 'admin',
      hideOnPath: '/',
      variant: 'primary'
    },
    {
      href: '/admin',
      label: 'Productos',
      showWhen: 'admin',
      hideOnPath: '/admin',
      variant: 'primary'
    },
    {
      href: '/admin/ventas',
      label: 'Ventas',
      showWhen: 'admin',
      hideOnPath: '/admin/ventas',
      variant: 'primary'
    },
    {
      href: '/como-comprar',
      label: 'Cómo Comprar',
      showWhen: 'always',
      hideOnPath: '/como-comprar',
      variant: 'ghost'
    },
    {
      href: '/preguntas-frecuentes',
      label: 'Preguntas Frecuentes',
      showWhen: 'always',
      hideOnPath: '/preguntas-frecuentes',
      variant: 'ghost'
    },
    {
      href: '/perfil',
      label: 'Perfil',
      showWhen: 'user',
      hideOnPath: '/perfil',
      variant: 'ghost'
    },
    {
      href: '/login',
      label: 'Login',
      showWhen: 'guest',
      hideOnPath: '/login',
      variant: 'ghost'
    },
  ], [])

  // Función para determinar si un link debe mostrarse
  const shouldShowLink = (link: NavLink): boolean => {
    // Verificar rol
    if (link.showWhen === 'admin' && !isAdmin) return false
    if (link.showWhen === 'user' && !user) return false
    if (link.showWhen === 'guest' && user) return false

    // Verificar path actual
    if (link.hideOnPath) {
      if (Array.isArray(link.hideOnPath)) {
        if (link.hideOnPath.some(path => pathname === path)) return false
      } else {
        if (pathname === link.hideOnPath) return false
      }
    }

    return true
  }

  // Filtrar links visibles
  const visibleLinks = navLinks.filter(shouldShowLink)

  // Estilos de variantes
  const getVariantClasses = (variant: 'primary' | 'secondary' | 'ghost' = 'primary') => {
    switch (variant) {
      case 'primary':
        return 'px-4 py-2 text-sm font-medium bg-white text-black border-2 border-black hover:bg-gray-100 transition-colors uppercase tracking-wider font-body'
      case 'secondary':
        return 'px-4 py-2 text-sm font-medium bg-black text-white hover:bg-gray-800 transition-colors uppercase tracking-wider font-body'
      case 'ghost':
        return 'px-4 py-2 text-sm font-medium bg-white text-black border-2 border-black hover:bg-gray-100 transition-colors uppercase tracking-wider font-body'
    }
  }

  return (
    <>
      {/* Header fijo - Minimalista */}
      <header className="fixed top-0 left-0 right-0 border-b border-black z-30 bg-white">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <Link href="/">
              <h1 className="text-2xl sm:text-3xl font-bold cursor-pointer tracking-tight text-black uppercase font-title">
                Fimu Vintage
              </h1>
            </Link>
            
            <div className="flex items-center gap-2">
              {/* Icono de carrito - siempre visible */}
              <Link href="/carrito" className="relative p-2 hover:bg-gray-100 transition-colors">
                {/* Icono de bolsa de compras */}
                <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                {cantidadCarrito > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-black text-white flex items-center justify-center text-xs font-bold">
                    {cantidadCarrito}
                  </span>
                )}
              </Link>

              {/* Botón hamburguesa - solo móvil */}
              {!menuAbierto && (
                <button
                  onClick={() => setMenuAbierto(true)}
                  className="md:hidden p-2 hover:bg-gray-100 transition-colors"
                  aria-label="Menú"
                >
                  <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              )}
            </div>

            {/* Nav Desktop - Dinámico */}
            <nav className="hidden md:flex gap-2 items-center">
              {visibleLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={getVariantClasses(link.variant)}
                >
                  {link.label}
                </Link>
              ))}
              
              {/* Cerrar Sesión */}
              {user && (
                <button
                  onClick={handleLogout}
                  className={getVariantClasses('secondary')}
                >
                  Salir
                </button>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Menú lateral derecho - móvil */}
      {menuAbierto && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 z-40 md:hidden"
            onClick={() => setMenuAbierto(false)}
          />
          
          {/* Panel lateral */}
          <div className="fixed top-0 right-0 h-full w-64 border-l border-black z-50 md:hidden overflow-y-auto bg-white">
            <div className="p-4">
              {/* Botón cerrar */}
              <button
                onClick={() => setMenuAbierto(false)}
                className="absolute top-4 right-4 p-2 hover:bg-gray-100 transition-colors"
                aria-label="Cerrar menú"
              >
                <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <h2 className="text-xl font-bold mb-6 mt-2 text-black uppercase tracking-wider font-title">Menú</h2>

              <div className="flex flex-col gap-2">
                {visibleLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuAbierto(false)}
                    className={getVariantClasses(link.variant).replace('text-sm', 'text-base').replace('py-2', 'py-3')}
                  >
                    {link.label}
                  </Link>
                ))}
                
                {/* Cerrar Sesión */}
                {user && (
                  <button
                    onClick={() => {
                      setMenuAbierto(false)
                      handleLogout()
                    }}
                    className={getVariantClasses('secondary').replace('text-sm', 'text-base').replace('py-2', 'py-3') + ' text-left'}
                  >
                    Salir
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
