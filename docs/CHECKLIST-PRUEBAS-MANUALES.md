# Pruebas manuales de Fimu: inicio local y secuencias

Preparado el 21 de octubre de 2026. Las casillas están pendientes: crear esta guía no significa que se hayan ejecutado las pruebas.

**No necesitas desplegar en producción. Empieza en `http://localhost:3000`.** La aplicación corre en tu computadora, pero usa la base de datos y Supabase indicados en tus variables de entorno.

## 1. Elegir dónde probar

| Entorno | Uso recomendado | ¿Modifica la tienda real? |
| --- | --- | --- |
| Local + base de pruebas | Todas las secuencias de esta guía | No, si las credenciales y servicios están separados |
| Local + base de producción | Solo comprobaciones limitadas de lectura y acceso | Sí: las escrituras afectan la base real |
| Despliegue de pruebas + base de pruebas | Repetir las pruebas con HTTPS y la configuración del hosting | No, si no comparte servicios con producción |
| Producción | Comprobación final breve después de corregir fallos | Sí |

**Precaución específica:** abrir `/admin/ventas` llama a una limpieza global de reservas expiradas y la repite cada minuto. Usar productos con nombre de prueba no aísla esa limpieza. Para las secuencias de reservas y ventas, utiliza una base de pruebas con el esquema de Fimu y cuentas de prueba configuradas.

Si todavía no tienes esa base preparada, puedes levantar la aplicación y ejecutar las comprobaciones automatizadas; deja las secuencias de compras como `BLOQUEADA`. No ejecutes `prisma:push`, migraciones ni reseteos contra una base cuyo destino no hayas confirmado.

## 2. Cómo registrar avances

- Cambia `[ ]` por `[x]` cuando completes y verifiques un paso.
- Si lo intentaste y falló, deja su casilla vacía y registra el fallo al final.
- En la tabla usa `PENDIENTE`, `OK`, `FALLÓ` o `BLOQUEADA`.
- No marques una secuencia como `OK` si su resultado esperado no se cumple.
- No escribas contraseñas, cookies, tokens ni el contenido del `.env` en este documento.

Fecha de la ejecución: __________

Entorno y URL de la aplicación: __________

Base: PRUEBAS / PRODUCCIÓN (sin copiar su URL de conexión): __________

Navegadores utilizados: __________

| Secuencia | Estado | Fecha | Incidencia / notas |
| --- | --- | --- | --- |
| S01. Carrito de invitado | PENDIENTE | | |
| S02. Separación entre visitantes | PENDIENTE | | |
| S03. Login y migración del carrito | PENDIENTE | | |
| S04. Reserva de invitado y migración | PENDIENTE | | |
| S05. Reserva disputada entre dos usuarios | PENDIENTE | | |
| S06. Pausar, reanudar y cancelar | PENDIENTE | | |
| S07. Confirmar venta y revisar stock | PENDIENTE | | |
| S08. Permisos administrativos | PENDIENTE | | |
| S09. Productos y categorías | PENDIENTE | | |
| S10. Vencimiento de reservas | PENDIENTE | | |
| S11. Registro y perfil (complementaria) | PENDIENTE | | |
| S12. Cierre y limpieza | PENDIENTE | | |

## 3. Levantar el proyecto localmente en Windows

Abre una terminal PowerShell en VS Code. Los comandos usan `npm.cmd` para evitar el bloqueo de `npm.ps1` por la política de scripts de PowerShell.

### Primera preparación o después de cambiar dependencias

```powershell
cd 'C:\Users\Eli\OneDrive\Escritorio\fimu\fimu2025'
node --version
npm.cmd ci
npm.cmd run prisma:generate
```

El entorno comprobado previamente usó Node 22.19.0. Si las dependencias ya están instaladas y el cliente de Prisma generado, no necesitas reinstalarlos en cada inicio.

- [ ] Estoy en la carpeta correcta, donde está `package.json`.
- [ ] Las dependencias están instaladas.
- [ ] Prisma terminó de generar su cliente. Este comando no crea ni modifica tablas.
- [ ] `.env` contiene `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DATABASE_URL` y `DIRECT_URL` del entorno elegido.
- [ ] Las variables de Supabase Auth y PostgreSQL corresponden al mismo proyecto.
- [ ] Si existen `.env.local` u otras variables configuradas en la terminal, comprobé que no apunten a otro entorno. Next.js y el script de verificación pueden leer configuraciones diferentes si hay sobrescrituras.

