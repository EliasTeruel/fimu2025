# 🚀 Quick Start - Tienda Online

Guía rápida para poner en marcha tu tienda online en minutos.

## ⚡ Inicio Rápido (5 minutos)

### 1. Configurar Supabase (2 min)

1. Ve a [supabase.com](https://supabase.com) y crea una cuenta
2. Crea un nuevo proyecto:
   - Nombre: `tienda-online`
   - Database Password: guarda esta contraseña
   - Region: elige la más cercana
3. Espera a que se cree el proyecto
4. Ve a **Settings > Database**:
   - Copia la `Connection String` en modo `Transaction`
   - Reemplaza `[YOUR-PASSWORD]` con tu contraseña
5. Ve a **Settings > API**:
   - Copia `Project URL`
   - Copia `anon public key`
6. Ve a **Authentication > Providers**:
   - Asegúrate de que **Email** esté habilitado

### 2. Configurar Cloudinary (2 min)

1. Ve a [cloudinary.com](https://cloudinary.com) y crea una cuenta gratuita
2. Desde el Dashboard:
   - Copia tu **Cloud Name**
3. Ve a **Settings > Upload > Upload Presets**:
   - Clic en "Add upload preset"
   - Signing Mode: **Unsigned**
   - Preset name: `tienda` (o el que prefieras)
   - Guarda el nombre del preset

### 3. Configurar el Proyecto (1 min)

```bash
# 1. Edita el archivo .env con tus credenciales
DATABASE_URL="postgresql://postgres:TU_PASSWORD@db.TU_PROJECT.supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:TU_PASSWORD@db.TU_PROJECT.supabase.co:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://TU_PROJECT.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="tu-anon-key"
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="tu-cloud-name"
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET="tu-preset"

# 2. Crear las tablas en la base de datos
npm run prisma:push

# 3. Iniciar el servidor de desarrollo
npm run dev
```

### 4. ¡Listo! (30 seg)

Abre [http://localhost:3000](http://localhost:3000)

**Primera vez:**
1. Ve a `/registro` y crea tu cuenta de administrador
2. Inicia sesión en `/login`
3. Accede al panel en `/admin`
4. ¡Agrega tu primer producto!

## 📝 Comandos Útiles

```bash
# Desarrollo
npm run dev                 # Iniciar servidor (localhost:3000)

# Prisma
npm run prisma:studio      # Abrir GUI de base de datos
npm run prisma:push        # Aplicar cambios del schema
npm run prisma:generate    # Regenerar cliente de Prisma

# Build y Deploy
npm run build              # Construir para producción
npm start                  # Iniciar en modo producción
```

## 🔍 Verificación

- ✅ Página principal muestra "No hay productos disponibles"
- ✅ Puedes registrarte en `/registro`
- ✅ Puedes iniciar sesión en `/login`
- ✅ Puedes acceder a `/admin` después de login
- ✅ Puedes subir imágenes con el botón de Cloudinary

## ❌ Problemas Comunes

### "Error al conectar con la base de datos"
- Verifica que `DATABASE_URL` tenga la contraseña correcta
- Asegúrate de estar usando el connection string correcto de Supabase

### "Cannot find module '@prisma/client'"
```bash
npm run prisma:generate
```

### "Error de autenticación"
- Verifica que `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` sean correctos
- Asegúrate de que Email Auth esté habilitado en Supabase

### "Error al subir imagen"
- Verifica el `CLOUDINARY_CLOUD_NAME`
- Asegúrate de que el preset sea "Unsigned"

## 🎯 Próximos Pasos

1. **Personaliza el diseño**
   - Edita `app/globals.css`
   - Modifica los colores en TailwindCSS

2. **Agrega más campos**
   - Edita `prisma/schema.prisma`
   - Ejecuta `npm run prisma:push`

3. **Deploy en Vercel**
   - Sube el código a GitHub
   - Conecta con Vercel
   - Lee `DEPLOY.md` para más detalles

## 📚 Más Información

- **README.md**: Documentación completa del proyecto
- **DEPLOY.md**: Guía detallada de deploy en Vercel

---

¿Tienes preguntas? Revisa el README.md completo 📖
