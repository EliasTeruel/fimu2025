# 🛒 Carrito Vinculado al Usuario - Documentación

## ✅ Cambios Implementados

### 1. **Base de Datos** (`prisma/schema.prisma`)

#### Modelo `CarritoItem` - Agregado:
```prisma
usuarioId  Int?  @map("usuario_id")  // ID del usuario logueado
usuario    Usuario? @relation(fields: [usuarioId], references: [id])
@@index([usuarioId])
```

#### Modelo `Usuario` - Agregado:
```prisma
carritoItems  CarritoItem[]  // Relación con items del carrito
```

**Migración requerida:**
```bash
npx prisma migrate dev --name agregar_usuario_id_carrito
```

---

### 2. **API del Carrito** (`/app/api/carrito/route.ts`)

#### GET - Obtener carrito:
- **Antes**: Solo por `sessionId`
- **Ahora**: Por `usuarioId` (prioridad) o `sessionId`
  
```typescript
// Usuario logueado
GET /api/carrito?usuarioId=1

// Usuario invitado  
GET /api/carrito?sessionId=abc-123
```

#### POST - Agregar al carrito:
- **Acepta `usuarioId` opcional** además de `sessionId`
- Si `usuarioId` está presente, el item se vincula al usuario
- Busca duplicados por usuario o por sesión según corresponda

```typescript
POST /api/carrito
{
  "productoId": 1,
  "cantidad": 1,
  "sessionId": "abc-123",
  "usuarioId": 5  // Opcional
}
```

#### DELETE - Vaciar carrito:
- **Antes**: Solo por `sessionId`
- **Ahora**: Por `usuarioId` o `sessionId`

---

### 3. **Nueva API - Migrar Carrito** (`/app/api/carrito/migrar/route.ts`)

**Propósito**: Transferir items del carrito de invitado al usuario cuando se loguea

**Endpoint**: `POST /api/carrito/migrar`

**Body**:
```json
{
  "sessionId": "abc-123",
  "usuarioId": 5
}
```

**Lógica**:
1. Busca items del carrito de invitado (con `sessionId`, sin `usuarioId`)
2. Busca items del usuario logueado
3. Para cada item de invitado:
   - Si el producto YA está en el carrito del usuario: elimina el duplicado
   - Si es producto nuevo: asigna `usuarioId` y limpia `sessionId`

**Respuesta**:
```json
{
  "message": "Carrito migrado exitosamente",
  "itemsMigrados": 2,
  "itemsActualizados": 1,
  "totalItems": 3
}
```

---

### 4. **Frontend - ProductoModal** (`/app/components/ProductoModal.tsx`)

**Cambios**:
- Importa `createClient` de Supabase
- Al agregar al carrito, verifica si el usuario está logueado
- Si está logueado: busca su `usuarioId` y lo incluye en el request
- Si NO está logueado: solo envía `sessionId`

**Flujo**:
```
Agregar al carrito
  ↓
¿Usuario logueado?
  ├─ SÍ → Buscar usuarioId → POST con usuarioId + sessionId
  └─ NO → POST solo con sessionId
```

---

### 5. **Frontend - Carrito Page** (`/app/carrito/page.tsx`)

#### Al cargar la página (`useEffect`):
1. Verifica autenticación de Supabase
2. Si está logueado:
   - Obtiene datos del usuario desde BD
   - **Migra el carrito** de invitado a usuario
   - Recarga el carrito (ahora vinculado al usuario)

#### `cargarCarrito()`:
- Si usuario logueado: `GET /api/carrito?usuarioId=X`
- Si invitado: `GET /api/carrito?sessionId=Y`

---

## 🎯 Flujos de Usuario

### A. Usuario Invitado (sin login)
1. Agrega productos → Se guardan con `sessionId` en localStorage
2. Cierra navegador → **Carrito persiste** (localStorage)
3. Abre navegador → Carga carrito por `sessionId`
4. Borra localStorage → **Pierde carrito**

