# 📦 Componentes Reutilizables - Guía de Uso

## ✅ ¿Qué se creó?

### 1. **ProductoCard** (`app/components/ProductoCard.tsx`)
Card individual de producto totalmente reutilizable y personalizable.

### 2. **ProductoGrid** (`app/components/ProductoGrid.tsx`)
Grid container responsive para organizar las cards.

### 3. **Ejemplo de uso** (`app/accesorios/page.tsx`)
Página ejemplo mostrando cómo crear una nueva sección con otra categoría.

---

## 🎨 Características

### ✨ ProductoCard

**Props disponibles:**

```typescript
interface ProductoCardProps {
  producto: Producto              // Datos del producto
  index?: number                  // Índice para lazy loading
  onClick?: (producto) => void    // Callback al hacer click
  showStock?: boolean             // Mostrar/ocultar stock
  customColors?: {                // Personalizar colores
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
```

**Ejemplo de uso:**

```tsx
<ProductoCard
  producto={producto}
  index={0}
  onClick={abrirModal}
  showStock={false}
  customColors={{
    border: '#FF5BC7',
    button: '#5E18EB',
  }}
/>
```

---

### 📐 ProductoGrid

**Props disponibles:**

```typescript
interface ProductoGridProps {
  children: ReactNode             // Cards a mostrar
  columns?: {                     // Columnas responsivas
    mobile?: number               // Default: 2
    tablet?: number               // Default: 3
    desktop?: number              // Default: 4
  }
  gap?: number                    // Espacio entre cards (Default: 4)
  className?: string              // Clases adicionales
}
```

**Ejemplo de uso:**

```tsx
<ProductoGrid 
  columns={{ mobile: 2, tablet: 3, desktop: 4 }} 
  gap={4}
>
  {productos.map((producto, index) => (
    <ProductoCard key={producto.id} producto={producto} index={index} />
  ))}
</ProductoGrid>
```

---

## 🚀 Cómo crear una nueva categoría

### Paso 1: Crear nueva página

```bash
# Crear carpeta para la categoría
mkdir app/nueva-categoria

# Crear el archivo page.tsx
```

### Paso 2: Copiar estructura

Usa `app/accesorios/page.tsx` como base y modifica:

```tsx
'use client'

import ProductoCard, { Producto } from "../components/ProductoCard"
import ProductoGrid from "../components/ProductoGrid"
import ProductoModal from "../components/ProductoModal"
// ... otros imports

export default function MiCategoria() {
  // ... estados y lógica

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#D1ECFF' }}>
      <Navbar />

      <main className="max-w-7xl mx-auto py-12 px-4" style={{ paddingTop: '120px' }}>
        <h2>🎯 Mi Nueva Categoría</h2>

        {/* Grid reutilizable */}
        <ProductoGrid columns={{ mobile: 2, tablet: 3, desktop: 4 }} gap={4}>
          {productos.map((producto, index) => (
            <ProductoCard
              key={producto.id}
              producto={producto}
              index={index}
              onClick={abrirModal}
              customColors={{
                border: '#TU_COLOR',
                button: '#TU_COLOR',
              }}
            />
          ))}
        </ProductoGrid>
      </main>
    </div>
  )
}
```

---

## 🎨 Personalización de colores por categoría

```tsx
// Ropa Vintage (colores actuales)
<ProductoCard
  customColors={{
    border: '#FF5BC7',
    imageBg: '#D1ECFF',
    button: '#5E18EB',
  }}
/>

// Accesorios (colores rosas)
<ProductoCard
  customColors={{
    border: '#FF5BC7',
    imageBg: '#FFF0FB',
    button: '#FF5BC7',
  }}
/>

// Zapatos (colores naranjas)
<ProductoCard
  customColors={{
    border: '#FF6012',
    imageBg: '#FFF4E6',
    button: '#FF6012',
  }}
/>

// Bolsos (colores morados)
<ProductoCard
  customColors={{
    border: '#5E18EB',
    imageBg: '#E6DEFF',
    button: '#5E18EB',
  }}
/>
```

---

## 📊 Ventajas de esta arquitectura

### ✅ Reutilizable
- Mismos componentes para todas las categorías
- No duplicar código

### ✅ Escalable
- Agregar nuevas categorías en minutos
- Mantener consistencia visual

### ✅ Mantenible
- Cambios en un solo lugar afectan todo
- Fácil de actualizar

### ✅ Personalizable
- Colores por categoría
- Grid flexible
- Props opcionales

### ✅ Performante
- Lazy loading integrado
- Scroll infinito incluido
- Optimización de imágenes

---

## 🔧 Configuración rápida

### Cambiar cantidad de productos por página:
```tsx
const PRODUCTOS_POR_PAGINA = 6 // Tu número
```

### Cambiar columnas del grid:
```tsx
<ProductoGrid 
  columns={{ 
    mobile: 2,   // Móvil: 2 columnas
    tablet: 3,   // Tablet: 3 columnas
    desktop: 4   // Desktop: 4 columnas
  }} 
/>
```

### Mostrar/ocultar stock:
```tsx
<ProductoCard showStock={true} /> // Mostrar
<ProductoCard showStock={false} /> // Ocultar (default)
```

---

## 🎯 Próximos pasos

1. **Agregar sistema de categorías en DB**
   ```sql
   ALTER TABLE productos ADD COLUMN categoria VARCHAR(50);
   ```

2. **Filtrar productos por categoría en API**
   ```typescript
   // En /api/productos/publico
   const categoria = searchParams.get('categoria')
   where.categoria = categoria
   ```

3. **Crear navegación entre categorías**
   ```tsx
   <Link href="/ropa">Ropa</Link>
   <Link href="/accesorios">Accesorios</Link>
   <Link href="/zapatos">Zapatos</Link>
   ```

---

## 📝 Ejemplo completo de implementación

Ver archivo: `app/accesorios/page.tsx`

Este ejemplo muestra:
- ✅ Uso de ProductoCard y ProductoGrid
- ✅ Scroll infinito
- ✅ Loading states
- ✅ Modal de producto
- ✅ Personalización de colores
- ✅ Responsive design

¡Tu proyecto ahora es completamente escalable! 🚀
