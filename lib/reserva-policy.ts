import { Temporal } from '@js-temporal/polyfill'

export type ReservaPolicy = {
  duracionMinutos: number
  pausaAutomaticaHabilitada: boolean
  pausaDesdeMinuto: number
  pausaHastaMinuto: number
  zonaHoraria: string
  revision: number
  algoritmo: 2
}

export const initialPolicy: ReservaPolicy = {
  duracionMinutos: 30, pausaAutomaticaHabilitada: true,
  pausaDesdeMinuto: 1380, pausaHastaMinuto: 600,
  zonaHoraria: 'America/Argentina/Buenos_Aires', revision: 1, algoritmo: 2,
}

export function durationMinutes(value: string, unit: 'horas' | 'minutos'): number {
  if (!/^\d+(?:[.,]\d+)?$/.test(value.trim())) throw new Error('Ingresa una duración numérica')
  const minutes = Number(value.replace(',', '.')) * (unit === 'horas' ? 60 : 1)
  const rounded = Math.round(minutes)
  if (Math.abs(minutes - rounded) > 1e-8 || rounded < 1 || rounded > 10080)
    throw new Error('La duración debe equivaler a minutos enteros entre 1 y 10.080')
  return rounded
}

export function validatePolicy(value: unknown): ReservaPolicy {
  if (!value || typeof value !== 'object') throw new Error('Configuración inválida')
  const p = value as Record<string, unknown>
  for (const [key, min, max] of [
    ['duracionMinutos', 1, 10080], ['pausaDesdeMinuto', 0, 1439],
    ['pausaHastaMinuto', 0, 1439], ['revision', 1, 2147483646],
  ] as const) {
    if (!Number.isSafeInteger(p[key]) || (p[key] as number) < min || (p[key] as number) > max)
      throw new Error(`${key}: debe ser un entero entre ${min} y ${max}`)
  }
  if (typeof p.pausaAutomaticaHabilitada !== 'boolean') throw new Error('Pausa inválida')
  if (p.pausaAutomaticaHabilitada && p.pausaDesdeMinuto === p.pausaHastaMinuto)
    throw new Error('El inicio y el fin de la pausa deben ser distintos')
  if (typeof p.zonaHoraria !== 'string' || !p.zonaHoraria || /^[+-]/.test(p.zonaHoraria))
    throw new Error('Indica una zona horaria IANA')
  try { Temporal.Instant.fromEpochMilliseconds(0).toZonedDateTimeISO(p.zonaHoraria) }
  catch { throw new Error('Zona horaria IANA inválida') }
  return {
    duracionMinutos: p.duracionMinutos as number,
    pausaAutomaticaHabilitada: p.pausaAutomaticaHabilitada,
    pausaDesdeMinuto: p.pausaDesdeMinuto as number,
    pausaHastaMinuto: p.pausaHastaMinuto as number,
    zonaHoraria: p.zonaHoraria, revision: p.revision as number, algoritmo: 2,
  }
}

export function readPolicy(value: unknown): ReservaPolicy | null {
  if (!value || typeof value !== 'object' || !('algoritmo' in value) || value.algoritmo !== 2) return null
  try { return validatePolicy(value) } catch { return null }
}

function boundary(day: Temporal.PlainDate, minute: number, zone: string) {
  return Temporal.ZonedDateTime.from({
    timeZone: zone, year: day.year, month: day.month, day: day.day,
    hour: Math.floor(minute / 60), minute: minute % 60,
  }, { disambiguation: 'compatible' }).epochMilliseconds
}

// Walk calendar intervals, never individual minutes. DST boundaries use Temporal's
// compatible rule: earlier offset for repeated times, shift forward for missing times.
function nextPause(now: number, p: ReservaPolicy): [number, number] {
  let day = Temporal.Instant.fromEpochMilliseconds(now).toZonedDateTimeISO(p.zonaHoraria).toPlainDate().subtract({ days: 1 })
  for (let n = 0; n < 5; n++, day = day.add({ days: 1 })) {
    const start = boundary(day, p.pausaDesdeMinuto, p.zonaHoraria)
    const endDay = p.pausaDesdeMinuto > p.pausaHastaMinuto ? day.add({ days: 1 }) : day
    const end = boundary(endDay, p.pausaHastaMinuto, p.zonaHoraria)
    if (end > now && end > start) return [start, end]
  }
  throw new Error('No se pudo resolver el próximo intervalo horario')
}

