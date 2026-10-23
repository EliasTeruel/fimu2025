# Plan y bitácora: configuración de reservas y horarios

Fecha de apertura: 22 de octubre de 2026.

Estado general al 23/10/2026: **migración real aplicada con respaldo y verificación; Prisma/build y servidor local actualizados; cron creado en Supabase y desactivado. Pendientes: publicar código/secreto en Vercel, activar cron tras verificar el despliegue y completar pruebas manuales.**

Pasos concretos para el usuario: [ACTIVACION-RESERVAS-PASOS-FINALES.md](ACTIVACION-RESERVAS-PASOS-FINALES.md).

Guía vigente: [CONFIGURACION-RESERVAS-OPERACION.md](CONFIGURACION-RESERVAS-OPERACION.md). Nueva ronda manual: [CHECKLIST-CONFIGURACION-RESERVAS.md](CHECKLIST-CONFIGURACION-RESERVAS.md).

Encargo reutilizable: [PROMPT-CONFIGURACION-RESERVAS.md](PROMPT-CONFIGURACION-RESERVAS.md).

Este documento separa lo que se encontró en el código, las decisiones propuestas, los pasos futuros y el registro de lo efectivamente realizado.

## 1. Solicitud del usuario

Ampliar **⚙️ Configurar Categorías** para administrar la duración de las reservas en minutos u horas y la franja diaria de pausa automática, incluyendo casos como **21:00–12:00**. Persistir los ajustes en una tabla y documentar el proceso para poder reconstruirlo en el futuro.

El usuario pidió primero preparar el prompt y la documentación del trabajo. La etapa inicial produjo esos documentos. Posteriormente el usuario autorizó implementar todo; ver Entrada 002 y siguientes.

## 2. Pruebas previas registradas por el usuario

Lectura del archivo guardado [CHECKLIST-PRUEBAS-MANUALES.md](CHECKLIST-PRUEBAS-MANUALES.md) al iniciar esta tarea:

| Secuencia | Pasos marcados | Observación |
| --- | --- | --- |
| S01 | 5/5 | Marcas del usuario |
| S02 | 4/4 | Marcas del usuario |
| S03 | 6/6 | Marcas del usuario |
| S04 | 7/7 | Marcas del usuario |
| S05 | 7/7 | Marcas del usuario |
| S06 | 8/8 | Marcas del usuario |
| S07 | 7/7 | Marcas del usuario |
| S08 | 6/6 | Marcas del usuario |
| S09 | 6/6 | Marcas del usuario |

Estas marcas son evidencia aportada por el usuario, no pruebas repetidas por el agente. 

## 3. Diagnóstico inicial (antes de implementar)

| Área | Archivo | Hallazgo |
| --- | --- | --- |
| Panel de configuración | [app/admin/page.tsx](../app/admin/page.tsx) | Solo gestiona visibilidad de categorías; punto de entrada solicitado para los nuevos controles |
| Configuración existente | [prisma/schema.prisma](../prisma/schema.prisma) | Existe `ConfiguracionCategoria`; no existe configuración de horarios de reservas |
| API de categorías | [route.ts](../app/api/configuracion/categorias/route.ts) | Escritura protegida por `requireAdmin`; mantener su comportamiento |
| Regla temporal | [lib/reserva-utils.ts](../lib/reserva-utils.ts) | 30 minutos y horarios fijos; usa hora local del proceso |
| Reserva | [reservar/route.ts](../app/api/ventas/reservar/route.ts) | Extiende reservas del propietario y devuelve `expiresAt`, pero el esquema no persiste ese vencimiento ni su política |
| Pausa manual | [pausar/route.ts](../app/api/ventas/pausar/route.ts) | Agrupa por `compradorInfo` y modifica `reservadoEn` al reanudar |
| Expiración individual | [expirar/route.ts](../app/api/ventas/expirar/route.ts) | Calcula con la utilidad actual; puede intentar notificar por WhatsApp |
| Limpieza global | [cancelar/route.ts](../app/api/ventas/cancelar/route.ts) | Usa 3 horas; debe converger con el vencimiento real y respetar pausas |
| Cronómetros | [carrito](../app/carrito/page.tsx), [modal](../app/components/ProductoModal.tsx), [ventas](../app/admin/ventas/page.tsx) | Repiten fórmulas y horarios; modificar solo una constante no actualiza todo |
| Disparadores | Ventas y modal de producto | La limpieza revisada depende de llamadas desde pantallas; falta definir ejecución independiente del navegador |
| Datos del modal | [productos/publico/route.ts](../app/api/productos/publico/route.ts) | El listado público selecciona estado, pero no toda la información temporal usada por el modal |
| Textos | [cómo comprar](../app/como-comprar/page.tsx), [preguntas frecuentes](../app/preguntas-frecuentes/page.tsx), [WhatsApp](../app/api/notificaciones/whatsapp/route.ts) | Contienen tiempos fijos, incluidos textos de 3 horas |
| Cambios de esquema | [prisma/migrations](../prisma/migrations) | SQL sueltos; verificar estrategia real de migraciones antes de automatizar aplicación |

