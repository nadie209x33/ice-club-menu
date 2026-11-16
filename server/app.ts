import { Hono } from 'hono';
import type { Context, Next } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { sign, verify } from 'hono/jwt';
import { secureHeaders } from 'hono/secure-headers';
import type { D1Database, R2Bucket } from '@cloudflare/workers-types';
import { generateSalt, hashPassword, timingSafeEqual } from './auth';

// Recursos que Cloudflare entrega a la API: base de datos, almacén de fotos y secreto de sesión.
export type Bindings = {
  DB: D1Database;
  BUCKET: R2Bucket;
  JWT_SECRET: string;
};

// Datos que el middleware de sesión deja disponibles para las rutas protegidas.
type Variables = {
  username: string;
};

type AppContext = Context<{ Bindings: Bindings; Variables: Variables }>;

const SESSION_COOKIE = 'ice_session';
const SESSION_SECONDS = 12 * 60 * 60;

// Límites del login: evitan que una entrada enorme obligue a calcular un hash costoso.
const MAX_USERNAME_LENGTH = 64;
const MAX_PASSWORD_LENGTH = 256;

// Mensaje cuando el secreto de sesión no está configurado. Solo afecta a las rutas
// que usan la sesión; el menú público sigue funcionando sin él.
const MISSING_SECRET = 'Falta configurar JWT_SECRET en el servidor';

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>().basePath('/api');

// Opciones comunes de la cookie de sesión: invisible para JavaScript, solo por HTTPS
// (los navegadores la aceptan también en localhost) y nunca enviada desde otros sitios.
const cookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'Strict',
  path: '/',
} as const;

// Middleware de sesión: exige una cookie con un JWT válido y vigente; si no, responde 401.
async function requireAuth(c: AppContext, next: Next) {
  if (!c.env.JWT_SECRET) return c.json({ error: MISSING_SECRET }, 500);
  const token = getCookie(c, SESSION_COOKIE);
  if (!token) return c.json({ error: 'Sesión no iniciada' }, 401);
  try {
    const payload = await verify(token, c.env.JWT_SECRET, 'HS256');
    if (typeof payload.sub !== 'string') throw new Error('Token sin usuario');
    c.set('username', payload.sub);
  } catch {
    return c.json({ error: 'Sesión no válida o vencida' }, 401);
  }
  // La sesión deja de valer si el administrador ya no existe en la base de datos.
  const admin = await c.env.DB.prepare('SELECT 1 FROM admins WHERE username = ?')
    .bind(c.get('username'))
    .first();
  if (!admin) return c.json({ error: 'Sesión no válida o vencida' }, 401);
  await next();
}

// Cabeceras de seguridad en todas las respuestas de la API: impiden que el navegador
// reinterprete el tipo de un archivo y que las respuestas se incrusten en otros sitios.
app.use('*', secureHeaders());

// Las respuestas JSON no se guardan en caché, para que el menú y el panel muestren
// siempre los datos actuales. Las imágenes fijan su propia caché.
app.use('*', async (c, next) => {
  await next();
  if (!c.req.path.startsWith('/api/images/')) c.header('Cache-Control', 'no-store');
});

app.use('/auth/me', requireAuth);
app.use('/admin/*', requireAuth);

// Ruta de comprobación: confirma que la API responde.
app.get('/health', (c) => c.json({ ok: true }));

