> Documento histórico. La implementación vigente de horarios configurables se describe en [docs/CONFIGURACION-RESERVAS-OPERACION.md](docs/CONFIGURACION-RESERVAS-OPERACION.md). Sus plazos fijos anteriores no describen la versión nueva.

# Actualización Sistema de Reservas - 30 Minutos

## Cambios Implementados

### 1. ⏱️ Nuevo Tiempo de Reserva: **30 minutos** (antes: 3 horas)

### 2. 🕐 Nuevo Horario de Atención: **10:00 - 23:00** (antes: 09:00 - 21:00)

### 3. 🧠 Lógica Inteligente de Expiración

#### Reglas:
- **10:00 - 21:59**: Reserva expira en **30 minutos** normales
- **22:00 - 22:59**: Reserva expira en **30 minutos** (caso especial: puede pasar las 23:00)
  - Ejemplo: Reserva a las 22:45 → Expira a las 23:15
- **23:00 - 09:59**: El conteo **empieza a las 10:00** del día siguiente
  - Reserva nocturna → Válida hasta las **10:30** (10:00 + 30 min)
  - Ejemplo: Reserva a las 02:00 → Expira a las 10:30 del mismo día

### 4. ⏸️ Función de Pausa para Admin

El administrador ahora puede **pausar y reanudar** el cronómetro de cualquier reserva desde la vista de ventas.

**Casos de uso:**
- Cliente tiene un problema temporal
- Delay en procesamiento de pago
- Situaciones excepcionales

**Botones en Admin:**
- 🟠 **⏸️ Pausar**: Detiene el cronómetro (botón naranja)
- 🟣 **▶️ Reanudar**: Reanuda el conteo (botón morado)

---

## Archivos Modificados

### Backend

1. **`lib/reserva-utils.ts`** ✅
   - Nueva configuración: 30 min, 10:00-23:00
   - Lógica especial para 22:XX
   - Función `calcularExpiracionReserva()` actualizada
   - Función `obtenerMensajeExpiracion()` actualizada
   - Función `calcularTiempoRestante()` sin cambios

2. **`prisma/schema.prisma`** ✅
   - Agregado campo `reservaPausada` (Boolean)
   - Agregado campo `pausadoEn` (DateTime?)
   
3. **`app/api/ventas/reservar/route.ts`** ✅
   - Usa `calcularExpiracionReserva()` con nueva lógica
   - Sin otros cambios necesarios

4. **`app/api/ventas/pausar/route.ts`** ✅ NUEVO
   - POST endpoint
   - Toggle pause/resume
   - Actualiza `reservaPausada` y `pausadoEn`

### Frontend

5. **`app/carrito/page.tsx`** ✅
   - Interface `Producto` con campos `reservaPausada` y `pausadoEn`
   - Lógica de cronómetro actualizada:
     * Muestra "⏸️ PAUSADO POR ADMIN" si `reservaPausada === true`
     * Calcula expiración con lógica 10:00-23:00, 30 min
     * Caso especial 22:XX implementado
   - Mensaje de expiración dinámico con `obtenerMensajeExpiracion()`

6. **`app/admin/ventas/page.tsx`** ✅
   - Interface `Producto` con campos `reservaPausada` y `pausadoEn`
   - Estado `pausandoReserva` agregado
   - Función `togglePausarReserva()` implementada
   - Función `calcularTiempoRestante()` actualizada:
     * Recibe parámetro `pausado?: boolean`
     * Muestra "⏸️ PAUSADO" si pausado
     * Calcula con lógica 10:00-23:00, 30 min
   - Botón "⏸️ Pausar" / "▶️ Reanudar" agregado entre "Confirmar Pago" y "Cancelar Reserva"

### Base de Datos