### Diferencia funcional que se debe tener presente

La regla actual no congela todas las reservas al comenzar la noche: una reserva de las 22:45 puede vencer a las 23:15. La propuesta de pausa efectiva conserva el saldo pendiente y lo retoma al reabrir. Es un cambio de comportamiento y debe probarse y comunicarse, además de permitir editar horarios.

## 4. Decisiones propuestas y puntos pendientes

| Tema | Propuesta | Estado |
| --- | --- | --- |
| Alcance | Una configuración global para toda la tienda | Propuesto; el pedido no requiere horarios por categoría |
| Duración | Minutos enteros en base; selector minutos/horas en UI; 1–10.080 minutos efectivos | Límites propuestos |
| Pausa | Diaria y editable; conserva el tiempo restante de reservas en curso al atravesar la franja | Propuesto; cambia la excepción nocturna actual |
| Horarios iniciales | Mantener 30 minutos y franja 23:00–10:00 para nuevas reservas al inicializar | Valores propuestos; proteger reservas antiguas con su política anterior |
| Zona horaria | `America/Argentina/Buenos_Aires` | Confirmada por el usuario el 22/10/2026 |
| Efecto de Guardar | Solo nuevas reservas; activas conservan su política | Confirmado por el usuario el 22/10/2026 |
| Excepción puntual | Cambio manual que permanece hasta otra edición | Propuesto; fechas especiales/restauración automática fuera de esta primera versión |
| Extensión al agregar productos | Extender reservas anteriores con su propia política; productos nuevos usan la vigente | Propuesto; puede producir vencimientos diferentes por producto |
| Confirmación después del vencimiento | Rechazar confirmación normal; una excepción requeriría una acción administrativa explícita | Propuesto |
| Ejecución automática | Supabase Cron llama al endpoint protegido cada minuto; worker Node para local | Vercel Hobby confirmado; scripts preparados, activación pendiente |

Zona y alcance resueltos por el usuario. Las restantes propuestas se adoptaron al implementar. Para reservas heredadas sin datos suficientes se eligió revisión explícita, conservando sus registros y pausas; no se presupone que la zona del antiguo servidor fuera Buenos Aires.

## 5. Diseño técnico orientativo

### Tabla de configuración

Modelo propuesto: `ConfiguracionReserva`, tabla `configuracion_reservas`.

| Campo conceptual | Tipo / intención |
| --- | --- |
| `id` | Clave única para la fila global; restricción que impida múltiples configuraciones globales |
| `duracionMinutos` | Entero positivo validado |
| `pausaAutomaticaHabilitada` | Booleano |
| `pausaDesdeMinuto` | Entero entre 0 y 1439; 21:00 = 1260 |
| `pausaHastaMinuto` | Entero entre 0 y 1439; 12:00 = 720 |
| `zonaHoraria` | Identificador IANA validado |
| `revision` | Entero creciente para detectar ediciones concurrentes |
| `createdAt`, `updatedAt` | Trazabilidad temporal |
| `actualizadoPorUsuarioId` | Administrador verificado que guardó el cambio; no tomarlo del cliente |

Guardar configuración y revisión de forma atómica. Si el administrador intenta sobrescribir una revisión antigua, responder con conflicto y permitir recargar los valores vigentes.

### Estado de cada reserva