### Evitar mensajes reales durante las simulaciones

En la configuración local de pruebas, deja estas credenciales vacías y define la URL de la aplicación local:

```dotenv
TWILIO_ACCOUNT_SID=""
TWILIO_AUTH_TOKEN=""
TWILIO_WHATSAPP_NUMBER=""
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
```

Conserva los valores originales únicamente en tu almacenamiento privado de credenciales. No los copies en esta guía ni en archivos versionados. Reinicia el servidor después de cambiar variables; comprueba también que no estén definidas con otros valores en `.env.local` o en la terminal.

La notificación al reservar está comentada actualmente en el carrito, pero el flujo de expiración sí puede llamar al endpoint de WhatsApp. La URL base debe apuntar al entorno local: de lo contrario podría llamar al sitio publicado con sus propias credenciales.

- [ ] Los servicios de notificaciones de esta prueba no enviarán mensajes reales.
- [ ] No voy a hacer transferencias ni enviar comprobantes de pago reales.

### Verificaciones previas

```powershell
npm.cmd run verify:env
npm.cmd run test:security
npx.cmd tsc --noEmit --incremental false
npm.cmd run lint
```

- [ ] `verify:env` muestra Supabase Auth HTTP 200 y conexión PostgreSQL correcta.
- [ ] Hay un perfil administrador y un perfil común vinculados. Para S05 hacen falta dos cuentas comunes distintas.
- [ ] Pasan las pruebas de seguridad. Al preparar esta guía había 44 pruebas.
- [ ] TypeScript termina sin errores.
- [ ] ESLint termina sin errores. Había tres advertencias previas documentadas en [la revisión de seguridad](SEGURIDAD-IDENTIDAD-CARRITO.md).

`verify:env` solo consulta conectividad y existencia de perfiles. No inicia sesión en las cuentas ni verifica sus contraseñas. Si falla por conexión, anota el resultado; no presupongas que la contraseña es incorrecta.

### Iniciar y detener

```powershell
npm.cmd run dev
```

- [ ] La terminal indica que el servidor está listo.
- [ ] Abro `http://localhost:3000` y veo el catálogo.
- [ ] Mantengo abierta esa terminal durante las pruebas.

Para detenerlo, pulsa `Ctrl+C`. Para volver a iniciarlo, ejecuta otra vez `npm.cmd run dev`.

Si el puerto 3000 está ocupado, usa la URL que indique la terminal. Ajusta también `NEXT_PUBLIC_BASE_URL` al puerto elegido y reinicia. No mezcles `localhost` con `127.0.0.1` entre pasos: sus cookies son diferentes. Evita `dev:clean`, porque el script actual termina todos los procesos Node del equipo.

## 4. Preparar cuentas, navegadores y productos

Usa tres sesiones independientes:

| Sesión | Ejemplo | Papel |
| --- | --- | --- |
| A | Chrome normal | Invitado y después cliente A |
| B | Chrome incógnito | Otro invitado y después cliente B |
| C | Edge o un perfil de navegador distinto | Administrador |

Dos pestañas normales comparten sesión; varias ventanas de incógnito del mismo navegador también pueden compartirla. No las uses como si fueran usuarios independientes. Para reiniciar un invitado, cierra todas las ventanas de incógnito de esa sesión o borra únicamente los datos del sitio local. Cerrar sesión de usuario no equivale a borrar su cookie de invitado.

- [ ] A y B son cuentas de prueba distintas y sin rol administrador.
- [ ] C tiene rol administrador ya configurado en el entorno de pruebas.
- [ ] En la base de pruebas hay productos disponibles con stock 1, identificables por el prefijo `PRUEBA-`.

| Producto de prueba | Uso | ID o nombre real |
| --- | --- | --- |
| PRUEBA-CARRITO | S01–S03 | |
| PRUEBA-MIGRACION-RESERVA | S04 | |
| PRUEBA-DISPUTA | S05–S06 | |
| PRUEBA-VENTA | S07 | |
| PRUEBA-EDICION | S09 | |
| PRUEBA-EXPIRACION | S10 | |

Antes de cada secuencia, deja únicamente sus productos en los carritos participantes. El botón de pago puede procesar todos los productos disponibles del carrito, y reservar otro producto puede extender reservas anteriores del mismo propietario.

