# 📱 Sistema de Notificaciones por WhatsApp - Fimu Vintage

## ✅ ¿Qué se implementó?

1. **Modal de Contacto** (`ContactoModal.tsx`):
   - Captura datos del cliente si no está registrado
   - Campos: Nombre, Apellido, Teléfono, Red Social, Usuario
   - Validaciones completas

2. **Integración en Carrito**:
   - Detecta si el usuario está logueado
   - Si está logueado: Usa sus datos del perfil
   - Si NO está logueado: Muestra modal para capturar datos
   - Al confirmar reserva: Envía notificación automática

3. **API de Notificaciones** (`/api/notificaciones/whatsapp`):
   - Endpoint POST preparado para envío de WhatsApp
   - Formato de mensaje profesional con emojis
   - Incluye: Datos del cliente, productos reservados, total
   - **Actualmente en modo de prueba** (registra en consola)

## 🔧 Configuración Actual

### Variables de Entorno (.env)
```env
NEXT_PUBLIC_ADMIN_WHATSAPP="+5491112345678"  # TU NÚMERO DE WHATSAPP
```

**🚨 IMPORTANTE**: Cambia `+5491112345678` por tu número real con código de país.

## 📲 Cómo Activar el Envío Real de WhatsApp

Actualmente el sistema está en **modo de prueba**. Los mensajes se registran en la consola del servidor pero NO se envían por WhatsApp.

Para activar el envío real, elige una de estas opciones:

---

### ⭐ Opción 1: Twilio (Recomendado - Más fácil)

**Ventajas**: Configuración simple, confiable, documentación clara
**Costo**: Aprox. USD $0.005 por mensaje

#### Pasos:

1. **Crear cuenta en Twilio**:
   - Ir a [https://www.twilio.com/try-twilio](https://www.twilio.com/try-twilio)
   - Registrarse (gratis con créditos de prueba)

2. **Configurar WhatsApp**:
   - En el panel: Messaging → Try it out → Send a WhatsApp message
   - Seguir instrucciones para conectar tu número de WhatsApp
   - Twilio te dará un número de prueba tipo: `whatsapp:+14155238886`

3. **Obtener credenciales**:
   - Account SID: En el panel principal
   - Auth Token: En el panel principal (clic en "Show")

4. **Agregar a .env**:
   ```env
   TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
   TWILIO_AUTH_TOKEN="tu_auth_token_aqui"
   TWILIO_WHATSAPP_NUMBER="whatsapp:+14155238886"
   ```

5. **Descomentar código en `/app/api/notificaciones/whatsapp/route.ts`**:
   ```typescript
   // Buscar esta sección y descomentar:
   const accountSid = process.env.TWILIO_ACCOUNT_SID
   const authToken = process.env.TWILIO_AUTH_TOKEN
   const twilioPhone = process.env.TWILIO_WHATSAPP_NUMBER
   
   if (accountSid && authToken && twilioPhone) {
     const twilio = require('twilio')
     const client = twilio(accountSid, authToken)
     
     await client.messages.create({
       from: twilioPhone,
       to: `whatsapp:${adminPhone}`,
       body: mensaje
     })
   }
   ```

6. **Instalar dependencia**:
   ```bash
   npm install twilio
   ```

---

### 📱 Opción 2: WhatsApp Business API (Gratis pero más complejo)

**Ventajas**: Gratis, oficial de Meta/Facebook
**Desventajas**: Requiere cuenta de Facebook Business, verificación

#### Pasos:

1. **Crear Facebook Business Account**:
   - Ir a [https://business.facebook.com](https://business.facebook.com)
   - Crear cuenta de negocio

2. **Configurar WhatsApp Business API**:
   - En Meta for Developers: [https://developers.facebook.com](https://developers.facebook.com)
   - Crear app → WhatsApp → Configurar

3. **Obtener credenciales**:
   - Phone Number ID
   - Access Token

4. **Agregar a .env**:
   ```env
   WHATSAPP_TOKEN="tu_access_token_aqui"
   WHATSAPP_PHONE_NUMBER_ID="123456789"
   ```

5. **Descomentar código en `/app/api/notificaciones/whatsapp/route.ts`**:
   ```typescript
   // Buscar esta sección y descomentar:
   const whatsappToken = process.env.WHATSAPP_TOKEN
   const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
   
   if (whatsappToken && phoneNumberId) {
     await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
       method: 'POST',
       headers: {
         'Authorization': `Bearer ${whatsappToken}`,
         'Content-Type': 'application/json',
       },
       body: JSON.stringify({
         messaging_product: 'whatsapp',
         to: adminPhone.replace(/\+/g, ''),
         type: 'text',
         text: { body: mensaje }
       })
     })
   }
   ```

---

### 🟢 Opción 3: Green API (Fácil, económico)

**Ventajas**: Configuración muy simple, sin verificaciones complejas
**Costo**: Planes desde USD $6/mes

#### Pasos:

1. **Crear cuenta**:
   - Ir a [https://green-api.com](https://green-api.com)
   - Registrarse

2. **Vincular WhatsApp**:
   - Escanear QR con tu WhatsApp
   - Obtener Instance ID y API Token

3. **Agregar a .env**:
   ```env
   GREEN_API_INSTANCE_ID="tu_instance_id"
   GREEN_API_TOKEN="tu_api_token"
   ```

4. **Implementar en `/app/api/notificaciones/whatsapp/route.ts`**:
   ```typescript
   const instanceId = process.env.GREEN_API_INSTANCE_ID
   const token = process.env.GREEN_API_TOKEN
   
   if (instanceId && token) {
     await fetch(`https://api.green-api.com/waInstance${instanceId}/sendMessage/${token}`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         chatId: `${adminPhone.replace(/[^0-9]/g, '')}@c.us`,
         message: mensaje
       })
     })
   }
   ```

---

## 📝 Formato del Mensaje que se Envía

```
🛍️ *NUEVA RESERVA - Fimu Vintage*

