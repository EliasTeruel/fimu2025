# Pruebas manuales de reservas y horarios

> Activación real al 23/10/2026: base migrada y servidor local actualizado; publicar código/secreto en Vercel y activar la tarea siguiendo [los pasos finales](ACTIVACION-RESERVAS-PASOS-FINALES.md). Las casillas de este archivo siguen siendo pruebas manuales pendientes.

Fecha: __________. Entorno/base de pruebas: __________. Versión: __________.

Todas las casillas parten pendientes. Las marcas S01–S09 del [checklist anterior](CHECKLIST-PRUEBAS-MANUALES.md) se conservaron y no se atribuyen a esta versión. Usar entorno aislado: el `.env` de trabajo apunta a la tienda real. Instalar según [la guía de operación](CONFIGURACION-RESERVAS-OPERACION.md).

## Preparación

- [ ] Entorno de pruebas identificado, migración aplicada y aplicación nueva iniciada.
- [ ] Notificaciones reales desactivadas; cuentas de comprador A, comprador B y administrador disponibles.
- [ ] Guardar los valores iniciales de configuración para restaurarlos al terminar.
- [ ] Crear productos identificados como PRUEBA-HORARIOS, sin pagos reales.

## Formulario y persistencia

- [ ] `/admin` → ⚙️ Configuración conserva la sección Categorías y sus controles.
- [ ] Guardar 15 minutos, recargar y verificar persistencia.
- [ ] Guardar 2 horas y luego 1,5 horas: resumen 120 y 90 minutos.
- [ ] Probar vacío, cero, negativos, más de 168 horas y fracciones de minuto: error sin guardado.
- [ ] Configurar 21:00–12:00; probar también pausa dentro del mismo día, por ejemplo 13:00–14:00.
- [ ] Horarios iguales con pausa activa se rechazan; desactivarla permite tiempo continuo.
- [ ] Editar y pulsar Descartar: vuelven los valores guardados.
- [ ] Dos pestañas administradoras: guardar en la primera, luego en la segunda; aparece conflicto y opción de recargar.
- [ ] Invitado y cliente común no pueden leer ni guardar la configuración administrativa por API.
- [ ] Revisar formulario y mensajes en móvil y con teclado.

## Contratos de reserva

- [ ] Crear una reserva A, cambiar duración/horario y recargar A: conserva su política y vencimiento.
- [ ] Agregar otro producto: el nuevo usa la política nueva; el anterior se renueva con la original.
- [ ] Reservar un producto A y otro B con igual texto de contacto: pausar A no pausa B.
- [ ] Pausar manualmente, esperar, recargar y reanudar: el saldo se conserva.
- [ ] Reanudar durante pausa automática: el saldo no baja hasta terminar esa franja.
- [ ] Una reserva manualmente pausada no se renueva ni reanuda al agregar productos nuevos.
- [ ] Dos compradores intentan reservar el mismo producto: solo uno gana.
- [ ] Confirmar pago y expirar/renovar casi simultáneamente: no se libera un producto vendido ni se borra la reserva nueva.
- [ ] Confirmar pago normal de reserva vencida devuelve conflicto; no descuenta stock.

## Fronteras y relojes

Los ejemplos de horas lejanas tienen pruebas automáticas; para UI se puede elegir una franja cercana en el entorno aislado. No cambiar el reloj del sistema ni editar fechas de producción.

- [ ] 30 minutos, pausa 21:00–12:00, reserva 20:50 → día siguiente 12:20.
- [ ] Reserva exactamente 21:00 → día siguiente 12:30; 02:00 → mismo día 12:30; 12:00 → 12:30.
- [ ] Dos horas desde 20:30 → día siguiente 13:30.
- [ ] Durante pausa, carrito/modal/ventas muestran saldo congelado y próxima reanudación.
- [ ] Duración que cruza varias pausas mantiene el total efectivo.
- [ ] Navegador en otra zona horaria muestra el mismo contrato de la tienda.
- [ ] Reloj del comprador, modal abierto y panel se actualizan después de pausar/reanudar/cancelar.

## Migración y funcionamiento sin navegador

- [ ] En una copia de pruebas, reservas antiguas activas/pausadas/incompletas conservan sus datos y aparecen para revisión.
- [ ] Revisar y asignar nuevo plazo requiere confirmación; las pausadas manualmente continúan pausadas.
- [ ] Reejecutar la migración conserva configuración y reservas ya existentes.
- [ ] Activar worker local o Supabase Cron contra pruebas; comprobar respuesta autenticada 200.
- [ ] Crear reserva de 1 minuto sin pausa, cerrar todos los navegadores y esperar dos minutos.
- [ ] Reabrir: producto disponible y sin su fila de carrito; registrar hora de vencimiento y de liberación.
- [ ] Repetir llamada del cron: no repite liberación ni notificación.
- [ ] Ejecutar sin secreto o con secreto incorrecto: rechazo sin cambios.
- [ ] Simular caída de la aplicación en pruebas y recuperarla: el siguiente ciclo recoge lo pendiente.
- [ ] Verificar también HTTP de pg_net, no solamente éxito de ejecución SQL del job.

## Cierre

- [ ] Restaurar configuración de pruebas, cancelar reservas de prueba y detener ejecutores temporales.
- [ ] Repetir por separado regresión S01–S09 sobre esta versión; no reemplazar las marcas históricas.
- [ ] Registrar resultados, incidencias y pruebas pendientes en la bitácora.

Resultado: __________. Incidencias: __________. Evidencia sin datos personales: __________.