Una tabla global no basta para conservar contratos anteriores. Evaluar añadir al modelo que actualmente contiene la reserva (`Producto`) estos datos, o introducir una entidad de reserva si la revisión demuestra que hace falta:

- Copia de la política aplicada: duración, franja, zona y versión del algoritmo.
- Revisión de configuración aplicada.
- `reservaExpiraEn` como instante UTC persistido para reservas que pueden avanzar.
- Tiempo efectivo restante al pausar manualmente, con precisión suficiente para no regalar o quitar un minuto en cada pausa.
- Marcas de pausa manual independientes de la pausa horaria.

Definir campos definitivos y nulabilidad antes de escribir la migración. Al pausar manualmente, conservar el saldo; al reanudar, calcular el nuevo vencimiento desde ese saldo y la política guardada. Una pausa manual indefinida no debe ser liberada por un vencimiento anterior.

No reutilizar `reservadoEn` como única fuente de verdad para todos los desplazamientos horarios. Una copia de política por reserva preserva el contrato, pero no equivale a un historial completo de ediciones administrativas: documentar esa diferencia.

### Servicio temporal y respuestas

Funciones puras propuestas: validar política, determinar si un instante está en pausa, sumar tiempo efectivo, calcular saldo y obtener el estado temporal. Recibir explícitamente el reloj y la zona para poder probarlos sin esperar horas reales.

El servidor entrega vencimiento, hora de referencia, saldo efectivo, motivo de pausa y próxima reanudación cuando corresponda. El cliente muestra esa información, sincroniza al cambiar de fase y evita mantener una segunda regla de negocio. Durante una pausa, `expiresAt - Date.now()` no representa por sí solo los minutos efectivos restantes.

Separar los datos públicos necesarios para el reloj de los datos privados de propietario y auditoría. Revisar caché y actualización del catálogo para no mostrar disponibilidad vieja tras una expiración.

API propuesta: `/api/configuracion/reservas`, con lectura/escritura administrativas verificadas. Para la tienda, entregar únicamente la política pública y el estado temporal necesarios mediante los endpoints adecuados, sin abrir la respuesta administrativa completa.

### Expiración y concurrencia

Un servicio de liberación común debe verificar estado, vencimiento, pausa y versión de la reserva en la misma operación/transacción que libera. Si otra petición renueva, vende o cancela primero, la operación anterior no debe afectar al nuevo estado.

La tarea periódica, la limpieza administrativa y cualquier expiración individual autorizada deben invocar esa misma lógica. La tarea periódica necesita autenticación independiente de un navegador administrador. No exponer una ruta pública de barrido ni depender del reloj del cliente.

Las notificaciones deben producirse después de una transición efectiva y evitar duplicados por reintentos. No enviar mensajes reales durante pruebas.

## 6. Plan de ejecución

Las casillas siguientes se marcan al terminar cada paso y registrar su evidencia. Las casillas distinguen implementación/pruebas automáticas de validación manual y activación real.

### P00 — Análisis y especificación

- [x] Revisar el panel, esquema, reglas, consumidores de tiempos y marcas del checklist.
- [x] Preparar el prompt, decisiones propuestas y esta bitácora.

Salida: los dos documentos enlazados. No se modificaron reglas ni datos de la aplicación en este paso.

### P01 — Cerrar las reglas de negocio

- [x] Registrar la zona horaria del negocio y las decisiones de la sección 4.
- [x] Definir límites, fronteras de horario, cambios en reservas activas y extensiones.
- [x] Validar los ejemplos 21:00–12:00 del prompt y el cambio frente al algoritmo anterior.

Salida: tabla de decisiones actualizada, con fecha y motivo. No seguir con una migración de horarios basada en una zona inferida.

### P02 — Preparar persistencia y migración

- [x] Definir esquema Prisma, restricciones, copia de política y estado temporal de reserva.
- [x] Revisar cómo se aplicaron los SQL anteriores y preparar una migración aditiva compatible.
- [x] Diseñar carga inicial idempotente: no sobrescribir configuración si ya existe.
- [x] Diseñar conversión de reservas antiguas y tratamiento de reservas pausadas o sin datos suficientes.
- [x] Probar migración en PostgreSQL embebido aislado (PGlite); verificar preservación de activas/pausadas y revisión explícita sin conversión inferida.