## 5. Secuencias

### S01. Carrito de invitado

Precondición: A sin login; PRUEBA-CARRITO disponible.

- [x] A agrega PRUEBA-CARRITO y lo ve en `/carrito`.
- [x] A recarga y conserva el producto.
- [x] A intenta agregarlo otra vez: no se duplica.
- [x] A elimina el producto: desaparece y no vuelve al recargar.
- [x] A lo agrega nuevamente para la siguiente secuencia.

Esperado: carrito persistente en esa sesión, sin duplicados ni errores. Comprueba también el contador de la tienda; si no coincide con el carrito, registra el fallo.

### S02. Separación entre visitantes

Precondición: A conserva PRUEBA-CARRITO; B es una sesión invitada independiente.

- [x] B abre `/carrito`: no ve el contenido de A.
- [x] B agrega PRUEBA-CARRITO mientras sigue disponible.
- [x] A elimina su item: el carrito de B lo conserva.
- [x] A vuelve a agregarlo; B elimina su propio item para terminar.

Esperado: agregar al carrito no reserva el producto. Ambos visitantes pueden tenerlo antes de reservar, y borrar el carrito de uno no borra el del otro.

### S03. Login y migración del carrito

Precondición: A tiene PRUEBA-CARRITO como invitado.

- [x] A inicia sesión como cliente A y abre `/carrito` (la migración se dispara allí).
- [x] El producto se conserva una sola vez.
- [x] A recarga: sigue presente y no se duplica.
- [x] A cierra sesión: el carrito de la cuenta deja de mostrarse al invitado.
- [x] A inicia sesión nuevamente y recupera el carrito de su cuenta.
- [x] A elimina el producto para preparar la siguiente secuencia.

Esperado: persistencia por cuenta después de migrar y separación al cerrar sesión. Anota si el contador queda desactualizado aunque el carrito esté bien.

### S04. Reserva de invitado y migración después del login

Precondición: A cierra sesión; deja vacío su carrito invitado y usa PRUEBA-MIGRACION-RESERVA.

- [x] A agrega el producto y pulsa el botón de pagar/reservar.
- [x] A completa el formulario con datos de contacto ficticios identificados como prueba.
- [x] Aparece la confirmación de reserva y el producto queda reservado. No realiza una transferencia.
- [x] A inicia sesión como cliente A y vuelve a `/carrito`.
- [x] La reserva se reconoce como propia; no aparece como reservada por otro comprador.
- [x] A recarga y mantiene esa propiedad.
- [x] C cancela únicamente esta reserva de prueba antes de continuar.

Esperado: se transfieren el carrito invitado y la propiedad de su reserva a la cuenta autenticada.

### S05. Dos clientes intentan reservar el mismo producto

Precondición: A y B logueados en cuentas distintas; PRUEBA-DISPUTA disponible; sin otras reservas de estas cuentas.

- [x] A y B agregan PRUEBA-DISPUTA a sus carritos antes de reservar.
- [x] A confirma la reserva primero.
- [x] B intenta reservar con su pantalla anterior y luego recarga.
- [x] B recibe un rechazo o ve que el producto pertenece a otro comprador.
- [x] A conserva su reserva; C ve un único propietario en Ventas.
- [x] C cancela la reserva de prueba y ambos preparan nuevamente sus carritos.
- [x] A y B intentan confirmar casi al mismo tiempo; se registra cuál ganó y cuál fue rechazado.

Esperado: solo una reserva gana; el segundo intento no reemplaza al comprador. Si la interfaz ya bloquea el botón de B, eso valida la pantalla; la prueba simultánea y las pruebas automatizadas cubren el intento con información desactualizada. Deja la reserva ganadora para S06.

### S06. Pausar, reanudar y cancelar

Precondición: hay una reserva de PRUEBA-DISPUTA; recuerda si la ganó A o B. El otro cliente no tiene reservas propias.

- [x] C entra en `/admin/ventas`, identifica ese producto y pulsa `Pausar`.
- [x] El comprador ve la reserva pausada; espera aproximadamente un minuto y recarga.
- [x] C pulsa `Reanudar`.
- [x] El comprador ve que el tiempo continúa sin descontar el intervalo pausado.
- [x] C pulsa `Cancelar Reserva` y confirma la acción.
- [x] El producto vuelve a disponible, deja de figurar reservado y su stock sigue siendo 1.
- [x] El otro cliente puede agregarlo y reservarlo de nuevo.
- [x] C cancela esta última reserva para dejar el producto limpio.