7. **`prisma/migrations/add_pausa_reserva.sql`** ✅ NUEVO
   ```sql
   ALTER TABLE productos ADD COLUMN IF NOT EXISTS reserva_pausada BOOLEAN DEFAULT false;
   ALTER TABLE productos ADD COLUMN IF NOT EXISTS pausado_en TIMESTAMP;
   ```

---

## 📋 Instrucciones de Despliegue

### 1. Ejecutar Migración SQL

Conectar a Supabase SQL Editor y ejecutar:

```sql
-- Agregar campos para pausar reservas
ALTER TABLE productos ADD COLUMN IF NOT EXISTS reserva_pausada BOOLEAN DEFAULT false;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS pausado_en TIMESTAMP;

-- Comentarios
COMMENT ON COLUMN productos.reserva_pausada IS 'Indica si el admin ha pausado el cronómetro de la reserva';
COMMENT ON COLUMN productos.pausado_en IS 'Timestamp de cuando se pausó el cronómetro';
```

### 2. Reiniciar Servidor de Desarrollo

```powershell
npm run dev
```

### 3. Generar Cliente Prisma (si es necesario)

```powershell
npx prisma generate
```

---

## 🧪 Testing

### Casos a Probar:

#### 1. Reserva en Horario Normal (10:00 - 21:59)
- Hacer reserva a las 15:00
- ✅ Debe expirar a las 15:30 (30 minutos)

#### 2. Reserva a las 22:XX
- Hacer reserva a las 22:30
- ✅ Debe expirar a las 23:00 (30 minutos, pasa las 23:00)

#### 3. Reserva Nocturna (23:00 - 09:59)
- Hacer reserva a las 02:00
- ✅ Debe expirar a las 10:30 del mismo día
- Hacer reserva a las 23:30
- ✅ Debe expirar a las 10:30 del día siguiente

#### 4. Pausar Cronómetro (Admin)
- Hacer reserva normal
- Admin entra a `/admin/ventas`
- Click en "⏸️ Pausar"
- ✅ Cronómetro muestra "⏸️ PAUSADO"
- ✅ Cliente ve "⏸️ PAUSADO POR ADMIN" en su carrito
- Click en "▶️ Reanudar"
- ✅ Cronómetro vuelve a contar

#### 5. Mensaje de Expiración
- Reserva nocturna: "Tu reserva es válida hasta las 10:30 (el conteo empieza a las 10:00). Te contactaremos durante el horario de atención (10:00 - 23:00)."
- Reserva 22:XX: "Tu reserva es válida por 30 minutos (hasta las 23:XX)."
- Reserva normal: "Tu reserva es válida por 30 minutos."

---

## 📊 Resumen de Configuración

| Parámetro | Valor Anterior | Valor Nuevo |
|-----------|----------------|-------------|
| Tiempo de Reserva | 3 horas | **30 minutos** |
| Horario Inicio | 09:00 | **10:00** |
| Horario Fin | 21:00 | **23:00** |
| Hora Límite Nocturna | 12:00 | **10:30** |
| Pausar Reserva | ❌ No | **✅ Sí** |

---

## 🚀 Próximos Pasos Opcionales

1. **Notificación WhatsApp** cuando se pausa/reanuda
2. **Log de pausas** en base de datos (historial)
3. **Límite de tiempo pausado** (ej: máximo 1 hora pausada)
4. **UI mejorada** con animación en cronómetro pausado
5. **Dashboard admin** con estadísticas de pausas

---

## 🐛 Troubleshooting

### Problema: "La propiedad 'reservaPausada' no existe"
**Solución:** Ejecutar migración SQL y `npx prisma generate`

### Problema: Cronómetro no se actualiza
**Solución:** El `useEffect` actualiza cada 1 segundo. Verificar que no haya errores en consola.

### Problema: Botón pausar no aparece
**Solución:** Solo aparece para productos con `estado === 'reservado'`. Verificar estado del producto.

---

**Fecha de actualización:** 23 de noviembre de 2025  
**Versión:** 2.0 - Sistema de Reservas Optimizado
