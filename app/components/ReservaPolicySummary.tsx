'use client'
import { useEffect, useState } from 'react'
import { policySummary, validatePolicy } from '@/lib/reserva-policy'

export default function ReservaPolicySummary() {
  const [summary, setSummary] = useState('Consulta el plazo y las pausas de tu reserva en el carrito.')
  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/configuracion/reservas/publico', { cache: 'no-store', signal: controller.signal })
      .then(async r => { if (r.ok) setSummary(policySummary(validatePolicy(await r.json()))) }).catch(() => {})
    return () => controller.abort()
  }, [])
  return <p className="my-4 border border-gray-300 p-4 text-sm text-black">Condiciones para nuevas reservas: {summary} Las reservas anteriores conservan sus condiciones.</p>
}
