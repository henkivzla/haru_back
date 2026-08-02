-- Imagen de producto (URL/ruta en disco, no binario en BD)
ALTER TABLE productos
  ADD COLUMN imagen_url VARCHAR(500) NULL DEFAULT NULL AFTER descripcion;
