-- Migración: métodos Mercantil Panamá, Zinli y PayPal en reportes de pago
USE lilit_db;

ALTER TABLE reportes_pago
  MODIFY COLUMN metodo_pago
    ENUM(
      'PAGO_MOVIL',
      'ZELLE',
      'BINANCE',
      'TRANSFERENCIA',
      'MERCANTIL_PANAMA',
      'ZINLI',
      'PAYPAL',
      'EFECTIVO_USD',
      'OTRO'
    ) NOT NULL;
