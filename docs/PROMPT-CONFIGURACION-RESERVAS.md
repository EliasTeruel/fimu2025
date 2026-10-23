> Decisiones confirmadas el 22/10/2026: zona `America/Argentina/Buenos_Aires`; guardar afecta solo nuevas reservas; hosting Vercel Hobby. Implementación y activación documentadas en [CONFIGURACION-RESERVAS-OPERACION.md](CONFIGURACION-RESERVAS-OPERACION.md).

# Prompt: duración y pausa horaria configurables para reservas

Fecha: 22 de octubre de 2026.

Estado: especificación preparada; implementación pendiente. Plan y registro de ejecución en [PLAN-Y-BITACORA-CONFIGURACION-RESERVAS.md](PLAN-Y-BITACORA-CONFIGURACION-RESERVAS.md).

El siguiente texto es el encargo para la futura implementación.

---

## Objetivo

En Fimu2025 quiero administrar los tiempos de reserva desde el panel que actualmente se abre con **⚙️ Configurar Categorías**, dentro de `/admin`.

Necesito poder elegir fácilmente cuánto dura una reserva, en minutos u horas, y personalizar la franja diaria en la que el cronómetro queda pausado automáticamente. Por ejemplo, quiero configurar una pausa desde las **21:00 hasta las 12:00 del día siguiente**, y poder cambiarla cuando tenga una situación especial.

Guarda esta configuración en PostgreSQL mediante Prisma. Los cambios deben persistir después de recargar o reiniciar la aplicación y no deben requerir editar código ni desplegar de nuevo.

## Contexto que debes conservar

- Stack existente: Next.js App Router, React, TypeScript, Prisma, PostgreSQL y Supabase Auth.
- Ya existe `requireAdmin()` en `lib/api-identity.ts`: verifica el usuario con Supabase y obtiene `isAdmin` de la base.
- Ya están protegidos carrito, reservas y operaciones administrativas. Mantén esos controles.
- El usuario realizó la mayoría de las pruebas S01–S09 y marcó sus pasos en `docs/CHECKLIST-PRUEBAS-MANUALES.md`. Conserva sus marcas y anotaciones.
- Los tiempos actuales están repartidos entre `lib/reserva-utils.ts`, carrito, modal de producto, ventas administrativas y rutas de ventas. Hay valores fijos de 30 minutos, horarios 23:00–10:00 y una limpieza de 3 horas. Deben tener una única regla coherente.
- La pausa manual del administrador debe seguir funcionando y ser independiente de la pausa automática por horario.

## Interfaz solicitada

1. Ampliar el panel actual con dos secciones: **Categorías** y **Reservas y horarios**. El acceso puede llamarse **⚙️ Configuración** para reflejar su alcance.
2. Conservar los controles de visibilidad de categorías.
3. Añadir un valor de duración y un selector **Minutos / Horas**. Ejemplos: 15 minutos, 45 minutos, 1 hora, 2 horas, 1,5 horas.
4. Añadir un interruptor **Pausar automáticamente por horario**.
5. Añadir **Pausar desde** y **Reanudar a las**, con precisión de minutos y formato de 24 horas. Permitir franjas que crucen medianoche.
6. Mostrar la zona horaria de la tienda y permitir configurarla explícitamente.
7. Añadir **Guardar cambios**, validación clara, estado de guardado, confirmación y posibilidad de descartar la edición sin modificar valores persistidos.
8. Mostrar un resumen y una vista previa comprensibles, por ejemplo: «Reservas de 45 minutos. El cronómetro se pausa de 21:00 a 12:00, según la zona horaria de la tienda».
9. Mostrar a qué reservas se aplican los cambios. No modificar silenciosamente los plazos de compradores que ya reservaron.

## Reglas funcionales propuestas

Estas decisiones completan los detalles todavía no especificados por el usuario. Déjalas identificadas como propuestas y revisa las decisiones pendientes del plan antes de implementarlas.

- Configuración global de la tienda en esta primera versión, no una duración distinta por categoría.
- Persistir la duración en minutos enteros; convertir la unidad de la interfaz sin redondear silenciosamente. Rango inicial propuesto: de 1 a 10.080 minutos efectivos (168 horas).
- La franja de pausa se repite diariamente hasta que el administrador la cambie. No incluye todavía fechas especiales ni restauración automática al día siguiente.
- Inicio de pausa incluido y fin excluido. Si ambos horarios son iguales, rechazar la configuración mientras la pausa esté activada; para contar todo el día se usa el interruptor de desactivación.
- Fuera de la pausa se consume tiempo; dentro de la pausa no se consume. Una reserva que llega al inicio de la pausa conserva su saldo y lo continúa al reabrir.
- Una reserva creada dentro de la pausa empieza a consumir su duración al terminar esa franja.
- Una duración larga puede atravesar varias pausas diarias. No limitar el cálculo a «hoy o mañana».
- Usar una zona IANA explícita de la tienda. No deducirla del navegador, del servidor, del idioma o de la ubicación del operador. La zona inicial del negocio está pendiente de confirmar.
- Usar el reloj del servidor para decidir vencimiento. El navegador representa el estado, pero no autoriza liberar productos.

### Ejemplos de aceptación

Con duración de 30 minutos y pausa de 21:00 a 12:00, en la zona horaria de la tienda y sin cambios de horario estacional:

| Reserva creada | Resultado esperado |
| --- | --- |
| 15:00 | Vence a las 15:30 del mismo día |
| 20:50 | Consume 10 minutos, se pausa a las 21:00 y vence a las 12:20 del día siguiente |
| 21:00 | Empieza a contar a las 12:00 del día siguiente y vence a las 12:30 |
| 02:00 | Empieza a contar a las 12:00 de ese día y vence a las 12:30 |
| 12:00 | Empieza inmediatamente y vence a las 12:30 |

