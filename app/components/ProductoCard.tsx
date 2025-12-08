import Image from 'next/image'
import { CloudinaryPresets } from '@/lib/cloudinary-utils'

interface ProductoImagen {
  id: number
  url: string
  esPrincipal: boolean
  orden: number
}

export interface Producto {
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
  categoria?: string
}

interface ProductoCardProps {
  producto: Producto
  index?: number
  onClick?: (producto: Producto) => void
  showStock?: boolean
  customColors?: {
    border?: string
    imageBg?: string
    title?: string
    price?: string
    button?: string
    disponible?: string
    reservado?: string
    vendido?: string
  }
}

export default function ProductoCard({ 
  producto, 
  index = 0,
  onClick,
  showStock = false,
  customColors = {}
}: ProductoCardProps) {
  
  // Colores minimalistas (blanco, negro y grises)
  const colors = {
    border: customColors.border || '#000000',
    imageBg: customColors.imageBg || '#FFFFFF',
    title: customColors.title || '#000000',
    price: customColors.price || '#000000',
    button: customColors.button || '#000000',
    disponible: customColors.disponible || '#000000',
    reservado: customColors.reservado || '#666666',
    vendido: customColors.vendido || '#999999',
  }

  // Obtener imagen principal
  const obtenerImagenPrincipal = () => {
    const imagenPrincipal = producto.imagenes?.find(img => img.esPrincipal)?.url
    return imagenPrincipal || producto.imagenes?.[0]?.url || producto.imagenUrl || '/placeholder.png'
  }

  // Determinar texto y color del badge de estado
  const getEstadoBadge = () => {
    if (producto.estado === 'reservado') {
      return { text: 'RESERVADO', bgColor: '#E5E5E5', textColor: colors.reservado }
    }
    if (producto.estado === 'vendido') {
      return { text: 'VENDIDO', bgColor: '#F5F5F5', textColor: colors.vendido }
    }
    return { text: 'DISPONIBLE', bgColor: '#FFFFFF', textColor: colors.disponible }
  }

  const badge = getEstadoBadge()

  return (
    <div
      className="bg-white overflow-hidden hover:opacity-80 transition-opacity duration-300 cursor-pointer"
      onClick={() => onClick?.(producto)}
    >
      {/* Imagen del producto - ocupa todo el ancho sin padding */}
      <div className="relative aspect-square w-full" style={{ backgroundColor: colors.imageBg }}>
        <Image
          src={CloudinaryPresets.productCard(obtenerImagenPrincipal())}
          alt={producto.nombre}
          fill
          className="object-contain"
          sizes="(max-width: 768px) 50vw, 25vw"
          priority={index < 4}
          loading={index < 4 ? undefined : 'lazy'}
          unoptimized
        />
      </div>

      {/* Contenido de la card - información abajo */}
      <div className="p-4 bg-white">
        {/* Título */}
        <h3 
          className="text-sm font-medium mb-2 line-clamp-1 uppercase tracking-wide font-body" 
          style={{ color: colors.title }}
        >
          {producto.nombre}
        </h3>

        {/* Precio y Badge */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-lg font-body font-title" style={{ color: colors.price }}>
            ${producto.precio.toFixed(2)}
          </span>
          
          {/* Badge de Estado - Solo mostrar si está vendido */}
          {producto.estado === 'vendido' && (
            <span
              className="text-xs px-3 py-1 font-medium tracking-wider font-body"
              style={{ 
                backgroundColor: badge.bgColor,
                color: badge.textColor,
                border: `1px solid ${badge.textColor}`
              }}
            >
              {badge.text}
            </span>
          )}
        </div>

        {/* Stock (opcional) */}
        {showStock && (
          <div className="mb-3">
            <span
              className="text-xs px-3 py-1 font-medium tracking-wider inline-block font-body"
              style={{ 
                backgroundColor: producto.stock > 0 ? '#FFFFFF' : '#F5F5F5',
                color: producto.stock > 0 ? colors.disponible : colors.reservado,
                border: `1px solid ${producto.stock > 0 ? colors.disponible : colors.reservado}`
              }}
            >
              {producto.stock > 0 ? `STOCK: ${producto.stock}` : 'SIN STOCK'}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
