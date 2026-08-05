-- Haru POS — seed mínimo: solo 3 super administradores + tasa BCV
-- Importar en phpMyAdmin sobre haru_db vacía, o después de schema.sql (INSERT IGNORE).
-- Contraseña inicial de todos: haru2026

USE haru_db;

INSERT IGNORE INTO usuarios (id, tienda_id, rol_id, nombre, email, telefono, password_hash, estado) VALUES
  (1, NULL, 1, 'Eiborth Gómez', 'gomezeiborth@gmail.com', '4129852460', '$2b$10$p5bxr.sDU5uklQQ8BGYXzultTmL4sCHZfzv3Q2OKUJtqRV674D1uC', 'ACTIVO'),
  (2, NULL, 1, 'Carla Borges', 'carlaborgesce@gmail.com', '4128066714', '$2b$10$p5bxr.sDU5uklQQ8BGYXzultTmL4sCHZfzv3Q2OKUJtqRV674D1uC', 'ACTIVO'),
  (3, NULL, 1, 'Haru Henki', 'haru@henki.com.ve', '04228180393', '$2b$10$p5bxr.sDU5uklQQ8BGYXzultTmL4sCHZfzv3Q2OKUJtqRV674D1uC', 'ACTIVO');

INSERT IGNORE INTO tasas_bcv (tasa, fuente) VALUES
  (746.6300, 'bcv.org.ve');