Salida: migración revisable y resultado en pruebas. Aplicarla a pruebas y aplicarla a producción son tareas diferentes.

### P03 — Implementar y probar el cálculo único

- [x] Crear funciones temporales con reloj inyectable y zona horaria explícita.
- [x] Cubrir periodos que cruzan medianoche, pausas diarias repetidas y cambios estacionales.
- [x] Cubrir solapamiento de pausas manuales y automáticas sin duplicar tiempo.
- [x] Implementar el estado temporal que devolverá el servidor a la interfaz.

Salida: cálculo y pruebas deterministas, antes de sustituir las fórmulas existentes.

### P04 — Implementar la API de configuración

- [x] Crear lectura y escritura con `requireAdmin()`.
- [x] Validar duración/unidades, horarios, zona y revisión; devolver errores utilizables por el formulario.
- [x] Guardar autor/revisión/fecha desde el servidor y detectar conflictos entre administradores.
- [x] Probar invitado, cliente común, administrador y fallo de acceso a la base.

Salida: API con autorización y validación comprobadas.

### P05 — Ampliar el panel administrativo

- [x] Mantener categorías y añadir duración, unidad, pausa habilitada, horarios y zona.
- [x] Añadir resumen, ejemplo de vencimiento, Guardar y Descartar, con estados accesibles.
- [x] Indicar el alcance de cambios sobre reservas nuevas/activas según la decisión adoptada.
- [ ] Comprobar persistencia al recargar y errores de guardado/conflictos.

Salida: administración utilizable desde el punto de entrada solicitado.

### P06 — Integrar reserva, pausa, confirmación y limpieza

- [x] Persistir la política y el vencimiento al reservar o extender.
- [x] Integrar pausa/reanudación manual y agrupar por identidad verificable.
- [x] Eliminar la limpieza fija de 3 horas y respetar pausas en todas las rutas.
- [x] Proteger las carreras entre confirmar, cancelar, renovar y expirar con transiciones atómicas.
- [x] Implementar endpoint, worker local y SQL de Supabase Cron; probar autenticación e idempotencia. Activación del hosting: pendiente.

Salida: misma política aplicada en todas las operaciones. Carreras simuladas probadas; concurrencia real y expiración sin navegador contra el hosting: pendientes.

### P07 — Actualizar pantallas y textos

- [x] Sustituir fórmulas duplicadas en carrito, modal y ventas por el contrato temporal nuevo.
- [x] Entregar desde catálogo/API los datos permitidos que necesitan los cronómetros.
- [x] Actualizar cómo comprar, preguntas frecuentes y mensajes de reserva/WhatsApp.
- [x] Revisar caché y refresco al vencer o cambiar de fase; verificar que no se exponen datos ajenos.

Salida: relojes y mensajes coherentes con la política aplicada, incluida una reserva anterior a un cambio de configuración.

### P08 — Verificar y registrar regresiones

- [x] Ejecutar pruebas nuevas y las pruebas de autorización existentes.
- [x] Ejecutar TypeScript, ESLint, comprobación de diferencias y compilación; resultados y limitaciones en Entrada 004.
- [x] Crear secuencia manual nueva de horarios y sustituir la advertencia de S10 cuando el problema esté resuelto.
- [x] Conservar las marcas originales S01–S09 y anotar una nueva ronda de regresión por separado.
- [x] Verificar que S04 ahora tiene 7/7 marcas del usuario; no quedan los dos pasos antes pendientes.

Salida: resultados automáticos y manuales fechados, sin marcar pruebas no ejecutadas.

### P09 — Preparar entrega y operación

- [x] Actualizar esta bitácora, la guía de uso y los documentos históricos de reservas con enlaces al comportamiento vigente.
- [x] Preparar instrucciones de migración, tratamiento de activas, activación de tarea periódica y reversión compatible.
- [ ] Verificar primero en pruebas la edición de configuración y el vencimiento sin sesión abierta.
- [x] Registrar por separado cualquier despliegue o migración efectivamente realizados.

Salida: entrega revisable. La documentación preparada no significa que se haya desplegado ni modificado la base real.

## 7. Matriz mínima de aceptación

