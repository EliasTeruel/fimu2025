# 🎯 INSTRUCCIONES PARA COMENZAR

## ¡Tu proyecto está listo! 🎉

El proyecto de tienda online full stack ha sido creado exitosamente. Ahora necesitas configurar las credenciales de los servicios externos.

## 📝 Pasos Obligatorios Antes de Iniciar

### 1️⃣ Crear Cuenta en Supabase (5 minutos)

1. Ve a [https://supabase.com](https://supabase.com)
2. Crea una cuenta gratuita
3. Haz clic en "New Project"
   - **Name**: `tienda-online` (o el que prefieras) Fimu-Tienda
   - **Database Password**: Crea una contraseña segura y **guárdala**
   - **Region**: Elige la más cercana a ti
   - Haz clic en "Create new project"
4. Espera 2-3 minutos mientras se crea el proyecto

#### Obtener las credenciales:

**a) Connection Strings (Database URLs):**
- Ve a: **Settings** (menú izquierdo) > **Database**
- Busca "Connection string"
- Copia el modo **"Transaction"** (no Pooler)
- Reemplaza `[YOUR-PASSWORD]` con tu contraseña

**b) API Keys:**
- Ve a: **Settings** > **API**
- Copia:
  - `Project URL` (algo como `https://xxxxx.supabase.co`)
  - `anon` `public` key (una larga cadena de texto)

**c) Habilitar Email Authentication:**
- Ve a: **Authentication** > **Providers**
- Asegúrate de que **Email** esté activado (toggle en verde)

### 2️⃣ Crear Cuenta en Cloudinary (3 minutos)

1. Ve a [https://cloudinary.com](https://cloudinary.com)
2. Crea una cuenta gratuita (elige "Free trial")
3. Desde el Dashboard:
   - Copia tu **Cloud Name** (aparece arriba, algo como `dxxxxx`)

#### Crear Upload Preset:

1. Ve a: **Settings** (⚙️ arriba derecha) > **Upload** > **Upload presets**
2. Haz clic en **"Add upload preset"**
3. Configura:
   - **Preset name**: `tienda` (o el que prefieras)
   - **Signing Mode**: Selecciona **"Unsigned"** ⚠️ IMPORTANTE
   - (Opcional) **Folder**: `productos`
4. Haz clic en **"Save"**
5. Copia el nombre del preset que creaste

### 3️⃣ Configurar Variables de Entorno

Abre el archivo `.env` en la raíz del proyecto y reemplaza los valores:

```env
# Reemplaza estos valores con los que obtuviste de Supabase
DATABASE_URL="postgresql://postgres:TU_PASSWORD_AQUI@db.tu-project-ref.supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:TU_PASSWORD_AQUI@db.tu-project-ref.supabase.co:5432/postgres"

NEXT_PUBLIC_SUPABASE_URL="https://tu-project-ref.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="tu-anon-key-muy-larga-aqui"

# Reemplaza con los valores de Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="tu-cloud-name"
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET="tienda"
```

**💡 Ejemplo real de cómo se ve:**
```env
DATABASE_URL="postgresql://postgres:MiPassword123!@db.abcdefgh.supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:MiPassword123!@db.abcdefgh.supabase.co:5432/postgres"

NEXT_PUBLIC_SUPABASE_URL="https://abcdefgh.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="dmycloud123"
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET="tienda"
```

### 4️⃣ Crear las Tablas en la Base de Datos

Ejecuta este comando en la terminal para crear la tabla de productos:

```powershell
npm run prisma:push
```

Deberías ver un mensaje: `✔ Database in sync with schema`

### 5️⃣ Iniciar el Servidor

```powershell
npm run dev
```

### 6️⃣ Abrir la Aplicación

Abre tu navegador en: [http://localhost:3000](http://localhost:3000)

## ✅ Verificación

### Primera vez - Crear tu cuenta de administrador:

1. Ve a [http://localhost:3000/registro](http://localhost:3000/registro)
2. Crea tu cuenta con email y contraseña
3. **Importante**: Revisa tu email para confirmar la cuenta
4. Inicia sesión en [http://localhost:3000/login](http://localhost:3000/login)
5. Ve al panel de admin: [http://localhost:3000/admin](http://localhost:3000/admin)

### Prueba el sistema:

1. **Crear producto:**
   - En `/admin`, haz clic en "Agregar Nuevo Producto"
   - Completa nombre, descripción, precio, stock
   - Haz clic en "Subir Imagen a Cloudinary"
   - Selecciona una imagen desde tu computadora
   - Espera a que se suba
   - Haz clic en "Crear"

2. **Ver en la tienda:**
   - Ve a la página principal `/`
   - Deberías ver tu producto con la imagen

3. **Editar/Eliminar:**
   - En `/admin`, prueba los botones de Editar y Eliminar

## 🐛 Si Algo No Funciona

### Error: "Cannot connect to database"
- ✅ Verifica que la `DATABASE_URL` sea correcta
- ✅ Asegúrate de haber reemplazado `[YOUR-PASSWORD]` con tu contraseña real
- ✅ Verifica que el proyecto de Supabase esté activo

### Error: "User not found" al iniciar sesión
- ✅ Revisa tu email de confirmación de Supabase
- ✅ En Supabase > Authentication > Users, verifica que tu usuario esté confirmado

### La imagen no se sube
- ✅ Verifica el `CLOUDINARY_CLOUD_NAME`
- ✅ Asegúrate de que el preset sea **"Unsigned"**
- ✅ Verifica que el nombre del preset sea correcto

### Error: "Prisma Client not generated"
```powershell
npm run prisma:generate
```

## 📚 Documentación

- **README.md** - Documentación completa
- **QUICKSTART.md** - Guía rápida de inicio
- **DEPLOY.md** - Cómo hacer deploy en Vercel
- **RESUMEN.md** - Resumen técnico del proyecto

## 🎯 Próximos Pasos

Una vez que todo funcione localmente:

1. **Personaliza el diseño** según tus gustos
2. **Agrega más productos** para probar
3. **Lee DEPLOY.md** para subir tu proyecto a Vercel (gratis)

## 💡 Comandos Útiles

```powershell
npm run dev              # Iniciar servidor de desarrollo
npm run prisma:studio    # Ver base de datos en el navegador
npm run prisma:push      # Aplicar cambios del schema
npm run build            # Construir para producción
```

## 🆘 Necesitas Ayuda?

Si encuentras algún problema:
1. Revisa los archivos de documentación (README.md, QUICKSTART.md)
2. Verifica que todas las variables de entorno estén correctas
3. Asegúrate de haber seguido todos los pasos en orden

---

**¡Mucha suerte con tu tienda online!** 🚀

Una vez que tengas todo funcionando, ¡estarás listo para hacer deploy en Vercel y tener tu tienda en producción! 🌐
