# 💰 Integración de Pagos - Mercado Pago

## 📊 Estado Actual

✅ **Implementado:**
- Sistema de reservas (3 horas)
- Notificaciones por WhatsApp
- Datos de pago mostrados en carrito (Alias + Nombre)
- Cliente transfiere manualmente
- Confirmación manual del vendedor

---

## 🎯 Próximas Opciones de Mejora

### Opción A: Link de Pago Automático (Recomendado)

**Descripción:** Generar link de Mercado Pago al confirmar reserva

**Flujo:**
```
Cliente reserva
    ↓
Sistema genera link de MP automático
    ↓
WhatsApp incluye el link de pago
    ↓
Cliente hace clic y paga
    ↓
MP notifica vía webhook
    ↓
Sistema confirma venta automáticamente
```

**Ventajas:**
- ✅ Semi-automático
- ✅ Cliente paga en el momento (mayor conversión)
- ✅ Confirmación automática vía webhook
- ✅ Reducís ventas perdidas

**Costo:**
- Comisión de Mercado Pago: ~3-6% por transacción

**Requisitos:**
1. Cuenta vendedor de Mercado Pago
2. Access Token de MP
3. Implementar webhook para recibir notificaciones

**Implementación estimada:** 2-3 horas

---

### Opción B: Checkout Pro de Mercado Pago

**Descripción:** Checkout completo dentro del sitio

**Ventajas:**
- ✅ Experiencia profesional
- ✅ Cliente nunca sale de tu sitio
- ✅ Mayor confianza

**Desventajas:**
- ⚠️ Más complejo
- ⚠️ Comisiones más altas

**Implementación estimada:** 1 día

---

## 🚀 Guía de Implementación - Link de Pago

### 1. Configurar Cuenta de Mercado Pago

1. Ir a: https://www.mercadopago.com.ar/developers
2. Crear aplicación
3. Obtener credenciales:
   - `ACCESS_TOKEN` (producción)
   - `PUBLIC_KEY`

4. Agregar a `.env`:
```env
MERCADOPAGO_ACCESS_TOKEN="APP_USR-xxxxxxxxxx"
MERCADOPAGO_PUBLIC_KEY="APP_USR-xxxxxxxxxx"
```

---

### 2. Instalar SDK

```bash
npm install mercadopago
```

---

### 3. Crear API para generar link de pago

**Archivo:** `app/api/pagos/crear-link/route.ts`

```typescript
import { NextResponse } from 'next/server'
import mercadopago from 'mercadopago'

// Configurar MP
mercadopago.configure({
  access_token: process.env.MERCADOPAGO_ACCESS_TOKEN!
})

export async function POST(request: Request) {
  try {
    const { items, compradorInfo, reservaId } = await request.json()

    // Crear preferencia de pago
    const preference = await mercadopago.preferences.create({
      items: items.map((item: any) => ({
        title: item.nombre,
        quantity: 1,
        unit_price: item.precio,
        currency_id: 'ARS'
      })),
      back_urls: {
        success: `${process.env.NEXT_PUBLIC_URL}/pago/success`,
        failure: `${process.env.NEXT_PUBLIC_URL}/pago/failure`,
        pending: `${process.env.NEXT_PUBLIC_URL}/pago/pending`
      },
      auto_return: 'approved',
      external_reference: reservaId.toString(), // Para identificar la reserva
      notification_url: `${process.env.NEXT_PUBLIC_URL}/api/pagos/webhook`
    })

    return NextResponse.json({
      init_point: preference.body.init_point, // Link de pago
      id: preference.body.id
    })
  } catch (error) {
    console.error('Error al crear preferencia de pago:', error)
    return NextResponse.json(
      { error: 'Error al crear link de pago' },
      { status: 500 }
    )
  }
}
```

---

### 4. Modificar flujo de reserva

En `app/carrito/page.tsx`:

