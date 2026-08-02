-- ============================================================================
-- HARU POS VENEZUELA — SCHEMA NORMALIZADO v2.6
-- Autor: @henkivzla
-- SUPERADMIN seed: Eiborth Gómez · gomezeiborth@gmail.com · +58 4129852460 · pass haru2026
-- Incluye: clientes.apellido, Binance, gastos, sucursales, soft delete, productos.creado_por_id, apariencia tienda/usuario
-- Usa SOLO este archivo para crear o resetear la BD (no migraciones sueltas).
-- IMPORTANTE: Este script BORRA la base de datos existente y la recrea desde cero.
-- Importar en phpMyAdmin: pestaña Importar → database/schema.sql
-- ⚠️  Perderás usuarios registrados manualmente. Solo demo queda en seed.
-- ============================================================================

DROP DATABASE IF EXISTS haru_db;
CREATE DATABASE haru_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE haru_db;

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO';

-- ============================================================================
-- 1. ROLES
--    Tabla maestra de roles. Separada de usuarios (3FN).
--    Evita ENUMs que no se pueden extender sin ALTER TABLE.
-- ============================================================================
CREATE TABLE IF NOT EXISTS roles (
  id          TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre      VARCHAR(30)  NOT NULL UNIQUE,
  descripcion VARCHAR(120) NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Catalogo de roles del sistema';

INSERT IGNORE INTO roles (id, nombre, descripcion) VALUES
  (1, 'SUPERADMIN', 'Dueno del sistema SaaS, acceso total'),
  (2, 'ADMIN',      'Gerente o dueno de un comercio cliente'),
  (3, 'CAJERO',     'Operador de punto de venta');

-- ============================================================================
-- 2. PLANES DE SUSCRIPCION
--    Catalogo de planes en tabla propia (evita ENUM no extensible).
-- ============================================================================
CREATE TABLE IF NOT EXISTS planes (
  id              TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug            VARCHAR(20)   NOT NULL UNIQUE,
  nombre          VARCHAR(50)   NOT NULL,
  precio_mensual  DECIMAL(10,2) NOT NULL,
  max_usuarios    SMALLINT      NOT NULL DEFAULT 1,
  descripcion     TEXT          NULL,
  activo          TINYINT(1)    NOT NULL DEFAULT 1,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Catalogo de planes SaaS';

INSERT IGNORE INTO planes (id, slug, nombre, precio_mensual, max_usuarios, descripcion) VALUES
  (1, 'economico', 'Plan Economico', 15.00, 1,   'POS - Inventario - Tasa BCV en tiempo real'),
  (2, 'estandar',  'Plan Estandar',  18.00, 3,   'Todo Economico + Clientes - Cuentas por Pagar'),
  (3, 'pro',       'Plan Pro',       22.00, 999, 'Todo Estandar + Multi-sucursal - Reportes avanzados');

-- ============================================================================
-- 3. TIENDAS (comercios cliente del SaaS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS tiendas (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre      VARCHAR(150) NOT NULL,
  rif         VARCHAR(30)  NULL UNIQUE,
  direccion   TEXT         NULL,
  telefono    VARCHAR(30)  NULL,
  theme_mode  ENUM('light','dark') NOT NULL DEFAULT 'dark',
  accent_key  VARCHAR(20)  NOT NULL DEFAULT 'default',
  activo      TINYINT(1)   NOT NULL DEFAULT 1,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at  TIMESTAMP    NULL DEFAULT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Comercios cliente del sistema SaaS';

-- ============================================================================
-- 4. USUARIOS
--    rol_id referencia a tabla roles (3FN, sin ENUM en esta tabla).
-- ============================================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id            INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  tienda_id     INT UNSIGNED     NULL,
  rol_id        TINYINT UNSIGNED NOT NULL DEFAULT 2,
  nombre        VARCHAR(100)  NOT NULL,
  email         VARCHAR(150)  NOT NULL UNIQUE,
  password_hash VARCHAR(255)  NOT NULL,
  theme_mode    ENUM('light','dark') NULL DEFAULT NULL,
  accent_key    VARCHAR(20)       NULL DEFAULT NULL,
  activo        TINYINT(1)    NOT NULL DEFAULT 1,
  estado        ENUM('ACTIVO','INACTIVO','BLOQUEADO') NOT NULL DEFAULT 'ACTIVO',
  ultimo_login  TIMESTAMP     NULL,
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at    TIMESTAMP     NULL DEFAULT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (tienda_id) REFERENCES tiendas(id)  ON DELETE SET NULL,
  FOREIGN KEY (rol_id)    REFERENCES roles(id)     ON DELETE RESTRICT,
  INDEX idx_tienda (tienda_id),
  INDEX idx_email  (email),
  INDEX idx_rol    (rol_id),
  INDEX idx_estado (estado, deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Usuarios del sistema con rol referenciado';

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id   INT UNSIGNED NOT NULL,
  token_hash   VARCHAR(64)  NOT NULL,
  expires_at   TIMESTAMP    NOT NULL,
  used_at      TIMESTAMP    NULL,
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_token_hash (token_hash),
  INDEX idx_usuario_expires (usuario_id, expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Tokens temporales para restablecer contraseña';

-- ============================================================================
-- 5. SUSCRIPCIONES
-- ============================================================================
CREATE TABLE IF NOT EXISTS suscripciones (
  id            INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  tienda_id     INT UNSIGNED     NOT NULL,
  plan_id       TINYINT UNSIGNED NOT NULL,
  ciclo         ENUM('MENSUAL','TRIMESTRAL','SEMESTRAL','ANUAL') NOT NULL DEFAULT 'MENSUAL',
  estado        ENUM('ACTIVA','SUSPENDIDA','PRUEBA','CANCELADA')  NOT NULL DEFAULT 'PRUEBA',
  fecha_inicio  DATE      NOT NULL,
  proximo_pago  DATE      NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at    TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (tienda_id) REFERENCES tiendas(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id)   REFERENCES planes(id)  ON DELETE RESTRICT,
  INDEX idx_tienda_estado (tienda_id, estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Suscripciones activas por tienda';

-- ============================================================================
-- 6. REPORTES DE PAGO
-- ============================================================================
CREATE TABLE IF NOT EXISTS reportes_pago (
  id              INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  tienda_id       INT UNSIGNED     NOT NULL,
  suscripcion_id  INT UNSIGNED     NULL,
  plan_id         TINYINT UNSIGNED NOT NULL,
  metodo_pago     ENUM('PAGO_MOVIL','ZELLE','BINANCE','TRANSFERENCIA','MERCANTIL_PANAMA','ZINLI','PAYPAL','EFECTIVO_USD','OTRO') NOT NULL,
  referencia      VARCHAR(100)  NOT NULL,
  monto_usd       DECIMAL(10,2) NOT NULL,
  banco_emisor    VARCHAR(100)  NULL,
  comprobante_url VARCHAR(255)  NULL,
  estado          ENUM('PENDIENTE','APROBADO','RECHAZADO') NOT NULL DEFAULT 'PENDIENTE',
  revisado_por    INT UNSIGNED  NULL,
  nota_revision   TEXT          NULL,
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at      TIMESTAMP     NULL DEFAULT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (tienda_id)      REFERENCES tiendas(id)       ON DELETE CASCADE,
  FOREIGN KEY (suscripcion_id) REFERENCES suscripciones(id) ON DELETE SET NULL,
  FOREIGN KEY (plan_id)        REFERENCES planes(id)         ON DELETE RESTRICT,
  FOREIGN KEY (revisado_por)   REFERENCES usuarios(id)       ON DELETE SET NULL,
  INDEX idx_estado  (estado),
  INDEX idx_tienda  (tienda_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Pagos de suscripcion reportados por clientes';

-- ============================================================================
-- 7. TASAS BCV
-- ============================================================================
CREATE TABLE IF NOT EXISTS tasas_bcv (
  id              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  tasa            DECIMAL(12,4) NOT NULL,
  fuente          VARCHAR(50)   NOT NULL DEFAULT 'bcv.org.ve',
  fecha_registro  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_fecha (fecha_registro)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Historial de tasas BCV';

-- ============================================================================
-- 8. CAJAS REGISTRADORAS
-- ============================================================================
CREATE TABLE IF NOT EXISTS cajas (
  id                 INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  tienda_id          INT UNSIGNED  NOT NULL,
  usuario_id         INT UNSIGNED  NOT NULL,
  tasa_bcv_apertura  DECIMAL(12,4) NOT NULL,
  monto_apertura_usd DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  monto_apertura_bs  DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  desglose_usd       JSON          NULL,
  desglose_bs        JSON          NULL,
  monto_zelle        DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  monto_pago_movil   DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  monto_pos          DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  estado             ENUM('ABIERTA','CERRADA') NOT NULL DEFAULT 'ABIERTA',
  abierta_at         TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cerrada_at         TIMESTAMP     NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (tienda_id)  REFERENCES tiendas(id)  ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
  INDEX idx_tienda_estado (tienda_id, estado),
  INDEX idx_usuario       (usuario_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Sesiones de caja por usuario';

-- ============================================================================
-- 9. CATEGORIAS DE PRODUCTO
--    Separadas de productos (3FN: elimina dependencia transitiva).
-- ============================================================================
CREATE TABLE IF NOT EXISTS categorias_producto (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  tienda_id   INT UNSIGNED NOT NULL,
  nombre      VARCHAR(80)  NOT NULL,
  color_hex   VARCHAR(7)   NULL DEFAULT '#64748B',
  deleted_at  TIMESTAMP    NULL DEFAULT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (tienda_id) REFERENCES tiendas(id) ON DELETE CASCADE,
  UNIQUE KEY uq_tienda_cat (tienda_id, nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Categorias de productos por tienda';

-- ============================================================================
-- 10. PRODUCTOS / INVENTARIO
-- ============================================================================
CREATE TABLE IF NOT EXISTS productos (
  id            INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  tienda_id     INT UNSIGNED  NOT NULL,
  categoria_id  INT UNSIGNED  NULL,
  codigo_ref    VARCHAR(50)   NOT NULL,
  nombre        VARCHAR(150)  NOT NULL,
  descripcion   TEXT          NULL,
  imagen_url    VARCHAR(500)  NULL,
  precio_usd    DECIMAL(10,2) NOT NULL,
  stock         INT           NOT NULL DEFAULT 0,
  stock_minimo  INT           NOT NULL DEFAULT 5,
  activo        TINYINT(1)    NOT NULL DEFAULT 1,
  creado_por_id INT UNSIGNED  NULL,
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at    TIMESTAMP     NULL DEFAULT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (tienda_id)    REFERENCES tiendas(id)             ON DELETE CASCADE,
  FOREIGN KEY (categoria_id) REFERENCES categorias_producto(id) ON DELETE SET NULL,
  FOREIGN KEY (creado_por_id) REFERENCES usuarios(id)            ON DELETE SET NULL,
  UNIQUE KEY uq_tienda_codigo (tienda_id, codigo_ref),
  INDEX idx_tienda_activo (tienda_id, activo),
  INDEX idx_stock         (tienda_id, stock),
  INDEX idx_tienda_created (tienda_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Inventario de productos por tienda';

-- ============================================================================
-- 11. CLIENTES
--    Separados de ventas (3FN: datos del cliente no dependen del ID de venta).
-- ============================================================================
CREATE TABLE IF NOT EXISTS clientes (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  tienda_id   INT UNSIGNED NOT NULL,
  nombre      VARCHAR(150) NOT NULL,
  apellido    VARCHAR(150) NULL,
  rif_cedula  VARCHAR(30)  NULL,
  telefono    VARCHAR(30)  NULL,
  email       VARCHAR(150) NULL,
  direccion   TEXT         NULL,
  activo      TINYINT(1)   NOT NULL DEFAULT 1,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at  TIMESTAMP    NULL DEFAULT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (tienda_id) REFERENCES tiendas(id) ON DELETE CASCADE,
  INDEX idx_rif    (rif_cedula),
  INDEX idx_tienda (tienda_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Clientes registrados por tienda';

-- ============================================================================
-- 12. VENTAS
-- ============================================================================
CREATE TABLE IF NOT EXISTS ventas (
  id                INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  caja_id           INT UNSIGNED  NOT NULL,
  cliente_id        INT UNSIGNED  NULL,
  metodo_pago       ENUM('EFECTIVO_USD','EFECTIVO_BS','PAGO_MOVIL','ZELLE','PUNTO_VENTA','MIXTO') NOT NULL,
  tasa_bcv_aplicada DECIMAL(12,4) NOT NULL,
  subtotal_usd      DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  descuento_usd     DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  monto_total_usd   DECIMAL(12,2) NOT NULL,
  monto_total_bs    DECIMAL(12,2) NOT NULL,
  notas             TEXT          NULL,
  anulada           TINYINT(1)    NOT NULL DEFAULT 0,
  anulada_at        TIMESTAMP     NULL,
  anulada_por       INT UNSIGNED  NULL,
  created_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (caja_id)     REFERENCES cajas(id)    ON DELETE RESTRICT,
  FOREIGN KEY (cliente_id)  REFERENCES clientes(id) ON DELETE SET NULL,
  FOREIGN KEY (anulada_por) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX idx_caja    (caja_id),
  INDEX idx_cliente (cliente_id),
  INDEX idx_created (created_at),
  INDEX idx_anulada (anulada)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Cabecera de ventas';

-- ============================================================================
-- 13. ITEMS DE VENTA (detalle de lineas)
-- ============================================================================
CREATE TABLE IF NOT EXISTS items_venta (
  id                  INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  venta_id            INT UNSIGNED  NOT NULL,
  producto_id         INT UNSIGNED  NULL,
  nombre_producto     VARCHAR(150)  NOT NULL,
  cantidad            DECIMAL(10,3) NOT NULL DEFAULT 1.000,
  precio_unitario_usd DECIMAL(10,2) NOT NULL,
  descuento_usd       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  subtotal_usd        DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (venta_id)    REFERENCES ventas(id)    ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE SET NULL,
  INDEX idx_venta    (venta_id),
  INDEX idx_producto (producto_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Lineas de detalle de cada venta';

-- ============================================================================
-- 14. PROVEEDORES
--    Separados de cuentas por pagar (3FN).
-- ============================================================================
CREATE TABLE IF NOT EXISTS proveedores (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  tienda_id   INT UNSIGNED NOT NULL,
  nombre      VARCHAR(150) NOT NULL,
  rif         VARCHAR(30)  NULL,
  telefono    VARCHAR(30)  NULL,
  email       VARCHAR(150) NULL,
  contacto    VARCHAR(100) NULL,
  activo      TINYINT(1)   NOT NULL DEFAULT 1,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at  TIMESTAMP    NULL DEFAULT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (tienda_id) REFERENCES tiendas(id) ON DELETE CASCADE,
  INDEX idx_tienda (tienda_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Proveedores por tienda';

-- ============================================================================
-- 15. CUENTAS POR PAGAR
-- ============================================================================
CREATE TABLE IF NOT EXISTS cuentas_pagar (
  id                INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  tienda_id         INT UNSIGNED  NOT NULL,
  proveedor_id      INT UNSIGNED  NULL,
  descripcion       VARCHAR(200)  NOT NULL,
  monto_usd         DECIMAL(12,2) NOT NULL,
  tasa_origen       DECIMAL(12,4) NULL,
  fecha_vencimiento DATE          NOT NULL,
  estado            ENUM('PENDIENTE','PAGADA','VENCIDA','PARCIAL') NOT NULL DEFAULT 'PENDIENTE',
  monto_pagado_usd  DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  pagada_at         TIMESTAMP     NULL,
  notas             TEXT          NULL,
  created_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at        TIMESTAMP     NULL DEFAULT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (tienda_id)    REFERENCES tiendas(id)    ON DELETE CASCADE,
  FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE SET NULL,
  INDEX idx_tienda_estado (tienda_id, estado),
  INDEX idx_vencimiento   (fecha_vencimiento)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Cuentas por pagar a proveedores';

-- ============================================================================
-- 16. GASTOS ADMINISTRATIVOS
-- ============================================================================
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Gastos operativos del comercio';

-- ============================================================================
-- 17. SUCURSALES (Plan Pro)
-- ============================================================================
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Sucursales adicionales (multi-sucursal)';

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- SEED DATA — datos iniciales del sistema
-- ============================================================================

-- Tiendas demo
INSERT IGNORE INTO tiendas (id, nombre, rif, direccion, telefono) VALUES
  (1, 'Comercio Demo Haru', 'J-12345678-0', 'Av. Francisco de Miranda, Caracas, VE', '+58 412 1234567'),
  (2, 'Inversiones Haru Vzla', 'J-87654321-0', 'Centro Comercial, Valencia, VE', '+58 424 7654321');

-- Usuarios demo (password inicial SUPERADMIN y demos: haru2026)
INSERT IGNORE INTO usuarios (id, tienda_id, rol_id, nombre, email, password_hash, estado) VALUES
  (1, NULL, 1, 'Eiborth Gómez', 'gomezeiborth@gmail.com', '$2b$10$p5bxr.sDU5uklQQ8BGYXzultTmL4sCHZfzv3Q2OKUJtqRV674D1uC', 'ACTIVO'),
  (2, 2, 2, 'Carlos Mendoza (Gerente)', 'gerente@tienda.ve', '$2b$10$p5bxr.sDU5uklQQ8BGYXzultTmL4sCHZfzv3Q2OKUJtqRV674D1uC', 'ACTIVO'),
  (3, 2, 3, 'María Gómez (Cajera)', 'cajero@tienda.ve', '$2b$10$p5bxr.sDU5uklQQ8BGYXzultTmL4sCHZfzv3Q2OKUJtqRV674D1uC', 'ACTIVO'),
  (4, 1, 2, 'Diego Aponte', 'diego@negocio.ve', '$2b$10$p5bxr.sDU5uklQQ8BGYXzultTmL4sCHZfzv3Q2OKUJtqRV674D1uC', 'ACTIVO');

-- Tasa BCV inicial
INSERT IGNORE INTO tasas_bcv (tasa, fuente) VALUES
  (746.6300, 'bcv.org.ve');

-- Suscripciones demo
INSERT IGNORE INTO suscripciones (id, tienda_id, plan_id, ciclo, estado, fecha_inicio, proximo_pago) VALUES
  (1, 1, 3, 'MENSUAL', 'ACTIVA', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 30 DAY)),
  (2, 2, 2, 'MENSUAL', 'ACTIVA', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 30 DAY));

-- Categorias demo
INSERT IGNORE INTO categorias_producto (id, tienda_id, nombre, color_hex) VALUES
  (1, 1, 'Licores',    '#8B5CF6'),
  (2, 1, 'Viveres',    '#10B981'),
  (3, 1, 'Calzado',    '#F59E0B'),
  (4, 1, 'Tecnologia', '#06B6D4'),
  (5, 2, 'Viveres',    '#10B981');

-- Proveedor demo
INSERT IGNORE INTO proveedores (id, tienda_id, nombre, rif, telefono) VALUES
  (1, 1, 'Distribuidora Nacional C.A.', 'J-98765432-1', '+58 212 5551234');

-- Productos demo
INSERT IGNORE INTO productos (tienda_id, categoria_id, codigo_ref, nombre, precio_usd, stock, stock_minimo, creado_por_id) VALUES
  (1, 2, 'COD-VIV-001', 'Harina P.A.N. Bulto 20kg', 19.00, 18, 5, 4),
  (1, 1, 'COD-LIC-001', 'Ron Santa Teresa Gran Reserva 0.75L', 14.50, 0, 5, 4),
  (2, 5, 'COD-VIV-001', 'Harina P.A.N. Bulto 20kg', 19.00, 10, 5, 2);

-- Cuentas por pagar demo (tienda 1)
INSERT IGNORE INTO cuentas_pagar (id, tienda_id, proveedor_id, descripcion, monto_usd, tasa_origen, fecha_vencimiento, estado) VALUES
  (1, 1, 1, 'Factura licores marzo', 450.00, 746.6300, DATE_ADD(CURDATE(), INTERVAL 15 DAY), 'PENDIENTE'),
  (2, 1, 1, 'Mercancía viveres', 280.50, 720.0000, DATE_SUB(CURDATE(), INTERVAL 3 DAY), 'VENCIDA');
