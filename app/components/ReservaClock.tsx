'use client'

import { useEffect, useState } from 'react'
import { automaticPause, effectiveTimeBetween, type ReservationTiming } from '@/lib/reserva-policy'

function textFor(timing: ReservationTiming | null) {
  if (!timing) return ''
  if (timing.pause === 'revision') return 'Reserva anterior: pendiente de revisión administrativa'
  const seconds = Math.ceil(timing.remainingMs / 1000)
  const balance = `${Math.floor(seconds / 3600)}h ${Math.floor(seconds % 3600 / 60)}m ${seconds % 60}s`
  if (timing.pause === 'manual') return `⏸ Pausa manual · ${balance} pendientes`
  if (timing.pause === 'automatica') return `⏸ Pausa horaria · ${balance} pendientes · continúa ${new Intl.DateTimeFormat('es-AR', { timeZone: timing.policy!.zonaHoraria, dateStyle: 'short', timeStyle: 'short' }).format(new Date(timing.resumesAt!))}`
  return seconds <= 0 ? 'Plazo vencido · actualizando disponibilidad' : `⏱ ${balance} restantes`
}

export default function ReservaClock({ timing }: { timing?: ReservationTiming | null }) {
  const [text, setText] = useState(() => textFor(timing || null))
  useEffect(() => {
    const receivedAt = performance.now()
    const render = () => {
      if (!timing) { setText(''); return }
      if (timing.pause === 'manual' || timing.pause === 'revision' || !timing.policy) { setText(textFor(timing)); return }
      const anchor = Date.parse(timing.serverNow)
      const now = Math.floor(anchor + performance.now() - receivedAt)
      const remainingMs = Math.max(0, timing.remainingMs - effectiveTimeBetween(anchor, now, timing.policy))
      const resume = remainingMs > 0 ? automaticPause(now, timing.policy) : null
      setText(textFor({ ...timing, remainingMs, pause: resume ? 'automatica' : null, resumesAt: resume ? new Date(resume).toISOString() : null }))
    }
    render()
    const timer = setInterval(render, 1000)
    return () => clearInterval(timer)
  }, [timing])
  return <span>{text}</span>
}
