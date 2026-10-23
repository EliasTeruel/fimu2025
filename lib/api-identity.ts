import { withReservationTiming } from '@/lib/reserva-policy'
import { createHash, randomBytes } from 'node:crypto'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export class AccessError extends Error {
  constructor(public status: number, message: string) { super(message) }
}

const GUEST_COOKIE = process.env.NODE_ENV === 'production' ? '__Host-fimu_guest' : 'fimu_guest'

// The cookie is a secret capability. Only its hash is stored or returned as sessionId.
export async function guestSession(create = false): Promise<string | null> {
  const jar = await cookies()
  let token = jar.get(GUEST_COOKIE)?.value
  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    if (!create) return null
    token = randomBytes(32).toString('hex')
    jar.set(GUEST_COOKIE, token, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30,
    })
  }
  return createHash('sha256').update(token).digest('hex')
}

export async function verifiedUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error && error.name !== 'AuthSessionMissingError') {
    throw new AccessError(401, 'Sesión inválida; vuelve a iniciar sesión')
  }
  return user
}

export type Identity = { usuarioId: number | null; sessionId: string | null; isAdmin: boolean }
type Claims = { usuarioId?: unknown; sessionId?: unknown }

export async function identity(claims: Claims = {}, requireUser = false): Promise<Identity> {
  const user = await verifiedUser()
  const sessionId = await guestSession()
  let usuarioId: number | null = null
  let isAdmin = false
  if (user) {
    const usuario = await prisma.usuario.findUnique({
      where: { supabaseId: user.id }, select: { id: true, isAdmin: true },
    })
    if (!usuario) throw new AccessError(403, 'No existe un perfil para esta cuenta')
    usuarioId = usuario.id
    isAdmin = usuario.isAdmin
  } else if (requireUser || claims.usuarioId != null) {
    throw new AccessError(401, 'Debes iniciar sesión')
  }
  if (claims.usuarioId != null && String(claims.usuarioId) !== String(usuarioId)) {
    throw new AccessError(403, 'No puedes acceder a otro usuario')
  }
  if (claims.sessionId != null && claims.sessionId !== sessionId) {
    throw new AccessError(403, 'La sesión no pertenece a este navegador')
  }
  if (!usuarioId && !sessionId) throw new AccessError(401, 'Debes iniciar una sesión de carrito')
  return { usuarioId, sessionId, isAdmin }
}

export async function requireAdmin() {
  const actor = await identity({}, true)
  if (!actor.isAdmin) throw new AccessError(403, 'Se requiere permiso de administrador')
  return actor
}

export function cartOwner(actor: Identity) {
  return actor.usuarioId !== null
    ? { usuarioId: actor.usuarioId }
    : { usuarioId: null, sessionId: actor.sessionId! }
}

export function reservationOwner(actor: Identity) {
  return actor.usuarioId !== null
    ? { reservadoPorUsuarioId: actor.usuarioId }
    : { reservadoPorUsuarioId: null, reservadoPorSessionId: actor.sessionId! }
}

export function ownsReservation(actor: Identity, product: { reservadoPorUsuarioId: number | null; reservadoPorSessionId: string | null }) {
  return actor.usuarioId !== null
    ? product.reservadoPorUsuarioId === actor.usuarioId
    : product.reservadoPorUsuarioId === null && !!actor.sessionId && product.reservadoPorSessionId === actor.sessionId
}

export function queryClaims(request: Request) {
  const query = new URL(request.url).searchParams
  return { usuarioId: query.get('usuarioId'), sessionId: query.get('sessionId') }
}

export function accessResponse(error: unknown) {
  return error instanceof AccessError
    ? NextResponse.json({ error: error.message }, { status: error.status })
    : null
}

export function publicProduct<T extends { compradorInfo: string | null; reservadoPorSessionId: string | null; reservadoPorUsuarioId: number | null }>(product: T) {
  const { reservaPolitica: _policy, reservaVersion: _version, reservaSaldoMs: _balance, ...safe } = withReservationTiming(product as T & { estado?: string; reservaPolitica?: unknown; reservaVersion?: number; reservaSaldoMs?: number | null })
  void _policy; void _version; void _balance
  return { ...safe, compradorInfo: null, reservadoPorSessionId: null, reservadoPorUsuarioId: null }
}

export async function canReadSales() {
  const user = await verifiedUser()
  if (!user) return false
  const profile = await prisma.usuario.findUnique({ where: { supabaseId: user.id }, select: { isAdmin: true } })
  return profile?.isAdmin === true
}
