-- Quitar referencias a POS / punto de venta en textos de catálogo (BD existente)
UPDATE roles
SET descripcion = 'Operador de caja y ventas'
WHERE nombre = 'CAJERO'
  AND (descripcion IS NULL OR descripcion LIKE '%punto de venta%' OR descripcion LIKE '%POS%');

UPDATE planes
SET descripcion = REPLACE(descripcion, 'POS - ', 'Ventas - ')
WHERE descripcion LIKE 'POS - %';
