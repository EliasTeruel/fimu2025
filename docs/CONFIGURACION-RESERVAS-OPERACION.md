# Reservas configurables: uso, instalación y operación

Implementación: 22/10/2026. Actualización: **23/10/2026: migración aplicada a la base real, respaldo local verificado y servidor local actualizado. Cron preparado en Supabase y desactivado; publicación en Vercel y activación pendientes.**

**Continuar por [ACTIVACION-RESERVAS-PASOS-FINALES.md](ACTIVACION-RESERVAS-PASOS-FINALES.md): los pasos ya realizados no deben repetirse.**

Este documento describe la versión nueva. La historia está en [PLAN-Y-BITACORA-CONFIGURACION-RESERVAS.md](PLAN-Y-BITACORA-CONFIGURACION-RESERVAS.md) y las pruebas manuales en [CHECKLIST-CONFIGURACION-RESERVAS.md](CHECKLIST-CONFIGURACION-RESERVAS.md).

## Usar la configuración

1. Iniciar sesión como administrador y abrir `/admin` → **⚙️ Configuración**.
2. Debajo de Categorías aparece **Reservas y horarios**.
3. Ingresar duración y unidad. Se admite `1,5` o `1.5` horas; la duración debe equivaler a minutos enteros entre 1 y 10.080 (168 horas efectivas).
4. Activar/desactivar la pausa diaria, editar inicio/fin y zona IANA. Zona acordada: `America/Argentina/Buenos_Aires`.
5. Revisar resumen y ejemplo; pulsar **Guardar reservas y horarios**. **Descartar cambios** vuelve a los últimos valores cargados/guardados.
6. Si otro administrador guardó primero, aparece conflicto: **Recargar valores vigentes**, revisar y volver a editar.

Guardar afecta solamente a nuevas reservas. Una reserva ya creada conserva una copia de duración, pausa, zona y versión de cálculo. Agregar otro producto renueva las reservas vigentes del propietario con su política anterior; el producto nuevo usa la vigente. Las pausadas manualmente, vencidas o pendientes de revisión no se renuevan implícitamente.

Los horarios se repiten diariamente hasta otra edición. No hay calendario de excepciones ni restauración automática al día siguiente. Horarios iguales solo son admitidos con pausa desactivada.

Ejemplo: duración 30 minutos y pausa 21:00–12:00. Reserva 20:50 → vence al día siguiente 12:20; reserva 21:00 → 12:30 del día siguiente; reserva 02:00 → 12:30 del mismo día. Una reserva que agota su saldo exactamente a las 21:00 vence allí.

## Pausas manuales y reservas anteriores

Pausar guarda el saldo efectivo en milisegundos y deja el vencimiento en null. Reanudar calcula un nuevo vencimiento con ese saldo; si sigue siendo horario de pausa automática, no empieza a descontar todavía. Se agrupa por identidad del propietario verificada, nunca por coincidencia del texto del comprador. El diálogo informa el alcance sobre varias reservas.

Las reservas creadas antes de la migración no guardaban la zona del proceso, la política ni la historia de pausas. La migración conserva todos sus datos y las deja **pendientes de revisión administrativa**, sin inventar vencimientos ni liberarlas. En Ventas, **Revisar y asignar nuevo plazo** pide confirmación para otorgar el plazo completo vigente desde ese momento y conserva una pausa manual existente. También se puede cancelar explícitamente o registrar una venta externa si corresponde. Confirmar pago normal exige una reserva vigente con política interpretable.

La inspección de solo lectura del 22/10/2026 encontró 9 disponibles, 2 vendidos y ninguna reserva activa en la base real. Esto es una fotografía del momento; repetir antes de instalar. No se modificaron esos productos durante las pruebas. El 23/10 se aplicó el cambio de esquema y se verificó, dentro de la transacción, que todos los valores anteriores de las tablas existentes se conservaran.

## Persistencia y cálculo

- `configuracion_reservas`: una fila (`id = 1`), duración, minutos del día de inicio/fin, zona, revisión, autor y fechas. CHECK de rangos, FK del autor y RLS habilitado sin políticas públicas. Prisma usa la conexión del servidor; el formulario pasa por `requireAdmin()`.
- `productos.reserva_politica`: JSON de la política aplicada, con `algoritmo: 2` y revisión de configuración.
- `reserva_expira_en`: instante UTC; null durante pausa manual y en registros antiguos sin convertir.
- `reserva_saldo_ms`: saldo congelado al pausar manualmente.
- `reserva_version`: contador para proteger transiciones concurrentes. El guardado comprueba también estado y `updatedAt`.