```typescript
// Después de reservar productos exitosamente:
const responsePago = await fetch('/api/pagos/crear-link', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    items: items.map(item => ({
      nombre: item.producto.nombre,
      precio: item.producto.precio
    })),
    compradorInfo,
    reservaId: dataReserva.reservaId // Necesitarás devolver esto del endpoint de reserva
  })
})

const dataPago = await responsePago.json()

// Mostrar link de pago al usuario
setAlertConfig({
  show: true,
  title: '✅ Reserva confirmada!',
  message: `Productos reservados por 3 horas.\n\n💰 Total: $${calcularTotal()}\n\nHacé clic en el botón para pagar con Mercado Pago:`,
  type: 'success',
  linkPago: dataPago.init_point // Agregar botón en el Alert component
})
```

---

### 5. Crear webhook para confirmación automática

**Archivo:** `app/api/pagos/webhook/route.ts`

```typescript
import { NextResponse } from 'next/server'
import mercadopago from 'mercadopago'
import { prisma } from '@/lib/prisma'

mercadopago.configure({
  access_token: process.env.MERCADOPAGO_ACCESS_TOKEN!
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // MP envía notificaciones de pago
    if (body.type === 'payment') {
      const paymentId = body.data.id
      
      // Obtener info del pago
      const payment = await mercadopago.payment.findById(paymentId)
      
      if (payment.body.status === 'approved') {
        const reservaId = payment.body.external_reference
        
        // Confirmar venta en la BD
        await prisma.producto.updateMany({
          where: {
            id: { in: productosIds }, // Necesitarás guardar esto en BD
            estado: 'reservado'
          },
          data: {
            estado: 'vendido'
          }
        })
        
        // Enviar WhatsApp de confirmación
        // ...
        
        console.log(`✅ Venta confirmada automáticamente: Reserva ${reservaId}`)
      }
    }
    
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error en webhook de MP:', error)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}
```

---

### 6. Configurar webhook en Mercado Pago

1. Ir a: https://www.mercadopago.com.ar/developers
2. Tu aplicación → Webhooks
3. Agregar URL: `https://tu-dominio.com/api/pagos/webhook`
4. Eventos: `payment`

---

## 📝 Modelo de Base de Datos Actualizado

Agregar a `prisma/schema.prisma`:

```prisma
model Venta {
  id              Int       @id @default(autoincrement())
  productos       Json      // Array de productos vendidos
  compradorInfo   String
  total           Float
  estado          String    @default("pendiente") // pendiente, pagado, cancelado
  metodoPago      String?   // mercadopago, transferencia
  mercadopagoId   String?   @unique // ID del pago de MP
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@map("ventas")
}
```

---

## 🧪 Testing del Flujo

### Modo Sandbox (Pruebas):

1. Usar credenciales de TEST de Mercado Pago
2. Tarjetas de prueba: https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/test-cards

**Tarjetas de prueba:**
```
✅ Aprobada:
Número: 5031 7557 3453 0604
CVV: 123
Fecha: 11/25

❌ Rechazada:
Número: 5031 4332 1540 6351
```

---

## 💡 Recomendación de Implementación

**Fase 1 (Actual - HECHO):**
- ✅ Mostrar datos de pago manualmente
- ✅ Cliente transfiere y envía comprobante

**Fase 2 (Próxima - OPCIONAL):**
- 🔄 Implementar link de pago automático
- 🔄 Webhook para confirmación
- 🔄 Botón "Pagar con Mercado Pago"

**Fase 3 (Futuro):**
- 🔮 Checkout integrado completo
- 🔮 Dashboard de ventas con estadísticas

---

## 💰 Costos de Mercado Pago

- **Transferencia manual**: 0% (lo que usás ahora)
- **Link de pago**: ~3-6% por transacción
- **Checkout Pro**: ~3-6% por transacción

**Ejemplo:** Venta de $10.000
- Tu ganancia: $9.400 - $9.700
- Comisión MP: $300 - $600

---

## 🎯 Conclusión

**Para empezar:** Usá el sistema actual (transferencia manual)

**Cuando escales:** Implementá link de pago automático para:
- Reducir ventas perdidas
- Automatizar confirmaciones
- Mejorar experiencia del cliente
- Ahorrar tiempo

¿Necesitás ayuda implementando alguna de estas opciones? Solo avisame!
