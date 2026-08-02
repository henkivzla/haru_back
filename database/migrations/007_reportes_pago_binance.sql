-- Agrega Binance como método de pago en reportes de suscripción
USE lilit_db;

ALTER TABLE reportes_pago
  MODIFY COLUMN metodo_pago
    ENUM('PAGO_MOVIL','ZELLE','BINANCE','TRANSFERENCIA','EFECTIVO_USD','OTRO') NOT NULL;
