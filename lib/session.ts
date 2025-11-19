/**
 * Gestión de sessionId para usuarios anónimos
 * Permite persistir el carrito sin necesidad de autenticación
 */

const SESSION_KEY = 'fimu_session_id'

/**
 * Genera un UUID v4 único
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

/**
 * Obtiene o crea un sessionId único para este navegador/dispositivo
 * Se almacena en localStorage para persistir entre sesiones
 */
export function getSessionId(): string {
  // Verificar si estamos en el navegador
  if (typeof window === 'undefined') {
    return ''
  }

  try {
    // Intentar obtener sessionId existente
    let sessionId = localStorage.getItem(SESSION_KEY)
    
    // Si no existe, crear uno nuevo
    if (!sessionId) {
      sessionId = generateUUID()
      localStorage.setItem(SESSION_KEY, sessionId)
      console.log('🆕 Nuevo sessionId generado:', sessionId)
    } else {
      console.log('✅ SessionId recuperado:', sessionId)
    }
    
    return sessionId
  } catch (error) {
    console.error('Error al gestionar sessionId:', error)
    // Fallback: generar sessionId temporal en memoria
    return generateUUID()
  }
}

/**
 * Limpia el sessionId (útil para testing o reset manual)
 */
export function clearSessionId(): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(SESSION_KEY)
      console.log('🗑️ SessionId eliminado')
    } catch (error) {
      console.error('Error al eliminar sessionId:', error)
    }
  }
}

/**
 * Verifica si existe un sessionId almacenado
 */
export function hasSessionId(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  
  try {
    return localStorage.getItem(SESSION_KEY) !== null
  } catch (error) {
    return false
  }
}
