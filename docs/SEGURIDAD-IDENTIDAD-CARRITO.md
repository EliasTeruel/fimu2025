# Identidad y propiedad del carrito

Implementa la validación de identidad y propiedad de los puntos 1 y 2 de «Prioridad 1» de la sección 9 de la auditoría técnica. La continuación incorpora los permisos administrativos de productos, categorías y páginas de administración de los puntos 3 y 4.

- Las APIs verifican al usuario con `supabase.auth.getUser()` y obtienen su ID interno desde `Usuario.supabaseId`.
- Los parámetros `usuarioId` y `sessionId` son comprobaciones de compatibilidad: nunca otorgan acceso por sí solos. Una identidad ajena devuelve 403; la falta de autenticación requerida devuelve 401.
- El invitado inicia su carrito mediante `POST /api/sesion`. El servidor emite una cookie aleatoria HttpOnly, SameSite=Lax y Secure en producción. La base y las respuestas solo usan el hash SHA-256 de esa cookie; conocer ese hash no permite autenticarse.
- Lectura, contador, agregado, edición, eliminación y migración del carrito filtran por su propietario. La migración exige login y prueba de la sesión invitada, y transfiere sus reservas en una transacción.
- La pantalla de ventas solicita explícitamente `scope=all` para inspeccionar carritos; ese alcance exige rol de administrador en el servidor.
- Reservar exige productos del carrito propio. Las reservas existentes se identifican por el propietario verificado y la escritura vuelve a comprobar disponibilidad dentro de una transacción serializable. `compradorInfo` es información de contacto, nunca autorización.
- Confirmar, cancelar, pausar, marcar vendido y volver a disponible requieren administrador verificado en la base. Expirar exige propietario o administrador y comprueba fecha y pausa en el servidor.
- Las lecturas públicas de productos ocultan contacto e identificadores de reserva. El carrito devuelve `reservadoPorMi` para mostrar la propiedad sin revelar datos de otro comprador. Las respuestas dependientes de sesión no se almacenan en cachés compartidas.
- Consulta, modificación y eliminación de perfiles existentes comprueban la identidad del usuario.

## Compatibilidad al desplegar

No se modifica el esquema ni se ejecutan cambios sobre la base de datos. No se necesita un secreto adicional para las cookies de invitados.

Los carritos y reservas de invitados anteriores, identificados únicamente por el UUID de localStorage, **no se reclaman automáticamente**: no existe una prueba segura de propiedad. Esos visitantes comienzan un carrito nuevo; sus antiguas reservas deben expirar o ser liberadas por administración. Los carritos de cuentas registradas conservan su propietario.

Quedan pendientes las demás prioridades de la auditoría y la revisión del alta de perfiles y de notificaciones. Estos cambios no equivalen a una certificación de seguridad de toda la aplicación.

## Permisos administrativos

- Crear, editar y eliminar productos y modificar categorías exige `requireAdmin()` antes de cualquier consulta o escritura de negocio.
- El permiso se obtiene de `Usuario.isAdmin`, buscando exclusivamente por el ID verificado de Supabase. No se aceptan permisos enviados en el cuerpo, query ni metadatos del usuario.
- `app/admin/layout.tsx` verifica el rol en el servidor antes de devolver las páginas. Redirige invitados a `/login` y usuarios sin permiso a `/`; los errores de verificación no permiten mostrar contenido administrativo.
- Las APIs responden 401 a invitados y 403 a usuarios sin permiso. Cada endpoint verifica por sí mismo, independientemente del middleware y la pantalla.
- El diagnóstico `/api/test-db` también exige administrador y no expone errores internos de conexión.
- Se retiró el log que imprimía parcialmente `DATABASE_URL` antes de usar las credenciales reales.

`npm run verify:env` permite verificar la configuración sin imprimir valores: consulta la disponibilidad de Supabase Auth, ejecuta `SELECT 1` y comprueba si existen perfiles comunes y administradores vinculados. No modifica datos ni envía mensajes.

## Verificación

`npm run test:security` ejecuta los handlers reales con Supabase, cookies y Prisma simulados. Cubre suplantación de usuario e invitado, acceso por ID de item, migración, reservas ajenas con el mismo nombre, operaciones administrativas y ocultación de datos privados.

Para verificar la integración con servicios reales en un entorno de prueba:

1. Abrir dos navegadores independientes, agregar productos y comprobar aislamiento de carritos y contador.
2. Iniciar sesión en uno, abrir el carrito y comprobar que migra los items y reservas propios.
3. Reservar desde un navegador e intentar reservar ese producto desde el otro: debe responder 409 sin sobrescribir al propietario.
4. Probar edición y eliminación propias, luego repetir con un ID ajeno: debe responder 404.
5. Confirmar una venta como administrador y repetir como usuario normal: debe responder 403.

Estas pruebas automatizadas no sustituyen una prueba con Supabase y PostgreSQL reales.

### Resultado de la verificación local

Verificación completada el 21 de octubre de 2026:

- Dependencias instaladas y cliente de Prisma generado.
- 44 pruebas de autorización aprobadas.
- TypeScript: `tsc --noEmit --incremental false` sin errores.
- ESLint: sin errores; tres advertencias previas en productos públicos, `ImageEditor` y el middleware de Supabase.
- `git diff --check`: sin errores.
- `.env` excluido por Git; sus valores no se imprimieron.
- Supabase Auth respondió HTTP 200 y PostgreSQL respondió correctamente a `SELECT 1`.
- Se comprobó que existen perfiles administrador y común vinculados a Supabase. Solo se realizaron consultas de lectura.

La conexión y la existencia de perfiles están verificadas. El recorrido completo de login, carrito y reserva con sesiones reales en el navegador sigue pendiente; las pruebas de autorización usan servicios simulados.
