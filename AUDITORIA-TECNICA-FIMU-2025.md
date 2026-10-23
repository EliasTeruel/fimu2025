# Auditoría técnica, funcional, UX y de seguridad — Fimu2025

## Alcance y metodología

Se revisó el código fuente relevante del proyecto, con foco en infraestructura, autenticación, APIs, flujo del carrito, reservas y protección de rutas. Se trabajó a partir de los archivos principales del repositorio y de la documentación disponible, sin tocar lógica de negocio ni código funcional.

Archivos revisados de forma directa:

- [package.json](./package.json)
- [README.md](./README.md)
- [middleware.ts](./middleware.ts)
- [lib/prisma.ts](./lib/prisma.ts)
- [lib/auth.ts](./lib/auth.ts)
- [lib/session.ts](./lib/session.ts)
- [lib/supabase/middleware.ts](./lib/supabase/middleware.ts)
- [prisma/schema.prisma](./prisma/schema.prisma)
- [app/layout.tsx](./app/layout.tsx)
- [app/contexts/AuthContext.tsx](./app/contexts/AuthContext.tsx)
- [app/page.tsx](./app/page.tsx)
- [app/carrito/page.tsx](./app/carrito/page.tsx)
- [app/components/ProductoModal.tsx](./app/components/ProductoModal.tsx)
- [app/registro/page.tsx](./app/registro/page.tsx)
- [app/admin/page.tsx](./app/admin/page.tsx)
- [app/admin/ventas/page.tsx](./app/admin/ventas/page.tsx)
- [app/api/productos/route.ts](./app/api/productos/route.ts)
- [app/api/productos/[id]/route.ts](./app/api/productos/[id]/route.ts)
- [app/api/productos/publico/route.ts](./app/api/productos/publico/route.ts)
- [app/api/usuarios/route.ts](./app/api/usuarios/route.ts)
- [app/api/usuarios/[id]/route.ts](./app/api/usuarios/[id]/route.ts)
- [app/api/carrito/route.ts](./app/api/carrito/route.ts)
- [app/api/carrito/migrar/route.ts](./app/api/carrito/migrar/route.ts)
- [app/api/ventas/reservar/route.ts](./app/api/ventas/reservar/route.ts)
- [app/api/ventas/confirmar/route.ts](./app/api/ventas/confirmar/route.ts)
- [app/api/ventas/cancelar/route.ts](./app/api/ventas/cancelar/route.ts)
- [app/api/ventas/disponible/route.ts](./app/api/ventas/disponible/route.ts)
- [app/api/notificaciones/whatsapp/route.ts](./app/api/notificaciones/whatsapp/route.ts)

Se excluyeron artefactos generados y dependencias instaladas según el criterio del prompt. No se afirmará haber revisado archivos que no pudieron leerse.

---

## 1) Tecnología real detectada

### Stack principal identificado

- Next.js: 16.0.7
- React: 19.2.0
- TypeScript: 5.x (según [package.json](./package.json))
- Prisma: 6.19.0
- PostgreSQL: Supabase Postgres (definido vía `DATABASE_URL`/`DIRECT_URL` en [prisma/schema.prisma](./prisma/schema.prisma))
- Supabase Auth + Supabase SSR + Supabase JS
- Tailwind CSS v4
- Cloudinary para imágenes
- Twilio para notificaciones de WhatsApp

### Arquitectura

- App Router de Next.js con rutas dentro de [app/](./app)
- API routes server-side bajo [app/api](./app/api)
- Client components con React para formularios y UI
- Prisma como capa de acceso a datos en [lib/prisma.ts](./lib/prisma.ts)
- Cookies y sesión de Supabase gestionados en [lib/supabase/middleware.ts](./lib/supabase/middleware.ts)
- Middleware global definido en [middleware.ts](./middleware.ts)
- Modelos de negocio principales en [prisma/schema.prisma](./prisma/schema.prisma)

### Estado de la arquitectura

