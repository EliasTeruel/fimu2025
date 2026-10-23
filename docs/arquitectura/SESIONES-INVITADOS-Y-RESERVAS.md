# Sesiones de invitados, carritos y reservas

**Proyecto:** Fimu Vintage  
**Fecha:** 2026-10-13  
**Estado:** propuesta de arquitectura; requiere aprobación antes de implementar  
**Alcance:** análisis y diseño. No se modificó código funcional, esquema, base de datos ni configuración. No se ejecutaron migraciones ni despliegues.

## 1. Diagnóstico actual y contraste con la auditoría

### 1.1 Stack y flujo existentes

El repositorio usa Next.js App Router, React, TypeScript, Prisma y PostgreSQL en Supabase, con Supabase Auth para cuentas. El esquema actual representa el estado de disponibilidad en `Producto.estado`; `CarritoItem` puede relacionarse opcionalmente con `sessionId` o `usuarioId`. Las rutas de API operan directamente con Prisma. La cookie de Supabase se actualiza en middleware; la identidad de invitado no usa una cookie de servidor.

La navegación permite agregar artículos sin iniciar sesión y `app/carrito/page.tsx` solicita nombre y contacto al avanzar a la reserva. La reserva actual es manual: muestra datos de pago y pide enviar comprobante por WhatsApp/Instagram. En el flujo revisado no se encontró una pasarela integrada ni un webhook de pago.

### 1.2 Hallazgos confirmados por el código

| Hallazgo | Evidencia y estado actual | Evaluación |
|---|---|---|
| El ID anónimo es controlado por el navegador | `lib/session.ts` crea un UUID con `Math.random()` y lo guarda en `localStorage`. Se envía como parámetro o en JSON. No es una sesión emitida ni autenticada por el servidor. | Confirmado. Es enumerable/alterable y funciona como bearer token, sin protección HttpOnly ni revocación. |
| Las APIs de carrito confían en identificadores del cliente | `app/api/carrito/route.ts` lee `sessionId`/`usuarioId` de query/body para GET, POST y DELETE. `app/api/carrito/count/route.ts` también cuenta usando el `sessionId` proporcionado. | Confirmado: autorización por IDOR, no por principal autenticado. |
| La modificación y eliminación de un item no comparten una regla de propiedad | `app/api/carrito/[id]/route.ts`: PUT actualiza por ID sin comprobar propietario; DELETE comprueba el `sessionId` de query. La UI de carrito también hace DELETE sin ese parámetro para ciertos artículos. | Confirmado: PUT sin ownership y comportamiento inconsistente en DELETE. |
| La migración se autoriza con valores enviados por el cliente | `app/api/carrito/migrar/route.ts` toma `sessionId` y `usuarioId` del JSON, y mueve/elimina items sin comprobar la cookie de invitado ni la sesión Supabase del solicitante. | Confirmado: apropiación/manipulación posible; no hay transacción atómica ni protección de colisión concurrente. |
| Reserva sin cuenta sí existe, pero la propiedad no es segura | `app/api/ventas/reservar/route.ts` acepta `sessionId`, `usuarioId` y `compradorInfo` del cliente. Permite reclamar reserva existente por igualdad de `compradorInfo`; actualiza productos sin compare-and-set ni transacción que garantice disponibilidad al confirmar. | Confirmado: permite falsificar contacto/propiedad y hay condición de carrera al reservar el mismo producto. |
| Reserva y estado de producto están acoplados y no hay entidad de reserva | `prisma/schema.prisma` guarda `reservadoEn`, `compradorInfo`, `reservaPausada` y campos de propietario en `Producto`. No existe modelo de Reserva/ReservaItem, snapshot de precio, estado de verificación, clave de idempotencia ni token de recuperación. | Confirmado: difícil auditar ciclo de vida y preservar historial/PII con controles separados. |
| Cancelar/liberar/confirmar y tareas auxiliares carecen de autorización real | `app/api/ventas/confirmar/route.ts`, `cancelar/route.ts`, `disponible/route.ts`, `marcar-vendido/route.ts`, `pausar/route.ts` y `expirar/route.ts` operan con `productoId` o se ejecutan sin una autorización administrativa visible en el propio endpoint. `cancelar` tiene además GET que cambia estado; `expirar` libera un producto con POST sin autenticar solicitante. | Confirmado. Alto impacto sobre inventario; la expiración debe ser una tarea de servidor autenticada, no una acción pública. |
| Administración se protege principalmente en cliente/middleware | `middleware.ts` delega a `lib/supabase/middleware.ts`, que redirige `/admin` si falta usuario, pero no verifica `isAdmin`; las páginas cliente consultan `/api/usuarios`. Varias mutaciones de APIs solo verifican que exista usuario o no verifican sesión/rol. `lib/auth.ts` sí tiene una función de consulta de rol, pero no se aplica uniformemente. | Confirmado; guard de UI no es autorización de API. |
| La lectura del perfil permite consultar por `supabaseId` recibido | `app/api/usuarios/route.ts` acepta GET público por parámetro `supabaseId`. POST acepta `email` y `supabaseId` desde el body sin validar identidad Supabase en el servidor; `app/api/usuarios/[id]/route.ts` actualiza/elimina por ID sin autorizar al titular/admin. | Confirmado en archivos revisados; se debe corregir junto con la migración autenticada del carrito. |
| Las cantidades/precios necesitan una autoridad de servidor | El carrito recibe `cantidad` del cliente; hoy el producto es normalmente de una unidad y el UI calcula el total sumando `producto.precio`. La API de reserva no recibe precio ni calcula/crea un total persistido. `Producto.precio` es `Float`. | No se confirmó una manipulación directa del precio en la operación actual de reserva; sí está confirmado que no existe snapshot/cotización ni total autoritativo persistido y que no hay pasarela/webhook revisado. Tratar como riesgo de integridad, no como explotación demostrada de pago. |
| Los índices únicos anunciados no existen | `prisma/schema.prisma` tiene índices normales para carrito, pero no `@@unique([productoId, sessionId])` ni restricción de propietario exclusivo; el comentario del esquema no crea una restricción SQL. PostgreSQL permite además múltiples NULL en un unique compuesto. | Confirmado: peticiones concurrentes pueden duplicar items. Requiere índices parciales/check constraints en migración SQL, si se elige el modelo propuesto. |
| Expiración no tiene una única regla | `lib/reserva-utils.ts` y los cronómetros cliente aplican 30 minutos durante el día y espera nocturna hasta 10:30. En cambio `app/api/ventas/cancelar/route.ts` libera tras 3 horas. `expirar` actúa desde el cliente y libera inmediatamente. El código usa horas locales del proceso/navegador. | Confirmado: reglas dispares, zona horaria ambigua y riesgo de liberación prematura/tardía. |
| Falta mecanismo seguro de recuperación/verificación | `compradorInfo` es texto de contacto sin verificación; no hay desafío OTP, email confirmado como contacto de reserva, token de recuperación revocable ni límites anti-enumeración. | Confirmado. |

