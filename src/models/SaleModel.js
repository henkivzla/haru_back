const db = require('../../config/db');

class SaleModel {
  static async createVenta({ cajaId, clienteNombre, clienteRif, montoUsd, montoBs, tasaBcv, metodoPago, items = [] }) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const [saleResult] = await connection.execute(
        `INSERT INTO ventas 
         (caja_id, cliente_nombre, cliente_rif, monto_total_usd, monto_total_bs, tasa_bcv_aplicada, metodo_pago, es_nota_entrega) 
         VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)`,
        [cajaId, clienteNombre, clienteRif, montoUsd, montoBs, tasaBcv, metodoPago]
      );

      const ventaId = saleResult.insertId;

      for (const item of items) {
        await connection.execute(
          `INSERT INTO detalles_venta (venta_id, producto_id, cantidad, precio_unitario_usd, subtotal_usd) 
           VALUES (?, ?, ?, ?, ?)`,
          [ventaId, item.productoId, item.cantidad, item.precioUsd, item.cantidad * item.precioUsd]
        );

        // Descontar stock del producto
        await connection.execute(
          `UPDATE productos SET stock = GREATEST(0, stock - ?) WHERE id = ?`,
          [item.cantidad, item.productoId]
        );
      }

      await connection.commit();
      return ventaId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async getMonthlyTotal(tiendaId) {
    const [rows] = await db.execute(
      `SELECT COALESCE(SUM(v.monto_total_usd), 0) as total_usd, COALESCE(SUM(v.monto_total_bs), 0) as total_bs 
       FROM ventas v 
       JOIN cajas c ON v.caja_id = c.id 
       WHERE c.tienda_id = ? AND MONTH(v.created_at) = MONTH(CURRENT_DATE())`,
      [tiendaId]
    );
    return rows[0];
  }
}

module.exports = SaleModel;