| ID | Caso | Resultado que debe verificarse |
| --- | --- | --- |
| R01 | 15 minutos / 2 horas / 1,5 horas | Conversión exacta, persistencia y vencimiento correcto |
| R02 | Cero, negativos, vacío, NaN, infinito y valores excesivos | Rechazo del servidor, sin guardar parcialmente |
| R03 | Pausa 21:00–12:00; reserva 20:50 con 30 minutos | Vence al día siguiente a las 12:20 |
| R04 | Reserva a las 21:00 / 02:00 / 12:00 | Fronteras y día correcto según los ejemplos del prompt |
| R05 | Pausa desactivada | Tiempo continuo, incluso de noche |
| R06 | Pausa dentro del mismo día y horarios iguales | Franja válida soportada; iguales rechazados si está activada |
| R07 | Duración que cruza varias pausas | Acumula todos los minutos efectivos, sin atajos de un solo día |
| R08 | Navegador y servidor en zonas diferentes | Ambos muestran el mismo vencimiento de la tienda |
| R09 | Cambio estacional en una zona que lo use | Instantes válidos y regla documentada para horas repetidas/inexistentes |
| R10 | Pausa manual superpuesta a la automática | Saldo preservado sin compensar el mismo intervalo dos veces |
| R11 | Cambiar configuración con reservas activas | Se respeta el alcance decidido, sin acortar silenciosamente plazos |
| R12 | Agregar productos con configuración distinta | Extensiones y vencimientos por producto coherentes con la política decidida |
| R13 | Renovación o venta simultánea a expiración | Una petición antigua no libera la reserva nueva ni el producto vendido |
| R14 | Dos administradores guardando | Conflicto detectable; no se pierde una edición sin aviso |
| R15 | Invitado/cliente intentando guardar | 401/403; configuración intacta |
| R16 | Reserva antigua/pausada durante migración | Conserva su situación o queda identificada para revisión, sin borrado automático |
| R17 | Ningún navegador abierto | Tarea periódica libera dentro del retraso documentado; reintentos no duplican efectos |
| R18 | Pausa automática activa en pantalla | Muestra saldo efectivo y próxima reanudación, no un descuento durante la pausa |

La implementación cubre R01–R18. Pruebas automáticas ejecutadas para cálculo, validación, permisos, conflictos, snapshot, pausa, revisión de heredadas y contrato del cron; migración ensayada en PGlite. R08/R18 requieren además revisión visual; R13 tiene carreras simuladas y CAS SQL, falta concurrencia real entre conexiones; R17 sigue pendiente de activación y comprobación en el hosting. Toda la ronda manual permanece pendiente en el checklist nuevo.

## 8. Migración y reversión: requisitos para el futuro procedimiento

- Identificar la base destino; no deducir que es de pruebas por estar en `localhost`.
- Inventariar reservas activas/pausadas y conservar una copia de seguridad antes de aplicar cambios de datos.
- Añadir esquema de forma compatible, cargar configuración sin sobrescribir y convertir reservas con una regla explícita.
- El `reservadoEn` antiguo puede haber sido desplazado por pausas manuales: no tratarlo automáticamente como hora original de creación.
- Para reservas anteriores, preservar el vencimiento/saldo con la política anterior; los registros que no permitan una conversión fiable requieren revisión, no una fecha inventada ni liberación masiva.
- Desplegar código compatible, verificar contratos y activar el ejecutor periódico solo cuando use el nuevo servicio.
- Si se revierte, conservar columnas y datos añadidos hasta tener una alternativa segura. Volver sin más al código antiguo reactivaría reglas fijas de 30 minutos/3 horas; no es una reversión temporalmente compatible.
- No ejecutar `db push`, resets o tareas de producción solo por seguir esta lista: primero preparar el procedimiento concreto según la base y el historial encontrados.

## 9. Bitácora de trabajo realizado

### Entrada 001 — 22/10/2026 — Análisis y documentos iniciales

**Solicitud:** preparar primero el prompt y la documentación de la mejora de duración/horarios desde Configurar Categorías.

**Trabajo realizado:**

