-- Esquema de la base de datos del menú de Ice Club La Decanatura.

-- Usuarios del panel. La contraseña se guarda como hash PBKDF2 con sal, nunca en texto plano.
CREATE TABLE admins (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  salt          TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Catálogo completo de sabores. is_today marca los sabores del día y today_order su posición.
CREATE TABLE flavors (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category    TEXT NOT NULL CHECK (category IN ('granizado', 'cremoso', 'artesanal')),
  image_key   TEXT,
  is_today    INTEGER NOT NULL DEFAULT 0 CHECK (is_today IN (0, 1)),
  today_order INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Secciones de la carta de precios. color es el nombre del color neón de la sección.
CREATE TABLE categories (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  color      TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Productos de cada sección. El precio se guarda en pesos como número entero.
CREATE TABLE products (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL REFERENCES categories (id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  price       INTEGER NOT NULL CHECK (price >= 0),
  description TEXT NOT NULL DEFAULT '',
  image_key   TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Índices para las dos consultas del menú público.
CREATE INDEX idx_flavors_today ON flavors (is_today, today_order);
CREATE INDEX idx_products_category ON products (category_id, sort_order);
