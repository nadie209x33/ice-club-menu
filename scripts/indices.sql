-- Índices de las tablas de la carta. La exportación por tablas de D1 no los incluye,
-- por lo que se añaden al final de cada copia de la carta para que la restauración
-- quede completa. Deben coincidir con los de migrations/0001_esquema.sql.
CREATE INDEX IF NOT EXISTS idx_flavors_today ON flavors (is_today, today_order);
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category_id, sort_order);