### 1.3 Qué de la auditoría previa se confirma, precisa o amplía

La [auditoría técnica existente](../../AUDITORIA-TECNICA-FIMU-2025.md) acierta al identificar la confianza en `usuarioId`/`sessionId`, el acceso IDOR al carrito, la falta de autorización administrativa uniforme y el uso insuficiente de identidad verificable para las reservas.

Este análisis precisa dos afirmaciones:

1. **Precio/pago:** el código revisado no acepta un precio del cliente en `reservar`, así que no queda demostrada una alteración efectiva del precio cobrado. El problema confirmado es que el total se calcula en el navegador, no se conserva una cotización/snapshot de reserva y no se encontró una pasarela o webhook de pago. La seguridad de un pago futuro no es verificable en este alcance.
2. **Cookies/CSRF:** el middleware mantiene cookies Supabase, pero la identidad de invitado actual está en `localStorage`; no se encontró cookie de invitado. La defensa CSRF requiere diseño para la nueva cookie bearer, no se deduce solo del uso de Supabase.

También se amplía la auditoría con los endpoints públicos de cancelación/liberación/expiración, PUT de item sin ownership, registro/perfil sin comprobación server-side suficiente, ausencia real de unicidad en carrito y discrepancia entre reglas de expiración.

La documentación [CARRITO-USUARIO.md](../../CARRITO-USUARIO.md) describe el esquema como si tuviera unicidad compuesta, aunque no está declarada en Prisma, y menciona conservar `sessionId` tras migración; el endpoint actual lo limpia al transferir. Debe considerarse documentación de intención, no prueba de garantías implementadas.

### 1.4 Archivos revisados

Se leyeron los archivos objetivo indicados en la solicitud: `prisma/schema.prisma`, `middleware.ts`, `lib/session.ts`, `lib/auth.ts`, `lib/supabase/middleware.ts`, `app/contexts/AuthContext.tsx`, APIs de carrito y ventas, y `app/carrito/page.tsx`. También se revisaron los participantes directos: `app/page.tsx`, `app/components/ProductoModal.tsx`, `app/admin/ventas/page.tsx`, APIs de usuarios, conteo y modificación de carrito, `lib/reserva-utils.ts`, `app/api/productos/route.ts`, `app/api/productos/[id]/route.ts`, `app/api/configuracion/categorias/route.ts`, `package.json` y `CARRITO-USUARIO.md`.

No se afirma una revisión línea por línea de todas las rutas o configuraciones del repositorio. No se encontraron archivos de pruebas con el patrón consultado ni scripts de test en `package.json`; esto deberá verificarse/actualizarse al iniciar implementación.

## 2. Requisitos funcionales y de seguridad

### Funcionales

- Catálogo, carrito y reserva disponibles sin registro.
- Un invitado mantiene su carrito en el mismo navegador y puede continuar como invitado.
- Una cuenta Supabase mantiene carrito accesible al autenticar en otro dispositivo.
- Al autenticar, se ofrece/realiza una fusión segura del carrito de invitado a la cuenta.
- Una reserva queda asociada a una identidad verificable (sesión invitada probada por cookie y contacto verificado, o usuario autenticado).
- El cliente ve su propia reserva/tiempo restante y puede solicitar su recuperación sin exponer reservas ajenas.
- Admin conserva las acciones de confirmar pago, pausar/liberar y registrar ventas externas.
- No se debe etiquetar la reserva como pago confirmado: el pago actual es manual y la confirmación corresponde a una acción administrativa.

### Seguridad e integridad

- El servidor genera y valida sesiones invitadas; ningún `sessionId`/`usuarioId` enviado por JSON/query decide propiedad.
- Cada operación deriva un único principal autorizado desde la cookie de invitado o de Supabase Auth validado server-side.
- Los cambios de carrito/reserva validan ownership en la propia consulta/mutación, no mediante una lectura separada confiable.
- Las operaciones de inventario son atómicas, idempotentes y con constraints de base de datos.
- Los precios, nombres y total de reserva salen de PostgreSQL y quedan como snapshot de la reserva.
- Contacto y recuperación se verifican sin enumerar reservas; se limitan OTP, reenvíos y mutaciones.
- APIs mutables tienen defensa CSRF, validación de input, rate limiting y logs sin secretos ni PII innecesaria.
- La expiración y limpieza son idempotentes y ejecutadas por procesos autenticados.
- Toda operación administrativa valida el rol desde el servidor y devuelve 401/403 apropiados.

## 3. Alternativas de arquitectura y recomendación

### Alternativa A — Sesión invitada opaca persistida en PostgreSQL (recomendada)

El servidor genera un token aleatorio de 256 bits, lo entrega solo en cookie HttpOnly y guarda en `GuestSession` únicamente el digest del token, timestamps, expiración y estado de vinculación. Cada API resuelve el digest a una sesión vigente y obtiene el propietario desde esa fila. La cuenta Supabase es otro principal; el servidor determina el usuario mediante `auth.getUser()` y la relación local.

**Ventajas:** revocación/expiración inmediata, vínculo explícito entre sesión y carrito/reserva, migración segura con prueba de posesión, recuperación/auditoría simple, encaja con Prisma/PostgreSQL y no exige servicio adicional.  
**Costos:** una lectura de sesión adicional (mitigable con consulta conjunta/índice y caché breve con invalidación), migración del modelo y cuidado de limpieza/rotación.

### Alternativa B — Token firmado autocontenido (JWT/PASETO) en cookie

Cookie con un token firmado que porta identificador y expiración; no se requiere fila de sesión hasta la primera escritura, o puede usarse una lista de revocación.

**Ventajas:** validación criptográfica local y menos lecturas para validar identidad.  
**Desventajas:** revocación y vinculación a usuario más complejas; para revocar, recuperar reservas, limitar sesiones y hacer merge seguro igualmente hace falta estado server-side. Un token firmado no evita robo/replay de cookie ni sustituye la propiedad consultada en DB.

### Alternativa C — Usuario anónimo de Supabase Auth

Crear una identidad Supabase anónima al entrar y actualizarla/vincularla al registrarse, usando sus tokens/cookies como principal.

**Ventajas:** una identidad administrada por el proveedor y APIs conocidas de sesión/refresh.  
**Desventajas:** añade cuentas anónimas y su limpieza/límites; el backend actual usa Prisma directamente, por lo que RLS de Supabase no protege automáticamente estas consultas. Vinculación/upgrade y recuperación de cuenta requieren decisiones específicas. Para este sistema no elimina la necesidad de autorización y tabla de reservas.

### Decisión recomendada

