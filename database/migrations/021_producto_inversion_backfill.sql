-- Productos creados antes del campo inversión: el precio guardado era el costo del lote.
UPDATE productos
SET
  moneda_inversion = COALESCE(moneda_inversion, moneda_entrada, 'USD'),
  inversion_entrada = precio_entrada,
  inversion_usd = precio_usd
WHERE inversion_usd IS NULL
  AND precio_entrada IS NOT NULL
  AND precio_entrada > 0
  AND deleted_at IS NULL;
