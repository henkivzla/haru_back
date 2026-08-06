-- Límite de productos activos por plan (NULL = ilimitado)

ALTER TABLE planes
  ADD COLUMN max_productos INT UNSIGNED NULL DEFAULT NULL
  COMMENT 'Productos activos permitidos; NULL = ilimitado'
  AFTER max_usuarios;

UPDATE planes SET max_productos = 75   WHERE slug = 'economico';
UPDATE planes SET max_productos = 300  WHERE slug = 'estandar';
UPDATE planes SET max_productos = NULL WHERE slug = 'pro';