Adoptar **A: sesión opaca con fila `GuestSession`**. Es la solución más proporcionada al stack y a la necesidad de revocar, fusionar y recuperar reservas. Mantener Supabase Auth para cuentas registradas; no crear cuentas Supabase anónimas. La cookie es credencial de invitado; no se guardará el token en `localStorage`, URL, logs ni respuesta JSON.

## 4. Arquitectura propuesta

### 4.1 Identidad y límites de confianza

Crear un helper server-only (nombre ilustrativo `resolvePrincipal`) compartido por route handlers:

- Si hay sesión Supabase válida: derivar el `Usuario` local desde `supabaseId = authUser.id`; ignorar IDs locales enviados por cliente. Si también llega cookie invitada vigente, permitir fusión solo mediante endpoint explícito y reglas de vinculación.
- Si no hay usuario Supabase pero sí cookie invitada válida: derivar `guestSessionId` de su hash y usarlo como principal.
- Si no hay ninguna identidad donde se requiere propietario: responder con error controlado; una llamada de bootstrap inicial podrá crear sesión.
- Para administrador, además de usuario autenticado, consultar `Usuario.isAdmin` en servidor en cada mutación administrativa. No confiar en `AuthContext.isAdmin`, URL, body ni claims no sincronizados.

Un administrador del sistema siempre tiene autorización sobre inventario y reservas para operar; un invitado solo sobre sus carritos/reservas. Conocer un ID de producto/reserva no concede acceso.

### 4.2 Flujo de sesión invitada

1. Primer acceso funcional ejecuta un endpoint same-origin de inicialización (`POST /api/session/guest` sugerido).
2. Si existe una cookie válida, devolver estado público mínimo sin revelar el token ni IDs internos. Si no, generar 32 bytes con CSPRNG del runtime Node, persistir `SHA-256(token)` (o HMAC versionado si se decide una clave de pepper) y fijar el token raw en cookie.
3. Las APIs siguientes no aceptan ID de sesión en URL/body; leen cookie, calculan digest y consultan `GuestSession`.
4. Rotar token en login/vinculación satisfactoria y revocar el digest anterior. Rotar también ante sospecha de compromiso; no cambiar token en cada request para evitar carreras entre requests concurrentes.
5. La cookie expira según política elegida; el servidor valida siempre `expiresAt`, `revokedAt` y vinculación, aunque el navegador conserve una cookie.

No crear una sesión en middleware para cada request: middleware sirve para mantener cookies Supabase y navegación; la emisión/consulta persistente se hace en endpoint server-side explícito y en Node runtime, lo que reduce escrituras y evita mezclar fallos de DB con navegación estática.

### 4.3 Flujo de carrito invitado

```mermaid
sequenceDiagram
    actor Visitante
    participant UI as Browser/UI
    participant API as Next.js API
    participant DB as PostgreSQL/Prisma
    Visitante->>UI: Abrir catálogo o carrito
    UI->>API: POST /api/session/guest (same-origin)
    API->>DB: Crear GuestSession con hash del token
    API-->>UI: Cookie HttpOnly; respuesta sin token
    UI->>API: POST /api/carrito {productoId}
    API->>API: Validar cookie y resolver principal
    API->>DB: Validar producto y upsert con ownership
    DB-->>API: Item del principal
    API-->>UI: Item y datos públicos mínimos
    UI->>API: GET /api/carrito
    API->>DB: Consultar exclusivamente carrito del principal
    API-->>UI: Items sin token/hash ni datos de otros
```

El endpoint no permite que el cliente asigne `usuarioId`, `guestSessionId`, precio o estado. El ID de producto se trata como selector de recurso, no prueba de propiedad. Un producto puede estar en varios carritos disponibles, pero solo puede pertenecer a una reserva activa conforme a la política de inventario.

### 4.4 Flujo de usuario autenticado y fusión

El navegador conserva su cookie Supabase. El servidor valida el usuario con `supabase.auth.getUser()`, obtiene el registro local a partir del UUID validado y carga el carrito del usuario. Si existe carrito invitado vigente, la UI solicita la fusión o ejecuta la política aprobada.

La fusión se ejecuta en transacción:

1. Comprobar usuario autenticado y cookie invitada de la misma petición.
2. Bloquear/vincular la sesión invitada con condición `linkedUserId IS NULL OR linkedUserId = usuario.id`; si está vinculada a otra cuenta, rechazar y no mover datos.
3. Insertar artículos de invitado bajo usuario y resolver duplicados según decisión de negocio (para catálogo de piezas únicas se recomienda conservar una fila por producto; si ambas filas existen, la del usuario gana y se registra el resultado).
4. Reasignar reservas solo si la reserva pertenece a la sesión probada y el usuario consiente/siempre bajo regla aprobada; nunca fusionar reservas por igualdad de nombre o teléfono.
5. Rotar/revocar credencial invitada después de éxito y devolver contadores de merge sin IDs sensibles.

No borrar el carrito invitado antes del commit. Error o conflicto debe dejar estado previo recuperable. Logout no convierte automáticamente el carrito del usuario a un carrito anónimo ni lo expone a la siguiente persona del mismo navegador.

### 4.5 Flujo de reserva, verificación y cancelación

```mermaid
sequenceDiagram
    actor Cliente
    participant UI as Browser/UI
    participant API as Next.js API
    participant DB as PostgreSQL
    participant OTP as Proveedor de verificación
    Cliente->>UI: Confirmar artículos y datos de contacto
    UI->>API: POST /api/reservas (sin IDs de propietario ni precio)
    API->>API: Resolver Supabase o cookie GuestSession + validar CSRF/rate limit
    API->>DB: Leer productos/precios vigentes y crear intento idempotente
    API->>DB: Transacción: reclamar disponibles condicionalmente y crear Reserva/Items
    DB-->>API: Estado pendiente de verificación, expiresAt
    API->>OTP: Enviar OTP al contacto normalizado
    API-->>UI: Respuesta genérica + expiración/estado
    Cliente->>UI: Ingresar OTP
    UI->>API: POST /api/reservas/{id}/verificar
    API->>DB: Validar principal, código hash, TTL, intentos y estado
    API->>DB: Activar reserva; confirmar precio snapshot
    API-->>UI: Confirmación y total autoritativo
    Cliente->>UI: Solicitar cancelar (misma sesión autenticada/guest)
    UI->>API: POST /api/reservas/{id}/cancelar
    API->>DB: Validar propiedad y estado; liberar artículos atómicamente
```

La verificación debe ocurrir **antes de confirmar una reserva activa**. Si la tienda decide bloquear stock mientras el visitante completa OTP, ese bloqueo tiene estado `PENDING_VERIFICATION` y TTL corto separado de la reserva de pago. Si decide no bloquear antes del OTP, los productos se revalidan y reclaman en una única transacción al verificar el código; el usuario puede perder disponibilidad durante el paso, pero se evita bloquear inventario a contactos no verificados. Esta elección requiere aprobación.