- Leído el panel administrativo, el esquema Prisma, la API de categorías, los cálculos temporales y las rutas de reservar/pausar; revisadas las referencias temporales de expiración, limpieza y pantallas.
- Identificada la divergencia entre 30 minutos y 3 horas, la duplicación de cálculos y el alcance limitado de la pausa nocturna actual.
- Leídos los pasos marcados por el usuario; registrado el estado guardado de S01–S09 sin cambiarlo.
- Revisada la estructura de SQL existentes y los textos con horarios fijos que necesitarán actualización.
- Creados el prompt de implementación y este plan/bitácora con decisiones propuestas, pasos, riesgos de compatibilidad y matriz de aceptación.

**Archivos creados:**

- `docs/PROMPT-CONFIGURACION-RESERVAS.md`.
- `docs/PLAN-Y-BITACORA-CONFIGURACION-RESERVAS.md`.

**Validación de esta entrega:** comprobación documental aprobada: enlaces locales existentes, bloques de código balanceados, diez pasos P00–P09 y dieciocho casos R01–R18. `git diff --check` sin errores. No se ejecutaron pruebas funcionales nuevas porque esta entrega solo añade Markdown.

**Estado técnico:** funcionalidad, tablas, migraciones, configuración persistida y despliegue permanecen pendientes para esta mejora. No se accedió a credenciales ni se ejecutaron operaciones sobre la base en esta etapa.

**Siguiente paso:** P01, resolver las decisiones de negocio pendientes y después preparar persistencia y cálculo.

### Entrada 002 — 22/10/2026 — P01–P07: implementación

**Autorización:** el usuario pidió implementar todo y confirmó Buenos Aires, cambios solo para nuevas reservas, base real en `.env` y Vercel Hobby.

**Persistencia:** modelo `ConfiguracionReserva`, fila global, autor/revisión, CHECK de rangos, FK y RLS; cuatro campos por producto para política JSON, vencimiento UTC, saldo manual y versión. SQL aditivo/idempotente en `prisma/migrations/add_configuracion_reservas.sql`. Las reservas heredadas se conservan para revisión; no se reconstruye una zona anterior desconocida. Ruta administrativa y diálogo explícito para asignar un nuevo plazo, conservando pausa manual.

**Cálculo:** `lib/reserva-policy.ts` usa Temporal 0.5.1, zona explícita, intervalos diarios y precisión de milisegundos. Incluye franja cruzando medianoche, varias pausas, DST y saltos de días sin transición. El extremo de 168 horas efectivas con solo un minuto disponible por día pasó de aproximadamente 2,26 s a 13 ms en una medición local; la exactitud se prueba también con un recorrido independiente minuto a minuto al cruzar DST.

**API y operaciones:** configuración administrativa con validación y conflicto 409, contrato público sin autor; `lib/reserva-service.ts` unifica reserva, pausa/reanudación, liberación y confirmación. Escrituras condicionadas por versión/estado/fecha; limpieza y borrado de carrito en la misma transacción. Renovaciones serializables, política original por producto. Confirmación normal rechaza vencidas o heredadas sin revisar. Migrar identidad de invitado incrementa versión. La pausa agrupa por propietario y excluye vencidas/heredadas, con alcance informado en el diálogo.

**Interfaz:** panel ampliado en `/admin` con minutos/horas, franja, zona, resumen, ejemplo, Guardar/Descartar y conflicto. `ReservaClock` compartido en carrito, modal y ventas, sincronizado al servidor. Modal y ventas refrescan cada 10 s; se retiró la expiración enviada por visitantes del modal. Textos de FAQ/cómo comprar y WhatsApp actualizados. Eliminado `lib/reserva-utils.ts`, que contenía la regla antigua.

**Ejecución independiente:** endpoint Bearer `/api/cron/reservas`, lotes de hasta 200 y presupuesto de procesamiento; worker Node para local. Para Vercel Hobby se preparó `scripts/activar-cron-reservas-supabase.sql`, con Cron/pg_net/Vault y frecuencia por minuto. No se programó un cron incompatible en `vercel.json`.

**Notificaciones:** intento opcional posterior al commit por la transición ganadora, habilitado solo con `RESERVA_WHATSAPP_ENABLED=true`. No hay outbox ni reintento del mensaje; posibles pérdidas después del commit están documentadas. No se enviaron mensajes. Endpoint manual protegido por administrador; destino fijado en el servidor, sin logs de contactos ni credenciales.

**Documentación:** guía de uso/instalación/operación, checklist nuevo sin marcas, actualización de S10 y referencia desde el documento histórico. Conservadas las marcas S01–S09; S04 tiene 7/7.