// Inicio de sesión: valida usuario y contraseña y entrega la cookie de sesión.
app.post('/auth/login', async (c) => {
  if (!c.env.JWT_SECRET) return c.json({ error: MISSING_SECRET }, 500);
  const body = await c.req.json<{ username?: unknown; password?: unknown }>().catch(() => null);
  const username = typeof body?.username === 'string' ? body.username.trim() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!username || !password) {
    return c.json({ error: 'Usuario y contraseña son obligatorios' }, 400);
  }
  if (username.length > MAX_USERNAME_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    return c.json({ error: 'Usuario o contraseña incorrectos' }, 401);
  }

  const admin = await c.env.DB.prepare(
    'SELECT username, password_hash, salt FROM admins WHERE username = ?',
  )
    .bind(username)
    .first<{ username: string; password_hash: string; salt: string }>();

  // Si el usuario no existe se calcula igualmente un hash, para que la respuesta
  // tarde lo mismo y no revele qué usuarios existen.
  const hash = await hashPassword(password, admin?.salt ?? generateSalt());
  if (!admin || !timingSafeEqual(hash, admin.password_hash)) {
    return c.json({ error: 'Usuario o contraseña incorrectos' }, 401);
  }

  const now = Math.floor(Date.now() / 1000);
  const token = await sign(
    { sub: admin.username, iat: now, exp: now + SESSION_SECONDS },
    c.env.JWT_SECRET,
    'HS256',
  );
  setCookie(c, SESSION_COOKIE, token, { ...cookieOptions, maxAge: SESSION_SECONDS });
  return c.json({ username: admin.username });
});

// Cierre de sesión: borra la cookie.
app.post('/auth/logout', (c) => {
  deleteCookie(c, SESSION_COOKIE, cookieOptions);
  return c.json({ ok: true });
});

// Devuelve el usuario de la sesión actual.
app.get('/auth/me', (c) => c.json({ username: c.get('username') }));

// ---------------------------------------------------------------------------
// Utilidades de validación
// ---------------------------------------------------------------------------

const FLAVOR_CATEGORIES = ['granizado', 'cremoso', 'artesanal'];
const IMAGE_KINDS = ['flavors', 'products'];
const MAX_TODAY = 5;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_PRICE = 10_000_000;

type FlavorRow = {
  id: number;
  name: string;
  description: string;
  category: string;
  image_key: string | null;
  is_today: number;
  today_order: number;
};

type CategoryRow = { id: number; name: string; color: string; sort_order: number };

type ProductRow = {
  id: number;
  category_id: number;
  label: string;
  price: number;
  description: string;
  image_key: string | null;
  sort_order: number;
};

// Error de validación: su mensaje se devuelve al cliente con estado 400.
class ValidationError extends Error {}

// Lee el cuerpo JSON de la petición; exige que sea un objeto.
async function readJson(c: AppContext): Promise<Record<string, unknown>> {
  const body: unknown = await c.req.json().catch(() => null);
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new ValidationError('El cuerpo de la petición debe ser un objeto JSON');
  }
  return body as Record<string, unknown>;
}

// Valida un texto: tipo, recorte de espacios y longitud mínima y máxima.
function readText(value: unknown, field: string, min: number, max: number): string {
  if (typeof value !== 'string') {
    if (value === undefined && min === 0) return '';
    throw new ValidationError(`El campo "${field}" debe ser un texto`);
  }
  const text = value.trim();
  if (text.length < min) throw new ValidationError(`El campo "${field}" es obligatorio`);
  if (text.length > max) {
    throw new ValidationError(`El campo "${field}" admite máximo ${max} caracteres`);
  }
  return text;
}

// Valida un entero dentro de un rango.
function readInt(value: unknown, field: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    throw new ValidationError(`El campo "${field}" debe ser un número entero entre ${min} y ${max}`);
  }
  return value;
}

// Valida el identificador numérico que llega en la URL.
function readId(value: string): number {
  if (!/^[1-9]\d{0,9}$/.test(value)) throw new ValidationError('Identificador no válido');
  return Number(value);
}

// Valida los campos de un sabor.
function readFlavor(body: Record<string, unknown>) {
  const category = readText(body.category, 'category', 1, 20);
  if (!FLAVOR_CATEGORIES.includes(category)) {
    throw new ValidationError('La categoría debe ser granizado, cremoso o artesanal');
  }
  return {
    name: readText(body.name, 'name', 1, 60),
    description: readText(body.description, 'description', 0, 200),
    category,
  };
}

// Valida los campos de un producto.
function readProduct(body: Record<string, unknown>) {
  return {
    category_id: readInt(body.category_id, 'category_id', 1, 2_000_000_000),
    label: readText(body.label, 'label', 1, 40),
    price: readInt(body.price, 'price', 0, MAX_PRICE),
    description: readText(body.description, 'description', 0, 200),
  };
}