La arquitectura es coherente para un e-commerce pequeño/mediano con Next.js + Prisma + Supabase. La estructura está ordenada y resulta legible. El proyecto tiene varias piezas bien diferenciadas: catalogo, carrito, reservas, administración y usuarios.

Sin embargo, la separación entre “autenticación en frontend” y “autorización real en backend” no está aplicada con consistencia; esto es el principal riesgo técnico/seguridad del proyecto.

---

## 2) Qué está bien implementado

### Funcionalidad general

- El flujo de catálogo está bien orientado y hay una estructura clara de páginas y componentes.
- El manejo de imágenes con Cloudinary y los componentes de formulario de carga se ven razonablemente bien organizados.
- La capa de ORM Prisma está bien utilizada para productos, usuarios, carrito y reservas.
- El sistema de autenticación con Supabase Auth está presente y la lógica de registro es coherente en [app/registro/page.tsx](./app/registro/page.tsx).
- El flujo de “carrito invitado” / “carrito logueado” existe y se intenta resolver con `sessionId` y `usuarioId` en [app/api/carrito/route.ts](./app/api/carrito/route.ts) y [app/api/carrito/migrar/route.ts](./app/api/carrito/migrar/route.ts).
- Hay control de acceso en UI para admin en [app/admin/page.tsx](./app/admin/page.tsx) y [app/admin/ventas/page.tsx](./app/admin/ventas/page.tsx).
- El proyecto define bien entidades clave en Prisma: `Producto`, `Usuario`, `CarritoItem`, `ProductoImagen`, `ConfiguracionCategoria`.

### Buenas prácticas observadas

- El uso de App Router es adecuado para Next.js 16.
- Se emplea `createClient` de Supabase para front-end y `createClient` de server-side para APIs.
- La lógica de reservas cuenta con tiempos de expiración y manejo de estado en [app/api/ventas/reservar/route.ts](./app/api/ventas/reservar/route.ts).
- Existe un intento de distinción entre usuario anónimo y usuario registrado en el carrito.

---

## 3) Qué está incompleto o presenta errores

### A. Autorización insegura en APIs críticas

El problema más importante no es sólo funcional, sino de seguridad. El backend acepta `usuarioId` y `sessionId` desde el cliente sin validar que el usuario autenticado sea el mismo que intenta manipular ese recurso.

Evidencia:

- [app/api/carrito/route.ts](./app/api/carrito/route.ts): `GET`, `POST` y `DELETE` usan `usuarioId` o `sessionId` directamente desde la query/body sin verificar la sesión autenticada real.
- [app/api/carrito/migrar/route.ts](./app/api/carrito/migrar/route.ts): acepta `usuarioId` del cliente y mueve items entre cuentas sin comprobar que el usuario actual pertenece a ese `usuarioId`.
- [app/api/ventas/reservar/route.ts](./app/api/ventas/reservar/route.ts): usa `usuarioId` y `sessionId` provistos por el cliente para determinar la reserva del producto.

Riesgo:

- Un usuario puede enviar `usuarioId` de otro cliente y manipular o consultar su carrito.
- Un atacante puede forzar la migración o borrado de un carrito ajeno si logra adivinar o descubrir IDs.
- Esto es un caso clásico de IDOR / falta de autorización en servidor.

Severidad: CRÍTICA

### B. Protección de rutas administrativas insuficiente

El middleware de Next.js solo redirige a `/login` si la ruta empieza con `/admin` y no hay usuario autenticado.

Evidencia:

- [middleware.ts](./middleware.ts)
- [lib/supabase/middleware.ts](./lib/supabase/middleware.ts)

Problema:

- Esa protección existe en el frontend, pero no se vuelve a imponer en todos los endpoints sensibles ni se valida rol de administrador del lado del servidor.
- Los endpoints de administración o flujo de compra pueden ser consumidos directamente por cualquier cliente si el endpoint no valida `isAdmin`/`supabaseId`.
- Las pantallas admin en [app/admin/page.tsx](./app/admin/page.tsx) y [app/admin/ventas/page.tsx](./app/admin/ventas/page.tsx) chequean permiso del lado del cliente, pero eso no reemplaza validación real del servidor.

