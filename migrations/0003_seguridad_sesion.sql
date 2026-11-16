-- Seguridad del inicio de sesión.

-- Intentos fallidos de login por dirección IP. window_start es el momento del primer
-- fallo del periodo, en segundos desde 1970. Un login correcto borra la fila.
CREATE TABLE login_attempts (
  ip           TEXT PRIMARY KEY,
  failures     INTEGER NOT NULL DEFAULT 0,
  window_start INTEGER NOT NULL
);

-- Versión de sesión de cada administrador. Aumenta al cambiar la contraseña,
-- lo que invalida las sesiones abiertas con la contraseña anterior.
ALTER TABLE admins ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0;