// Convierte la clave guardada en la base en la dirección pública de la imagen.
function imageUrl(key: string | null): string | null {
  return key ? `/api/images/${key}` : null;
}

// Reconoce el formato de una imagen por sus primeros bytes; devuelve null si no es JPEG, PNG ni WebP.
function detectImage(bytes: Uint8Array): { ext: string; mime: string } | null {
  const starts = (signature: number[], offset = 0) =>
    signature.every((byte, i) => bytes[offset + i] === byte);
  if (starts([0xff, 0xd8, 0xff])) return { ext: 'jpg', mime: 'image/jpeg' };
  if (starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { ext: 'png', mime: 'image/png' };
  if (starts([0x52, 0x49, 0x46, 0x46]) && starts([0x57, 0x45, 0x42, 0x50], 8)) {
    return { ext: 'webp', mime: 'image/webp' };
  }
  return null;
}

// Da a un sabor la forma que recibe el cliente.
function toFlavor(row: FlavorRow) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    image_url: imageUrl(row.image_key),
    is_today: row.is_today === 1,
    today_order: row.today_order,
  };
}

// Da a un producto la forma que recibe el cliente.
function toProduct(row: ProductRow) {
  return {
    id: row.id,
    category_id: row.category_id,
    label: row.label,
    price: row.price,
    description: row.description,
    image_url: imageUrl(row.image_key),
  };
}

// Consulta la carta completa: secciones en orden, cada una con sus productos.
async function loadCarta(db: D1Database) {
  const [categories, products] = await Promise.all([
    db.prepare('SELECT id, name, color, sort_order FROM categories ORDER BY sort_order, id').all<CategoryRow>(),
    db.prepare('SELECT * FROM products ORDER BY category_id, sort_order, id').all<ProductRow>(),
  ]);
  return categories.results.map((category) => ({
    id: category.id,
    name: category.name,
    color: category.color,
    products: products.results.filter((p) => p.category_id === category.id).map(toProduct),
  }));
}

// ---------------------------------------------------------------------------
// Rutas públicas
// ---------------------------------------------------------------------------

// Menú público: solo los sabores del día, en orden, y la carta agrupada por sección.
app.get('/menu', async (c) => {
  const flavors = await c.env.DB.prepare(
    'SELECT * FROM flavors WHERE is_today = 1 ORDER BY today_order, id LIMIT ?',
  )
    .bind(MAX_TODAY)
    .all<FlavorRow>();
  return c.json({
    flavors: flavors.results.map((row) => {
      const { id, name, description, category, image_url } = toFlavor(row);
      return { id, name, description, category, image_url };
    }),
    categories: await loadCarta(c.env.DB),
  });
});

// Sirve una imagen desde R2. Cada subida genera una clave nueva, por lo que
// el navegador puede guardarla en caché de forma indefinida.
app.get('/images/:folder/:file', async (c) => {
  const { folder, file } = c.req.param();
  if (!IMAGE_KINDS.includes(folder) || !/^[\w-]+\.(jpg|png|webp)$/.test(file)) {
    return c.json({ error: 'Imagen no encontrada' }, 404);
  }
  const object = await c.env.BUCKET.get(`${folder}/${file}`);
  if (!object) return c.json({ error: 'Imagen no encontrada' }, 404);
  return c.body(await object.arrayBuffer(), 200, {
    'Content-Type': object.httpMetadata?.contentType ?? 'application/octet-stream',
    'Cache-Control': 'public, max-age=31536000, immutable',
    ETag: object.httpEtag,
  });
});

// ---------------------------------------------------------------------------
// Rutas de administración (protegidas por requireAuth)
// ---------------------------------------------------------------------------

// Lista el catálogo completo de sabores.
app.get('/admin/flavors', async (c) => {
  const rows = await c.env.DB.prepare('SELECT * FROM flavors ORDER BY name COLLATE NOCASE').all<FlavorRow>();
  return c.json({ flavors: rows.results.map(toFlavor) });
});

