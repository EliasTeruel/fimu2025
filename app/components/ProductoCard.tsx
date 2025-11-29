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
  
  // Colores por defecto (Fimu Vintage palette)
  const colors = {
    border: customColors.border || '#FF5BC7',
    imageBg: customColors.imageBg || '#D1ECFF',
    title: customColors.title || '#1F0354',
    price: customColors.price || '#5E18EB',
    button: customColors.button || '#5E18EB',
    disponible: customColors.disponible || '#5E18EB',
    reservado: customColors.reservado || '#FF6012',
    vendido: customColors.vendido || '#00A86B',
  }

  // Obtener imagen principal
  const obtenerImagenPrincipal = () => {
    const imagenPrincipal = producto.imagenes?.find(img => img.esPrincipal)?.url
    return imagenPrincipal || producto.imagenes?.[0]?.url || producto.imagenUrl || '/placeholder.png'
  }

  // Determinar texto y color del badge de estado
  const getEstadoBadge = () => {
    if (producto.estado === 'reservado') {
      return { text: '⏱️ Reservado', bgColor: '#FFF4E6', textColor: colors.reservado }
    }
    if (producto.estado === 'vendido') {
      return { text: '✅ Vendido', bgColor: '#E6FFE6', textColor: colors.vendido }
    }
    return { text: '✓ Disponible', bgColor: '#D1ECFF', textColor: colors.disponible }
  }

  const badge = getEstadoBadge()

  return (
    <div
      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 border-2 cursor-pointer"
      style={{ borderColor: colors.border }}
      onClick={() => onClick?.(producto)}
    >
      {/* Imagen del producto */}
      <div className="relative h-48" style={{ backgroundColor: colors.imageBg }}>
        <Image
          src={CloudinaryPresets.productCard(obtenerImagenPrincipal())}
          alt={producto.nombre}
          fill
          className="object-contain p-2"
          sizes="(max-width: 768px) 50vw, 25vw"
          priority={index < 4}
          loading={index < 4 ? undefined : 'lazy'}
          unoptimized
        />
      </div>

      {/* Contenido de la card */}
      <div className="p-3">
        {/* Título */}
        <h3 
          className="text-base font-semibold mb-1 line-clamp-1" 
          style={{ color: colors.title }}
        >
          {producto.nombre}
        </h3>

        {/* Precio y Badge */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xl font-bold" style={{ color: colors.price }}>
            ${producto.precio.toFixed(2)}
          </span>
          
          {/* Badge de Estado */}
          <span
            className="text-xs px-2 py-1 rounded-full font-semibold"
            style={{ 
              backgroundColor: badge.bgColor,
              color: badge.textColor
            }}
          >
            {badge.text}
          </span>
        </div>

        {/* Stock (opcional) */}
        {showStock && (
          <div className="mb-2">
            <span
              className={`text-xs px-2 py-1 rounded-full font-semibold inline-block ${
                producto.stock > 0 ? 'bg-green-100' : 'bg-red-100'
              }`}
              style={{ color: producto.stock > 0 ? colors.disponible : colors.reservado }}
            >
              {producto.stock > 0 ? `Stock: ${producto.stock}` : 'Sin stock'}
            </span>
          </div>
        )}

        {/* Botón Ver más */}
        <button
          className="w-full py-2 rounded-md text-white font-semibold text-sm hover:opacity-90 transition-opacity"
          style={{ backgroundColor: colors.button }}
          onClick={(e) => {
            e.stopPropagation()
            onClick?.(producto)
          }}
        >
          Ver más info
        </button>
      </div>
    </div>
  )
}
