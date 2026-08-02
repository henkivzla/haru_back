-- Repara usuarios cuyo tienda_id no existe en tiendas (causa error al reportar pago)
-- Ejecutar en phpMyAdmin sobre lilit_db. Revisa el SELECT antes del INSERT.

USE lilit_db;

-- 1) Ver usuarios huérfanos (tienen tienda_id pero la tienda no existe)
SELECT u.id, u.nombre, u.email, u.tienda_id
FROM usuarios u
LEFT JOIN tiendas t ON t.id = u.tienda_id AND t.deleted_at IS NULL
WHERE u.tienda_id IS NOT NULL
  AND u.deleted_at IS NULL
  AND t.id IS NULL;

-- 2) Para cada fila huérfana: crear tienda y suscripción de prueba
-- Sustituye @user_id y @nombre_comercio según tu caso (ejemplo genérico):

-- SET @user_id = 5;
-- SET @email = 'tu@correo.com';
-- INSERT INTO tiendas (nombre, rif, telefono, activo)
-- VALUES ('Mi Comercio', NULL, NULL, 1);
-- SET @tienda_id = LAST_INSERT_ID();
-- UPDATE usuarios SET tienda_id = @tienda_id WHERE id = @user_id;
-- INSERT INTO suscripciones (tienda_id, plan_id, ciclo, estado, fecha_inicio, proximo_pago)
-- VALUES (@tienda_id, 1, 'MENSUAL', 'PRUEBA', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 14 DAY));
