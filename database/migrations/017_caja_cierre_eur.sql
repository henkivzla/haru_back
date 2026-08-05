-- Caja: EUR en apertura + snapshot de cierre del día (solo lectura después)
USE haru_db;

ALTER TABLE cajas
  ADD COLUMN IF NOT EXISTS monto_apertura_eur DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER monto_apertura_bs,
  ADD COLUMN IF NOT EXISTS desglose_eur JSON NULL AFTER desglose_bs,
  ADD COLUMN IF NOT EXISTS tasa_eur_apertura DECIMAL(12,4) NULL AFTER tasa_bcv_apertura,
  ADD COLUMN IF NOT EXISTS monto_cierre_usd DECIMAL(12,2) NULL AFTER monto_pos,
  ADD COLUMN IF NOT EXISTS monto_cierre_bs DECIMAL(12,2) NULL AFTER monto_cierre_usd,
  ADD COLUMN IF NOT EXISTS monto_cierre_eur DECIMAL(12,2) NULL AFTER monto_cierre_bs,
  ADD COLUMN IF NOT EXISTS desglose_cierre_usd JSON NULL AFTER monto_cierre_eur,
  ADD COLUMN IF NOT EXISTS desglose_cierre_bs JSON NULL AFTER desglose_cierre_usd,
  ADD COLUMN IF NOT EXISTS desglose_cierre_eur JSON NULL AFTER desglose_cierre_bs,
  ADD COLUMN IF NOT EXISTS ventas_total_usd DECIMAL(12,2) NULL AFTER desglose_cierre_eur,
  ADD COLUMN IF NOT EXISTS ventas_total_bs DECIMAL(12,2) NULL AFTER ventas_total_usd,
  ADD COLUMN IF NOT EXISTS ventas_total_eur DECIMAL(12,2) NULL AFTER ventas_total_bs,
  ADD COLUMN IF NOT EXISTS ventas_cantidad INT UNSIGNED NULL DEFAULT 0 AFTER ventas_total_eur,
  ADD COLUMN IF NOT EXISTS tasa_bcv_cierre DECIMAL(12,4) NULL AFTER ventas_cantidad,
  ADD COLUMN IF NOT EXISTS tasa_eur_cierre DECIMAL(12,4) NULL AFTER tasa_bcv_cierre,
  ADD COLUMN IF NOT EXISTS cerrado_por_id INT UNSIGNED NULL AFTER tasa_eur_cierre,
  ADD COLUMN IF NOT EXISTS notas_cierre TEXT NULL AFTER cerrado_por_id;

ALTER TABLE cajas
  ADD INDEX IF NOT EXISTS idx_tienda_cerrada (tienda_id, cerrada_at);
