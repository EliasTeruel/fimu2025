# 📋 Flujo Multi-Cliente - Documentación Completa

## 🎯 Objetivo
Permitir que **múltiples usuarios** agreguen el **mismo producto** a sus carritos individuales, pero solo el **primero en reservar** lo bloquee para los demás.
Se añade la secuencia que despues de hacer el paso anterior, si los mismos usuarios agregan un nuevo producto pero son el mimso producto a sus carritos individuales, y ahora el segundo se reserva, bloquee para los demas

---

## 🔑 Conceptos Clave

### 1. **Identificadores de Usuario**
Cada usuario tiene un identificador único:s

- **Usuario NO logueado (invitado)**: `sessionId` (string único generado en el navegador)
  - Ejemplo: `"a1b2c3d4-e5f6-7890-abcd-ef1234567890"`
  
- **Usuario logueado**: `usuarioId` (número del ID en la base de datos)
  - Ejemplo: `5`

### 2. **CarritoItem** 
Cada producto en el carrito es un `CarritoItem` con:
- `id`: ID único del item en el carrito
- `productoId`: ID del producto
- `sessionId`: Quién agregó este item (invitado)
- `usuarioId`: Quién agregó este item (logueado)
- `producto`: Datos completos del producto incluyendo:
  - `estado`: 'disponible' | 'reservado' | 'vendido'
  - `compradorInfo`: "Nombre | Tel: XXX | red: @user"

### 3. **Estados del Producto**
- **disponible**: Cualquiera puede agregarlo al carrito
- **reservado**: Alguien lo reservó (está en cronómetro)
- **vendido**: Ya se vendió (se elimina de todos los carritos)

---

## 📊 Flujo Paso a Paso

### Escenario: u1 y u2 agregan el mismo producto

```
ESTADO INICIAL:
- Producto p1: disponible
- Usuario 1 (u1): sessionId = "abc123"
- Usuario 2 (u2): sessionId = "xyz789"
```

#### **Paso 1: Ambos agregan p1 al carrito**

**u1 agrega p1:**
```
POST /api/carrito
Body: { productoId: 1, sessionId: "abc123" }

→ Se crea CarritoItem:
  - id: 10
  - productoId: 1
  - sessionId: "abc123"
  - usuarioId: null
  - producto: { id: 1, estado: "disponible", ... }
```

**u2 agrega p1:**
```
POST /api/carrito
Body: { productoId: 1, sessionId: "xyz789" }

→ Se crea CarritoItem:
  - id: 11
  - productoId: 1
  - sessionId: "xyz789"  ← DIFERENTE sessionId
  - usuarioId: null
  - producto: { id: 1, estado: "disponible", ... }
```

✅ **Resultado**: Ambos tienen p1 en su carrito, ambos ven el producto como "disponible"

---

#### **Paso 2: u1 reserva p1**

**u1 hace click en "Pagar":**
```
POST /api/ventas/reservar
Body: {
  productosIds: [1],
  compradorInfo: "Juan Perez | Tel: 123 | ig: @juan",
  sessionId: "abc123"
}

→ Se actualiza el Producto en la DB:
  - id: 1
  - estado: "reservado"  ← CAMBIA
  - reservadoEn: "2025-12-05 14:30:00"
  - compradorInfo: "Juan Perez | Tel: 123 | ig: @juan"
```

**u1 recarga su carrito:**
```
GET /api/carrito?sessionId=abc123

→ Respuesta:
[
  {
    id: 10,
    sessionId: "abc123",        ← MI sessionId
    producto: {
      id: 1,
      estado: "reservado",
      compradorInfo: "Juan Perez | ..."
    }
  }
]

→ Frontend ejecuta esDeOtroUsuario(item):
  - item.sessionId = "abc123"
  - miSessionId = "abc123"
  - SON IGUALES → return false ← NO es de otro

→ Se muestra:
  ✅ Cronómetro
  ✅ Info de pago
  ⚪ Borde gris
```

**u2 recarga su carrito:**
```
GET /api/carrito?sessionId=xyz789

→ Respuesta:
[
  {
    id: 11,
    sessionId: "xyz789",        ← MI sessionId (diferente)
    producto: {
      id: 1,
      estado: "reservado",      ← El producto cambió
      compradorInfo: "Juan Perez | ..."
    }
  }
]

→ Frontend ejecuta esDeOtroUsuario(item):
  - item.sessionId = "xyz789"
  - miSessionId = "xyz789"
  - SON IGUALES → return false ← Espera... ¿POR QUÉ?
  
  🔴 PROBLEMA: u2 tiene en SU carrito un item con SU sessionId,
     pero el PRODUCTO fue reservado por u1
```

