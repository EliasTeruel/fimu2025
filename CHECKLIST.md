# ✅ CHECKLIST DE CONFIGURACIÓN

Usa este checklist para verificar que todo esté configurado correctamente.

## 📋 Pre-requisitos

- [ ] Node.js instalado (v18 o superior)
- [ ] npm funcionando
- [ ] Editor de código (VS Code recomendado)
- [ ] Navegador web moderno

## 🔧 Configuración de Servicios

### Supabase
- [ ] Cuenta creada en supabase.com
- [ ] Proyecto creado
- [ ] Database password guardado en lugar seguro
- [ ] Connection String copiado (Transaction mode)
- [ ] Project URL copiado
- [ ] Anon key copiado
- [ ] Email Authentication habilitado

### Cloudinary
- [ ] Cuenta creada en cloudinary.com
- [ ] Cloud Name copiado
- [ ] Upload Preset creado
- [ ] Preset configurado como "Unsigned"
- [ ] Nombre del preset copiado

## 📄 Archivos de Configuración

- [ ] Archivo `.env` editado con credenciales reales
- [ ] `DATABASE_URL` configurada correctamente
- [ ] `DIRECT_URL` configurada correctamente
- [ ] `NEXT_PUBLIC_SUPABASE_URL` configurada
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` configurada
- [ ] `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` configurada
- [ ] `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` configurada

## 🗄️ Base de Datos

- [ ] `npm run prisma:generate` ejecutado sin errores
- [ ] `npm run prisma:push` ejecutado sin errores
- [ ] Mensaje "Database in sync" mostrado

## 🚀 Inicio de la Aplicación

- [ ] `npm run dev` ejecutado
- [ ] Servidor iniciado en http://localhost:3000
- [ ] Página principal se carga sin errores
- [ ] No hay errores en la consola del navegador

## 👤 Cuenta de Administrador

- [ ] Visitado `/registro`
- [ ] Cuenta creada con email y contraseña
- [ ] Email de confirmación recibido
- [ ] Cuenta confirmada (clic en link del email)
- [ ] Login exitoso en `/login`
- [ ] Redirección a `/admin` funciona
- [ ] Panel de administración se muestra correctamente

## 📦 Funcionalidad de Productos

### Crear Producto
- [ ] Botón "Agregar Nuevo Producto" visible
- [ ] Formulario se muestra al hacer clic
- [ ] Campos de nombre, descripción, precio y stock funcionan
- [ ] Botón "Subir Imagen a Cloudinary" funciona
- [ ] Widget de Cloudinary se abre
- [ ] Imagen se sube correctamente
- [ ] Preview de imagen se muestra
- [ ] Botón "Crear" guarda el producto
- [ ] Producto aparece en la tabla

### Ver Productos
- [ ] Tabla de productos se muestra
- [ ] Imagen del producto se ve correctamente
- [ ] Nombre, precio y stock se muestran
- [ ] Producto aparece en página principal `/`

### Editar Producto
- [ ] Botón "Editar" funciona
- [ ] Formulario se rellena con datos existentes
- [ ] Cambios se pueden hacer
- [ ] Botón "Actualizar" guarda los cambios
- [ ] Cambios se reflejan en la tabla

### Eliminar Producto
- [ ] Botón "Eliminar" funciona
- [ ] Mensaje de confirmación aparece
- [ ] Producto se elimina al confirmar
- [ ] Producto desaparece de la tabla

## 🎨 Interfaz de Usuario

### Página Principal (/)
- [ ] Header se muestra correctamente
- [ ] Productos se muestran en grid
- [ ] Cards de productos tienen imagen
- [ ] Precio se muestra formateado
- [ ] Indicador de stock funciona
- [ ] Diseño responsivo en móvil
- [ ] Footer se muestra

### Página de Login (/login)
- [ ] Formulario se muestra
- [ ] Link a registro funciona
- [ ] Login con credenciales correctas funciona
- [ ] Error con credenciales incorrectas se muestra
- [ ] Redirección después de login funciona

### Página de Registro (/registro)
- [ ] Formulario se muestra
- [ ] Link a login funciona
- [ ] Validación de contraseñas coincidentes
- [ ] Registro exitoso muestra mensaje
- [ ] Email de confirmación se envía

### Panel Admin (/admin)
- [ ] Solo accesible con login
- [ ] Sin login redirige a `/login`
- [ ] Email del usuario se muestra
- [ ] Botón "Cerrar Sesión" funciona
- [ ] Botón "Ver Tienda" redirige a `/`

## 🔒 Seguridad

- [ ] Ruta `/admin` protegida (sin login redirige)
- [ ] API POST/PUT/DELETE requieren autenticación
- [ ] Cerrar sesión funciona correctamente
- [ ] Contraseñas no se muestran en texto plano

## 📱 Responsive Design

- [ ] Funciona en escritorio (1920x1080)
- [ ] Funciona en tablet (768x1024)
- [ ] Funciona en móvil (375x667)
- [ ] Grid de productos se adapta
- [ ] Tabla en admin es scrollable en móvil

## 🌐 Preparación para Deploy

- [ ] `npm run build` ejecuta sin errores
- [ ] Archivo `.gitignore` está correcto
- [ ] `.env` NO está commitido en git
- [ ] `.env.example` SÍ está en el repositorio
- [ ] README.md está actualizado
- [ ] Código subido a GitHub (opcional)

## ✨ Testing Manual Final

- [ ] Crear 3 productos diferentes
- [ ] Subir imagen a cada uno
- [ ] Editar un producto
- [ ] Eliminar un producto
- [ ] Cerrar sesión y abrir sesión nuevamente
- [ ] Ver productos en página principal sin login
- [ ] Intentar acceder a `/admin` sin login (debe redirigir)

## 🎉 ¡Todo Listo!

Si todos los checkboxes están marcados, ¡tu tienda online está completamente funcional!

### Próximos Pasos:
1. Personaliza el diseño según tus necesidades
2. Agrega más productos
3. Lee `DEPLOY.md` para subir a Vercel
4. ¡Comparte tu tienda con el mundo! 🚀

---

**Fecha de última verificación:** _____________

**Notas adicionales:**
_____________________________________________________________
_____________________________________________________________
_____________________________________________________________
