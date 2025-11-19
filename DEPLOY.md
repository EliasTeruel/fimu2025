# 🚀 Guía de Deploy en Vercel

Esta guía te ayudará a desplegar tu tienda online en Vercel de forma gratuita.

## Pre-requisitos

Antes de hacer deploy, asegúrate de tener:

1. ✅ Cuenta de Supabase configurada con:
   - Base de datos PostgreSQL
   - Authentication habilitada
   - Connection strings guardadas

2. ✅ Cuenta de Cloudinary configurada con:
   - Cloud Name
   - Upload Preset (Unsigned)

3. ✅ Código subido a GitHub

## Pasos para Deploy

### 1. Preparar el Repositorio

```bash
# Inicializar git (si no lo has hecho)
git init
git add .
git commit -m "Initial commit"

# Crear repositorio en GitHub y subir
git remote add origin <tu-repositorio-github>
git branch -M main
git push -u origin main
```

### 2. Deploy en Vercel

1. Ve a [Vercel](https://vercel.com)
2. Inicia sesión con tu cuenta de GitHub
3. Haz clic en "Add New Project"
4. Selecciona tu repositorio `fimu2025`
5. Configura las variables de entorno (ver abajo)
6. Haz clic en "Deploy"

### 3. Configurar Variables de Entorno

En Vercel, ve a tu proyecto > Settings > Environment Variables y agrega:

```
DATABASE_URL
DIRECT_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
NEXT_PUBLIC_SITE_URL (tu URL de Vercel, ej: https://tu-app.vercel.app)
```

**Importante:** Marca estas variables para todos los entornos (Production, Preview, Development).

### 4. Configurar Prisma en Vercel

Vercel ejecutará automáticamente `prisma generate` durante el build, pero asegúrate de que:

1. El archivo `prisma/schema.prisma` esté en el repositorio
2. Las dependencias de Prisma estén en `package.json`

### 5. Primera Migración de Base de Datos

Después del primer deploy, necesitas aplicar el schema a tu base de datos:

```bash
# Local (con tus credenciales de producción)
npx prisma db push
```

O puedes usar la consola de Supabase SQL Editor y ejecutar:

```sql
CREATE TABLE "productos" (
    "id" SERIAL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "precio" DOUBLE PRECISION NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "imagenUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);
```

## Verificación Post-Deploy

1. **Verifica que la app esté funcionando:**
   - Visita tu URL de Vercel
   - Deberías ver la página principal

2. **Prueba el registro:**
   - Ve a `/registro`
   - Crea una cuenta de prueba

3. **Configura Supabase para emails de confirmación:**
   - En Supabase > Authentication > URL Configuration
   - Agrega tu URL de Vercel como Site URL

4. **Prueba el CRUD:**
   - Inicia sesión
   - Ve a `/admin`
   - Crea un producto de prueba
   - Sube una imagen

## Actualizaciones Automáticas

Cada vez que hagas push a la rama `main`, Vercel:
1. Detectará los cambios automáticamente
2. Ejecutará el build
3. Desplegará la nueva versión
4. ¡Listo! 🎉

```bash
# Para actualizar
git add .
git commit -m "Descripción de tus cambios"
git push
```

## Troubleshooting

### Error: "Cannot connect to database"
- Verifica que `DATABASE_URL` esté correctamente configurada
- Asegúrate de usar la conexión directa de Supabase, no la pooled

### Error: "Prisma Client not found"
- Ejecuta `npm run build` localmente para verificar
- Asegúrate de que `@prisma/client` y `prisma` estén en `package.json`

### Error: "Authentication required"
- Verifica que `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` estén configuradas
- Asegúrate de que las variables tengan el prefijo `NEXT_PUBLIC_`

### Imágenes no se cargan
- Verifica la configuración de Cloudinary
- En `next.config.ts`, agrega el dominio de Cloudinary a `images.domains`

## Monitoreo

Vercel provee:
- 📊 Analytics automático
- 🐛 Error tracking
- 📈 Performance metrics
- 📝 Deploy logs

Accede a ellos desde el dashboard de tu proyecto.

## Costos

Con el plan gratuito de Vercel tienes:
- ✅ Deploy ilimitados
- ✅ Bandwidth generoso
- ✅ SSL automático
- ✅ Preview deployments

**Todo gratis para proyectos personales** 🎉

## Mejoras Opcionales

### Custom Domain
1. Compra un dominio
2. En Vercel > Settings > Domains
3. Agrega tu dominio custom
4. Sigue las instrucciones de DNS

### Monitoring Avanzado
- Integra Sentry para error tracking
- Usa Vercel Analytics (incluido)
- Configura alertas en Supabase

---

¡Tu tienda online está lista para el mundo! 🚀
