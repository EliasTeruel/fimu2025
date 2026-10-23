'use client'

import { useCallback, useEffect, useState } from 'react'
import { addEffectiveTime, durationMinutes, formatMinute, policySummary, validatePolicy, type ReservaPolicy } from '@/lib/reserva-policy'

export default function ReservaConfig() {
  const [saved, setSaved] = useState<ReservaPolicy | null>(null)
  const [draft, setDraft] = useState<ReservaPolicy | null>(null)
  const [duration, setDuration] = useState('')
  const [unit, setUnit] = useState<'minutos' | 'horas'>('minutos')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [previewAt, setPreviewAt] = useState<number | null>(null)
  function populate(p: ReservaPolicy) {
    setSaved(p); setDraft(p); setDuration(String(p.duracionMinutos)); setUnit('minutos'); setPreviewAt(Date.now())
  }
  const reload = useCallback(async () => {
    setBusy(true); setError(''); setMessage('')
    try {
      const response = await fetch('/api/configuracion/reservas', { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      populate(validatePolicy(data))
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo cargar') }
    finally { setBusy(false) }
  }, [])
  useEffect(() => { void reload() }, [reload])
  let policy: ReservaPolicy | null = null, invalid = '', preview = ''
  if (draft) {
    try {
      policy = validatePolicy({ ...draft, duracionMinutos: durationMinutes(duration, unit) })
      if (previewAt) preview = new Intl.DateTimeFormat('es-AR', { timeZone: policy.zonaHoraria, dateStyle: 'short', timeStyle: 'short' })
        .format(new Date(addEffectiveTime(previewAt, policy.duracionMinutos * 60000, policy)))
    } catch (e) { invalid = (e as Error).message }
  }
  async function save(event: React.FormEvent) {
    event.preventDefault()
    if (!policy) return
    setBusy(true); setError(''); setMessage('')
    try {
      const response = await fetch('/api/configuracion/reservas', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(policy) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      populate(validatePolicy(data)); setMessage('Configuración guardada. Se aplicará a las reservas nuevas.')
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar') }
    finally { setBusy(false) }
  }
  const inputClass = 'block w-full border border-gray-500 rounded p-2 mt-1 bg-white text-black'
  return <section className="mt-8 border-t-2 border-black pt-6 text-black" aria-labelledby="reserva-config-title">
    <h2 id="reserva-config-title" className="text-xl font-semibold">Reservas y horarios</h2>
    <p className="my-3 text-sm">Los cambios se aplican a reservas nuevas. Las activas conservan su duración y horarios. La pausa se repite todos los días hasta que vuelvas a cambiarla.</p>
    {error && <p role="alert" className="my-3 text-red-700">{error} <button type="button" className="underline" disabled={busy} onClick={reload}>Recargar valores vigentes</button></p>}
    {message && <p role="status" className="my-3 text-green-800">{message}</p>}
    {!draft ? <p role="status">{busy ? 'Cargando configuración…' : 'Configuración no disponible.'}</p> :
      <form onSubmit={save}>
        <fieldset disabled={busy} className="space-y-4 disabled:opacity-60">
          <div className="grid gap-4 sm:grid-cols-2">
            <label>Duración<input className={inputClass} type="text" inputMode="decimal" required value={duration} onChange={e => setDuration(e.target.value)} /></label>
            <label>Unidad<select className={inputClass} value={unit} onChange={e => {
              const next = e.target.value as 'minutos' | 'horas'
              const minutes = Number(duration.replace(',', '.')) * (unit === 'horas' ? 60 : 1)
              setDuration(String(next === 'horas' ? minutes / 60 : minutes)); setUnit(next)
            }}><option value="minutos">Minutos</option><option value="horas">Horas</option></select></label>
          </div>
          <p className="text-sm">Entre 1 minuto y 168 horas efectivas. Puedes ingresar 1,5 horas.</p>
          <label className="flex gap-2 items-center"><input type="checkbox" checked={draft.pausaAutomaticaHabilitada} onChange={e => setDraft({ ...draft, pausaAutomaticaHabilitada: e.target.checked })} />Activar pausa automática diaria</label>
          <div className="grid gap-4 sm:grid-cols-2">
            {(['pausaDesdeMinuto', 'pausaHastaMinuto'] as const).map((key, i) => <label key={key}>{i === 0 ? 'Inicio de pausa' : 'Fin de pausa'}<input className={inputClass} type="time" required step="60" disabled={!draft.pausaAutomaticaHabilitada} value={formatMinute(draft[key])} onChange={e => {
              const [h, m] = e.target.value.split(':').map(Number)
              if (Number.isInteger(h) && Number.isInteger(m)) setDraft({ ...draft, [key]: h * 60 + m })
            }} /></label>)}
          </div>
          <label className="block">Zona horaria de la tienda<input className={inputClass} required value={draft.zonaHoraria} onChange={e => setDraft({ ...draft, zonaHoraria: e.target.value })} /></label>
          {invalid ? <p role="alert" className="text-red-700">{invalid}</p> : <div className="bg-gray-100 p-3 text-sm"><p>{policySummary(policy!)}</p><p>Ejemplo al abrir este formulario: vencería el {preview}, hora de la tienda.</p></div>}
          <div className="flex flex-wrap gap-3">
            <button className="bg-black text-white px-4 py-2 disabled:opacity-50" disabled={!policy || busy} type="submit">{busy ? 'Guardando…' : 'Guardar reservas y horarios'}</button>
            <button className="border border-black px-4 py-2" type="button" onClick={() => { if (saved) populate(saved); setError(''); setMessage('') }}>Descartar cambios</button>
          </div>
        </fieldset>
      </form>}
  </section>
}
