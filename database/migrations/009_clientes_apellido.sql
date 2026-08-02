-- Apellido opcional en clientes (venta POS)
USE haru_db;

ALTER TABLE clientes
  ADD COLUMN apellido VARCHAR(150) NULL AFTER nombre;
