-- Gastos administrativos + sucursales (Plan Estándar / Pro)
USE lilit_db;

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
