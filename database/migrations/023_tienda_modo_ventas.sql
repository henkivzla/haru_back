-- Modo de operación por comercio:
-- turno   = abrir/cerrar caja manual (default)
-- directo = ventas sin paso de caja (emprendedores)
ALTER TABLE tiendas
  ADD COLUMN modo_ventas ENUM('turno', 'directo') NOT NULL DEFAULT 'turno'
  AFTER accent_key;