Con duración de 2 horas y esa misma pausa, una reserva a las 20:30 vence a las 13:30 del día siguiente. Con la pausa desactivada, una reserva de 30 minutos a las 20:50 vence a las 21:20.

Esto cambia la excepción actual que permite que ciertas reservas iniciadas antes del cierre venzan durante la noche. No confundas mantener los valores iniciales de 30 minutos y 23:00–10:00 con mantener exactamente el algoritmo anterior.

## Reservas existentes y pausa manual

- Propuesta inicial: los cambios de configuración se aplican a nuevas reservas. Las activas conservan la política y el plazo que recibieron.
- Guardar una copia de la política aplicada y su revisión junto con el estado temporal de cada reserva. Actualizar solo una fila global no alcanza para preservar reservas activas.
- Si el usuario necesita aplicar una excepción a reservas ya activas, definir primero esa opción: vista previa de afectadas, regla para conservar el tiempo consumido y acción explícita. No implementarlo de forma implícita al pulsar Guardar.
- Definir también qué sucede al añadir productos a una reserva existente. Propuesta: mantener la política original de las reservas extendidas; usar la configuración actual en los productos nuevos y devolver el vencimiento por producto si difieren.
- Pausar manualmente conserva el tiempo efectivo restante. Reanudar durante la franja automática no comienza a descontar hasta que termine esa franja.
- Los intervalos de pausa manual y automática que se superponen no se suman dos veces.
- Agrupar pausas por identidad verificada o identificador de reserva; nunca por coincidencia de `compradorInfo`.

## Persistencia y autorización

- Crear una tabla dedicada, por ejemplo `configuracion_reservas`, con una única configuración global, duración, pausa habilitada, horarios, zona horaria, revisión y fecha/autor de actualización.
- Usar validación en servidor y restricciones de base cuando corresponda. Rechazar números inválidos, valores fuera de rango, horarios imposibles y zonas horarias no válidas.
- Lectura administrativa y escritura mediante API protegida con `requireAdmin()`.
- Evitar sobrescrituras silenciosas si dos administradores editan a la vez, usando revisión de configuración y respuesta de conflicto.
- La tienda puede recibir los parámetros públicos y los datos temporales necesarios para mostrar su reserva. No exponer datos del comprador, identificadores de otros propietarios ni datos internos de auditoría.
- Preparar la migración y el procedimiento para reservas antiguas antes de ejecutar cambios sobre la base. No resetear tablas ni borrar reservas para introducir esta mejora.
- Revisar cómo se aplican los SQL existentes del repositorio: hay archivos SQL sueltos en `prisma/migrations`. No asumir que ya existe un historial estándar de Prisma Migrate.

## Integración completa

- Centralizar la lógica temporal en funciones reutilizables y comprobables con un reloj controlado.
- Usar la misma política en reservar, extender, pausar, reanudar, expirar, limpiar vencidas y confirmar una venta. Expirar y confirmar simultáneamente no debe producir resultados contradictorios.
- Definir qué ocurre si un administrador intenta confirmar una reserva ya vencida. Propuesta: rechazar la confirmación normal y exigir una operación administrativa explícita si se necesita una excepción.
- Sustituir la limpieza fija de 3 horas por el vencimiento real de cada reserva y respetar las pausas manuales.
- La liberación por vencimiento debe ser atómica e idempotente. Una petición antigua no puede borrar una reserva renovada ni un producto vendido.
- Decidir y documentar cómo se ejecuta la expiración sin navegadores abiertos: tarea periódica protegida, frecuencia y límite de retraso. El cronómetro no debe ser el único disparador. Registrar por separado la implementación del servicio y su activación en el hosting.
- Unificar cronómetros y mensajes en carrito, modal, administración, preguntas frecuentes, cómo comprar y notificaciones. Mostrar el tiempo efectivo restante y cuándo se reanudará durante una pausa.
- Ajustar las respuestas públicas y el caché para que la interfaz reciba tiempos actualizados sin revelar información privada. Los endpoints públicos actuales no devuelven todos los campos que necesita el modal.

## Pruebas y documentación obligatorias

- Cubrir duración en minutos/horas, límites, franja nocturna, franja dentro del mismo día, pausa desactivada, medianoche, múltiples días, zona horaria y cambios estacionales donde existan.
- Cubrir pausa manual dentro y fuera de la automática, reservas antiguas, modificación de configuración con reservas activas, dos administradores guardando y carreras entre confirmar/renovar/expirar.
- Mantener las pruebas de autorización previas y agregar invitado/cliente/admin para la nueva API.
- Ejecutar pruebas, TypeScript, ESLint y comprobación de compilación según el entorno. Informar los resultados reales y cualquier bloqueo.
- Preparar una nueva secuencia manual de configuración y vencimientos sin borrar las marcas previas S01–S09.
- Actualizar la bitácora después de cada paso implementado: archivos, razón del cambio, validación, resultados, incidencias y pendientes. No marcar como realizada una tarea solo porque está planificada.
- Entregar instrucciones para migrar en pruebas, verificar reservas existentes, desplegar y revertir de forma compatible. No incluir credenciales en documentación ni logs.

## Entrega esperada

Configuración editable y persistida; cálculo único de tiempos; expiración coherente; controles de administrador; pruebas; migración revisable; guía de operación y bitácora actualizada. Distinguir claramente código implementado, migración aplicada, servicio periódico activado y pruebas realmente ejecutadas.
