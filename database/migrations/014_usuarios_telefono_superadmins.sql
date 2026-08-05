-- Añade teléfono a usuarios y deja solo los 3 super administradores de producción.
-- Ejecutar sobre haru_db existente sin reimportar schema.sql completo.
-- Contraseña inicial: haru2026

USE haru_db;

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS telefono VARCHAR(30) NULL AFTER email;

-- Limpia datos demo (respeta FK: orden de borrado)
DELETE FROM venta_detalle;
DELETE FROM ventas;
DELETE FROM movimientos_caja;
DELETE FROM cierres_caja;
DELETE FROM cuentas_pagar;
DELETE FROM productos;
DELETE FROM proveedores;
DELETE FROM categorias_producto;
DELETE FROM suscripciones;
DELETE FROM tiendas;
DELETE FROM usuarios WHERE rol_id != 1 OR email NOT IN (
  'gomezeiborth@gmail.com',
  'carlaborgesce@gmail.com',
  'haru@henki.com.ve'
);

INSERT INTO usuarios (id, tienda_id, rol_id, nombre, email, telefono, password_hash, estado) VALUES
  (1, NULL, 1, 'Eiborth Gómez', 'gomezeiborth@gmail.com', '4129852460', '$2b$10$p5bxr.sDU5uklQQ8BGYXzultTmL4sCHZfzv3Q2OKUJtqRV674D1uC', 'ACTIVO'),
  (2, NULL, 1, 'Carla Borges', 'carlaborgesce@gmail.com', '4128066714', '$2b$10$p5bxr.sDU5uklQQ8BGYXzultTmL4sCHZfzv3Q2OKUJtqRV674D1uC', 'ACTIVO'),
  (3, NULL, 1, 'Haru Henki', 'haru@henki.com.ve', '04228180393', '$2b$10$p5bxr.sDU5uklQQ8BGYXzultTmL4sCHZfzv3Q2OKUJtqRV674D1uC', 'ACTIVO')
ON DUPLICATE KEY UPDATE
  tienda_id = VALUES(tienda_id),
  rol_id = VALUES(rol_id),
  nombre = VALUES(nombre),
  telefono = VALUES(telefono),
  password_hash = VALUES(password_hash),
  activo = 1,
  estado = 'ACTIVO',
  deleted_at = NULL;

INSERT IGNORE INTO tasas_bcv (tasa, fuente) VALUES
  (746.6300, 'bcv.org.ve');