Severidad: ALTA

### C. Faltan validaciones de propiedad y consistencia sobre reservas

El estado de reserva del producto depende de información capturada por el cliente (`compradorInfo`, `sessionId`, `usuarioId`). Eso deja abierta la manipulación del estado del producto.

Evidencia:

- [app/api/ventas/reservar/route.ts](./app/api/ventas/reservar/route.ts)
- [app/api/ventas/confirmar/route.ts](./app/api/ventas/confirmar/route.ts)
- [app/api/ventas/cancelar/route.ts](./app/api/ventas/cancelar/route.ts)

Problema:

- El backend no verifica que el comprador actual sea quien reservó el producto antes de confirmarlo o cancelarlo.
- La validación de “ya está reservado por otro cliente” se basa en `compradorInfo` y no en identidad verificable del usuario autenticado.
- Hay riesgo de manipulación del estado de inventario y de acceso a reservas ajenas.

Severidad: ALTA

### D. Logging de datos sensibles en entorno de desarrollo

En [lib/prisma.ts](./lib/prisma.ts) se imprime el valor de `DATABASE_URL` truncado en logs.

Evidencia:

```ts
console.log('🔧 [Prisma] DATABASE_URL:', process.env.DATABASE_URL?.substring(0, 50) + '...')
```

Problema:

- Aunque se trunca, aún expone información del host y estructura del string de conexión.
- En entornos compartidos o logs centralizados, esto puede ser información sensible y reutilizable. 
- En [app/api/notificaciones/whatsapp/route.ts](./app/api/notificaciones/whatsapp/route.ts) además se loguean credenciales y número objetivo parcialmente.

Severidad: MEDIA

### E. El sistema de administración parece depender de un guard cliente

Si bien la lógica admin se demuestra en UI, no hay una validación severa del rol a nivel de API. La API de productos y la API de ventas no chequean si el usuario autenticado es admin antes de permitir cambios relevantes.

Evidencia:

- [app/api/productos/route.ts](./app/api/productos/route.ts): POST valida `supabase.auth.getUser()`, pero no valida `isAdmin`.
- [app/api/productos/[id]/route.ts](./app/api/productos/[id]/route.ts): PUT y DELETE validan usuario autenticado, no rol admin.
- [app/api/ventas/confirmar/route.ts](./app/api/ventas/confirmar/route.ts): no valida rol administrativo.
- [app/api/ventas/cancelar/route.ts](./app/api/ventas/cancelar/route.ts): no valida rol administrativo.

Severidad: ALTA

### F. El carrito no tiene una validación real de propietario en el servidor

Aun cuando el frontend hace `GET /api/carrito?usuarioId=...`, el backend no comprueba que el usuario autenticado coincida con ese `usuarioId`.

Esto hace que las vistas de carrito y perfiles puedan mostrarse datos de otras personas si se manipula el parámetro. También puede afectar el proceso de checkout.

Severidad: CRÍTICA

---

## 4) Seguridad: OWASP / ASVS / riesgos específicos

### Autenticación y autorización

- La autenticación por Supabase está presente.
- El problema principal es la falta de autorización del lado del servidor.
- Admin no es un rol verificado correctamente en APIs; sólo se comprueba en client componentes.
- El middleware de Next.js protege solo la ruta `/admin` a nivel de redirect, pero no la API ni la lógica de negocio.

### XSS / inyección

- No se detectó uso evidente de `innerHTML` ni `dangerouslySetInnerHTML` en los archivos revisados.
- El proyecto usa imágenes y textos generados por la base de datos, pero sin evidencia directa de sanitización manual. Para un proyecto de este tipo, la principal preocupación no es XSS sino integridad del backend y manipulación de identidad.

### CSRF / cookies