La creación de reserva toma los productos del carrito del principal (o una lista de IDs que se contrasta contra ese carrito), vuelve a consultar precio/estado en PostgreSQL, y calcula total con decimal exacto. Se guarda snapshot por artículo. No se acepta `compradorInfo` como identidad o prueba de ownership.

#### Recuperación y cancelación en otro dispositivo

- La recuperación comienza con email o teléfono normalizado; la respuesta y tiempos deben ser indistinguibles tanto si existe reserva como si no.
- Emitir código de un solo uso, TTL breve (p. ej., 5 minutos), límite estricto de intentos y reenvíos, y rate limit por contacto/IP/dispositivo. Guardar solo hash del código; no registrar código ni contacto completo.
- Tras verificar, mostrar solo reservas activas del contacto verificado y permitir operación dentro de permisos limitados. Preferible emitir un token de recuperación aleatorio, corto y de un solo propósito, almacenar su hash y revocarlo al usarlo.
- Nunca permitir recuperar/cancelar usando solo `reservationId`, email/teléfono en claro o `productoId`.
- Una sesión/cuenta autenticada puede gestionar solo reservas suyas; admin puede operar todas y dejar auditoría.

### 4.6 Concurrencia e idempotencia

- Reservar en transacción de DB; reclamar cada `Producto` con `UPDATE ... WHERE estado = 'disponible'` (o equivalente Prisma `updateMany` con estado en el filtro) y comprobar exactamente una fila afectada por producto. Si cualquier reclamación falla, rollback de todos los productos y responder conflicto (409); no leer disponible y luego hacer update sin condición.
- Ordenar locks por ID para reducir deadlocks. Reintentar únicamente errores transitorios identificados, con límite y backoff.
- Índice único parcial en PostgreSQL para impedir que un producto aparezca en dos reservas activas, según estados elegidos. Una constraint/índice de DB es respaldo de la lógica transaccional.
- Aceptar `Idempotency-Key` por intento de reserva; índice único por principal + clave; misma clave y payload devuelve el mismo resultado. Una misma reserva no debe duplicarse por doble click/retry.
- Para carrito: `INSERT ... ON CONFLICT` respaldado por índices únicos parciales; idempotencia de agregar producto y límite de cantidades conforme inventario.
- Confirmar pago manual solo como acción admin, atómica e idempotente; cambiar estado de reserva/producto en la misma transacción. El precio pagado manualmente debe ser comparado/registrado por admin, no derivado de datos que envíe el browser.

## 5. Modelo de datos propuesto en Prisma

Es una forma objetivo conceptual, no un schema listo para migrar. Los índices parciales y CHECK constraints requieren SQL de migración porque no se expresan completamente en Prisma.

### `GuestSession`

- `id`: UUID interno, PK.
- `tokenHash`: `String` única (hex/base64url del digest del token aleatorio); nunca el token raw.
- `createdAt`, `lastSeenAt`, `expiresAt`, `revokedAt`.
- `linkedUserId`: FK nullable a `Usuario`, `onDelete: SetNull`; indica vinculación única autorizada.
- Opcional `tokenVersion`/`hashKeyVersion` para rotación controlada de claves.
- Índices en `expiresAt`, `linkedUserId`, `revokedAt`.

### `CarritoItem` compatible durante transición

- Añadir `guestSessionId` nullable y relación a `GuestSession`; conservar temporalmente `sessionId` como dato legacy para backfill.
- Mantener `usuarioId` nullable.
- Validar por DB que exactamente uno de `guestSessionId` o `usuarioId` está asignado para filas nuevas (excepto filas legacy explícitamente pendientes de migración).
- Índices únicos parciales: `(guest_session_id, producto_id) WHERE guest_session_id IS NOT NULL`; `(usuario_id, producto_id) WHERE usuario_id IS NOT NULL`.
- Índices normales para búsquedas por `productoId`; política de borrado definida (eliminar items de carrito al borrar producto, preservar reserva histórica).
- En fase final retirar `sessionId` legacy luego de migrar y validar conteos. Para producto unitario, mantener cantidad 1 o establecer límite/semántica explícita.

### `Reserva` y `ReservaItem`

`Reserva`:

- `id` UUID aleatorio interno; `publicReference` aleatoria no secuencial y no usada como secreto.
- `status` enum (propuesta): `PENDING_VERIFICATION`, `ACTIVE`, `CONFIRMED`, `CANCELLED`, `EXPIRED`; añadir `PENDING_PAYMENT` solo si el negocio requiere distinción real.
- `usuarioId` nullable y `guestSessionId` nullable para propietario; regla de owner consistente y cambio de propietario solo vía merge autenticado.
- `contactName`, `contactValueNormalized`, `contactDisplay` (PII mínima), `contactChannel`; `contactVerifiedAt`.
- `currency`, `total` y snapshots en `Decimal` (precisión definida con moneda); `createdAt`, `expiresAt`, `verifiedAt`, `cancelledAt`, `confirmedAt`, `updatedAt`.
- `idempotencyKey` scoped a principal (o tabla de idempotencia), con unique constraint.
- Pausa: preferir persistir `expiresAt` y al pausar `pausedAt`; al reanudar desplazar `expiresAt` por tiempo pausado y limpiar pausa. Si pausas prolongadas deben reanudarse con precisión tras restart, guardar duración remanente.
- Datos de pago/comprobante solo si el flujo futuro lo requiere y con acceso limitado.

`ReservaItem`:

- `id`, `reservaId`, `productoId` nullable si el producto se elimina (preservar historial), nombre/identificador de catálogo snapshot, `unitPrice Decimal`, `quantity`, `lineTotal Decimal`.
- Unique `(reservaId, productoId)` si solo se permite una línea por producto.
- Índice por `productoId` y `reservaId`.

`Producto` puede mantener `estado` durante migración y para catálogo actual, pero el estado activo debe reconciliarse con `Reserva`. En destino, decidir una única fuente de verdad: el campo `estado` sincronizado por transacciones/constraints, o una derivación desde reserva activa. Evitar que campos de reserva duplicados (`reservadoPorSessionId`, `reservadoPorUsuarioId`, `compradorInfo`) se conviertan en una segunda autoridad permanente.

`Producto.precio` hoy es `Float`. La ruta de reservas debe snapshotear precio actual con decimal en el modelo de reserva; migrar precio de producto a Decimal es recomendable para importes monetarios, pero requiere revisión y conversión de valores existentes. No cambiarlo sin aprobación y comparación de datos.

### Verificación y recuperación

Modelo opcional `ReservationChallenge` si se opta por una tabla separada:

