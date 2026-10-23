import { NextResponse } from 'next/server'
import { AccessError, accessResponse, requireAdmin } from '@/lib/api-identity'

export async function POST(request: Request) {
  try {
    await requireAdmin()
    const { clienteNombre, productos, total } = await request.json()
    if (typeof clienteNombre !== 'string' || clienteNombre.length > 200 ||
        !Array.isArray(productos) || !productos.length || productos.length > 200 ||
        productos.some(p => typeof p.nombre !== 'string' || p.nombre.length > 300 || !Number.isFinite(p.precio)) ||
        !Number.isFinite(total)) throw new AccessError(400, 'Datos de notificación inválidos')
    const sid = process.env.TWILIO_ACCOUNT_SID, token = process.env.TWILIO_AUTH_TOKEN
    const from = process.env.TWILIO_WHATSAPP_NUMBER, to = process.env.NEXT_PUBLIC_ADMIN_WHATSAPP
    if (!sid || !token || !from || !to) throw new AccessError(503, 'WhatsApp no está configurado')
    const lines = productos.map((p: { nombre: string; precio: number }) => `• ${p.nombre} - $${p.precio.toFixed(2)}`).join('\n')
    const { default: twilio } = await import('twilio')
    await twilio(sid, token, { timeout: 5000, autoRetry: false }).messages.create({
      from, to: `whatsapp:${to}`,
      body: `NUEVA RESERVA - Fimu Vintage\nCliente: ${clienteNombre}\n${lines}\nTotal: $${total.toFixed(2)}\nConsulta el plazo y las pausas de cada producto en el panel de ventas. Cada reserva conserva sus condiciones.`,
    })
    return NextResponse.json({ success: true, message: 'Notificación enviada' })
  } catch (error) {
    return accessResponse(error) ?? NextResponse.json({ error: 'No se pudo enviar la notificación' }, { status: 500 })
  }
}
