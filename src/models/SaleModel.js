const db = require('../../config/db');
const { createClienteFromVenta } = require('../services/clienteVentaService');

class SaleModel {
  static async createVenta({
    cajaId,
    tiendaId,
    cliente = null,
    montoUsd,
    montoBs,
    tasaBcv,
    metodoPago,
    items = [],
  }) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const clienteId = await createClienteFromVenta(connection, tiendaId, cliente);

      const [saleResult] = await connection.execute(
        `INSERT INTO ventas
         (caja_id, cliente_id, metodo_pago, tasa_bcv_aplicada,
          subtotal_usd, descuento_usd, monto_total_usd, monto_total_bs)
         VALUES (?, ?, ?, ?, ?, 0.00, ?, ?)`,
        [cajaId, clienteId, metodoPago, tasaBcv, montoUsd, montoUsd, montoBs]
      );

      const ventaId = saleResult.insertId;

      // Insertar líneas de detalle
      for (const item of items) {
        const subtotal = (item.cantidad || 1) * (item.precioUsd || 0);

        await connection.execute(
          `INSERT INTO items_venta
           (venta_id, producto_id, nombre_producto, cantidad, precio_unitario_usd, subtotal_usd)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [ventaId, item.productoId || null, item.nombre || 'Producto', item.cantidad || 1, item.precioUsd || 0, subtotal]
        );

        // Descontar stock si hay producto ligado
        if (item.productoId) {
          await connection.execute(
            `UPDATE productos SET stock = GREATEST(0, stock - ?) WHERE id = ? AND deleted_at IS NULL`,
            [item.cantidad || 1, item.productoId]
          );
        }
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
      `SELECT
         COALESCE(SUM(v.monto_total_usd), 0) AS total_usd,
         COALESCE(SUM(v.monto_total_bs),  0) AS total_bs,
         COUNT(*) AS total_ventas
       FROM ventas v
       JOIN cajas c ON c.id = v.caja_id
       WHERE c.tienda_id = ?
         AND v.anulada = 0
         AND MONTH(v.created_at) = MONTH(CURDATE())
         AND YEAR(v.created_at)  = YEAR(CURDATE())`,
      [tiendaId]
    );
    return rows[0];
  }
}

module.exports = SaleModel;
