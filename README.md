# Menú digital de Ice Club La Decanatura

Menú interactivo para Ice Club La Decanatura, bar de granizados con licor en Bogotá ([@iceclubdeca](https://www.instagram.com/iceclubdeca/)).

- **Menú público (`/`)**: muestra los cinco sabores del día y la carta de precios. Está pensado para abrirse desde el celular.
- **Panel de administrador (`/admin`)**: con usuario y contraseña, permite elegir los sabores del día, editar el catálogo de sabores, gestionar las secciones y los productos de la carta (crear, editar, reordenar y eliminar), subir fotos y cambiar la contraseña.

## Tecnologías

| Parte | Tecnología |
|---|---|
| Interfaz | React, Vite, TypeScript |
| Estilos | Tailwind CSS 4 |
| Animaciones | Motion |
| Rutas | React Router |
| API | Hono sobre Cloudflare Pages Functions |
| Base de datos | Cloudflare D1 (SQLite), binding `DB` |
| Imágenes | Cloudflare R2, binding `BUCKET` |
| Sesión | JWT HS256 en la cookie `ice_session` (12 horas), secreto `JWT_SECRET` |

## Estructura

```
functions/api/[[route]].ts   Entrada de Pages Functions; delega en server/app.ts
server/app.ts                Rutas de la API
server/auth.ts               Hash de contraseñas y comparación en tiempo constante
migrations/                  Esquema y datos iniciales de la base de datos
scripts/create-admin.mjs     Genera admin.sql con el usuario administrador
src/pages/                   Menú público y panel
src/admin/                   Pestañas del panel y selector de fotos
src/components/              Fondo, logo, destellos, tarjetas y colores (theme.ts)
src/api.ts                   Cliente de la API y formato de precios
src/types.ts                 Tipos compartidos
public/                      Logo y favicon
wrangler.toml                Configuración de Pages, D1 y R2
```

## Instalación local

Requisitos: Node.js 22.12 o superior (el archivo `.nvmrc` fija la versión 24) y Git.

1. Instalar las dependencias:

   ```bash
   npm install
   ```

2. Crear el archivo de secretos locales a partir del ejemplo y cambiar el valor de `JWT_SECRET`:

   ```bash
   cp .dev.vars.example .dev.vars
   ```

3. Crear la base de datos local con sus datos iniciales:

   ```bash
   npm run db:local
   ```

4. Crear un administrador local. El script pide usuario y contraseña y genera `admin.sql`:

   ```bash
   npm run create-admin
   npx wrangler d1 execute ice-club-db --local --file=admin.sql
   ```

   Después de aplicarlo, `admin.sql` debe borrarse.

5. Compilar la interfaz e iniciar la API (puerto 8788) en una terminal:

   ```bash
   npm run build
   npm run dev:api
   ```

6. Iniciar la interfaz (puerto 5173) en otra terminal:

   ```bash
   npm run dev
   ```

El menú queda en `http://localhost:5173/` y el panel en `http://localhost:5173/admin`. Vite redirige las peticiones de `/api` al puerto 8788.

## Scripts

| Script | Función |
|---|---|
| `npm run dev` | Interfaz en modo desarrollo |
| `npm run dev:api` | API local con Wrangler |
| `npm run build` | Comprobación de tipos y compilación a `dist/` |
| `npm run preview` | Vista previa de la compilación |
| `npm run db:local` | Aplica las migraciones a la base local |
| `npm run db:remote` | Aplica las migraciones a la base de producción |
| `npm run create-admin` | Genera `admin.sql` con un administrador |

## API

Públicas:

- `GET /api/menu`: sabores del día, en orden, y carta agrupada por sección.
- `GET /api/images/:folder/:file`: imagen servida desde R2.
- `POST /api/auth/login`, `POST /api/auth/logout`.

Con sesión (responden 401 sin una cookie válida):

- `GET /api/auth/me`
- `GET|POST /api/admin/flavors`, `PUT|DELETE /api/admin/flavors/:id`
- `PUT /api/admin/today` con `{ "ids": [...] }`: máximo cinco, sin repetidos, en orden.
- `GET|POST /api/admin/products`, `PUT|DELETE /api/admin/products/:id`
- `POST /api/admin/categories`, `PUT|DELETE /api/admin/categories/:id`: secciones de la carta. Eliminar una sección elimina sus productos y sus fotos.
- `PUT /api/admin/order/categories` y `PUT /api/admin/order/products/:categoryId` con `{ "ids": [...] }`: orden de las secciones y de los productos de una sección. La lista debe contener exactamente los elementos existentes.
- `POST /api/admin/password` con `{ "current": "...", "next": "..." }`: cambia la contraseña y cierra las demás sesiones abiertas.
- `POST|DELETE /api/admin/images/:kind/:id` (`kind`: `flavors` o `products`). El cuerpo de la petición es el archivo; se aceptan JPEG, PNG y WebP de hasta 5 MB.

Los errores devuelven `{ "error": "mensaje en español" }`.

## Despliegue en Cloudflare Pages

1. Iniciar sesión en Cloudflare:

   ```bash
   npx wrangler login
   ```

2. Crear la base de datos y copiar el `database_id` que devuelve el comando en `wrangler.toml`:

   ```bash
   npx wrangler d1 create ice-club-db
   ```

3. Activar R2 en el panel de Cloudflare y crear el almacén de imágenes:

   ```bash
   npx wrangler r2 bucket create ice-club-images
   ```

4. Aplicar las migraciones a producción:

   ```bash
   npm run db:remote
   ```

5. Crear el administrador real y aplicarlo a producción. Después, borrar `admin.sql`:

   ```bash
   npm run create-admin
   npx wrangler d1 execute ice-club-db --remote --file=admin.sql
   ```

6. En el panel de Cloudflare, en **Workers & Pages → Create → Pages → Connect to Git**, conectar el repositorio con el comando de compilación `npm run build` y el directorio de salida `dist`.

7. Registrar el secreto de sesión con un valor aleatorio (por ejemplo, el resultado de `openssl rand -hex 32`):

   ```bash
   npx wrangler pages secret put JWT_SECRET --project-name ice-club-menu
   ```

8. Volver a desplegar y probar en la dirección `*.pages.dev`.

Pages toma los bindings `DB` y `BUCKET` de `wrangler.toml` porque el archivo define `pages_build_output_dir`; esa línea no debe quitarse.

## Seguridad

- Las contraseñas se guardan con hash PBKDF2-SHA256 de 100 000 iteraciones y sal aleatoria. `scripts/create-admin.mjs` y `server/auth.ts` usan los mismos parámetros.
- La cookie de sesión es `HttpOnly`, `Secure` y `SameSite=Strict`.
- El login se bloquea durante quince minutos tras cinco intentos fallidos desde una misma dirección IP (respuesta 429). Un inicio de sesión correcto reinicia la cuenta. Para levantar un bloqueo a mano: `npx wrangler d1 execute ice-club-db --remote --command "DELETE FROM login_attempts"`.
- La contraseña se cambia desde la pestaña **Cuenta** del panel. Si se olvida, se repite `npm run create-admin` con el mismo usuario y se aplica el `admin.sql` con `--remote`. En ambos casos se cierran las sesiones abiertas.
- La sesión deja de valer si el administrador se elimina de la base de datos o cambia su contraseña.
- `public/_headers` define las cabeceras de seguridad de los archivos estáticos, incluida la política de contenido (CSP); la API añade las suyas en `server/app.ts`. Si se incorpora un recurso externo nuevo (otra fuente, un script, un mapa), hay que autorizar su origen en la CSP.
- Las respuestas JSON de la API se envían con `Cache-Control: no-store`.
- `.dev.vars` y `admin.sql` están excluidos de Git y no deben subirse al repositorio.

## Funcionamiento

- El menú se actualiza solo: vuelve a consultar la API al regresar a la pestaña y cada cinco minutos.
- `public/robots.txt` y la cabecera `X-Robots-Tag` evitan que los buscadores listen el panel.
- Cada push y cada pull request ejecutan `npm run build` en GitHub Actions (`.github/workflows/ci.yml`).
