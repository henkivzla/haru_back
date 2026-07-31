const db = require('../../config/db');

class ProductModel {
  static async findAllByStore(tiendaId) {
    const [rows] = await db.execute(
      `SELECT * FROM productos WHERE tienda_id = ? ORDER BY nombre ASC`,
      [tiendaId]
    );
    return rows;
  }

  static async create({ tiendaId, codigoRef, nombre, categoria, precioUsd, stock, minStock }) {
    const [result] = await db.execute(
      `INSERT INTO productos (tienda_id, codigo_ref, nombre, categoria, precio_usd, stock, stock_minimo) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [tiendaId, codigoRef, nombre, categoria, precioUsd, stock, minStock]
    );
    return result.insertId;
  }
}

module.exports = ProductModel;
