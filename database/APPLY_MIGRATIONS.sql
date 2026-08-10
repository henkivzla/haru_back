-- =============================================================================
-- Haru POS — Migraciones pendientes (BD existente)
-- Ejecutar en phpMyAdmin o mysql CLI sobre haru_db
-- Si una línea falla con "Duplicate column", esa parte ya estaba aplicada.
-- Instalación nueva: importar database/schema.sql completo.
-- =============================================================================

USE haru_db;

-- 004: soft delete
ALTER TABLE usuarios ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE tiendas ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE suscripciones ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE reportes_pago ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;

-- 005: RIF opcional
ALTER TABLE tiendas MODIFY COLUMN rif VARCHAR(30) NULL UNIQUE;

-- 006: gastos + sucursales
CREATE TABLE IF NOT EXISTS gastos_administrativos (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  tienda_id   INT UNSIGNED  NOT NULL,
  concepto    VARCHAR(200)  NOT NULL,
  monto_usd   DECIMAL(10,2) NOT NULL,
  categoria   VARCHAR(80)   NULL DEFAULT 'General',
  fecha       DATE          NOT NULL,
  notas       TEXT          NULL,
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at  TIMESTAMP     NULL DEFAULT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (tienda_id) REFERENCES tiendas(id) ON DELETE CASCADE,
  INDEX idx_tienda_fecha (tienda_id, fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sucursales (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  tienda_id   INT UNSIGNED NOT NULL,
  nombre      VARCHAR(150) NOT NULL,
  direccion   TEXT         NULL,
  telefono    VARCHAR(30)  NULL,
  activa      TINYINT(1)   NOT NULL DEFAULT 1,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at  TIMESTAMP    NULL DEFAULT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (tienda_id) REFERENCES tiendas(id) ON DELETE CASCADE,
  INDEX idx_tienda_activa (tienda_id, activa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 007: Binance en reportes de pago
ALTER TABLE reportes_pago
  MODIFY COLUMN metodo_pago
    ENUM('PAGO_MOVIL','ZELLE','BINANCE','TRANSFERENCIA','EFECTIVO_USD','OTRO') NOT NULL;

-- 009: apellido en clientes
ALTER TABLE clientes ADD COLUMN apellido VARCHAR(150) NULL AFTER nombre;

-- 023: modo ventas por tienda (turno | directo)
ALTER TABLE tiendas
  ADD COLUMN modo_ventas ENUM('turno', 'directo') NOT NULL DEFAULT 'turno'
  AFTER accent_key;

-- Emprendedores sin RIF: ventas directas (sin abrir/cerrar caja)
UPDATE tiendas
SET modo_ventas = 'directo'
WHERE (rif IS NULL OR TRIM(rif) = '')
  AND modo_ventas = 'turno';