---

## ❌ El Problema Actual

La función `esDeOtroUsuario` compara el `sessionId` del **CarritoItem** con mi `sessionId`:

```typescript
if (!miUsuarioId && sessionId && item.sessionId) {
  return item.sessionId !== sessionId
}
```

**Esto funciona si:**
- u1 reserva p1 → item en carrito de u1 tiene `sessionId="abc123"`
- u2 NO tiene p1 en su carrito

**Pero NO funciona si:**
- u1 reserva p1
- u2 YA TIENE p1 en su carrito con `sessionId="xyz789"`
- El item de u2 sigue teniendo `sessionId="xyz789"` (su propio ID)
- La comparación: `"xyz789" !== "xyz789"` → false → "no es de otro"

---

## ✅ La Solución

Necesitamos comparar NO el sessionId del **CarritoItem**, sino el sessionId/usuarioId que está en el **compradorInfo** del **Producto**.

### Opción 1: Agregar campos al Producto (Recomendado)

Modificar el modelo `Producto` para incluir:
```prisma
model Producto {
  // ... campos existentes
  reservadoPorSessionId String?
  reservadoPorUsuarioId Int?
}
```

Cuando se reserva:
```typescript
await prisma.producto.update({
  where: { id: productoId },
  data: {
    estado: 'reservado',
    reservadoEn: new Date(),
    compradorInfo: compradorInfo,
    reservadoPorSessionId: sessionId,      // ← NUEVO
    reservadoPorUsuarioId: usuarioId || null  // ← NUEVO
  }
})
```

En el frontend:
```typescript
const esDeOtroUsuario = (item: CarritoItem): boolean => {
  if (item.producto.estado !== 'reservado') return false
  
  // Comparar con los campos del PRODUCTO (no del CarritoItem)
  if (miUsuarioId && item.producto.reservadoPorUsuarioId) {
    return item.producto.reservadoPorUsuarioId !== miUsuarioId
  }
  
  if (!miUsuarioId && sessionId && item.producto.reservadoPorSessionId) {
    return item.producto.reservadoPorSessionId !== sessionId
  }
  
  return true
}
```

### Opción 2: Parsear compradorInfo (Actual - menos confiable)

Extraer el sessionId del compradorInfo si lo incluimos:
```typescript
// Al reservar
const compradorInfo = `${nombre} ${apellido} | Tel: ${tel} | red: @user | session: ${sessionId}`

// Al verificar
const sessionEnCompradorInfo = item.producto.compradorInfo?.split(' | ').find(p => p.startsWith('session:'))?.replace('session:', '')
return sessionEnCompradorInfo !== sessionId
```

---

## 📝 Archivos Modificados

1. **`/app/api/carrito/route.ts`**
   - GET devuelve `sessionId` y `usuarioId` de cada CarritoItem
   
2. **`/app/carrito/page.tsx`**
   - Interface `CarritoItem` incluye `sessionId` y `usuarioId`
   - Función `esDeOtroUsuario` compara IDs
   - useEffect de cronómetros usa `esDeOtroUsuario`
   - Renderizado usa `esDeOtroUsuario`

3. **`/prisma/schema.prisma`** (pendiente)
   - Agregar `reservadoPorSessionId` y `reservadoPorUsuarioId` al modelo Producto

---

## 🧪 Cómo Probar

1. Abre dos navegadores (o PC + celular)
2. Ambos agregan el mismo producto
3. Usuario 1 reserva → debe ver cronómetro
4. Usuario 2 recarga → debe ver cartel rojo "Ya reservado"
5. Verificar en consola los logs de `esDeOtroUsuario`

---

## 🐛 Debug

Agregar estos logs en `esDeOtroUsuario`:
```typescript
console.log('🔍 Verificando ownership:', {
  productoId: item.producto.id,
  productoEstado: item.producto.estado,
  itemSessionId: item.sessionId,
  miSessionId: sessionId,
  itemUsuarioId: item.usuarioId,
  miUsuarioId: miUsuarioId,
  resultado: /* true o false */
})
```
