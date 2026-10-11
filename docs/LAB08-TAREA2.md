# Laboratorio 08 — Tarea 2: API JWT en producción

## Qué se conserva y qué cambia

Se reutiliza `express-mongo-auth`. Se mantienen las rutas, vistas EJS, CSS, imágenes, JWT, registro, login, perfiles y dashboards del laboratorio 07. Los nombres almacenados de roles siguen siendo `user` y `admin` para conservar las referencias existentes.

El arranque valida las variables, utiliza `MONGO_URI`, escucha en `0.0.0.0` con `process.env.PORT` y falla con mensajes que no incluyen valores sensibles. `/health` devuelve `200 {"ok":true}` con MongoDB conectado y `503 {"ok":false}` si se pierde la conexión.

Se eliminan las credenciales predeterminadas del administrador. Los seeds agregan los roles faltantes y, solo si lo solicitas expresamente mediante variables, un administrador nuevo. No borran usuarios, no restablecen contraseñas ni cambian roles de usuarios existentes. Un email ya registrado no se convierte automáticamente en ADMIN.

`bcrypt` se actualizó a la versión 6 para retirar dependencias vulnerables de instalación. Los hashes bcrypt históricos siguen siendo compatibles; hay una prueba de login con vectores históricos `$2a$` y `$2b$`. El modo de desarrollo usa `node --watch`, incluido en Node 22, en reemplazo de `nodemon`.

## Variables

| Variable | Local | Render |
| --- | --- | --- |
| `NODE_ENV` | `development` | `production` |
| `MONGO_URI` | URI local con tu base existente | URI de Atlas con usuario, contraseña codificada y base explícita |
| `JWT_SECRET` | Secreto privado | Valor aleatorio de al menos 32 caracteres; diferente al local |
| `JWT_EXPIRES_IN` | `1h` | `1h` |
| `BCRYPT_SALT_ROUNDS` | `10` | `10` (se admiten enteros de 10 a 15) |
| `PORT` | `3000` o el puerto actual | Usar el asignado por Render; no es necesario definirlo manualmente |
| `SEED_ADMIN` | `false` normalmente | `false`; `true` solo para crear un administrador ausente |
| `ADMIN_EMAIL` | Solo para seed explícito | Solo para seed explícito |
| `ADMIN_PASSWORD` | Solo para seed explícito | Solo para seed explícito; mínimo 8 caracteres, mayúscula, número y uno de `#$%&*@` |

No pegues secretos en el repositorio, README, capturas ni conversaciones. `.env.example` tiene valores vacíos o marcadores; `.env`, variantes privadas, claves, logs y respaldos están ignorados por Git. Tu `.env` actual no fue sobrescrito.

La versión anterior de `.env.example` contenía valores de acceso. Si alguno fue real o reutilizado y ya se compartió, cámbialo en el servicio correspondiente: editar el archivo actual no lo retira del historial Git. No publiques ese historial hasta revisar esta situación.

## 1. Configurar MongoDB Atlas

