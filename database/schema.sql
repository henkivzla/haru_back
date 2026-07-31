-- ==========================================================================
-- LILIT POS VENEZUELA - MYSQL DATABASE SCHEMA & RBAC ROLES
-- ==========================================================================

CREATE TABLE IF NOT EXISTS tiendas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  rif VARCHAR(30) NOT NULL UNIQUE,
  direccion TEXT,
  telefono VARCHAR(30),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tienda_id INT NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  rol ENUM('SUPERADMIN', 'ADMIN', 'CAJERO') DEFAULT 'ADMIN',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tienda_id) REFERENCES tiendas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS suscripciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tienda_id INT NOT NULL,
  plan ENUM('ECONOMICO', 'ESTANDAR', 'PRO') NOT NULL DEFAULT 'ECONOMICO',
  precio_mensual DECIMAL(10, 2) NOT NULL DEFAULT 15.00,
  ciclo ENUM('MENSUAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL') NOT NULL DEFAULT 'TRIMESTRAL',
  estado ENUM('ACTIVATED', 'SUSPENDED', 'TRIAL') NOT NULL DEFAULT 'ACTIVATED',
  proximo_pago DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tienda_id) REFERENCES tiendas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tasas_bcv (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tasa DECIMAL(10, 4) NOT NULL,
  fuente VARCHAR(50) DEFAULT 'bcv.org.ve',
  fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cajas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tienda_id INT NOT NULL,
  usuario_id INT NOT NULL,
  monto_apertura_usd DECIMAL(12, 2) DEFAULT 0.00,
  monto_apertura_bs DECIMAL(12, 2) DEFAULT 0.00,
  desglose_usd JSON NULL,
  desglose_bs JSON NULL,
  monto_zelle_usd DECIMAL(12, 2) DEFAULT 0.00,
  monto_pago_movil_bs DECIMAL(12, 2) DEFAULT 0.00,
  monto_pos_bs DECIMAL(12, 2) DEFAULT 0.00,
  tasa_bcv_apertura DECIMAL(10, 4) NOT NULL,
  estado ENUM('ABIERTA', 'CERRADA') DEFAULT 'ABIERTA',
  abierta_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  cerrada_at TIMESTAMP NULL,
  FOREIGN KEY (tienda_id) REFERENCES tiendas(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS productos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tienda_id INT NOT NULL,
  codigo_ref VARCHAR(50) NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  categoria VARCHAR(50) DEFAULT 'General',
  precio_usd DECIMAL(10, 2) NOT NULL,
  stock INT DEFAULT 0,
  stock_minimo INT DEFAULT 5,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tienda_id) REFERENCES tiendas(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ventas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  caja_id INT NOT NULL,
  cliente_nombre VARCHAR(150) DEFAULT 'Cliente General',
  cliente_rif VARCHAR(30),
  monto_total_usd DECIMAL(12, 2) NOT NULL,
  monto_total_bs DECIMAL(12, 2) NOT NULL,
  tasa_bcv_aplicada DECIMAL(10, 4) NOT NULL,
  metodo_pago ENUM('Efectivo USD', 'Efectivo Bs', 'Pago Movil', 'Zelle', 'Punto de Venta') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (caja_id) REFERENCES cajas(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- DATOS DE PRUEBA INICIALES
INSERT INTO tiendas (id, nombre, rif, direccion, telefono) VALUES
(1, 'Comercio Demo lilit Vzla', 'J-12345678-0', 'Av. Francisco de Miranda, Caracas', '+58 412 1234567');

INSERT INTO tasas_bcv (tasa, fuente) VALUES (746.6300, 'bcv.org.ve');
