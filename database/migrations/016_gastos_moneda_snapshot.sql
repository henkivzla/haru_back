-- Gastos con moneda de ingreso + equivalentes congelados al registrar
USE haru_db;

ALTER TABLE gastos_administrativos
  ADD COLUMN IF NOT EXISTS moneda_entrada ENUM('USD','VES','EUR') NOT NULL DEFAULT 'USD' AFTER monto_usd,
  ADD COLUMN IF NOT EXISTS monto_entrada DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER moneda_entrada,
  ADD COLUMN IF NOT EXISTS tasa_bcv_snapshot DECIMAL(12,4) NULL AFTER monto_entrada,
  ADD COLUMN IF NOT EXISTS tasa_eur_snapshot DECIMAL(12,4) NULL AFTER tasa_bcv_snapshot,
  ADD COLUMN IF NOT EXISTS monto_bs_snapshot DECIMAL(12,2) NULL AFTER tasa_eur_snapshot,
  ADD COLUMN IF NOT EXISTS monto_eur_snapshot DECIMAL(12,2) NULL AFTER monto_bs_snapshot;

UPDATE gastos_administrativos SET
  moneda_entrada = 'USD',
  monto_entrada = monto_usd
WHERE monto_entrada = 0 AND monto_usd > 0;