const DAY_MS = 86400000
function stableDays(now: number, p: ReservaPolicy) {
  const next = Temporal.Instant.fromEpochMilliseconds(now).toZonedDateTimeISO(p.zonaHoraria).getTimeZoneTransition('next')
  // Leave the day containing an offset transition to the calendar algorithm.
  return next ? Math.max(0, Math.floor((next.epochMilliseconds - now - 1) / DAY_MS)) : Infinity
}
function dailyEffective(p: ReservaPolicy) {
  const paused = (p.pausaHastaMinuto - p.pausaDesdeMinuto + 1440) % 1440
  return (1440 - paused) * 60000
}

export function automaticPause(now: number, p: ReservaPolicy): number | null {
  if (!p.pausaAutomaticaHabilitada) return null
  const [start, end] = nextPause(now, p)
  return start <= now ? end : null
}

export function addEffectiveTime(now: number, milliseconds: number, p: ReservaPolicy): number {
  if (!Number.isFinite(now) || !Number.isFinite(milliseconds) || milliseconds < 0)
    throw new Error('Tiempo inválido')
  if (!p.pausaAutomaticaHabilitada || milliseconds === 0) return now + milliseconds
  let cursor = now, remaining = milliseconds
  for (let n = 0; n < 20000; n++) {
    const days = Math.min(Math.floor((remaining - 1) / dailyEffective(p)), stableDays(cursor, p))
    if (days > 0) { cursor += days * DAY_MS; remaining -= days * dailyEffective(p) }
    const [start, end] = nextPause(cursor, p)
    const available = Math.max(0, start - cursor)
    if (remaining <= available) return cursor + remaining
    remaining -= available
    cursor = end
  }
  throw new Error('Duración fuera del rango calculable')
}

export function effectiveTimeBetween(from: number, to: number, p: ReservaPolicy): number {
  if (to <= from) return 0
  if (!p.pausaAutomaticaHabilitada) return to - from
  let cursor = from, total = 0
  for (let n = 0; n < 20000 && cursor < to; n++) {
    const days = Math.min(Math.floor((to - cursor) / DAY_MS), stableDays(cursor, p))
    if (days > 0) { cursor += days * DAY_MS; total += days * dailyEffective(p) }
    if (cursor >= to) break
    const [start, end] = nextPause(cursor, p)
    total += Math.max(0, Math.min(to, start) - cursor)
    cursor = Math.max(cursor, end)
  }
  if (cursor < to) throw new Error('Intervalo fuera del rango calculable')
  return total
}

export type TimedReservation = {
  estado?: string; reservaPolitica?: unknown; reservaExpiraEn?: Date | string | null
  reservaPausada?: boolean; reservaSaldoMs?: number | null
}
export type ReservationTiming = {
  serverNow: string; expiresAt: string | null; remainingMs: number
  pause: 'manual' | 'automatica' | 'revision' | null
  resumesAt: string | null; policy: ReservaPolicy | null
}

export function reservationTiming(product: TimedReservation, now = Date.now()): ReservationTiming | null {
  if (product.estado !== 'reservado') return null
  const policy = readPolicy(product.reservaPolitica)
  const expires = product.reservaExpiraEn ? new Date(product.reservaExpiraEn).getTime() : null
  const base = { serverNow: new Date(now).toISOString(), expiresAt: expires === null ? null : new Date(expires).toISOString(), policy }
  if (!policy || (product.reservaPausada ? product.reservaSaldoMs == null : expires === null))
    return { ...base, remainingMs: 0, pause: 'revision', resumesAt: null }
  if (product.reservaPausada)
    return { ...base, remainingMs: product.reservaSaldoMs!, pause: 'manual', resumesAt: null }
  const resume = expires! > now ? automaticPause(now, policy) : null
  return { ...base, remainingMs: effectiveTimeBetween(now, expires!, policy), pause: resume ? 'automatica' : null, resumesAt: resume ? new Date(resume).toISOString() : null }
}

export function withReservationTiming<T extends TimedReservation>(product: T) {
  return { ...product, reservaTiempo: reservationTiming(product) }
}

export function formatMinute(minute: number) {
  return `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`
}

export function policySummary(p: ReservaPolicy) {
  return `${p.duracionMinutos} minutos efectivos. ${p.pausaAutomaticaHabilitada ? `Pausa diaria de ${formatMinute(p.pausaDesdeMinuto)} a ${formatMinute(p.pausaHastaMinuto)} (${p.zonaHoraria}).` : 'Sin pausa automática.'}`
}