`lib/reserva-policy.ts` es el cálculo puro compartido. `lib/reserva-service.ts` controla las transiciones y limpieza. Se eliminaron las tres fórmulas duplicadas y la utilidad anterior. Inicio de pausa inclusivo, fin exclusivo; acumulación por intervalos de calendario. Los saltos de días solo se optimizan cuando no hay transición de zona. En horas repetidas se elige la primera ocurrencia; las horas inexistentes se desplazan hacia adelante, siguiendo la [regla compatible de Temporal](https://tc39.es/proposal-temporal/docs/zoneddatetime.html).

`reservaTiempo` contiene hora del servidor, saldo, vencimiento, motivo de pausa, próxima reanudación y política pública. El reloj de pantalla avanza desde esa referencia con `performance.now()`, sin depender de la hora configurada en la computadora. Carrito, modal abierto y Ventas refrescan los datos cada 10 segundos. El catálogo público responde sin caché HTTP. El servidor siempre decide si una transición está permitida.

La fila global y las copias por reserva no constituyen un historial completo de todas las ediciones administrativas.

## Validar localmente sin tocar la tienda

Las pruebas automáticas siguientes no cargan `.env`, no se conectan a la base real y no envían WhatsApp:

```powershell
npm.cmd run test:security
npm.cmd run test:reservas
npx.cmd tsc --noEmit
npm.cmd run lint
```

Las pruebas de migración usan PostgreSQL embebido en memoria ([PGlite](https://pglite.dev/docs/api)), con datos sintéticos. Comprueban preservación, reejecución, restricciones y escritura condicional SQL. Las carreras de los handlers se prueban con fronteras de base simuladas; no equivalen a una prueba de carga concurrente contra Supabase.

Para probar la aplicación completa, usar una base/entorno de pruebas con las mismas tablas e identidad de pruebas. **El `.env` actual apunta a la base real: abrir `localhost` no aísla los datos.** No cambiar la duración global a 1 minuto sobre la tienda para ejecutar la matriz de prueba.

Con la migración aplicada al entorno elegido:

```powershell
npm.cmd run prisma:generate
npm.cmd run dev
```

En otra terminal, configurar `RESERVAS_BASE_URL=http://localhost:3000` y un `CRON_SECRET` aleatorio de al menos 32 caracteres en el `.env` de ese entorno, y ejecutar:

```powershell
npm.cmd run reservas:worker
```

El worker revisa cada minuto y reintenta en el siguiente ciclo; requiere que el proceso y la aplicación permanezcan encendidos. Detener con Ctrl+C. No inicia automáticamente por ejecutar `npm run dev`.

## Migración de la base real

Archivo revisable: [add_configuracion_reservas.sql](../prisma/migrations/add_configuracion_reservas.sql). Es aditivo, transaccional e idempotente. Agrega una tabla, cuatro columnas e índice; inicializa 30 minutos, pausa 23:00–10:00, Buenos Aires. No reescribe productos existentes ni reemplaza una configuración ya guardada.

El proyecto usa SQL sueltos y la inspección no encontró `_prisma_migrations`; no introducir `migrate reset` ni `db push` para esta entrega.

Procedimiento para una ventana de activación acordada:

1. Verificar respaldo recuperable de la base y registrar su referencia fuera del repositorio. El 23/10 se creó una copia JSON verificada de las tablas de aplicación en `.backups/`; no incluye Supabase Auth/Storage ni sustituye un respaldo completo del proveedor.
2. Ejecutar `npm.cmd run reservas:check`: consulta únicamente nombres de tablas/columnas y conteos, sin contactos ni cadenas de conexión.
3. Revisar/aplicar **solo** `prisma/migrations/add_configuracion_reservas.sql` en el SQL Editor del proyecto correcto. Alternativa desde la raíz con la conexión comprobada:

   ```powershell
   npx.cmd prisma db execute --file prisma/migrations/add_configuracion_reservas.sql --schema prisma/schema.prisma
   ```

4. Repetir `reservas:check`; deben aparecer la tabla de configuración y las cuatro columnas; los conteos de productos deben conservarse si no hubo operaciones legítimas concurrentes.
5. Regenerar Prisma y compilar/desplegar el código nuevo. La migración debe preceder al código nuevo, que consulta estas columnas. Detener/reemplazar instancias antiguas y cerrar pantallas antiguas de Ventas, cuya limpieza usaba otra regla.
6. Comprobar lectura de configuración, categorías y productos como administrador; público sin información de comprador.
7. Revisar reservas antiguas si aparecieron entre la inspección y el despliegue.
8. Activar el cron descrito abajo y comprobar respuesta HTTP y efectos en una reserva de prueba controlada.

En Windows, el motor Prisma puede estar bloqueado por `next start`. Cerrar solamente el servidor de este proyecto antes de `prisma generate`, no todos los procesos Node. Inicialmente se validó generación alternativa y build en `.next-reservas`. El 23/10 se detuvo únicamente el servidor anterior, se completó `prisma generate` normal y `npm run build` con Turbopack, y se inició el build nuevo en localhost.

## Producción: Vercel Hobby + Supabase Cron

El usuario confirmó **Vercel Hobby**. Su cron nativo permite una ejecución diaria, insuficiente para este objetivo; por eso no se añadió un `vercel.json` con cron por minuto que impediría desplegar en Hobby. [Límites oficiales de Vercel](https://vercel.com/docs/cron-jobs/usage-and-pricing).

El ejecutor preparado usa **Supabase Cron (`pg_cron`) + `pg_net` + Vault** para llamar por HTTPS a `GET /api/cron/reservas`. Todas las decisiones siguen en el mismo servicio de la aplicación. Supabase documenta este patrón de programación y almacenamiento del secreto en [Scheduling Functions](https://supabase.com/docs/guides/functions/schedule-functions).

Activación, después del despliegue:

1. Habilitar/verificar Cron, `pg_net` y Vault en el proyecto Supabase. **Ya realizado el 23/10:** pg_cron y pg_net habilitados; Vault ya estaba instalado.
2. Crear un secreto aleatorio exclusivo de al menos 32 caracteres. Guardarlo en Vercel como `CRON_SECRET` de Production y volver a desplegar para que esté disponible. No usar la clave pública de Supabase ni prefijo `NEXT_PUBLIC_`.
3. Crear en Vault los nombres `fimu_reservas_base_url` (origen HTTPS de producción, sin ruta) y `fimu_reservas_cron_secret` (mismo valor que `CRON_SECRET`). No guardar valores reales en este documento/SQL/Git.
4. Verificar una llamada autenticada a `/api/cron/reservas`: debe devolver 200 con `revisadas`, `liberadas`, `hayMas`. Sin secreto debe dar 401; sin configuración del servidor, 503.
5. Ejecutar [activar-cron-reservas-supabase.sql](../scripts/activar-cron-reservas-supabase.sql). Valida que existan los secretos y registra `fimu-expirar-reservas` cada minuto. Reejecutar actualiza ese nombre en lugar de duplicarlo.
6. Revisar historial del job y resultado HTTP. Que `pg_net` acepte/encole la petición no significa que la aplicación haya respondido 200: comprobar también `net._http_response`, filtrando el ID de la petición o la hora de ejecución. Evitar copiar cabeceras/secreto a tickets.
7. Registrar fecha, dominio y primera ejecución 200 en la bitácora. Para desactivar, el SQL incluye `cron.alter_job(... active := false)`.

La ruta comprueba `Authorization: Bearer …` en tiempo constante, no requiere cookies de administrador y está excluida de la renovación de sesión del middleware. El reloj nocturno usa Buenos Aires aunque la programación del scheduler use UTC: se invoca cada minuto.

Cada pasada procesa hasta 200 candidatos, con presupuesto aproximado de 20 segundos entre elementos; el siguiente ciclo continúa el resto. Un vencimiento puede tardar aproximadamente un minuto más red/procesamiento en reflejarse, y más si hay cola o caída. `hayMas` permite detectar acumulación. Dos ejecutores simultáneos no deben liberar una reserva renovada ni repetir el borrado del carrito: la escritura condicionada y el borrado ocurren en una transacción. Monitorear errores y reintentar en el siguiente ciclo.

**Estado al 23/10:** las extensiones y Vault están verificados en la base real; el job ID 1 está creado y desactivado. URL `https://fimu2025.vercel.app` y secreto ya guardados en Vault. Falta copiar el mismo `CRON_SECRET` del `.env` a Vercel, desplegar el código nuevo y ejecutar `npm.cmd run reservas:cron:activate`, que verifica HTTP 200 antes de activar. La URL pública todavía respondió 404 para la ruta nueva en la última comprobación.

## WhatsApp

La expiración notifica únicamente después de confirmar la liberación y solo por la petición que ganó la transición. Activación opcional explícita: `RESERVA_WHATSAPP_ENABLED=true`, junto a las variables Twilio existentes. Por defecto no envía. No se envió ningún mensaje real en las pruebas.

Entrega de mejor esfuerzo, sin reintento automático del mensaje: un fallo o caída entre el commit y el envío puede perder la notificación; no revierte la liberación. No hay outbox durable ni garantía de entrega exactamente una vez. El endpoint de notificación manual ahora requiere administrador y usa el destino del servidor. Se quitaron plazos fijos y registros de contactos/credenciales de esa ruta.

## Reversión y límites

Para detener expiraciones automáticas, desactivar el job/worker. Esto no cambia contratos ni borra datos. Si hay un problema de código, desplegar una corrección que conserve la política y vencimiento persistidos. Volver directamente a la versión anterior reactivaría reglas de 30 minutos/3 horas y no es compatible con las reservas nuevas.

Conservar tabla/columnas durante una reversión. No se incluye un borrado automático de datos. Las comprobaciones manuales de interfaz, el despliegue, la aplicación a producción y la primera ejecución real del scheduler deben quedar registrados separadamente de las pruebas automáticas.