- `id`, `reservaId` o contacto objetivo, `codeHash`, propósito (`VERIFY_CONTACT`/`RECOVER`), `expiresAt`, `attemptCount`, `consumedAt`, `createdAt`.
- Nunca guardar OTP plano; máximo de intentos, cooldown y revocación de desafíos previos.
- Si se emite token de recuperación de mayor entropía, guardar su hash/propósito/expiración/uso separado del OTP.

Índice parcial PostgreSQL sugerido para exclusividad de producto activo: no es viable en Prisma como una unique común condicionada al estado de una fila relacionada. Alternativas: reclamar atómicamente `Producto.estado` dentro de la transacción y manejar toda transición de reserva allí; o introducir puntero `activeReservationId` único nullable en Producto. Elegir y probar en implementación.

## 6. Endpoints a modificar o agregar

Los paths siguientes son una propuesta de contrato; puede preservarse el path actual mientras se reemplaza la semántica.

| Endpoint actual/propuesto | Cambio requerido |
|---|---|
| `POST /api/session/guest` (nuevo) | Crear/renovar sesión invitada desde servidor; emitir cookie segura. Respuesta sin credencial raw ni ID interno. Rate limit de creación y TTL. |
| `GET /api/carrito` | Retirar query `sessionId`/`usuarioId`; resolver propietario por principal servidor. Retornar solo campos públicos mínimos, sin tokens/hash/IDs de sesión. |
| `POST /api/carrito` | Recibir `productoId` y cantidad validada; ignorar/rechazar campos de ownership/precio. Validar producto y hacer insert idempotente con índices. |
| `GET /api/carrito/count` | Igual: principal por cookie/Auth, sin sessionId de cliente. |
| `PUT/DELETE /api/carrito/[id]` | Derivar principal, incluirlo en filtro de update/delete; 404 genérico si no es suyo. Validad cantidad máxima/disponibilidad en servidor. |
| `DELETE /api/carrito` | Vaciar solo artículos elegibles del principal; reserva activa no se libera silenciosamente. |
| `POST /api/carrito/migrar` | Exigir Supabase Auth validado server-side y cookie guest válida. No aceptar `usuarioId`/`sessionId`. Transacción, merge idempotente, vinculación condicional, rotación y respuesta agregada. |
| `POST /api/ventas/reservar` o `POST /api/reservas` | Solo seleccionar productos del carrito autenticado por principal; recargar producto/precio en servidor. Contacto validado; crear idempotentemente, reservar atómicamente y responder estado/expiración/total snapshot. |
| `POST /api/reservas/[id]/verificar` (nuevo) | Verificar OTP de contacto, propiedad, expiración y límites; consumir desafío una vez. Respuesta no enumerable. |
| `GET /api/reservas` (nuevo) | Mostrar las reservas del principal actual; nunca buscar por ID arbitrario del cliente. |
| `POST /api/reservas/[id]/cancelar` (nuevo/reemplazo) | Cliente cancela solo reserva propia y en estados permitidos; ownership de cookie o cuenta, OTP/token recovery para otro dispositivo. |
| `POST /api/reservas/recuperar` + `/verificar-recuperacion` (nuevo) | Solicitud uniforme, OTP al contacto y token temporal de recuperación. Rate limit/anti-enumeración. |
| `POST /api/admin/reservas/[id]/confirmar` | `requireAdmin`; transición idempotente y transaccional; registrar actor, fecha y referencia manual si aplica. |
| `POST /api/admin/reservas/[id]/cancelar`, `/pausar`, `/reanudar` | `requireAdmin`; acciones auditadas y restricciones de estado. |
| `POST /api/admin/productos/[id]/marcar-vendido` y `/disponible` | `requireAdmin`; transacciones que no borren la historia ni liberen reserva de forma incoherente. |
| `POST /api/internal/reservas/expirar` o cron job | No público. Autenticar con secreto de cron/server identity; seleccionar vencidas y liberar atómicamente/idempotente. Quitar mutación GET de `ventas/cancelar` y llamada de expiración disparada por cliente. |
| `/api/usuarios` y `/api/usuarios/[id]` | GET perfil propio derivado de Auth; crear perfil solo para identidad Supabase probada (o flujo administrativo confiable); PUT propio, DELETE protegido y rol admin donde corresponda. No aceptar `supabaseId` como autoridad. |
| `/api/configuracion/categorias` PUT y APIs CRUD de producto | `requireAdmin` real, no solo usuario autenticado. |

El payload de reserva no debe permitir `usuarioId`, `sessionId`, `compradorInfo`, precio, total ni estado. Si se envía una lista de productos, cada ID debe demostrarse en el carrito asociado al principal.

## 7. Reglas de autorización

| Recurso/acción | Invitado | Cuenta Supabase | Admin |
|---|---|---|---|
| Consultar/modificar carrito | Solo con cookie GuestSession válida; mutación filtrada por `guestSessionId`. | Solo cuenta derivada de `auth.getUser()`; merge guest requiere cookie probada. | No implica acceso general a carritos de clientes salvo herramienta explícita y auditada. |
| Crear reserva | Carrito propio + contacto verificado conforme política aprobada. | Carrito propio; contacto verificado o atributo verificado aceptado formalmente. | No crea en nombre de cliente salvo operación admin explícita registrada. |
| Ver/cancelar reserva | Cookie propietaria; recuperación cross-device exige OTP/token de recovery. | Solo `usuarioId` del principal, opcionalmente OTP para recuperación externa. | Cualquier reserva para gestión, con auditoría. |
| Confirmar venta/pago, liberar inventario, marcar vendido | Prohibido. | Prohibido. | Requiere `Usuario.isAdmin` verificado server-side. |
| Ejecutar expiración masiva | Prohibido. | Prohibido. | Solo servicio/cron autorizado o endpoint admin explícito, no ruta pública genérica. |

Respuesta de unauthorized: 401 sin sesión; 403 si autenticado pero no autorizado. Para evitar enumerar recursos ajenos, en endpoints de reserva/item puede convenir 404 uniforme. No devolver PII de otros clientes ni IDs de sesión.

## 8. Cookies, sesiones y CSRF

### Cookie invitada

- Nombre recomendado: `__Host-fimu_guest` en producción con HTTPS.
- Atributos: `HttpOnly; Secure; SameSite=Lax; Path=/`; sin `Domain`; `Max-Age` alineado con expiración DB.
- Token CSPRNG de al menos 256 bits, base64url; digest almacenado en DB. El digest nunca se devuelve.
- `SameSite=Lax` y HttpOnly reducen exposición, no evitan CSRF por sí solos ni robo de cookie por malware/dispositivo.
- Servidor actualiza `lastSeenAt` con cadencia limitada para no escribir en DB en cada request. La expiración de DB prevalece sobre Max-Age.
- Entorno local HTTP puede usar nombre/atributos de desarrollo sin `__Host-`/Secure; producción no debe degradar atributos.
- No copiar token a query, fragment, `localStorage`, telemetría, error reports o logs.

