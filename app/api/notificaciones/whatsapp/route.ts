import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { 
      adminPhone, 
      clienteNombre, 
      clienteTelefono, 
      clienteRedSocial,
      productos,
      total 
    } = body

    // Validar datos requeridos
    if (!adminPhone || !clienteNombre || !productos || productos.length === 0) {
      return NextResponse.json(
        { error: 'Datos incompletos para enviar notificación' },
        { status: 400 }
      )
    }

    // Construir mensaje de WhatsApp
    const productosTexto = productos.map((p: { nombre: string, precio: number }) => 
      `• ${p.nombre} - $${p.precio.toFixed(2)}`
    ).join('\n')

    const mensaje = `
🛍️ *NUEVA RESERVA - Fimu Vintage*

👤 *Cliente:* ${clienteNombre}
📱 *Teléfono:* ${clienteTelefono || 'No proporcionado'}
${clienteRedSocial ? `📲 *Red Social:* ${clienteRedSocial}` : ''}

📦 *Productos reservados:*
${productosTexto}

💰 *Total:* $${total.toFixed(2)}

⏰ *Reserva válida por 3 horas*

Por favor contacta al cliente para confirmar el pago.
    `.trim()

    // Aquí puedes integrar con diferentes servicios:
    // 1. Twilio
    // 2. WhatsApp Business API
    // 3. Baileys (WhatsApp Web)
    // 4. Green API
    
    // Envío con Twilio
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const twilioPhone = process.env.TWILIO_WHATSAPP_NUMBER // Ej: whatsapp:+14155238886
    
    console.log('🔍 Verificando credenciales de Twilio...')
    console.log('Account SID:', accountSid ? `${accountSid.substring(0, 10)}...` : 'NO CONFIGURADO')
    console.log('Auth Token:', authToken ? 'CONFIGURADO' : 'NO CONFIGURADO')
    console.log('Twilio Phone:', twilioPhone || 'NO CONFIGURADO')
    
    // ✅ ACTIVADO - Envío de WhatsApp ACTIVO
    // 🔧 Número del admin para recibir notificaciones
    const numeroAdmin = process.env.NEXT_PUBLIC_ADMIN_WHATSAPP || '+5491123882449'
    
    if (accountSid && authToken && twilioPhone) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const twilio = require('twilio')
      const client = twilio(accountSid, authToken)
      
      try {
        console.log('📤 Enviando mensaje WhatsApp...')
        console.log('Desde:', twilioPhone)
        console.log('Para:', `whatsapp:${numeroAdmin}`)
        
        const result = await client.messages.create({
          from: twilioPhone,
          to: `whatsapp:${numeroAdmin}`,
          body: mensaje
        })
        
        console.log('✅ Mensaje WhatsApp enviado exitosamente!')
        console.log('Message SID:', result.sid)
        console.log('Status:', result.status)
        console.log('📱 Enviado a:', numeroAdmin)
        
        return NextResponse.json({ 
          success: true, 
          message: 'Notificación enviada por WhatsApp',
          messageSid: result.sid,
          status: result.status,
          sentTo: numeroAdmin
        })
      } catch (error) {
        console.error('❌ Error al enviar WhatsApp con Twilio:', error)
        throw error
      }
    } else {
      // MODO PRUEBA - Solo mostrar en consola
      console.warn('⚠️ WhatsApp NO se enviará (faltan credenciales de Twilio)')
      console.log('📱 Vista previa del mensaje que se enviaría:', {
        destino: numeroAdmin,
        mensaje,
        cliente: clienteNombre
      })
      
      return NextResponse.json({ 
        success: true, 
        message: 'Modo prueba - Notificación simulada (faltan credenciales de Twilio)',
        preview: mensaje
      })
    }
  } catch (error) {
    console.error('❌ Error al enviar notificación WhatsApp:', error)
    return NextResponse.json(
      { error: 'Error al procesar notificación', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