### Entrada 003 — 22/10/2026 — P02/P08: comprobaciones y estado de activación

**Base real, solo lectura:** `scripts/check-reservas-migration.cjs`, con permiso de acceso de red, encontró `productos` y `usuarios`, sin `configuracion_reservas`, sin las cuatro columnas nuevas y sin `_prisma_migrations`. Conteos: 9 disponibles, 2 vendidos, 0 reservados. No se imprimieron datos de compradores ni conexiones. No se aplicó SQL a producción.

**Pruebas automáticas:** suite de autorización existente conservada y adaptada a las nuevas escrituras; suite de reservas para cálculos, validaciones, permisos, snapshot, pausas, vencidas, revisión de heredadas, conflictos y cron; pruebas PostgreSQL embebido (PGlite 0.5.11) para migración y restricciones. El entorno temporal vive en memoria y no usa `.env`. La matriz de concurrencia de handlers usa dobles de base; falta prueba real entre conexiones contra un entorno de staging.

**Compilación:** se generó Prisma 6.19 en `node_modules/.prisma/reservas-validation` porque un `next start` ya abierto bloquea el reemplazo de su DLL en Windows. Las definiciones del cliente principal se actualizaron, pero la generación estándar completa requiere cerrar ese servidor. Build Next aislado en `.next-reservas` para no reemplazar `.next` del servidor abierto. Se requirió red para descargar las fuentes de Google.

**Separación de entornos:** no se detuvo el servidor anterior, no se migró la base real, no se hizo despliegue, no se guardaron secretos nuevos y no se activó el scheduler de Supabase. Los resultados de comprobación final y los pasos de activación se registran a continuación; las pruebas manuales siguen pendientes.

### Entrada 004 — 23/10/2026 — Verificación final y pendientes concretos

**Resultados finales:**

- `node --test tests/authorization.test.cjs tests/reservas*.test.cjs`: **88 pruebas aprobadas, 0 fallos** (44 de autorización y 44 de reservas/migración, contando subpruebas).
- `npx.cmd tsc --noEmit`: aprobado.
- `npm.cmd run lint`: **0 errores, 2 advertencias preexistentes** (`ImageEditor` y variable `options` del middleware).
- `git diff --check`: aprobado.
- Generación Prisma 6.19 con salida alternativa: aprobada; la DLL del cliente principal sigue bloqueada por el servidor anterior abierto.
- `NEXT_DIST_DIR=.next-reservas` y `npx.cmd next build --webpack`: **compilación aprobada**, con 33 páginas generadas y rutas nuevas incluidas. El directorio alternativo evita sustituir el build que utiliza el servidor local abierto.

**Incidencias resueltas:** un primer lint intentó recorrer el build alternativo y agotó memoria; se añadió `.next-*/**` a las exclusiones y el lint final terminó correctamente. La compilación conserva avisos del proyecto sobre raíz inferida por varios lockfiles, middleware antiguo y datos de compatibilidad de navegadores. No bloquean esta compilación. Se restauró `tsconfig.json` después de la inclusión automática de rutas del build temporal para no dejar cambios de configuración ajenos a la funcionalidad.

**Pendientes para activar:**

1. Verificar respaldo y aplicar la migración aditiva a la base real; repetir el inventario.
2. Regenerar el cliente principal con el servidor local detenido y desplegar esta versión en Vercel.
3. Configurar `CRON_SECRET` en Vercel y URL/secreto en Vault; habilitar/verificar extensiones y activar el SQL de Supabase Cron. No hay secretos nuevos ni job activo creados por el agente.
4. Ejecutar el checklist nuevo en pruebas, incluyendo interfaz, concurrencia real y liberación sin navegador; luego verificar la activación en producción.

**Estado real al cerrar:** código implementado y comprobado automáticamente. Base real solo consultada; migración real, deploy, cron y pruebas manuales nuevos **pendientes**. No hubo ventas simuladas, cambios de productos reales ni WhatsApp enviado durante esta implementación.

### Entrada 005 — 23/10/2026 — Aplicación a la base real y preparación operativa

**Autorización:** el usuario pidió terminar de aplicar todos los cambios y explicar las partes manuales. Confirmó el dominio `https://fimu2025.vercel.app/`.

