# 🎨 Sistema de Diseño - Fimu Vintage

## Tipografías Implementadas

### 1. **Kitck Text Black** (`font-title`)
- **Uso:** Títulos principales, encabezados importantes
- **Variable CSS:** `--font-kitck`
- **Clase Tailwind:** `font-title`
- **Ejemplos:**
  - Logo "FIMU VINTAGE"
  - Título de página principal
  - Títulos de secciones
  - Botones de categoría

### 2. **Clean Sans Regular** (`font-body`)
- **Uso:** Texto de cuerpo, navegación, etiquetas
- **Variable CSS:** `--font-clean`
- **Clase Tailwind:** `font-body`
- **Ejemplos:**
  - Nombres de productos
  - Descripciones
  - Botones del navbar
  - Texto informativo
  - Labels y badges

### 3. **Day Dream** (`font-accent`)
- **Uso:** Detalles especiales, textos de resalte
- **Variable CSS:** `--font-daydream`
- **Clase Tailwind:** `font-accent`
- **Ejemplos:**
  - Subtítulos decorativos
  - Mensajes especiales
  - CTAs (Call to Action)
  - Textos destacados

---

## 🎯 Navbar Dinámico Implementado

### Características:
- ✅ **100% Reutilizable** - Un solo componente para toda la app
- ✅ **Configuración basada en roles** - Muestra links según admin/user/guest
- ✅ **Oculta rutas activas** - No muestra el botón de la página actual
- ✅ **Sistema de variantes** - primary/secondary/ghost
- ✅ **Responsive** - Desktop y móvil con menú hamburguesa
- ✅ **Overlay en móvil** - Cierra al hacer click fuera
- ✅ **Contador de carrito** - Badge con cantidad de items

### Configuración de Links:

```typescript
const navLinks: NavLink[] = [
  {
    href: '/',
    label: 'Tienda',
    showWhen: 'admin',      // Solo admins
    hideOnPath: '/',        // Ocultar en home
    variant: 'primary'      // Botón negro
  },
  {
    href: '/carrito',
    label: 'Carrito',
    showWhen: 'always',     // Todos los usuarios
    hideOnPath: '/carrito',
    variant: 'primary'
  },
  // ... más links
]
```

### Variantes de Botones:

1. **primary** - Fondo negro, texto blanco
2. **secondary** - Fondo gris claro, texto negro  
3. **ghost** - Sin fondo, texto negro, hover gris claro

---

## 📝 Cómo agregar nuevos links al Navbar

Solo edita el array `navLinks` en `Navbar.tsx`:

```typescript
{
  href: '/nueva-ruta',
  label: 'Mi Página',
  showWhen: 'user',           // 'always' | 'admin' | 'user' | 'guest'
  hideOnPath: '/nueva-ruta',  // String o Array de rutas
  variant: 'primary'          // 'primary' | 'secondary' | 'ghost'
}
```

---

## 🚀 Para usar las tipografías:

1. Coloca los archivos `.ttf` en `app/fonts/`:
   - `KitckTextBlack.ttf`
   - `CleanSansRegular.ttf`
   - `DayDream.ttf`

2. Si tienes otros formatos (`.otf`, `.woff`, `.woff2`), actualiza las rutas en `app/layout.tsx`

3. Usa las clases en tus componentes:
   ```tsx
   <h1 className="font-title">Título</h1>
   <p className="font-body">Texto normal</p>
   <span className="font-accent">Especial</span>
   ```

---

## ✅ Componentes Actualizados con Tipografías:

- ✅ Navbar (logo + links)
- ✅ Página principal (título + botones + textos)
- ✅ ProductoCard (nombre + precio + botón)
- ✅ MantenimientoScreen (todos los textos)
- ✅ globals.css (estilos base)

---

## 🎨 Paleta de Colores Minimalista:

- **Negro:** `#000000` - Botones primarios, textos principales
- **Blanco:** `#FFFFFF` - Fondos, texto en botones negros
- **Gris Oscuro:** `#333333` - Texto secundario
- **Gris Medio:** `#666666` - Texto deshabilitado
- **Gris Claro:** `#F5F5F5` - Fondos alternos
- **Gris Muy Claro:** `#E5E5E5` - Bordes sutiles

---

## 📦 Archivos Modificados:

1. `app/layout.tsx` - Configuración de fuentes
2. `app/globals.css` - Variables CSS y clases de tipografía
3. `app/components/Navbar.tsx` - Navbar dinámico completo
4. `app/page.tsx` - Tipografías en página principal
5. `app/components/ProductoCard.tsx` - Tipografías en cards
6. `app/components/MantenimientoScreen.tsx` - Tipografías en mantenimiento
