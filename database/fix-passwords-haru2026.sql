-- Restablece contraseña de superadmins a haru2026 (hash bcrypt verificado).
-- Ejecutar en phpMyAdmin sobre la BD ya importada si el login da 401.

UPDATE usuarios
SET password_hash = '$2b$10$p5bxr.sDU5uklQQ8BGYXzultTmL4sCHZfzv3Q2OKUJtqRV674D1uC',
    updated_at = NOW()
WHERE rol_id = 1 AND deleted_at IS NULL;