**Migración aplicada:** `node scripts/apply-reservas-migration.cjs --apply`. Respaldo previo en `.backups/reservas-before-2026-10-23T12-12-24-067Z.json` y archivo SHA-256. Incluye cinco tablas de aplicación: 0 carritos, 2 categorías, 30 imágenes, 11 productos y 4 perfiles. No incluye Auth/Storage. `.backups/` se añadió a `.gitignore` antes de escribir el respaldo. Se bloqueó brevemente la escritura durante la transacción, se verificó el archivo y se comparó cada campo anterior después de aplicar el SQL; todos se conservaron. Configuración creada: 30 minutos, 23:00–10:00, Buenos Aires, revisión 1. No hubo reservas activas al migrar.

**Supabase preparado:** comprobadas las extensiones; pg_cron y pg_net estaban ausentes y se habilitaron; Vault ya estaba instalado. `scripts/configure-reservas-cron.cjs --prepare https://fimu2025.vercel.app` generó un secreto aleatorio local en `.env`, guardó el mismo secreto y el origen HTTPS en Vault y creó `fimu-expirar-reservas` (ID 1) con frecuencia `* * * * *`. Se desactivó dentro de la misma transacción de creación, sin ejecución intermedia. Estado confirmado: extensiones instaladas, ambos nombres en Vault y `active: false`. Una consulta de comprobación falló transitoriamente; su reintento fue satisfactorio.

**Local actualizado:** se identificó y detuvo exclusivamente el antiguo Next del proyecto (PID 16364), liberando la DLL. `prisma generate` principal y `npm.cmd run build` aprobaron. Primer build Turbopack falló al validar certificados de Google Fonts; se repitió usando el almacén de certificados del sistema (`NODE_USE_SYSTEM_CA=1` y `NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS=1`), sin deshabilitar TLS. Se fijó la raíz del proyecto en `next.config.ts` para evitar inferir la carpeta superior por otro lockfile. Servidor actualizado iniciado oculto en http://localhost:3000, PID **13816**. Logs en `.backups/local-server.*.log`.

**Verificación real del servidor local:** configuración pública 200 (30 min/Buenos Aires), configuración administrativa sin sesión 401, cron sin secreto 401, cron autenticado 200 con `revisadas: 0`, `liberadas: 0`, `hayMas: false`. No se simuló ninguna venta ni se liberaron productos. Suite completa: 88 aprobadas. Lint: 0 errores, 2 avisos anteriores. Diferencias e ignorado de `.env`/respaldo comprobados.

**Despliegue todavía pendiente:** no hay conector, navegador habilitado, credencial CLI ni token Vercel disponibles. La configuración pública en `fimu2025.vercel.app` devolvió 404, confirmando que no contiene aún la nueva ruta. No se creó commit, push ni despliegue. El cron quedó deliberadamente desactivado hasta que el endpoint publicado pase la verificación.

**Entrega manual concreta:** guía `ACTIVACION-RESERVAS-PASOS-FINALES.md`: copiar el secreto existente de `.env` a Vercel Production, publicar el código, esperar Ready y ejecutar `npm.cmd run reservas:cron:activate`. Este comando toma el secreto de Vault, exige respuesta válida HTTP 200 del destino publicado y solo entonces activa el job existente. `npm.cmd run reservas:cron:status` permite revisar su estado. No es necesario volver a migrar ni crear otro cron.

**Pruebas manuales:** siguen pendientes; se preservaron todas las marcas existentes. El localhost actualizado comparte la base real, por lo que las simulaciones cortas deben hacerse en una base aislada.

### Plantilla para próximas entradas

```text
Entrada N — Fecha — Paso Pxx
Objetivo:
Decisiones adoptadas y motivo:
Archivos creados/modificados:
Cambio de comportamiento (antes/después):
Migración preparada / aplicada y entorno:
Comandos o pruebas ejecutados:
Resultados y evidencia:
Incidencias, limitaciones y pendientes:
Despliegue o tarea periódica activada (sí/no y entorno):
Siguiente paso:
```

No reemplazar entradas antiguas por una descripción nueva del resultado final. Añadir entradas y, si una decisión cambia, enlazar la anterior y explicar el motivo.