- Como se usa Supabase con cookies y SSR, el riesgo de CSRF depende de cómo se configuran cookies y de la seguridad de origen. No se observó un análisis explícito de políticas de cookies ni de `SameSite`/`Secure` en el alcance revisado.
- El proyecto debería documentar y verificar la configuración del dominio y la estrategia de sesión de Supabase.

### Manipulación de precios / carrito / pagos

- En el estado actual, el cliente puede decidir cantidades y `usuarioId`/`sessionId` que luego son usados por la API. Eso deja la lógica de e-commerce vulnerable a manipulación del cliente.
- El backend no valida la identidad ni el estado del usuario antes de aceptar cambios sobre carrito y productos reservados.
- Esto es un riesgo serio para un e-commerce en producción.

### Secretos y configuración

- No se observaron secretos hardcodeados completos en los archivos revisados.
- Pero sí se detecta la impresión de valores de entorno en logs y la posibilidad de exponer configuración de infraestructura.
- No se detectó configuración explícita de CSP ni headers de seguridad en esta revisión, por lo que puede requerirse una revisión adicional de producción y despliegue.

---

## 5) Auditoría funcional de la tienda

### Catálogo

- Listado de productos: implementado de forma clara.
- Categorías: hay soporte para categorías visibles con configuración en [app/api/configuracion/categorias/route.ts](./app/api/configuracion/categorias/route.ts) (no revisada en detalle, pero presente en la estructura).
- Filtros, ordenamiento y búsqueda: existe una capa de paginación, pero no se observó un sistema completo de filtros avanzados o búsqueda de productos con refinamiento profundo.
- Variantes de talle / color: no se evidencian en este alcance.
- Stock: se gestiona en Prisma, aunque el flujo de negocio no es estrictamente robusto en validación del lado del servidor.
- Fotografía: incluida y manejada con Cloudinary.
- Precios y descuentos: existe un flujo de precio, pero no se evidencia lógica robusta de cupones/descuentos centralizados.

### Carrito y compras

- Agregar producto: funcional en [app/components/ProductoModal.tsx](./app/components/ProductoModal.tsx) y [app/api/carrito/route.ts](./app/api/carrito/route.ts)
- Modificar cantidades: no se detecta una lógica fuerte de edición de cantidades por item; el sistema parece estar basado en un item por producto.
- Eliminar productos: existe vaciado y eliminación por item, según la naturaleza del flujo.
- Persistencia: implementada con `sessionId` localStorage y lógica de migración a usuario.
- Validación de disponibilidad: existe parcialmente, pero depende demasiado del cliente y de estados de producto.
- Cálculo de subtotales y totales: no se evidenció claramente en la revisión directa; puede existir parte del flujo en otras pantallas no revisadas en detalle.
- Checkout: existe flujo de reserva / pago, pero la validación de identidad aún no está resuelta.

### Usuarios

- Registro: implementado.
- Login: plausible con Supabase Auth.
- Recuperación de contraseña: no se confirmó en la revisión directa.
- Perfil y direcciones: existe página de perfil y usuario en base de datos, pero no se revisó profundidad suficiente como para asegurarlo completamente.

### Administración

- ABM de productos: implementado con UI en [app/admin/page.tsx](./app/admin/page.tsx)
- Gestión de imágenes: sí
- Inventario: sí, a partir de `stock`
- Pedidos / estados de compra: hay flujo de reservas y confirmación, pero requiere hardening.

---

## 6) UX / accesibilidad / experiencia

### Lo positivo

- El proyecto tiene una identidad visual muy definida y coherente.
- El layout y la navegación tienen una estética consistente.
- La interfaz usa colores y tipografías bien alineadas con el branding.

### Debilidades UX / accesibilidad

- El sistema depende bastante de mensajes de alerta personalizados y de moderación de estados. Eso puede ser útil, pero no reemplaza la accesibilidad semántica y la validación de formularios.
- No se evidenció un plan explícito de accesibilidad (contrastes, foco, teclado, ARIA, lectura por pantalla) en la lógica revisada.
- Las validaciones del lado del cliente son buenas, pero los errores del backend se traducen parcialmente y no siempre se manejan con mensajes accesibles.
- El flujo de compras y reservas requiere más claridad y guiado para evitar que el usuario manipule estados inconsistentes.

