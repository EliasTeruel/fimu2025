// The secret is stored only in the server-issued HttpOnly cookie.
let pendingSession: Promise<string> | null = null

export function getSessionId(): Promise<string> {
  if (typeof window === 'undefined') return Promise.resolve('')
  if (!pendingSession) {
    pendingSession = fetch('/api/sesion', { method: 'POST', cache: 'no-store' })
      .then(async response => {
        if (!response.ok) throw new Error('No se pudo iniciar el carrito')
        const data = await response.json()
        return data.sessionId as string
      })
      .finally(() => { pendingSession = null })
  }
  return pendingSession
}