### Supabase Auth

- Mantener `createClient` SSR y `auth.getUser()` en operaciones protegidas; no tratar estado React ni una sesión cliente sin verificar como autoridad.
- Después de login, el navegador continúa con cookies Supabase y conserva cookie guest hasta completar merge.
- En logout, no reasignar carrito de cuenta a guest automáticamente. Definir si se borra cookie guest vinculada o si se inicializa una nueva sesión anónima.

### CSRF

- Mutaciones de navegador solo same-origin; comprobar `Origin` contra allowlist exacta de despliegue y `Sec-Fetch-Site` cuando exista. Rechazar `Origin` externo; no confiar en CORS como protección.
- Usar `SameSite=Lax`, JSON y header CSRF explícito con token anti-CSRF ligado a sesión para mutaciones sensibles; comparar en servidor. Alternativamente documentar una defensa comprobable equivalente. El token CSRF no reemplaza autorización/ownership.
- Métodos GET/HEAD sin efectos secundarios. Webhooks futuros validan firma del proveedor e idempotencia.
- Endpoint interno de expiración requiere autenticación de cron independiente; no abrirlo por un GET del navegador.

### Abuso automatizado y enumeración

- Límite por IP confiable del proxy + digest de guest session + contacto normalizado para inicialización, agregar carrito, reservar, OTP y recuperación.
- CAPTCHA adaptativo solo ante señales de abuso, no imponer registro. Los límites deben ser distribuidos entre instancias (no memoria local de proceso).
- OTP de un solo uso, corto, número limitado de intentos/resend, cooldown, invalidación del anterior y mensajes genéricos; aplicar límites también a SMS/WhatsApp para prevenir costos.
- Respuestas uniformes para solicitudes de recuperación aunque el contacto no corresponda a reserva; no diferenciar existencia, estado ni contacto parcial antes de verificar.
- Validar schema/tamaño de payload y límites de IDs/items; limitar cuerpos y evitar logs de PII.

## 9. Expiración, limpieza y recuperación

### Reservas

Persistir `expiresAt` como instante UTC y mostrarlo desde el servidor. La regla actual es de 30 minutos diurnos y espera nocturna a 10:30 en `lib/reserva-utils.ts`, pero otras rutas aplican tres horas o expiración iniciada en browser. Debe definirse una sola política y zona horaria IANA (probablemente `America/Argentina/Buenos_Aires`, a confirmar); no recalcular regla distinta en cliente.

Propuesta de estados:

1. `PENDING_VERIFICATION`: OTP emitido, TTL de desafío y, solo si se aprueba, hold de producto muy corto.
2. `ACTIVE`: contacto verificado e inventario reclamado; expira en `expiresAt`.
3. `CONFIRMED`: pago comprobado manualmente por admin (no significa pago automático).
4. `CANCELLED` / `EXPIRED`: terminales; liberar producto en la misma transacción y preservar registro según retención.

Cron autenticado en intervalos cortos procesa lotes `expiresAt <= now()` y `status = ACTIVE`; actualiza estado solo si sigue vencida/activa. Repetir el job no debe duplicar acciones. Pausar actualiza el vencimiento o captura tiempo restante en servidor; no confiar en timer React. Mostrar cronómetro en UI es presentación, nunca autoridad.

### Sesiones y datos

Valores iniciales para aprobación, no política ya adoptada:

- Guest session: idle TTL de 30 días y límite absoluto de 90 días; cookie y servidor coherentes.
- Sesiones guest vinculadas: conservar vínculo solo lo necesario para carrito/reservas; al expirar/revocar eliminar credencial y desvincular/anonimizar datos no retenidos.
- Carrito abandonado: limpiar items tras TTL definido, sin borrar reserva activa o confirmada.
- OTP: 5 minutos, 5 intentos por desafío, cooldown/resend controlado y bloqueo temporal por contacto/IP.
- Reservas terminales/PII: política de retención por definir según contabilidad, privacidad y ley aplicable; no cascade-delete de evidencia de venta.

### Recuperación

El usuario puede recuperar en el mismo dispositivo por cookie válida. Para dispositivo nuevo, código enviado al contacto verificado y token de recovery temporal; el token autoriza solo leer/gestionar las reservas del contacto y propósito indicados, se guarda hasheado, expira y se consume una vez. No se manda un enlace de recuperación que exponga IDs o datos personales sin token aleatorio.

## 10. Plan de migración sin pérdida de datos

La migración es aditiva y por etapas; no desplegarla directamente sobre producción sin backup y ensayo.

1. **Inventario y backup:** exportar conteos/snapshots de `carrito_items`, productos reservados/vendidos y sus campos `reservado*`; tomar backup verificado. Identificar valores legacy, duplicados, filas con ambos/nulo propietarios y productos en estados incompatibles.
2. **Añadir tablas/campos nullable:** `GuestSession`, `Reserva`, `ReservaItem` y columnas nuevas de propietario sin eliminar `sessionId`, campos viejos de `Producto` o datos del carrito.
3. **Backfill conservador:** no convertir `sessionId` legacy en token seguro ni tratar UUID localStorage como prueba criptográfica de identidad. Crear sesiones nuevas solo cuando el usuario presente el valor legacy a través de un endpoint de transición, validarlo contra filas que ese valor posee y emitir cookie nueva; limitarlo como transición temporal y registrar riesgo. Reservas legacy se importan como `LEGACY_UNVERIFIED`, sin afirmar contacto verificado; conservar `compradorInfo`/timestamps en snapshot con acceso restringido.
4. **Resolver anomalías manualmente/por reglas aprobadas:** identificar duplicados por `(sessionId, productoId)` y `(usuarioId, productoId)` antes de índices; no descartar reservas/productos sin reporte. Cuenta ganadora y colisión deben estar definidas.
5. **Backfill de reservas:** una fila legacy de producto reservado puede convertirse en Reserva + ReservaItem con `legacyProductId`, precio actual solo como valor aproximado/no precio acordado; nunca marcar pagado/verificado por inferencia. Mantener snapshot de texto de comprador solo según retención y restringir exposición.
6. **Desplegar aplicación compatible:** lectura dual temporal (nuevo `guestSessionId`/usuario vs filas legacy) solo en servidor, escrituras nuevas únicamente al modelo nuevo; feature flag para revertir lectura sin borrar datos. Logs/métricas agregadas, sin tokens ni PII.
7. **Validar conteos e invariantes:** comparar cantidad/IDs y estados antes/después; detectar items perdidos, duplicados, propietarios ambiguos, reservas huérfanas y totales inconsistentes. Backfill repetible/idempotente.
8. **Imponer constraints tras depuración:** CHECK propietario XOR, índices parciales únicos, foreign keys y constraints de estado. Aplicar índices de forma segura conforme estrategia PostgreSQL (p. ej., concurrencia de índices si aplica al entorno).
9. **Retirar legacy:** después de ventana de observación y aceptación, eliminar dependencia de query/body `sessionId`, migrar UI y luego archivar/eliminar columnas antiguas en migración posterior. No retirar datos legacy antes de vencimiento de ventana y aprobación.