Esperado: pausa y reanudación coherentes; cancelación libera el producto sin venderlo. La pausa actual puede afectar varias reservas agrupadas por información del comprador: si tienes más de una, anota exactamente cuáles cambiaron. No uses contactos de clientes reales.

### S07. Confirmar venta y revisar stock

Precondición: PRUEBA-VENTA disponible, stock 1; carrito de A vacío.

- [x] A agrega y reserva PRUEBA-VENTA.
- [x] C pulsa `Confirmar Pago` únicamente para esta simulación.
- [x] El producto aparece vendido; el stock pasa de 1 a 0.
- [x] Desaparece del carrito después de recargar; B no puede comprarlo.
- [x] Tras recargar Ventas, ya no se ofrece confirmar otra vez esa reserva.
- [x] C usa `Volver Disponible` sobre el producto de prueba y revisa su estado y stock.
- [x] C restablece manualmente el stock de prueba a 1 desde edición de productos, o elimina el producto de prueba si ya no se necesita.

Esperado: una confirmación descuenta una unidad. **El código actual de `Volver Disponible` limpia la reserva/venta, pero no repone stock**: registra ese comportamiento, no presupongas que deja el producto listo para vender otra vez. La prueba de confirmaciones simultáneas a nivel de API queda para la revisión técnica.

### S08. Permisos administrativos

- [x] B cierra sesión y abre `/admin`: termina en `/login`.
- [x] B, aún sin login, abre `/admin/ventas`: no ve contenido administrativo.
- [x] B inicia sesión como cliente común y abre ambas rutas: no accede a las pantallas de administración.
- [x] B abre `/api/test-db`: recibe un error de falta de permiso (403 como usuario común; 401 sin login).
- [x] C entra como administrador y puede abrir `/admin` y `/admin/ventas`.
- [x] C abre `/api/test-db` y obtiene el estado de conexión correcto.

Esperado: solo el administrador accede. Los permisos de creación/edición/borrado directos de API se comprueban también con `npm.cmd run test:security`; no basta con que un botón esté oculto.

### S09. Productos y categorías

Solo en base de pruebas: cambiar la visibilidad de categorías afecta a todo el catálogo de ese entorno.

- [x] C crea PRUEBA-EDICION desde `/admin` y aparece en la tienda.
- [x] C cambia nombre, precio y stock; recarga y comprueba que persisten.
- [x] C anota la visibilidad original de la categoría elegida: __________.
- [x] C cambia su visibilidad y comprueba el resultado en la tienda como visitante.
- [x] C devuelve la categoría a su visibilidad original.
- [x] C elimina únicamente PRUEBA-EDICION y verifica que ya no aparece.

Esperado: el administrador puede gestionar el catálogo; los cambios persisten y se restaura la configuración de prueba.

### S10. Vencimiento de reservas

La implementación nueva elimina la divergencia entre 30 minutos y la limpieza de 3 horas. Antes de ejecutar esta secuencia, aplicar la migración y desplegar la nueva versión en un entorno de pruebas, y activar su tarea periódica. Ver [CONFIGURACION-RESERVAS-OPERACION.md](CONFIGURACION-RESERVAS-OPERACION.md) y la [matriz nueva de horarios](CHECKLIST-CONFIGURACION-RESERVAS.md).

Precondición: entorno aislado, sin reservas anteriores de A; PRUEBA-EXPIRACION disponible; notificaciones reales desactivadas. El `.env` de trabajo apunta a la base real, aunque la aplicación se abra en localhost.

- [ ] Configurar en pruebas 1 minuto sin pausa y reservar PRUEBA-EXPIRACION.
- [ ] Anotar hora del servidor/vencimiento mostrado: __________.
- [ ] No agregar más productos, para evitar renovar el plazo.
- [ ] Cerrar todos los navegadores y esperar dos minutos, con el ejecutor periódico activo.
- [ ] Reabrir: el producto está disponible y se retiró del carrito; no solo cambió el texto del reloj.
- [ ] Registrar hora de liberación observada y estado HTTP del cron: __________.
- [ ] Repetir con pausa manual: esperar más que el plazo original y comprobar que sigue reservado.
- [ ] Reanudar, verificar saldo conservado y completar los cruces de horario de la matriz nueva.
- [ ] Si hay discrepancias, marcar S10 como FALLÓ; restaurar configuración y limpiar únicamente productos de prueba.

