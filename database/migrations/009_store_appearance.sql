-- Migración v2.5: apariencia por tienda (admin) y superadmin (usuario)
-- Ejecutar solo si ya tienes la BD v2.4 y no quieres reimportar schema.sql completo

USE haru_db;

ALTER TABLE tiendas
  ADD COLUMN IF NOT EXISTS theme_mode ENUM('light','dark') NOT NULL DEFAULT 'dark' AFTER telefono,
  ADD COLUMN IF NOT EXISTS accent_key VARCHAR(20) NOT NULL DEFAULT 'blue' AFTER theme_mode;

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS theme_mode ENUM('light','dark') NULL DEFAULT NULL AFTER password_hash,
  ADD COLUMN IF NOT EXISTS accent_key VARCHAR(20) NULL DEFAULT NULL AFTER theme_mode;
