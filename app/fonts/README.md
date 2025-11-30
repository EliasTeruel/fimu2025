# Tipografías de Fimu Vintage

## ✅ Usando Google Fonts (No requiere archivos locales)

El proyecto ahora usa tipografías gratuitas de Google Fonts que se cargan automáticamente:

### Fuentes Implementadas:

1. **Black Ops One** → Títulos
   - Reemplazo de: Kitck Text Black
   - Estilo: Bold, impactante, display
   - Clase: `font-title`
   - Variable: `--font-title`

2. **Inter** → Texto de cuerpo
   - Reemplazo de: Clean Sans Regular
   - Estilo: Limpia, moderna, minimalista
   - Clase: `font-body`
   - Variable: `--font-body`

3. **Pacifico** → Acentos y detalles
   - Reemplazo de: Day Dream
   - Estilo: Script, decorativa, amigable
   - Clase: `font-accent`
   - Variable: `--font-accent`

## 🎯 Cómo usar en el código:

```tsx
// Títulos
<h1 className="font-title">Mi Título</h1>

// Texto normal
<p className="font-body">Mi texto</p>

// Texto de acento/resaltar
<span className="font-accent">Texto especial</span>
```

## 📝 Ventajas de Google Fonts:

✅ No requiere archivos locales  
✅ Carga optimizada y automática  
✅ Gratis y de código abierto  
✅ Soporte para múltiples idiomas  
✅ Actualizaciones automáticas  

## 🔄 Si quieres cambiar las fuentes:

Edita `app/layout.tsx` e importa otras fuentes de Google Fonts:

```typescript
import { NombreFuente } from "next/font/google";

const miFuente = NombreFuente({
  subsets: ['latin'],
  variable: "--font-nombre",
});
```

Ver fuentes disponibles: https://fonts.google.com/