Esperado: con el scheduler sano, el producto se libera en el siguiente ciclo después del vencimiento (aproximadamente un minuto más red/procesamiento). Una pausa manual no se libera por un plazo anterior. No cambiar el reloj del sistema ni editar fechas de producción. La ejecución manual de esta secuencia sigue pendiente.

### S11. Registro y perfil — complementaria

Solo con cuentas de prueba. La revisión de seguridad del alta de perfiles sigue pendiente.

- [ ] En una sesión independiente, crea una cuenta usando un correo de pruebas que controles.
- [ ] Si se exige confirmación de email, la completa sin terminar operando accidentalmente sobre el sitio de producción. Si el enlace lleva al dominio equivocado, registra el bloqueo de configuración.
- [ ] Inicia sesión y ve su propio perfil.
- [ ] Cambia un dato de perfil ficticio y comprueba que persiste después de recargar.
- [ ] Cierra sesión: ya no se muestra información privada de esa cuenta.

Esperado: registro, confirmación y perfil coherentes. No pruebes eliminar tu cuenta administradora ni una cuenta real.

### S12. Cierre y limpieza

- [ ] Cancela únicamente las reservas de productos PRUEBA que hayan quedado activas.
- [ ] Revisa estado y stock de los productos usados; no asumas que volver a disponible repone stock.
- [ ] Elimina únicamente los productos de prueba que ya no necesitas.
- [ ] Restablece la visibilidad original de las categorías.
- [ ] Cierra sesión en las cuentas y detén el servidor con `Ctrl+C`.
- [ ] Completa la tabla de resultados y los fallos encontrados.
- [ ] Si modificaste variables locales para las pruebas, conserva identificada la configuración que quedó activa. No actives envíos reales por accidente.

## 6. ¿Cuándo desplegar?

No despliegues a producción para descubrir si funcionan estas secuencias. Primero completa las pruebas locales, corrige los fallos y repite las secuencias afectadas.

Puedes comprobar la compilación y ejecución de producción **en tu computadora**, sin publicar nada:

```powershell
# Detén primero el servidor de desarrollo con Ctrl+C.
npm.cmd run build
npm.cmd run start
```

`build` genera Prisma y compila Next.js; puede necesitar acceso de red para recursos de compilación. `start` necesita que `build` haya terminado correctamente. Sigue usando los servicios que indique tu configuración local; no crea una base aislada. La comprobación de cookies Secure bajo HTTPS se hará en un despliegue de pruebas HTTPS.

- [ ] Compilación local de producción completada, o fallo registrado.
- [ ] Pruebas básicas repetidas en un despliegue de pruebas con HTTPS y servicios separados, si se prepara ese entorno.
- [ ] Confirmadas las variables, URLs de redirección de autenticación y destino de notificaciones del entorno publicado de pruebas.
- [ ] No quedan fallos críticos de acceso, reservas compartidas, stock o confirmación.
- [ ] Antes de publicar en producción, se revisaron los fallos y los cambios a desplegar.

Después de un despliegue aprobado, realiza una comprobación breve del catálogo y login. Las compras de prueba y pruebas simultáneas deben seguir haciéndose en el entorno de pruebas.

## 7. Registro de fallos

Copia este bloque por cada problema. Las capturas son opcionales; oculta datos personales y credenciales. No compartas un HAR completo ni encabezados de cookies/autorización.

```text
ID: F-001
Secuencia y paso:
Fecha, hora y zona horaria:
Entorno y URL de la página (sin tokens):
Sesión / rol: A, B o C
Producto de prueba:
Pasos exactos para reproducir:
Resultado esperado:
Resultado observado:
Mensaje visible de error:
Código HTTP y ruta de /api/, si se conoce (sin headers ni secretos):
¿Se repite después de recargar?:
Estado: NUEVO / CORREGIDO / REPROBADO
Notas:
```

Cuando termines una tanda, comparte los IDs de las secuencias que fallaron y sus registros. No necesitas terminar toda la guía para reportar un bloqueo.
