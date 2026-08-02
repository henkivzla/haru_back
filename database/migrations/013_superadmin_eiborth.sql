-- SUPERADMIN de producción: Eiborth Gómez (gomezeiborth@gmail.com)
-- Ejecutar sobre haru_db existente sin reimportar schema.sql completo.
-- Contraseña inicial: haru2026 (cámbiala tras el primer login).

USE haru_db;

UPDATE usuarios
SET nombre = 'Eiborth Gómez',
    email = 'gomezeiborth@gmail.com',
    rol_id = 1,
    tienda_id = NULL,
    activo = 1,
    estado = 'ACTIVO',
    deleted_at = NULL
WHERE id = 1;

-- Si el id 1 no era superadmin, inserta uno nuevo (solo si no existe el correo):
-- INSERT INTO usuarios (tienda_id, rol_id, nombre, email, password_hash, estado)
-- SELECT NULL, 1, 'Eiborth Gómez', 'gomezeiborth@gmail.com',
--        '$2b$10$p5bxr.sDU5uklQQ8BGYXzultTmL4sCHZfzv3Q2OKUJtqRV674D1uC', 'ACTIVO'
-- WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE email = 'gomezeiborth@gmail.com');
