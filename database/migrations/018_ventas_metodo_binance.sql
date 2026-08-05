-- Agrega Binance como forma de pago en ventas POS
ALTER TABLE ventas
  MODIFY COLUMN metodo_pago
    ENUM(
      'EFECTIVO_USD',
      'EFECTIVO_BS',
      'EFECTIVO_EUR',
      'PAGO_MOVIL',
      'ZELLE',
      'PUNTO_VENTA',
      'BINANCE',
      'MIXTO'
    ) NOT NULL;