👤 *Cliente:* Juan Pérez
📱 *Teléfono:* +54 9 11 1234-5678
📲 *Red Social:* instagram: @juanperez

📦 *Productos reservados:*
• Campera Vintage - $25000.00
• Jean Retro - $18000.00

💰 *Total:* $43000.00

⏰ *Reserva válida por 3 horas*

Por favor contacta al cliente para confirmar el pago.
```

## 🔄 Flujo Completo

1. **Cliente agrega productos al carrito**
2. **Cliente hace clic en "Reservar Productos"**
3. **Sistema verifica**:
   - ¿Está logueado? → Usa datos del perfil
   - ¿No está logueado? → Muestra modal para capturar datos
4. **Cliente completa formulario** (si no está logueado)
5. **Sistema reserva productos** (3 horas)
6. **Sistema envía WhatsApp al admin** con todos los detalles
7. **Admin recibe notificación** y contacta al cliente

## ✅ Testing

### Modo Prueba (Actual)
1. Agregar producto al carrito
2. Ir a "Reservar Productos"
3. Completar datos de contacto
4. Ver en consola del servidor el mensaje que se enviaría

### Modo Producción (Después de configurar)
1. Mismo flujo
2. El mensaje SE ENVÍA al WhatsApp del admin
3. Verificar recepción en tu teléfono

## 🚀 Deploy a Vercel

1. **Agregar variables de entorno en Vercel**:
   - Settings → Environment Variables
   - Agregar todas las variables necesarias según la opción elegida

2. **Hacer commit y push**:
   ```bash
   git add .
   git commit -m "Implementar notificaciones WhatsApp"
   git push
   ```

3. **Vercel desplegará automáticamente** con las nuevas variables

## 📞 Soporte

Si necesitas ayuda con la configuración:
- **Twilio**: [https://www.twilio.com/docs/whatsapp](https://www.twilio.com/docs/whatsapp)
- **WhatsApp Business API**: [https://developers.facebook.com/docs/whatsapp](https://developers.facebook.com/docs/whatsapp)
- **Green API**: [https://green-api.com/en/docs/](https://green-api.com/en/docs/)

---

## 📌 Notas Importantes

- ⚠️ **Cambiar el número en `.env`**: El `+5491112345678` es un ejemplo
- 🔐 **No compartir tokens**: Agregar `.env` al `.gitignore`
- 💰 **Costos**: Verificar precios de cada servicio antes de implementar
- 📱 **Número verificado**: Algunos servicios requieren verificar el número del admin
- ⏰ **Límites de envío**: Verificar límites de mensajes por día/hora de cada servicio