Se prefiere migración SQL/Prisma con datos preservados, no `db push` destructivo. Prisma migrations actuales deben inspeccionarse en implementación antes de decidir el procedimiento exacto; el documento no asume estado real del historial remoto.

## 11. Pruebas y criterios de aceptación

No hay infraestructura de test visible en los scripts de `package.json` revisado. Antes de añadir dependencias hay que elegir runner y entorno DB. Pruebas unitarias de funciones puras pueden usar el runner del proyecto que se apruebe; integración requiere PostgreSQL de test aislado y E2E requiere Playwright u otra herramienta acordada. Nunca usar datos de producción.

### Unitarias

- Generación/hash/validación token; no se puede invertir digest ni aceptar token expirado/revocado.
- Resolución de principal: invitado válido, usuario válido, no autenticado, cookie corrupta, sesión vinculada a otra cuenta y sesión concurrentemente revocada.
- Políticas de transición de reserva/expiración/pausa usando reloj inyectable y zona horaria elegida.
- Normalización/validación de contacto, OTP TTL, intentos, consumo único y rate-limit key.
- Cálculo `Decimal` de total y redondeo para moneda acordada.
- Reglas de merge y resolución de duplicados.

### Integración (API + PostgreSQL)

- Guest crea carrito sin Auth y solo cookie propia puede leer, cambiar, borrar o contar.
- Falsificar `usuarioId`, `sessionId`, ID de carrito/reserva o `compradorInfo` no concede acceso.
- Cuenta registrada opera solo sobre su carrito/reservas; otro usuario no obtiene recursos por ID.
- Merge autenticado + cookie correcta conserva todos los artículos, no duplica y es idempotente; sin cookie o sesión vinculada a otra cuenta no migra.
- PUT/DELETE de artículo valida ownership en DB.
- Dos reservas concurrentes para último producto: exactamente una activa; rollback total de lote ante producto ocupado; retries con misma idempotency key no duplican.
- Total/snapshot corresponde a precio consultado en DB, no a precio enviado por browser; precio no válido/stock agotado se rechaza sin mutación parcial.
- OTP incorrecto, vencido, repetido o de otra reserva falla; mensajes de recuperación no revelan existencia.
- Expiración repetida libera una vez; no toca confirmadas, canceladas, vencimientos futuros o producto re-reservado.
- Todos los endpoints admin responden 401/403 para no-admin; cron rechaza llamado público.
- Validar respuestas, cabeceras, CSRF Origin y limitación en API.

### E2E

- Navegación anónima -> carrito -> reserva sin creación/login de cuenta.
- Recarga/cierre y reapertura del navegador dentro de TTL recuperan carrito sin exponer token en storage.
- OTP de contacto correcto activa reserva y muestra monto/expiración; incorrecto muestra error y permite reintento acotado.
- Login con carrito invitado -> consentimiento/política de merge -> cuenta ve conjunto fusionado; otro usuario de navegador no puede apropiárselo.
- Recuperación en segundo dispositivo por contacto verificado muestra solo reservas de ese contacto y revoca token luego de uso.
- Doble click, timeout de red y refresh no generan reservas duplicadas ni liberan stock ajeno.
- Admin confirma/libera/pausa solo con rol, y la UI muestra historial/estado coherente.
- Verificar logout y usuario distinto en mismo browser; no filtra carrito ni sesión anterior.

### Criterios de aceptación obligatorios

1. Ningún endpoint de carrito/reserva usa owner ID del cliente como autoridad.
2. Se puede completar el flujo de invitado sin registrar cuenta.
3. No hay reserva activa duplicada de producto ni actualización parcial ante carrera.
4. Solo identidad propietaria, recuperación verificada o admin puede modificar una reserva.
5. Ninguna respuesta pública permite enumerar si un teléfono/email tiene reservas.
6. Ninguna confirmación de pago/admin ni liberación se ejecuta sin permiso server-side.
7. Reintentos y expiración son idempotentes; migración de datos conserva conteos y estados acordados.
8. Secretos, tokens, OTP y PII completa no aparecen en logs/respuestas.

## 12. Riesgos, decisiones pendientes y aprobaciones

### Decisiones de arquitectura que requieren aprobación del propietario

1. **Canal y obligatoriedad de verificación:** recomendado WhatsApp OTP porque el flujo actual ya usa Twilio/WhatsApp; alternativa email OTP. ¿La verificación debe ser obligatoria antes de activar la reserva? Recomendación: sí; si se quiere bloquear stock mientras se ingresa OTP, el bloqueo pendiente debe ser muy corto.
2. **Política de duración:** ¿mantener 30 minutos diurnos y la regla nocturna hasta 10:30, corregir a un TTL fijo (p. ej. 30 min) o conservar tres horas? El código actual contradice sus pantallas/documentación. Confirmar también zona horaria IANA del negocio.
3. **Merge al iniciar sesión:** ¿fusionar automáticamente una vez que servidor prueba cookie + Auth o pedir consentimiento UI? Recomendación: consentimiento informado la primera vez, luego transacción automática; items duplicados mantienen una unidad y la fila de usuario gana, dado el catálogo de piezas únicas.
4. **Comportamiento de contacto inválido/no verificado:** ¿no reservar hasta verificar (recomendado) o permitir reserva sin bloqueo de inventario hasta verificar? Evitar reservar producto por largo tiempo para teléfono no confirmado.
5. **Recuperación cross-device:** elegir email, WhatsApp o ambos; confirmar canales operativos, titularidad del remitente Twilio, costo y qué sucede cuando proveedor no está configurado. No se debe degradar silenciosamente a reserva “verificada”.
6. **Vigencia de sesión guest:** valores propuestos idle 30 días / máximo 90 días. Definir duración deseada, política de logout y si sesiones guest deben tener límite por IP/device.
7. **Tasa de reserva y catálogo:** ¿cada producto representa siempre una unidad indivisible? Si sí, mantener `quantity = 1`; si existen variantes/stock múltiple, modelo de inventario y restricción de reserva deben ampliarse.
8. **Precio y moneda:** definir moneda/escala decimal, reglas de redondeo, si cambios de precio entre carrito y reserva se notifican o actualizan y qué precio se considera aceptado. Recomendación: consultar precio actual al confirmar reserva, snapshotearlo y mostrarlo antes de terminar.
9. **Confirmación administrativa:** definir qué significa “confirmar venta” (pago verificado, comprobante recibido, venta externa), quién puede ejecutarla y si se necesita registrar referencia/importe/canal.
10. **Rate limit y CAPTCHA:** elegir servicio compartido para límites entre instancias (la app actual no muestra Redis/Upstash u otro almacén) y proveedor/umbral de CAPTCHA adaptativo. No usar rate limit solo en memoria.
11. **Retención y privacidad:** periodo para PII/contactos de reservas expiradas, logs de auditoría y sesiones; requerimiento legal/contable local. No eliminar reservas confirmadas por limpieza de sesión.
12. **Estrategia de estado:** mantener temporalmente `Producto.estado` con Reserva como fuente coordinada, o migrar a Reserva activa como única autoridad. Recomendación: transición compatible y retirar columnas duplicadas solo tras reconciliación.
13. **Costos/proveedor OTP:** verificar presupuesto, límites de WhatsApp Business/Twilio, plantillas/consentimiento y alternativa de fallback. Credenciales/proveedor ausentes no deben provocar una respuesta de éxito simulado para verificación real.

