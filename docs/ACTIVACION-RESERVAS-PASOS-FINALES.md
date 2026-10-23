# Activación de reservas: lo que falta hacer en tu cuenta

Actualizado: **23/10/2026**. Tienda: **https://fimu2025.vercel.app**.

## Ya realizado por el agente

- Migración aplicada a la **base real**, dentro de una transacción.
- Respaldo local de las tablas de aplicación y verificación SHA-256 en `.backups/`, excluida de Git. Incluye usuarios/perfiles de la app, productos, imágenes, carritos y categorías; **no es un respaldo de Supabase Auth ni Storage**.
- Datos existentes conservados: 11 productos, 30 imágenes, 4 perfiles, 2 categorías y 0 filas de carrito. Ninguna reserva activa al migrar.
- Configuración inicial: **30 minutos, pausa 23:00–10:00, America/Argentina/Buenos_Aires**.
- Prisma regenerado y `npm.cmd run build` aprobado con Turbopack.
- Servidor local reiniciado con la nueva versión: http://localhost:3000. Puedes entrar en `/admin` → **⚙️ Configuración**.
- Extensiones `pg_cron` y `pg_net` habilitadas en Supabase; Vault verificado.
- Secreto aleatorio generado y guardado en `.env` como `CRON_SECRET`; el mismo valor quedó en Vault. No se imprimió ni se guardó en Git.
- URL de producción guardada en Vault.
- Tarea **`fimu-expirar-reservas`**, ID 1, creada con frecuencia de un minuto y **desactivada**.
- Verificación HTTP local: configuración pública 200; configuración administrativa sin sesión 401; cron sin secreto 401; cron autenticado 200, con 0 reservas revisadas/liberadas.
- 88 pruebas automáticas aprobadas. ESLint: 0 errores, 2 advertencias previas.

**No vuelvas a ejecutar la migración ni crees otra tarea.** Falta publicar el código y el secreto en Vercel, y activar la tarea existente. La ruta nueva pública devuelve actualmente 404, porque ese despliegue todavía no contiene estos cambios.

No hay conexión autenticada con Vercel disponible para el agente (sin sesión de navegador habilitada, CLI autenticada ni token), por lo que los pasos de tu cuenta se hacen manualmente.

## 1. Agregar el secreto en Vercel

