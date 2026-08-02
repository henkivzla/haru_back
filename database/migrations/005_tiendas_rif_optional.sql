-- RIF opcional en tiendas (emprendedores sin registro formal aún)
USE lilit_db;

ALTER TABLE tiendas
  MODIFY COLUMN rif VARCHAR(30) NULL UNIQUE;