### B. Usuario se Registra/Loguea
1. Estaba navegando como invitado (tiene carrito con `sessionId`)
2. Se loguea
3. **Automáticamente**: Carrito migra a su cuenta
4. Ahora el carrito está vinculado a `usuarioId`
5. Puede verlo desde cualquier dispositivo donde inicie sesión

### C. Usuario Logueado
1. Agrega productos → Se guardan con `usuarioId`
2. Cierra navegador → **Carrito persiste** (base de datos)
3. Abre en otro dispositivo → **Ve el mismo carrito**
4. Borra localStorage → **NO afecta** (está en BD)

---

## 🔄 Migración Automática

**Cuándo ocurre**: Al cargar `/carrito` estando logueado

**Qué hace**:
```
Carrito Invitado          Carrito Usuario
┌─────────────────┐      ┌─────────────────┐
│ Producto A      │ ───→ │ Producto A      │
│ Producto B      │ ───→ │ Producto B      │
│ sessionId: abc  │      │ Producto C (ya) │
│ usuarioId: null │      │ usuarioId: 5    │
└─────────────────┘      └─────────────────┘

Resultado final:
┌─────────────────────┐
│ Producto A (migrado)│
│ Producto B (migrado)│
│ Producto C          │
│ usuarioId: 5        │
│ sessionId: null     │
└─────────────────────┘
```

---

## ⚠️ Consideraciones Importantes

1. **Duplicate Prevention**: El constraint `@@unique([productoId, sessionId])` permite que el mismo producto esté en carritos de diferentes sesiones, pero no duplicado en la misma sesión

2. **Migration on Login**: La migración ocurre automáticamente, no requiere acción del usuario

3. **SessionId permanece**: Incluso después de migrar, el `sessionId` se guarda por si el usuario cierra sesión

4. **Productos reservados**: La migración NO afecta el estado de los productos (disponible/reservado/vendido)

5. **Performance**: La migración es rápida (1 query para buscar, N updates/deletes)

---

## 🧪 Testing

### Escenario 1: Usuario Invitado
```bash
1. Abrir modo incógnito
2. Agregar 2 productos al carrito
3. Verificar localStorage tiene sessionId
4. Cerrar navegador
5. Reabrir → Carrito debe persistir
```

### Escenario 2: Login con carrito existente
```bash
1. Agregar productos como invitado (3 items)
2. Loguearse con cuenta existente
3. Verificar que el carrito muestra los 3 items
4. Abrir DevTools → Console debe mostrar "✅ Carrito migrado"
```

### Escenario 3: Multi-dispositivo
```bash
1. Login en dispositivo A
2. Agregar productos
3. Login en dispositivo B con misma cuenta
4. Verificar que se ven los mismos productos
```

### Escenario 4: Duplicados
```bash
1. Agregar Producto A como invitado
2. Loguearse (cuenta ya tiene Producto A)
3. Verificar que NO se duplica (solo aparece 1 vez)
```

---

## 📊 Queries de Base de Datos

### Ver items por usuario:
```sql
SELECT * FROM carrito_items WHERE usuario_id = 5;
```

### Ver items huérfanos (sin usuario):
```sql
SELECT * FROM carrito_items WHERE usuario_id IS NULL;
```

### Contar carritos activos:
```sql
SELECT 
  COUNT(DISTINCT session_id) as carritos_invitados,
  COUNT(DISTINCT usuario_id) as carritos_usuarios
FROM carrito_items;
```

---

## 🚀 Próximos Pasos (Opcional)

1. **Limpiar carritos antiguos**: Crear job que elimine items de sessionId viejos (> 30 días)
2. **Notificación de migración**: Mostrar toast al usuario cuando se migra su carrito
3. **Analytics**: Trackear cuántos usuarios migran vs. cuántos empiezan de cero
4. **Merge inteligente**: Si hay cantidades diferentes del mismo producto, sumarlas en vez de descartar

---

## 📝 Comandos Útiles

```bash
# Aplicar migración
npx prisma migrate dev --name agregar_usuario_id_carrito

# Ver estado de base de datos
npx prisma studio

# Regenerar cliente Prisma (después de cambios)
npx prisma generate

# Reiniciar servidor dev
npm run dev
```