// Crea un sabor.
app.post('/admin/flavors', async (c) => {
  const data = readFlavor(await readJson(c));
  const row = await c.env.DB.prepare(
    'INSERT INTO flavors (name, description, category) VALUES (?, ?, ?) RETURNING *',
  )
    .bind(data.name, data.description, data.category)
    .first<FlavorRow>();
  return c.json({ flavor: toFlavor(row!) }, 201);
});

// Edita nombre, descripción y categoría de un sabor.
app.put('/admin/flavors/:id', async (c) => {
  const id = readId(c.req.param('id'));
  const data = readFlavor(await readJson(c));
  const row = await c.env.DB.prepare(
    "UPDATE flavors SET name = ?, description = ?, category = ?, updated_at = datetime('now') WHERE id = ? RETURNING *",
  )
    .bind(data.name, data.description, data.category, id)
    .first<FlavorRow>();
  if (!row) return c.json({ error: 'Sabor no encontrado' }, 404);
  return c.json({ flavor: toFlavor(row) });
});

// Elimina un sabor y, si tenía foto, también el archivo de R2.
app.delete('/admin/flavors/:id', async (c) => {
  const id = readId(c.req.param('id'));
  const row = await c.env.DB.prepare('DELETE FROM flavors WHERE id = ? RETURNING image_key')
    .bind(id)
    .first<{ image_key: string | null }>();
  if (!row) return c.json({ error: 'Sabor no encontrado' }, 404);
  if (row.image_key) await c.env.BUCKET.delete(row.image_key);
  return c.json({ ok: true });
});

// Define los sabores del día: máximo cinco, sin repetidos y en el orden recibido.
app.put('/admin/today', async (c) => {
  const body = await readJson(c);
  if (!Array.isArray(body.ids)) throw new ValidationError('El campo "ids" debe ser una lista');
  const ids = body.ids.map((value) => readInt(value, 'ids', 1, 2_000_000_000));
  if (ids.length > MAX_TODAY) {
    throw new ValidationError(`Se permiten máximo ${MAX_TODAY} sabores del día`);
  }
  if (new Set(ids).size !== ids.length) {
    throw new ValidationError('La lista de sabores del día tiene repetidos');
  }
  if (ids.length > 0) {
    const found = await c.env.DB.prepare(
      `SELECT COUNT(*) AS total FROM flavors WHERE id IN (${ids.map(() => '?').join(', ')})`,
    )
      .bind(...ids)
      .first<{ total: number }>();
    if (found?.total !== ids.length) throw new ValidationError('Alguno de los sabores no existe');
  }

  // Todas las sentencias se ejecutan como una sola transacción.
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE flavors SET is_today = 0, today_order = 0 WHERE is_today = 1'),
    ...ids.map((id, index) =>
      c.env.DB.prepare(
        "UPDATE flavors SET is_today = 1, today_order = ?, updated_at = datetime('now') WHERE id = ?",
      ).bind(index + 1, id),
    ),
  ]);
  return c.json({ ids });
});

// Lista la carta completa para el panel.
app.get('/admin/products', async (c) => c.json({ categories: await loadCarta(c.env.DB) }));

// Crea un producto al final de su sección.
app.post('/admin/products', async (c) => {
  const data = readProduct(await readJson(c));
  const category = await c.env.DB.prepare('SELECT id FROM categories WHERE id = ?')
    .bind(data.category_id)
    .first();
  if (!category) throw new ValidationError('La sección indicada no existe');
  const row = await c.env.DB.prepare(
    `INSERT INTO products (category_id, label, price, description, sort_order)
     VALUES (?, ?, ?, ?, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM products WHERE category_id = ?))
     RETURNING *`,
  )
    .bind(data.category_id, data.label, data.price, data.description, data.category_id)
    .first<ProductRow>();
  return c.json({ product: toProduct(row!) }, 201);
});

// Edita un producto.
app.put('/admin/products/:id', async (c) => {
  const id = readId(c.req.param('id'));
  const data = readProduct(await readJson(c));
  const category = await c.env.DB.prepare('SELECT id FROM categories WHERE id = ?')
    .bind(data.category_id)
    .first();
  if (!category) throw new ValidationError('La sección indicada no existe');
  const row = await c.env.DB.prepare(
    "UPDATE products SET category_id = ?, label = ?, price = ?, description = ?, updated_at = datetime('now') WHERE id = ? RETURNING *",
  )
    .bind(data.category_id, data.label, data.price, data.description, id)
    .first<ProductRow>();
  if (!row) return c.json({ error: 'Producto no encontrado' }, 404);
  return c.json({ product: toProduct(row) });
});

