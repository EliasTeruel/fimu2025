# 🔧 Solución de Problemas - FIMU2025

## Error 500 en API / Servidor no responde

### Problema: Múltiples instancias de Node.js corriendo

**Síntomas:**
- Error: `Port 3000 is in use`
- Error: `Unable to acquire lock at .next/dev/lock`
- API devuelve 500 sin logs en la consola
- El servidor funciona en una IP pero no en otra

**Solución 1 - Comando rápido:**
```powershell
npm run dev:clean
```

**Solución 2 - Manual (paso a paso):**

```powershell
# 1. Matar todos los procesos de Node.js
taskkill /F /IM node.exe

# 2. Borrar el archivo de lock
Remove-Item -Force -Recurse .next\dev\lock -ErrorAction SilentlyContinue

# 3. Iniciar el servidor
npm run dev
```

**Solución 3 - Verificar y limpiar puerto específico:**

```powershell
# Ver qué proceso está usando el puerto 3000
netstat -ano | findstr :3000

# Matar el proceso específico (reemplaza PID con el número que te aparece)
taskkill /PID <numero> /F

# Ejemplo: taskkill /PID 14504 /F
```

---

## Navegador muestra contenido viejo / Caché

### Problema: localhost funciona mal pero la IP funciona bien

**Síntomas:**
- `http://localhost:3000` da error 500
- `http://192.168.0.110:3000` funciona correctamente
- Los cambios no se reflejan en el navegador

**Solución:**

1. **Recarga forzada (sin caché):**
   - `Ctrl + Shift + R` 
   - O `Ctrl + F5`

2. **Modo incógnito:**
   - Chrome: `Ctrl + Shift + N`
   - Firefox: `Ctrl + Shift + P`

3. **Limpiar caché completo:**
   - `Ctrl + Shift + Delete`
   - Seleccionar "Caché" o "Archivos en caché"
   - Limpiar y reiniciar navegador

4. **Usar la IP directamente:**
   - `http://192.168.0.110:3000` (funciona igual que localhost)

---

## Problemas con Prisma / Base de Datos

### Error: Can't reach database server

**Síntomas:**
- `Can't reach database server at pooler.supabase.com:6543`
- Timeout en conexiones a BD

**Solución 1 - Usar conexión directa (desarrollo local):**

Edita `.env` y cambia:
```env
# En lugar de usar el pooler (6543)
DATABASE_URL="postgresql://postgres.xxx@db.xxx.supabase.co:5432/postgres"
```

**Solución 2 - Regenerar cliente de Prisma:**

```powershell
npx prisma generate
```

**Solución 3 - Sincronizar schema con BD:**

```powershell
# Solo si cambiaste el schema.prisma
npx prisma db push
```

---

## Verificar estado del sistema

### Comandos de diagnóstico:

```powershell
# Ver procesos de Node.js corriendo
Get-Process node -ErrorAction SilentlyContinue

# Ver qué está usando el puerto 3000
netstat -ano | findstr :3000

# Ver contenido de .env (sin mostrar valores)
Get-Content .env | Select-String "DATABASE_URL"

# Ver versión de Node y npm
node --version
npm --version

# Ver logs del servidor en tiempo real
npm run dev
```

---

## Comandos útiles de desarrollo

```powershell
# Desarrollo normal
npm run dev

# Desarrollo limpiando procesos anteriores
npm run dev:clean

# Generar cliente de Prisma
npx prisma generate

# Ver base de datos con interfaz gráfica
npx prisma studio

# Sincronizar cambios de schema con BD
npx prisma db push

# Build para producción
npm run build

# Iniciar en modo producción
npm run start
```

---

## Prevención de problemas

### Buenas prácticas:

1. ✅ **Usar solo UNA terminal** para `npm run dev`
2. ✅ **Cerrar el servidor con `Ctrl + C`** antes de cerrarlo
3. ✅ **Verificar que no haya procesos** antes de iniciar:
   ```powershell
   Get-Process node -ErrorAction SilentlyContinue
   ```
4. ✅ **Usar `npm run dev:clean`** si tienes dudas
5. ✅ **Reiniciar el servidor** después de cambios en `.env`
6. ✅ **Limpiar caché del navegador** si los cambios no se ven

### Evitar:

1. ❌ Abrir múltiples terminales ejecutando `npm run dev`
2. ❌ Cerrar la terminal sin detener el servidor (`Ctrl + C`)
3. ❌ Cambiar `.env` sin reiniciar el servidor
4. ❌ Usar `localhost` y la IP al mismo tiempo (confusión de caché)

---

## Contacto / Notas

- Repositorio: https://github.com/EliasTeruel/fimu2025
- Deploy: Vercel (auto-deploy en push a main)
- Base de datos: Supabase PostgreSQL

**Último update:** 23 de noviembre 2025
