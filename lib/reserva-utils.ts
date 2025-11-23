/**
 * Utilidades para calcular tiempos de expiración de reservas
 * Considera horarios de atención del vendedor
 */

// Configuración de horarios de atención
const HORARIO_CONFIG = {
  horaInicio: 10, // 10:00
  horaFin: 23,   // 23:00
  minutosReservaStandard: 30, // 30 minutos en horario normal
  horaInicioConteo: 10 // 10:00 - hora en que empiezan a contar las reservas nocturnas
}

/**
 * Calcula la fecha de expiración inteligente para una reserva
 * Considera horarios de atención para no penalizar al vendedor
 */
export function calcularExpiracionReserva(fechaReserva: Date = new Date()): Date {
  const hora = fechaReserva.getHours()
  const minuto = fechaReserva.getMinutes()
  const expiracion = new Date(fechaReserva)

  // Caso Especial: Reserva justo antes del cierre (22:59 o antes de las 23:00)
  // → Expira en 30 minutos normales (puede pasar de las 23:00)
  if (hora === 22 && minuto >= 0) {
    expiracion.setTime(fechaReserva.getTime() + HORARIO_CONFIG.minutosReservaStandard * 60 * 1000)
    console.log(`⏰ Reserva a las ${hora}:${minuto} - Expira en 30 minutos (puede pasar las 23:00)`)
    return expiracion
  }

  // Caso 1: Reserva nocturna/madrugada (23:00 - 10:00)
  // → Empieza a contar desde las 10:00
  if (hora >= HORARIO_CONFIG.horaFin || hora < HORARIO_CONFIG.horaInicio) {
    // Si es después de las 23:00, el conteo empieza mañana a las 10:00
    if (hora >= HORARIO_CONFIG.horaFin) {
      expiracion.setDate(expiracion.getDate() + 1)
    }
    expiracion.setHours(HORARIO_CONFIG.horaInicioConteo, HORARIO_CONFIG.minutosReservaStandard, 0, 0)
    console.log(`🌙 Reserva nocturna (${hora}:${minuto}). Conteo empieza a las 10:00 + 30 min = 10:30`)
    return expiracion
  }

  // Caso 2: Reserva en horario normal (10:00 - 21:59)
  // → Expira en 30 minutos desde el momento de la reserva
  if (hora >= HORARIO_CONFIG.horaInicio && hora < 22) {
    expiracion.setTime(fechaReserva.getTime() + HORARIO_CONFIG.minutosReservaStandard * 60 * 1000)
    console.log(`☀️ Reserva en horario normal (${hora}:${minuto}). Expira en ${HORARIO_CONFIG.minutosReservaStandard} minutos`)
    return expiracion
  }

  // Caso por defecto (no debería llegar aquí)
  expiracion.setTime(fechaReserva.getTime() + HORARIO_CONFIG.minutosReservaStandard * 60 * 1000)
  return expiracion
}

/**
 * Obtiene un mensaje descriptivo del tiempo de expiración
 */
export function obtenerMensajeExpiracion(fechaReserva: Date = new Date()): string {
  const hora = fechaReserva.getHours()
  const minuto = fechaReserva.getMinutes()

  // Reserva nocturna/madrugada
  if ((hora >= HORARIO_CONFIG.horaFin && hora < 24) || (hora >= 0 && hora < HORARIO_CONFIG.horaInicio)) {
    return `Tu reserva es válida hasta las 10:30 (el conteo empieza a las 10:00). Te contactaremos durante el horario de atención (10:00 - 23:00).`
  }

  // Reserva a las 22:XX
  if (hora === 22) {
    const minutoFinal = minuto + HORARIO_CONFIG.minutosReservaStandard
    const horaFinal = minutoFinal >= 60 ? 23 : 22
    const minutoFinalAjustado = minutoFinal >= 60 ? minutoFinal - 60 : minutoFinal
    return `Tu reserva es válida por ${HORARIO_CONFIG.minutosReservaStandard} minutos (hasta las ${horaFinal}:${minutoFinalAjustado < 10 ? '0' + minutoFinalAjustado : minutoFinalAjustado}).`
  }

  // Reserva normal
  return `Tu reserva es válida por ${HORARIO_CONFIG.minutosReservaStandard} minutos.`
}

/**
 * Verifica si una reserva está en horario de atención
 */
export function estaEnHorarioAtencion(fecha: Date = new Date()): boolean {
  const hora = fecha.getHours()
  return hora >= HORARIO_CONFIG.horaInicio && hora < HORARIO_CONFIG.horaFin
}

/**
 * Calcula el tiempo restante hasta la expiración (para mostrar cronómetro)
 */
export function calcularTiempoRestante(fechaReserva: Date, fechaExpiracion: Date): string {
  const ahora = new Date()
  const diferencia = fechaExpiracion.getTime() - ahora.getTime()

  if (diferencia <= 0) {
    return '⏰ Expirado'
  }

  const horas = Math.floor(diferencia / (1000 * 60 * 60))
  const minutos = Math.floor((diferencia % (1000 * 60 * 60)) / (1000 * 60))
  const segundos = Math.floor((diferencia % (1000 * 60)) / 1000)

  return `⏱️ ${horas}h ${minutos}m ${segundos}s`
}
