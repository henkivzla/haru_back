-- Soft delete + estado de usuarios (ejecutar UNA vez sobre BD existente)
USE haru_db;

ALTER TABLE usuarios
  ADD COLUMN estado ENUM('ACTIVO','INACTIVO','BLOQUEADO') NOT NULL DEFAULT 'ACTIVO' AFTER activo,
  ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL AFTER updated_at;

UPDATE usuarios SET estado = IF(activo = 1, 'ACTIVO', 'INACTIVO');

ALTER TABLE tiendas ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE productos ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE clientes ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE proveedores ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE categorias_producto ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE suscripciones ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE reportes_pago ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE cuentas_pagar ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;

CREATE INDEX idx_usuarios_estado ON usuarios (estado, deleted_at);