---

## 7) Documentación y mantenimiento

### Estado de la documentación

La documentación base en [README.md](./README.md) describe el proyecto y su stack de forma útil. El proyecto además tiene un conjunto de archivos de referencia y administración (por ejemplo, [CARRITO-USUARIO.md](./CARRITO-USUARIO.md), [CHECKLIST.md](./CHECKLIST.md), [DEPLOY.md](./DEPLOY.md), etc.) que muestran una estructura de documentación activa.

### Problemas de documentación

- La documentación de negocio parece muy avanzada respecto a la práctica de seguridad real del sistema.
- Hay riesgo de que una parte de la documentación describa comportamientos deseados sin reflejar la protección real en backend.
- No se observó una política clara de seguridad, rotación de secrets ni deployment checklist robusto en el alcance revisado.

---

## 8) Deuda técnica y riesgos de mantenimiento

- La lógica de permisos está mezclada entre UI y backend.
- Los endpoints de compra y carrito confían en parámetros del cliente.
- La lógica de reserva está acoplada a información no autenticada y no verificable.
- Hay varios puntos donde el código asume que el cliente es confiable.
- Se requieren pruebas end-to-end para flujo de login, carrito, reserva y admin.
- No se observó un plan de CI/CD formal en el repo revisado.

---

## 9) Mejoras recomendadas y orden de ejecución

### Prioridad 1 — Seguridad crítica

1. Validar identidad y propiedad del usuario en todos los endpoints que reciban `usuarioId` o `sessionId`.
2. Verificar el usuario autenticado en server-side antes de leer/escribir carrito, reservas y ventas.
3. Reforzar la autorización en todos los endpoints administrativos.
4. Confirmar `isAdmin` desde la base de datos del usuario autenticado, no desde el cliente.

### Prioridad 2 — Integridad del negocio

1. Reemplazar uso de `compradorInfo` como identificador de propiedad por una identidad real verificada del usuario autenticado.
2. Validar la propiedad del producto reservado antes de confirmación/cancelación.
3. Revisar el flujo de checkout para prevenir reservas duplicadas y manipulación.

### Prioridad 3 — Operación y observabilidad

1. Sacar logs de conexión y secrets del entorno.
2. Añadir pruebas automatizadas para login, carrito, reservas y admin.
3. Revisar headers de seguridad, CSP y configuración de cookies.

### Prioridad 4 — UX y mantenibilidad

1. Mejorar mensajes de error y estados del flujo de compra.
2. Revisar accesibilidad general (foco, contraste, teclado).
3. Revisar limpieza y unificación del modelo de datos del carrito.

---

## Conclusión general

El proyecto tiene una base arquitectónica razonable para una tienda online de tamaño medio y muestra un nivel de implementación funcional aceptable, especialmente en catalogo, UI, autenticación básica y administración de productos. Sin embargo, la seguridad del negocio está claramente insuficiente en las áreas más sensibles: carrito, reservas, estado del producto y permisos administrativos.

El principal riesgo no es la falta de funcionalidad, sino la confianza excesiva en datos que vienen del cliente. En un proyecto de comercio electrónico, esto es un riesgo crítico porque permite manipulación de identidad, acceso a datos ajenos y modificación del estado de inventario.

De no corregirse, el sistema no debería considerarse listo para producción con datos reales o transacciones financieras.

---

## Resumen ejecutivo

- Estado funcional general: bueno / parcialmente maduro
- Estado de seguridad: insuficiente para producción
- Riesgo crítico más importante: IDOR y manipulación de identidad en carrito y reservas
- Riesgo administrativo: validación de rol en backend ausente
- Recomendación principal: reforzar autorización del lado del servidor antes de cualquier despliegue productivo
