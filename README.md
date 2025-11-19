# 🛒 Tienda Online - Full Stack Next.js 15

Una tienda online minimalista y escalable construida con Next.js 15, TypeScript, Prisma, Supabase y Cloudinary.

## 🎯 Características

- ✅ Autenticación de usuarios con Supabase Auth (email/password)
- ✅ CRUD completo de productos
- ✅ Subida de imágenes a Cloudinary
- ✅ Listado público de productos con cards responsivas
- ✅ Panel de administración protegido
- ✅ Base de datos PostgreSQL con Supabase
- ✅ ORM con Prisma
- ✅ Deploy gratuito en Vercel

## 🛠️ Stack Tecnológico

- **Frontend/Backend:** Next.js 15 (App Router) con TypeScript
- **ORM:** Prisma
- **Base de datos:** Supabase (PostgreSQL)
- **Autenticación:** Supabase Auth
- **Storage de imágenes:** Cloudinary
- **Estilos:** TailwindCSS
- **Hosting:** Vercel

## 📦 Instalación

1. **Clonar el repositorio:**
```bash
git clone <tu-repositorio>
cd fimu2025
```

2. **Instalar dependencias:**
```bash
npm install
```

3. **Configurar variables de entorno:**

Copia el archivo `.env.example` a `.env` y completa las variables:

```env
# Database (Supabase PostgreSQL)
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="your-cloud-name"
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET="your-upload-preset"
```

## 🔧 Configuración de Servicios

### 1. Supabase (Base de datos y Autenticación)

1. Crea una cuenta en [Supabase](https://supabase.com)
2. Crea un nuevo proyecto
3. En Settings > Database, copia la `Connection String` (modo de transacción)
4. En Settings > API, copia:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon/public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Habilita Email Authentication en Authentication > Providers

### 2. Cloudinary (Storage de Imágenes)

1. Crea una cuenta en [Cloudinary](https://cloudinary.com)
2. En Dashboard, copia el `Cloud Name`
3. Ve a Settings > Upload > Upload Presets
4. Crea un nuevo preset:
   - Signing Mode: **Unsigned**
   - Folder: `tienda` (o el que prefieras)
   - Copia el nombre del preset

### 3. Prisma (ORM)

Ejecuta las migraciones para crear las tablas:

```bash
npx prisma generate
npx prisma db push
```

Para abrir Prisma Studio (GUI para ver la base de datos):

```bash
npx prisma studio
```

## 🚀 Desarrollo

Inicia el servidor de desarrollo:

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 📁 Estructura del Proyecto

```
fimu2025/
├── app/
│   ├── admin/              # Panel de administración (protegido)
│   │   └── page.tsx
│   ├── api/
│   │   └── productos/      # API routes para CRUD
│   │       ├── route.ts
│   │       └── [id]/
│   │           └── route.ts
│   ├── login/              # Página de login
│   │   └── page.tsx
│   ├── registro/           # Página de registro
│   │   └── page.tsx
│   ├── layout.tsx
│   ├── page.tsx            # Página principal (listado de productos)
│   └── globals.css
├── lib/
│   ├── prisma.ts           # Cliente de Prisma
│   └── supabase/
│       ├── client.ts       # Cliente de Supabase (browser)
│       ├── server.ts       # Cliente de Supabase (server)
│       └── middleware.ts   # Middleware de autenticación
├── prisma/
│   └── schema.prisma       # Schema de la base de datos
├── middleware.ts           # Middleware de Next.js
└── .env                    # Variables de entorno
```

## 📝 Uso

### Como Usuario

1. **Ver productos:** Visita la página principal para ver todos los productos disponibles
2. **Registrarse:** Crea una cuenta en `/registro`
3. **Iniciar sesión:** Accede con tu cuenta en `/login`

### Como Administrador

1. **Acceder al panel:** Navega a `/admin` (debes estar autenticado)
2. **Crear producto:**
   - Haz clic en "Agregar Nuevo Producto"
   - Completa el formulario
   - Sube una imagen con el botón de Cloudinary
   - Guarda el producto
3. **Editar producto:** Haz clic en "Editar" en la tabla de productos
4. **Eliminar producto:** Haz clic en "Eliminar" (confirmación requerida)

## 🌐 Deploy en Vercel

1. Sube tu código a GitHub
2. Ve a [Vercel](https://vercel.com)
3. Importa tu repositorio
4. Agrega las variables de entorno en Project Settings
5. Deploy automático ✨

**Importante:** Agrega `NEXT_PUBLIC_SITE_URL` en producción con la URL de tu sitio de Vercel.

## 🔒 Seguridad

- Las rutas `/admin` están protegidas por middleware
- Solo usuarios autenticados pueden crear/editar/eliminar productos
- Las API routes verifican la autenticación antes de realizar operaciones
- Las contraseñas se manejan de forma segura con Supabase Auth

## 📚 API Routes

### Productos

- `GET /api/productos` - Listar todos los productos
- `POST /api/productos` - Crear producto (requiere autenticación)
- `GET /api/productos/[id]` - Obtener un producto
- `PUT /api/productos/[id]` - Actualizar producto (requiere autenticación)
- `DELETE /api/productos/[id]` - Eliminar producto (requiere autenticación)

## 🎨 Personalización

### Estilos

Los estilos están en `app/globals.css` usando TailwindCSS. Puedes personalizar:
- Colores en `tailwind.config.ts`
- Tipografía y espaciado según tus necesidades

### Modelo de Datos

Para agregar más campos al modelo Producto, edita `prisma/schema.prisma` y ejecuta:

```bash
npx prisma db push
npx prisma generate
```

## 🐛 Troubleshooting

### Error de conexión a Supabase
- Verifica que las variables de entorno estén correctamente configuradas
- Asegúrate de que el proyecto de Supabase esté activo

### Error de Cloudinary
- Verifica el nombre del Cloud Name
- Asegúrate de que el Upload Preset sea "Unsigned"

### Error de Prisma
- Ejecuta `npx prisma generate` para regenerar el cliente
- Verifica la conexión a la base de datos con `DATABASE_URL`

## 📄 Licencia

Este proyecto es de uso personal y educativo.

## 🤝 Contribuciones

Este es un proyecto personal, pero si tienes sugerencias, ¡son bienvenidas!

---

Desarrollado con ❤️ usando Next.js 15, TypeScript y las mejores prácticas de desarrollo full stack.