- [x] Abrir tu archivo local `.env` en el editor.
- [x] Buscar la línea `CRON_SECRET=...` añadida al final.
- [x] Copiar **solo el valor después del signo `=`**. No cambiarlo ni generar otro: ya está sincronizado con Vault.
- [x] Entrar en [Vercel](https://vercel.com/dashboard), abrir el proyecto **fimu2025** y entrar en **Settings → Environment Variables**.
- [x] Crear la variable **`CRON_SECRET`**, pegar el valor y seleccionar el entorno **Production**. Si ya existe, editarla con ese mismo valor.
- [x] Guardar. No usar el nombre `NEXT_PUBLIC_CRON_SECRET`.

Las variables se aplican a los despliegues nuevos; el paso siguiente publicará la versión que las utiliza. [Documentación de Vercel](https://vercel.com/docs/environment-variables/managing-environment-variables).

No es necesario modificar las variables de Supabase que ya usa Vercel. `RESERVAS_BASE_URL=http://localhost:3000` es para el worker local; no hace falta copiarla a Vercel.

## 2. Publicar el código nuevo

El remoto local es `https://github.com/EliasTeruel/fimu2025.git`, rama `main`. Todavía no se creó un commit ni se hizo push de estos cambios. Puedes usar Control de código fuente de VS Code o ejecutar, desde la raíz del proyecto:

```powershell
git status --short
git diff --check
git add .
git diff --cached --stat
git commit -m "Configurar duracion y pausas de reservas"
git push origin main
```

Revisa la lista antes del commit: debe incluir los archivos de código nuevos y modificados, Prisma, scripts y documentación que quieras conservar. `.env`, `.backups/`, `node_modules` y los builds están ignorados; no los agregues con `-f`.

- [ ] Hacer commit y push de los cambios.
- [ ] Si Git pide iniciar sesión, hacerlo en el flujo de GitHub de tu equipo.
- [ ] En Vercel → **Deployments**, comprobar que se inició un despliegue del commit nuevo para **Production** y esperar **Ready**.
- [ ] Si no se inició, revisar **Settings → Git**: debe estar conectado el repositorio indicado y `main` como rama de producción.
- [ ] Si agregaste `CRON_SECRET` después de ese despliegue, usar **Redeploy** sobre el despliegue del **código nuevo**. Redeploy de un commit viejo no incorpora archivos locales.
- [ ] Abrir [la configuración pública](https://fimu2025.vercel.app/api/configuracion/reservas/publico): debe mostrar JSON con `duracionMinutos: 30`, la zona de Buenos Aires y `algoritmo: 2` (salvo cambios legítimos que hayas guardado).
- [ ] Iniciar sesión como administrador en la web publicada y abrir **⚙️ Configuración → Reservas y horarios**. Recargar con Ctrl+F5 si conserva una pantalla anterior.

## 3. Activar la limpieza automática

Solo después de completar los dos pasos anteriores, abrir PowerShell en la raíz del proyecto:

```powershell
$env:NODE_USE_SYSTEM_CA='1'
npm.cmd run reservas:cron:activate
npm.cmd run reservas:cron:status
```

El primer comando lee el destino y el secreto desde Vault, llama al endpoint publicado y comprueba la respuesta. **Solo activa el job si la aplicación responde correctamente con HTTP 200**. No imprime el secreto.

- [ ] Resultado de activación: `active: true`, `verifiedHttpStatus: 200`, `job: "fimu-expirar-reservas"`.
- [ ] Resultado de estado: tarea `fimu-expirar-reservas`, frecuencia `* * * * *`, `active: true`.
- [ ] Esperar uno o dos minutos y revisar Supabase → **Integrations → Cron** → `fimu-expirar-reservas` → historial.

Si prefieres que lo termine el agente, después de publicar indica: **“Ya puse CRON_SECRET en Vercel y el despliegue nuevo está Ready; verificá y activá el cron”**. No pegues el secreto en el chat.

## 4. Verificar la primera ejecución automática

En el SQL Editor de Supabase, estas consultas son de lectura y no muestran el secreto:

```sql
SELECT jobid, jobname, schedule, active
FROM cron.job
WHERE jobname = 'fimu-expirar-reservas';

SELECT d.start_time, d.end_time, d.status, d.return_message
FROM cron.job_run_details d
JOIN cron.job j ON j.jobid = d.jobid
WHERE j.jobname = 'fimu-expirar-reservas'
ORDER BY d.start_time DESC
LIMIT 5;
```

La ejecución SQL exitosa solo confirma que se encoló la llamada; `return_message` puede mostrar únicamente el número de filas. Revisar también las respuestas HTTP recientes, comparando `created` con la hora de ejecución del job y buscando el contenido de reservas:

```sql
SELECT id, status_code, timed_out, error_msg, created, content
FROM net._http_response
WHERE created >= now() - interval '10 minutes'
ORDER BY created DESC
LIMIT 20;
```

- [ ] La respuesta correspondiente tiene `status_code = 200`, sin timeout y contenido con `revisadas`, `liberadas`, `hayMas`. Si hay otras tareas HTTP en la base, no confundir sus respuestas con las de reservas.
- [ ] Registrar fecha y resultado en [la bitácora](PLAN-Y-BITACORA-CONFIGURACION-RESERVAS.md).
- [ ] Ejecutar la [ronda manual de horarios](CHECKLIST-CONFIGURACION-RESERVAS.md) en un entorno de pruebas separado. **Localhost y la web publicada comparten ahora la base real**: no bajar globalmente el plazo a 1 minuto sobre esa base para simular compras.

Con el job activo, la limpieza no necesita tener abierta la web ni mantener tu PC encendida. Supabase llama al endpoint de Vercel cada minuto. [Funcionamiento de Supabase Cron](https://supabase.com/docs/guides/cron/quickstart).

## Si aparece un error

| Resultado | Cómo resolverlo |
| --- | --- |
| `DEPLOYMENT_NOT_READY_HTTP_404` | La web todavía tiene el código anterior. Revisar commit y despliegue Production. |
| `DEPLOYMENT_NOT_READY_HTTP_503` | Normalmente falta `CRON_SECRET` o tiene menos de 32 caracteres en el servidor. Revisar variable y redeploy. |
| `DEPLOYMENT_NOT_READY_HTTP_401` | El valor en Vercel no coincide con el `.env`/Vault, o el despliegue tiene una protección adicional. Revisar ambos casos; no regenerar claves a ciegas. |
| HTTP 500 | Revisar logs de Vercel y conexión de esa instancia a la base migrada. La activación no se completa. |
| Error de conexión local/Prisma | Verificar red y `.env`; repetir `npm.cmd run reservas:cron:status`. No reaplicar la migración para solucionar un corte de red. |
| Error de certificado al compilar localmente | Usar las variables de certificados del bloque siguiente, sin desactivar TLS. |

Compilación local en este equipo, si necesitas repetirla:

```powershell
# Primero detener únicamente el servidor de este proyecto.
$env:NODE_USE_SYSTEM_CA='1'
$env:NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS='1'
npm.cmd run build
npm.cmd run start
```

El servidor que dejó iniciado el agente usa el build nuevo. Su PID quedó registrado en la bitácora; no detener todos los procesos Node del equipo.
