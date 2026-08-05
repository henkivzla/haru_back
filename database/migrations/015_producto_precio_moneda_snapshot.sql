-- Precio con moneda de ingreso + equivalentes congelados al guardar (USD, Bs, EUR)
USE haru_db;

ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS moneda_entrada ENUM('USD','VES','EUR') NOT NULL DEFAULT 'USD' AFTER precio_usd,
  ADD COLUMN IF NOT EXISTS precio_entrada DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER moneda_entrada,
  ADD COLUMN IF NOT EXISTS tasa_bcv_snapshot DECIMAL(12,4) NULL AFTER precio_entrada,
  ADD COLUMN IF NOT EXISTS tasa_eur_snapshot DECIMAL(12,4) NULL AFTER tasa_bcv_snapshot,
  ADD COLUMN IF NOT EXISTS precio_bs_snapshot DECIMAL(12,2) NULL AFTER tasa_eur_snapshot,
  ADD COLUMN IF NOT EXISTS precio_eur_snapshot DECIMAL(12,2) NULL AFTER precio_bs_snapshot,
  ADD COLUMN IF NOT EXISTS precio_registrado_at TIMESTAMP NULL DEFAULT NULL AFTER precio_eur_snapshot;

UPDATE productos SET
  moneda_entrada = 'USD',
  precio_entrada = precio_usd
WHERE precio_entrada = 0 AND precio_usd > 0;
