import type { Producto } from '@prisma/client'

// Best effort, after commit and only by the winner of the guarded transition.
// Explicit opt-in prevents test installations from sending real messages.
export async function notifyExpiration(product: Pick<Producto, 'id' | 'nombre'>) {
  if (process.env.RESERVA_WHATSAPP_ENABLED !== 'true') return
  const sid = process.env.TWILIO_ACCOUNT_SID, token = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_WHATSAPP_NUMBER, to = process.env.NEXT_PUBLIC_ADMIN_WHATSAPP
  if (!sid || !token || !from || !to) return
  try {
    const { default: twilio } = await import('twilio')
    await twilio(sid, token, { timeout: 5000, autoRetry: false }).messages.create({
      from, to: `whatsapp:${to}`, body: `Reserva vencida: ${product.nombre} (#${product.id}). El producto fue liberado. Consulta el panel de ventas.`,
    })
  } catch { console.error('No se pudo notificar una expiración; la liberación ya fue confirmada.') }
}