1. En tu proyecto Atlas, utiliza un clúster existente o crea uno para el laboratorio. No elimines colecciones ni usuarios actuales.
2. En **Database Access**, crea un usuario de base de datos distinto a tu cuenta de Atlas, con acceso `readWrite` a la base de la API. Guarda su contraseña de forma privada.
3. En **Network Access**, autoriza tu IP pública para pruebas locales. Para Render, agrega todos los rangos del servicio desde **Connect > Outbound**. Si aún no tienes esos rangos, completa el alta del servicio, agrégalos y reintenta el despliegue. [Acceso a Atlas](https://www.mongodb.com/docs/atlas/connect-to-database-deployment/), [IPs salientes de Render](https://render.com/docs/outbound-ip-addresses).
4. En **Connect > Drivers > Node.js**, copia la URI. Incluye el nombre de la base en la ruta, mantén las opciones proporcionadas por Atlas y codifica los caracteres especiales de usuario/contraseña como componentes URL.
5. Guarda la URI completa únicamente como `MONGO_URI` en Render. Para probar Atlas desde tu PC, puedes configurarla en tu `.env` privado sin subirlo.

Ejemplo ilustrativo, sin credenciales reales:

```text
mongodb+srv://<USUARIO_DB>:<PASSWORD_URL_ENCODED>@<CLUSTER>/<BASE_EXISTENTE>?retryWrites=true&w=majority
```

Cambiar la URI no copia los usuarios locales a Atlas. Si Atlas está vacío, será una base distinta. Para conservar también esos usuarios en producción, realiza una migración controlada, sin borrar la base original.

### Migración opcional de los datos locales

No se ejecutó ninguna migración. Antes de hacerla, detén escrituras locales, crea un respaldo con MongoDB Database Tools y elige una base de Atlas vacía. Restaura **todas** las colecciones, especialmente `users` y `roles`, para conservar los ObjectId y las referencias. Nunca uses `--drop`. Si el destino ya tiene datos, revisa los conflictos antes de restaurar; la operación puede insertar documentos parcialmente si falla.

Ejemplo para adaptar localmente, sin escribir la contraseña en el comando; `mongorestore` la solicita:

```powershell
mongodump --uri "mongodb://127.0.0.1:27017/<BASE_EXISTENTE>" --out "backups/lab07"
mongorestore --uri "mongodb+srv://<CLUSTER>/<BASE_EXISTENTE>?retryWrites=true&w=majority&authSource=admin" --username "<USUARIO_DB>" --nsInclude "<BASE_EXISTENTE>.*" --stopOnError "backups/lab07"
```

Si tu MongoDB local usa autenticación, utiliza también la solicitud interactiva de contraseña. Verifica los conteos, roles y un login de una cuenta existente tras restaurar. Conserva el respaldo privado. [Documentación de mongodump](https://www.mongodb.com/docs/database-tools/mongodump/), [documentación de mongorestore](https://www.mongodb.com/docs/database-tools/mongorestore/).

## 2. Preparar GitHub

Los archivos están preparados localmente. El commit y el push requieren tu autorización y no se ejecutaron.

`README.md` se conserva únicamente como documentación local y está excluido mediante `.gitignore`; no se incluirá en GitHub con un agregado normal de archivos. `.env` también está ignorado y no fue modificado.

La revisión previa a publicar detectó valores antiguos de `JWT_SECRET` y `ADMIN_PASSWORD` en el historial Git. Posteriormente se rotó únicamente `JWT_SECRET` en el `.env` local usando 256 bits aleatorios, sin mostrar su valor. Se reinició el servidor y se comprobó que rechaza la firma JWT anterior y acepta la nueva manteniendo los permisos. La consulta de lectura a `auth_cloud_database` encontró 0 usuarios y 2 roles, sin administradores que requieran cambio de contraseña; los documentos permanecieron intactos. `ADMIN_PASSWORD` no fue modificado y su valor anterior no debe reutilizarse para crear cuentas nuevas. **No publiques el historial actual:** primero debe limpiarse o prepararse una publicación con historial nuevo, sin incluir esos commits. No se reescribieron commits ni se modificó la contraseña de ninguna cuenta.

Antes de publicar, verifica los nombres de archivos pendientes con `git status --short` y que `git ls-files .env` no produzca resultados. No uses `git add .` sin revisar primero los archivos y el historial que vas a compartir. La rama actual y las configuraciones usan `main`; si cambias de rama de producción, actualiza tanto el workflow como Render.

## 3. Configurar Render

Cuando autorices publicar el repositorio, crea un **Web Service**, conecta GitHub y selecciona ese repositorio. También puedes usar **New > Blueprint** para aplicar `render.yaml`; no crees ambas opciones para el mismo proyecto.

| Ajuste | Valor |
| --- | --- |
| Name | `express-auth-Jimenez` |
| Branch | `main` |
| Runtime | Node |
| Node | 22 |
| Root Directory | Vacío, raíz del repositorio |
| Build Command | `npm ci --omit=dev` |
| Start Command | `npm start` |
| Health Check Path | `/health` |
| Auto-Deploy | **Off**; GitHub Actions solicita los siguientes despliegues |

`render.yaml` utiliza `autoDeployTrigger: off` y solicita `MONGO_URI` como dato privado. Genera `JWT_SECRET` automáticamente en un Blueprint. Si creas el servicio manualmente, genera un secreto aleatorio con un gestor de contraseñas y configúralo en Environment. La creación inicial del servicio sí inicia un despliegue: hazla únicamente cuando decidas autorizarlo. Consulta la configuración oficial de [Express en Render](https://render.com/docs/deploy-node-express-app) y [Blueprints](https://render.com/docs/blueprint-spec).

Completa las variables de la tabla inicial. No subas `.env` a Render como parte del repositorio. Atlas almacena los datos; el servicio no depende del disco de Render.

Después del primer despliegue, confirma **Live** y abre la URL HTTPS asignada en Render, seguida de `/health`. El nombre solicitado está en la configuración; la URL real depende de la disponibilidad del subdominio.

### Administrador inicial

Si restauraste un ADMIN del laboratorio 07, inicia sesión con esa cuenta y mantén `SEED_ADMIN=false`. Si necesitas crear uno nuevo, configura en Environment `SEED_ADMIN=true`, un email nuevo y una contraseña privada que cumpla la política. Tras un arranque correcto, vuelve a `SEED_ADMIN=false` y retira `ADMIN_PASSWORD` y `ADMIN_EMAIL`. Esto no borra ni cambia la cuenta creada. No se debe usar una cuenta USER existente esperando que el seed cambie sus permisos.

## 4. Activar GitHub Actions

1. Render: **Settings > Deploy Hook**. Copia privadamente la URL completa.
2. GitHub: **Settings > Secrets and variables > Actions > New repository secret**.
3. Nombre exacto: `RENDER_DEPLOY_HOOK_URL`. Valor: el hook completo. No lo agregues a `.env.example` ni a `render.yaml`. [Secrets de GitHub](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets).

El workflow `.github/workflows/deploy-render.yml` prueba los pull requests a `main`. En un push a `main`, instala dependencias, revisa sintaxis y ejecuta pruebas contra un contenedor MongoDB de CI. Solo si pasan solicita el despliegue del SHA probado usando el hook con `ref`. También permite ejecución manual desde Actions en `main`. Los pull requests no ejecutan el job de despliegue y las pruebas no requieren secretos de Atlas.

Un HTTP 200/202 del hook indica que Render aceptó la solicitud, no que terminó el despliegue. Confirma **Live**, el commit y `/health` en Render. No se ejecutó el workflow remoto durante esta preparación. [Deploy hooks de Render](https://render.com/docs/deploy-hooks).

## 5. Probar en Postman

Importa `docs/postman/Lab08.postman_collection.json` y `docs/postman/Lab08.postman_environment.json`. Selecciona el entorno importado. Configura `baseUrl` con la URL HTTPS real, sin `/` final (local: `http://localhost:3000`).

Completa localmente `user_email`, `user_password`, `admin_email` y `admin_password`. Usa un email nuevo para el registro. Las contraseñas deben cumplir la política; las variables de contraseña y token están marcadas como secret en la plantilla. Evita compartir, sincronizar o exportar un entorno con valores reales. Los scripts guardan los tokens únicamente en el entorno seleccionado, por lo que debes mantenerlo privado.

Ejecuta las solicitudes numeradas en orden. El registro crea un usuario de prueba, y la edición modifica solo su perfil. Las pruebas de listado y login ADMIN requieren que ya exista ese administrador.

| Solicitud | Autorización | Resultado esperado |
| --- | --- | --- |
| `GET /health` | Ninguna | 200 y `ok: true` |
| `POST /api/auth/signUp` | Ninguna | 201, rol `user`, sin password en respuesta |
| Repetir registro | Ninguna | 400, email en uso |
| `POST /api/auth/signIn` | Credenciales USER en JSON | 200, token JWT |
| Login con password incorrecto | Ninguna | 401 |
| `GET /api/users/me` | Ninguna | 401 |
| `GET /api/users/me` | Bearer USER | 200, perfil propio |
| `PUT /api/users/me` | Bearer USER y JSON de perfil | 200, perfil actualizado |
| `GET /api/users` | Bearer USER | 403 |
| `POST /api/auth/signIn` | Credenciales ADMIN en JSON | 200, token JWT |
| `GET /api/users` | Bearer ADMIN | 200, lista sin passwords |
| `GET /api/users/:id` | Bearer ADMIN | 200 para ID existente; 404 para uno inexistente |
| `GET /api/users/me` | Bearer inválido, alterado o caducado | 401 |

Las rutas conservan la escritura del laboratorio 07: `signUp` y `signIn`. Para solicitudes manuales usa **Body > raw > JSON**, `Content-Type: application/json` y **Authorization > Bearer Token**.

Ejemplo de registro (configura las variables locales antes de enviarlo):

```json
{
  "email": "{{user_email}}",
  "password": "{{user_password}}",
  "name": "Prueba",
  "lastName": "Laboratorio",
  "phoneNumber": "999999999",
  "birthdate": "2000-01-01",
  "address": "Lima"
}
```

Para comprobar caducidad manualmente, espera el tiempo configurado sin renovar el token y repite una ruta protegida. Las pruebas automatizadas ya verifican la expiración sin esperar una hora.

## 6. Probar en el navegador

1. Abre `/`, `/signUp` y `/signIn`. Comprueba el diseño original y los recursos estáticos.
2. En una ventana privada, abre `/profile` o `/dashboard/user` sin sesión: el guard redirige a `/signIn`.
3. Registra una cuenta de prueba o usa una existente. Tras iniciar sesión como USER, abre `/dashboard/user` y consulta tus datos.
4. Abre `/profile`, edita un dato de la cuenta de prueba y confirma que persiste después de recargar.
5. Como USER, abre `/dashboard/admin`: el guard redirige a `/403`.
6. Cierra sesión, entra como ADMIN y abre `/dashboard/admin`. Comprueba el listado y el detalle de un usuario.
7. Cierra sesión y vuelve a una ruta privada: debe pedir login.

Las vistas siguen usando `sessionStorage` y `Auth.guard`, como en el laboratorio 07. El HTML de estas páginas es una plantilla pública; no contiene los datos privados. La API verifica en el servidor la firma/expiración JWT y el rol antes de entregar datos. Escribir la URL de la API en la barra del navegador no envía el Bearer token; para probar datos privados usa las páginas o Postman. Las pruebas HTTP verifican las plantillas y las pruebas de JavaScript simulan los guards; la revisión visual en navegador es manual.

## 7. Capturas para el informe

Oculta contraseñas, URI completas, tokens, hashes de contraseñas y URLs de deploy hook. Usa cuentas de prueba para evitar exponer datos personales.

1. Estructura final del repositorio con `render.yaml`, `.env.example`, workflow y pruebas.
2. Atlas: clúster disponible y base/colecciones `users` y `roles`; sin abrir los hashes de los documentos.
3. Atlas: configuración de acceso de red, sin credenciales.
4. GitHub: repositorio publicado y workflow presente, cuando autorices publicarlo.
5. GitHub: nombre del secret `RENDER_DEPLOY_HOOK_URL`, sin mostrar el valor.
6. Render: servicio `express-auth-Jimenez`, comandos de build/start y URL pública.
7. Render: nombres de variables con valores sensibles ocultos.
8. Render: despliegue **Live**, SHA y logs de arranque sin secretos.
9. Actions: ejecución verde con jobs `test` y `deploy` completados.
10. Navegador o Postman: `/health` con 200 y `ok: true` desde la URL de producción.
11. Postman: registro 201 y login 200; cubre el token y cualquier contraseña.
12. Postman: perfil 200, ausencia de token 401 y USER intentando listar usuarios con 403.
13. Postman: ADMIN consultando listado con 200, usando datos ficticios y ocultando el Bearer token.
14. Navegador: dashboard USER, perfil editado, dashboard ADMIN y página 403.
15. Terminal: resultado de `npm run check`, `npm test` y `npm audit --omit=dev`.

## 8. Diagnóstico

| Síntoma | Revisión |
| --- | --- |
| Arranque falla antes de conectar | Configurar `MONGO_URI` con base explícita, `JWT_SECRET`, puerto y duración válidos |
| MongoDB no conecta | Usuario DB, contraseña codificada, clúster activo y rangos/IP permitidos en Atlas |
| Error preparando índices | Revisar duplicados/índices en una copia; el proyecto no elimina datos ni índices para resolverlo |
| Render no detecta el puerto | `npm start`, puerto asignado y log de escucha; se enlaza a `0.0.0.0` |
| Login de usuario local falla en Atlas | Los datos todavía no fueron migrados, o se seleccionó otra base |
| ADMIN no se crea | `SEED_ADMIN=true`, credenciales válidas y email nuevo; no hay elevación de usuarios existentes |
| Actions indica secret ausente | Crear el secret exacto en GitHub Actions, no en variables comunes |
| Hook devuelve 401/404 | Revisar hook vigente, servicio enlazado al repositorio y SHA publicado |
| Actions verde pero servicio falla | El hook solo inicia el despliegue: revisar estado y logs en Render |
| `npm test` no inicia MongoDB | Instalar `mongod` o configurar `MONGOD_BINARY`; no usar la base real para pruebas |

## Pendientes manuales

Configurar Atlas y secretos, migrar datos si se desea, autorizar commit/push, crear el servicio Render cuando autorices desplegar, guardar el hook en GitHub y ejecutar las verificaciones de producción. La preparación local no acredita un despliegue remoto exitoso.

## Verificación local realizada

El 10 de octubre de 2026, con Node.js 22.20.0 y MongoDB 8.0.13 temporal:

- `npm run check`: correcto.
- `npm test`: 36 pruebas aprobadas, 0 fallos y 0 omitidas.
- `npm audit --omit=dev --audit-level=high`: 0 vulnerabilidades.
- `npm audit --audit-level=high`: 0 vulnerabilidades en el conjunto completo.
- Verificación de `.gitignore`: `.env`, variantes privadas, caché y respaldos ignorados; `.env` no está rastreado por Git.
- Las vistas y los recursos originales de `public` no se modificaron.

Las pruebas cubrieron registro, login, bcrypt, JWT válidos/alterados/expirados, 401/403, USER/ADMIN, consulta y edición del perfil, cambio de contraseña, plantillas EJS, guards simulados y reinicios sin modificar usuarios preexistentes en la base de prueba. No se probó la conexión real a Atlas, no se ejecutó el workflow remoto y no se realizó revisión visual en un navegador real.

## Inventario de archivos

| Estado | Archivos |
| --- | --- |
| Modificados: entorno | `.env.example`, `.gitignore` |
| Modificados: dependencias y comandos | `package.json`, `package-lock.json` |
| Modificados: arranque | `src/server.js` |
| Modificados: autenticación y permisos | `src/controllers/AuthController.js`, `src/services/AuthService.js`, `src/middlewares/authenticate.js` |
| Modificados: inicialización de datos | `src/repositories/RoleRepository.js`, `src/utils/seedRoles.js`, `src/utils/seedUsers.js` |
| Nuevos: aplicación y configuración | `src/app.js`, `src/config/env.js`, `render.yaml`, `.github/workflows/deploy-render.yml` |
| Nuevos: verificaciones | `scripts/check-syntax.js`, `test/config.test.js`, `test/api.test.js`, `test/web-auth.test.js`, `test/helpers/runtime.js` |
| Nuevos: documentación publicable | `docs/LAB08-TAREA2.md`, `docs/postman/Lab08.postman_collection.json`, `docs/postman/Lab08.postman_environment.json` |
| Documentación únicamente local, ignorada por Git | `README.md` |
