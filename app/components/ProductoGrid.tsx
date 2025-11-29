import { ReactNode } from 'react'

interface ProductoGridProps {
  children: ReactNode
  columns?: {
    mobile?: number
    tablet?: number
    desktop?: number
  }
  gap?: number
  className?: string
}

export default function ProductoGrid({ 
  children, 
  columns = { mobile: 2, tablet: 3, desktop: 4 },
  gap = 4,
  className = ''
}: ProductoGridProps) {
  
  // Construir clases de grid dinámicamente
  const gridCols = `grid-cols-${columns.mobile} md:grid-cols-${columns.tablet} lg:grid-cols-${columns.desktop}`
  const gridGap = `gap-${gap}`
  
  return (
    <div className={`grid ${gridCols} ${gridGap} ${className}`}>
      {children}
    </div>
  )
}
