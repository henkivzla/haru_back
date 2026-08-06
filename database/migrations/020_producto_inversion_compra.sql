-- Inversión total del lote (lo que pagaste por el stock), separado del precio de venta c/u
USE haru_db;

ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS moneda_inversion ENUM('USD','VES','EUR') NULL AFTER precio_registrado_at,
  ADD COLUMN IF NOT EXISTS inversion_entrada DECIMAL(10,2) NULL AFTER moneda_inversion,
  ADD COLUMN IF NOT EXISTS inversion_usd DECIMAL(10,2) NULL AFTER inversion_entrada;