### Riesgos residuales incluso después del diseño

- Una cookie bearer robada permite usar la sesión hasta expiración/revocación; HttpOnly/Secure no evita compromiso del dispositivo. La recuperación y rotación limitan el impacto.
- Un atacante puede automatizar la creación de sesiones o pedir OTP y generar costos; hacen falta rate limit distribuido, cuotas y monitoreo.
- Fallos de proveedor OTP pueden bloquear reserva si la verificación es requisito; definir reintento y soporte manual controlado.
- Migración legacy no puede convertir localStorage UUID en prueba fuerte de identidad retroactivamente; una transferencia de reservas antiguas puede requerir OTP/admin y conservar estado “no verificado”.
- Aislamiento y niveles de transacción del PostgreSQL administrado deben validarse en integración bajo carga; el índice/compare-and-set debe ser la garantía final.
- Precio de reserva snapshot no equivale a comprobante de pago; la confirmación manual seguirá necesitando procedimiento operativo.
- Cambiar campos existentes y constraints puede revelar filas duplicadas/inconsistentes; no ejecutar migración sin inventario, backup y dry run.

## 13. Plan de implementación por fases

**Fase 0 — decisiones y medición**

- Aprobar decisiones anteriores.
- Capturar conteos de carritos, duplicados, productos reservados y antigüedad; revisar historial de migraciones y entorno de staging.
- Definir contrato de UX, proveedor OTP, rate-limit y política de retención.

**Fase 1 — identidad segura y autorización**

- Implementar resolución de principal, `GuestSession`, endpoint bootstrap, cookie HttpOnly y validaciones CSRF/origin.
- Añadir `requireAuth`, `requireAdmin` y ownership helpers server-only.
- Proteger APIs existentes y cerrar rutas públicas mutables; separar endpoints admin/internal.
- Corregir `/api/usuarios` para identidad propia.
- Añadir pruebas unitarias/API para ownership antes de cambiar UI.

**Fase 2 — carrito y migración**

- Añadir campos/índices/constraints aditivos y backfill preparado.
- Migrar GET/POST/PUT/DELETE/count a principal server-side.
- Migrar cliente a no leer/escribir `sessionId`; bootstrap sesión al entrar.
- Implementar merge transaccional Supabase Auth + cookie guest con decisión UX y conflictos.
- Comparar métricas/conteos y mantener lectura legacy temporal.

**Fase 3 — reservas e inventario**

- Introducir modelos Reserva/ReservaItem, estados, snapshots Decimal, idempotencia y ownership.
- Implementar reclamo atómico de stock/estado, creación all-or-nothing y reconciliación del producto.
- Incorporar OTP/contacto, activación y recuperación según canal aprobado.
- Cambiar UI de carrito para mostrar estado, precio snapshot y expiración provista por server.

**Fase 4 — administración y expiración**

- Mover confirmar/cancelar/pausar/reanudar/marcar vendido a rutas admin con auditoría.
- Implementar worker/cron autenticado e idempotente para expiración y limpieza.
- Retirar acciones de expiración disparadas por browser y GET con efectos secundarios.

**Fase 5 — migrar y retirar legacy**

- Ensayo de migración en copia/staging; ejecutar checks de integridad y rollback probado.
- Habilitar por flag, canary y monitoreo de errores/conflictos.
- Tras ventana de estabilidad, eliminar `sessionId` como autoridad, fields antiguos duplicados y endpoints incompatibles.
- Reconciliar documentación y procedimiento operativo de soporte.

No pasar a fase siguiente ante pérdida de carrito/reserva, fallo de autorización, duplicados o ausencia de recuperación probada.

## 14. Contexto para continuar con otro agente

**Resumen de continuidad:** implementar un diseño de sesión invitada opaca guardada por hash en PostgreSQL, entregada mediante cookie HttpOnly/Secure/SameSite; mantener Supabase Auth para usuarios. Todas las APIs derivan owner de cookie/Auth validado en servidor, nunca de `sessionId`/`usuarioId` en payload. Carrito migra con cookie guest probada + cuenta Supabase dentro de transacción y protección de cuenta vinculada. Las reservas pasan a modelos Reserva/ReservaItem con contacto verificado, snapshots monetarios, idempotencia, expiración server-side y reclamo atómico de inventario. Todas las rutas admin comprueban rol real. Hacer migración aditiva con backfill conservador y sin inferir verificación de datos legacy.

**Estado:** solo análisis y documento; ningún código o configuración funcional fue modificado. No se migró DB, no se desplegó y no se ejecutaron pruebas funcionales. `package.json` no expone script de test y no se encontraron archivos de test con el patrón consultado.

**Archivos clave para empezar implementación:** [schema](../../prisma/schema.prisma), [session actual](../../lib/session.ts), [auth helper](../../lib/auth.ts), [middleware Supabase](../../lib/supabase/middleware.ts), [carrito API](../../app/api/carrito/route.ts), [merge actual](../../app/api/carrito/migrar/route.ts), [carrito UI](../../app/carrito/page.tsx), [ProductoModal](../../app/components/ProductoModal.tsx), [reserva API](../../app/api/ventas/reservar/route.ts), [cancelación/expiración](../../app/api/ventas/cancelar/route.ts), [confirmación](../../app/api/ventas/confirmar/route.ts), [utils de tiempo](../../lib/reserva-utils.ts), [admin ventas UI](../../app/admin/ventas/page.tsx).

**Antes de editar:** obtener aprobación al menos para canal/obligatoriedad OTP, política de expiración/zona horaria, semántica de merge, TTL de sesión, política de precio/moneda, proveedor/rate-limit y retención de PII. Primero crear tests de autorización y concurrencia, luego migración aditiva ensayada; no reutilizar UUID localStorage como token de seguridad.