// Elimina un producto y, si tenía foto, también el archivo de R2.
app.delete('/admin/products/:id', async (c) => {
  const id = readId(c.req.param('id'));
  const row = await c.env.DB.prepare('DELETE FROM products WHERE id = ? RETURNING image_key')
    .bind(id)
    .first<{ image_key: string | null }>();
  if (!row) return c.json({ error: 'Producto no encontrado' }, 404);
  if (row.image_key) await c.env.BUCKET.delete(row.image_key);
  return c.json({ ok: true });
});

// Valida el tipo de la URL de imágenes y devuelve la tabla correspondiente.
function readImageTarget(c: AppContext) {
  const kind = c.req.param('kind') ?? '';
  if (!IMAGE_KINDS.includes(kind)) throw new ValidationError('Tipo de imagen no válido');
  return { kind, table: kind, id: readId(c.req.param('id') ?? '') };
}

// Sube la foto de un sabor o producto. El cuerpo de la petición es el archivo.
// Guarda el archivo en R2, la clave en la base y borra la foto anterior.
app.post('/admin/images/:kind/:id', async (c) => {
  const { kind, table, id } = readImageTarget(c);
  if (Number(c.req.header('Content-Length') ?? 0) > MAX_IMAGE_BYTES) {
    return c.json({ error: 'La imagen supera el tamaño máximo de 5 MB' }, 413);
  }
  const buffer = await c.req.arrayBuffer();
  if (buffer.byteLength > MAX_IMAGE_BYTES) {
    return c.json({ error: 'La imagen supera el tamaño máximo de 5 MB' }, 413);
  }
  const image = detectImage(new Uint8Array(buffer));
  if (!image) return c.json({ error: 'Solo se aceptan imágenes JPEG, PNG o WebP' }, 415);

  const current = await c.env.DB.prepare(`SELECT image_key FROM ${table} WHERE id = ?`)
    .bind(id)
    .first<{ image_key: string | null }>();
  if (!current) return c.json({ error: 'Elemento no encontrado' }, 404);

  const key = `${kind}/${id}-${generateSalt().slice(0, 12)}.${image.ext}`;
  await c.env.BUCKET.put(key, buffer, { httpMetadata: { contentType: image.mime } });
  await c.env.DB.prepare(`UPDATE ${table} SET image_key = ?, updated_at = datetime('now') WHERE id = ?`)
    .bind(key, id)
    .run();
  if (current.image_key) await c.env.BUCKET.delete(current.image_key);
  return c.json({ image_url: imageUrl(key) }, 201);
});

// Quita la foto de un sabor o producto: borra el archivo de R2 y la clave de la base.
app.delete('/admin/images/:kind/:id', async (c) => {
  const { table, id } = readImageTarget(c);
  const current = await c.env.DB.prepare(`SELECT image_key FROM ${table} WHERE id = ?`)
    .bind(id)
    .first<{ image_key: string | null }>();
  if (!current) return c.json({ error: 'Elemento no encontrado' }, 404);
  if (current.image_key) {
    await c.env.BUCKET.delete(current.image_key);
    await c.env.DB.prepare(`UPDATE ${table} SET image_key = NULL, updated_at = datetime('now') WHERE id = ?`)
      .bind(id)
      .run();
  }
  return c.json({ ok: true });
});

// Respuesta para rutas inexistentes, con el formato de error de la API.
app.notFound((c) => c.json({ error: 'Ruta no encontrada' }, 404));

// Errores: los de validación devuelven su mensaje con estado 400;
// los no previstos, un mensaje genérico sin exponer detalles internos.
app.onError((error, c) => {
  if (error instanceof ValidationError) return c.json({ error: error.message }, 400);
  console.error(error);
  return c.json({ error: 'Error interno del servidor' }, 500);
});

export default app;
