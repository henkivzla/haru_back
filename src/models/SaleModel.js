const db = require('../../config/db');
const { createClienteFromVenta } = require('../services/clienteVentaService');

class SaleModel {
  static parseProductoId(item = {}) {
    const raw = item.productoId ?? item.producto_id ?? item.id ?? null;
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

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
        const productoId = SaleModel.parseProductoId(item);
        const cantidad = Math.max(1, parseInt(item.cantidad || item.qty || 1, 10) || 1);
        const subtotal = cantidad * (Number(item.precioUsd) || 0);

        await connection.execute(
          `INSERT INTO items_venta
           (venta_id, producto_id, nombre_producto, cantidad, precio_unitario_usd, subtotal_usd)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [ventaId, productoId, item.nombre || 'Producto', cantidad, item.precioUsd || 0, subtotal]
        );

        if (productoId) {
          const [updateResult] = await connection.execute(
            `UPDATE productos
             SET stock = GREATEST(0, stock - ?)
             WHERE id = ? AND tienda_id = ? AND deleted_at IS NULL`,
            [cantidad, productoId, tiendaId]
          );
          if (updateResult.affectedRows === 0) {
            const err = new Error(`No se pudo descontar stock de "${item.nombre || 'producto'}".`);
            err.status = 409;
            throw err;
          }
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

  static mapVentaRow(row) {
    return {
      ...row,
      montoUsd: Number(row.montoUsd || 0),
      montoBs: Number(row.montoBs || 0),
      itemsCount: Number(row.itemsCount || 0),
      cantidadTotal: Number(row.cantidadTotal || 0),
      cantidadesResumen: row.cantidadesResumen || '',
      clienteNombre: String(row.clienteNombre || '').trim() || 'Cliente mostrador',
      anuladaAt: row.anuladaAt || null,
    };
  }

  static async listByCaja(cajaId, tiendaId, { limit = 120, anulada = 0 } = {}) {
    const safeLimit = Math.min(Math.max(Number(limit) || 120, 1), 200);
    const anuladaFlag = anulada ? 1 : 0;
    const orderColumn = anulada ? 'v.anulada_at' : 'v.created_at';
    const [rows] = await db.execute(
      `SELECT
         v.id,
         v.metodo_pago AS metodoPago,
         v.monto_total_usd AS montoUsd,
         v.monto_total_bs AS montoBs,
         v.created_at AS createdAt,
         v.anulada_at AS anuladaAt,
         TRIM(CONCAT(COALESCE(c.nombre, ''), ' ', COALESCE(c.apellido, ''))) AS clienteNombre,
         COUNT(iv.id) AS itemsCount,
         COALESCE(SUM(iv.cantidad), 0) AS cantidadTotal,
         GROUP_CONCAT(iv.nombre_producto ORDER BY iv.id SEPARATOR ' · ') AS productosResumen,
         GROUP_CONCAT(
           IF(
             iv.cantidad = FLOOR(iv.cantidad),
             CAST(iv.cantidad AS UNSIGNED),
             TRIM(TRAILING '0' FROM TRIM(TRAILING '.' FROM CAST(iv.cantidad AS CHAR)))
           )
           ORDER BY iv.id SEPARATOR ' · '
         ) AS cantidadesResumen
       FROM ventas v
       JOIN cajas ca ON ca.id = v.caja_id
       LEFT JOIN clientes c ON c.id = v.cliente_id
       LEFT JOIN items_venta iv ON iv.venta_id = v.id
       WHERE v.caja_id = ? AND ca.tienda_id = ? AND v.anulada = ?
       GROUP BY v.id
       ORDER BY ${orderColumn} DESC
       LIMIT ${safeLimit}`,
      [cajaId, tiendaId, anuladaFlag]
    );
    return rows.map((row) => this.mapVentaRow(row));
  }

  static async listTodayByTienda(tiendaId, { limit = 120, anulada = 0 } = {}) {
    const safeLimit = Math.min(Math.max(Number(limit) || 120, 1), 200);
    const anuladaFlag = anulada ? 1 : 0;
    const orderColumn = anulada ? 'v.anulada_at' : 'v.created_at';
    const dateFilter = anulada
      ? 'DATE(COALESCE(v.anulada_at, v.created_at)) = CURDATE()'
      : 'DATE(v.created_at) = CURDATE()';
    const [rows] = await db.execute(
      `SELECT
         v.id,
         v.metodo_pago AS metodoPago,
         v.monto_total_usd AS montoUsd,
         v.monto_total_bs AS montoBs,
         v.created_at AS createdAt,
         v.anulada_at AS anuladaAt,
         TRIM(CONCAT(COALESCE(c.nombre, ''), ' ', COALESCE(c.apellido, ''))) AS clienteNombre,
         COUNT(iv.id) AS itemsCount,
         COALESCE(SUM(iv.cantidad), 0) AS cantidadTotal,
         GROUP_CONCAT(iv.nombre_producto ORDER BY iv.id SEPARATOR ' · ') AS productosResumen,
         GROUP_CONCAT(
           IF(
             iv.cantidad = FLOOR(iv.cantidad),
             CAST(iv.cantidad AS UNSIGNED),
             TRIM(TRAILING '0' FROM TRIM(TRAILING '.' FROM CAST(iv.cantidad AS CHAR)))
           )
           ORDER BY iv.id SEPARATOR ' · '
         ) AS cantidadesResumen
       FROM ventas v
       JOIN cajas ca ON ca.id = v.caja_id
       LEFT JOIN clientes c ON c.id = v.cliente_id
       LEFT JOIN items_venta iv ON iv.venta_id = v.id
       WHERE ca.tienda_id = ? AND v.anulada = ? AND ${dateFilter}
       GROUP BY v.id
       ORDER BY ${orderColumn} DESC
       LIMIT ${safeLimit}`,
      [tiendaId, anuladaFlag]
    );
    return rows.map((row) => this.mapVentaRow(row));
  }

  static async listByTiendaDateRange(
    tiendaId,
    { desde, hasta, limit = 200, anulada = 0 } = {}
  ) {
    const safeLimit = Math.min(Math.max(Number(limit) || 200, 1), 500);
    const anuladaFlag = anulada ? 1 : 0;
    const orderColumn = anulada ? 'v.anulada_at' : 'v.created_at';
    const dateColumn = anulada ? 'COALESCE(v.anulada_at, v.created_at)' : 'v.created_at';
    const rangeDesde = desde || hasta;
    const rangeHasta = hasta || desde;
    if (!rangeDesde || !rangeHasta) return [];

    const [rows] = await db.execute(
      `SELECT
         v.id,
         v.metodo_pago AS metodoPago,
         v.monto_total_usd AS montoUsd,
         v.monto_total_bs AS montoBs,
         v.created_at AS createdAt,
         v.anulada_at AS anuladaAt,
         TRIM(CONCAT(COALESCE(c.nombre, ''), ' ', COALESCE(c.apellido, ''))) AS clienteNombre,
         COUNT(iv.id) AS itemsCount,
         COALESCE(SUM(iv.cantidad), 0) AS cantidadTotal,
         GROUP_CONCAT(iv.nombre_producto ORDER BY iv.id SEPARATOR ' · ') AS productosResumen,
         GROUP_CONCAT(
           IF(
             iv.cantidad = FLOOR(iv.cantidad),
             CAST(iv.cantidad AS UNSIGNED),
             TRIM(TRAILING '0' FROM TRIM(TRAILING '.' FROM CAST(iv.cantidad AS CHAR)))
           )
           ORDER BY iv.id SEPARATOR ' · '
         ) AS cantidadesResumen
       FROM ventas v
       JOIN cajas ca ON ca.id = v.caja_id
       LEFT JOIN clientes c ON c.id = v.cliente_id
       LEFT JOIN items_venta iv ON iv.venta_id = v.id
       WHERE ca.tienda_id = ? AND v.anulada = ?
         AND DATE(${dateColumn}) >= ? AND DATE(${dateColumn}) <= ?
       GROUP BY v.id
       ORDER BY ${orderColumn} DESC
       LIMIT ${safeLimit}`,
      [tiendaId, anuladaFlag, rangeDesde, rangeHasta]
    );
    return rows.map((row) => this.mapVentaRow(row));
  }

  static async annulVenta({ ventaId, tiendaId, usuarioId, cajaId }) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const [ventas] = await connection.execute(
        `SELECT v.id, v.caja_id, v.anulada
         FROM ventas v
         JOIN cajas ca ON ca.id = v.caja_id
         WHERE v.id = ? AND ca.tienda_id = ?
         LIMIT 1
         FOR UPDATE`,
        [ventaId, tiendaId]
      );
      const venta = ventas[0];
      if (!venta) {
        const err = new Error('Venta no encontrada.');
        err.status = 404;
        throw err;
      }
      if (venta.anulada) {
        const err = new Error('Esta venta ya fue anulada.');
        err.status = 400;
        throw err;
      }
      if (String(venta.caja_id) !== String(cajaId)) {
        const err = new Error('Solo puedes anular ventas del turno de caja actual.');
        err.status = 403;
        throw err;
      }

      const [items] = await connection.execute(
        `SELECT producto_id, cantidad
         FROM items_venta
         WHERE venta_id = ?`,
        [ventaId]
      );

      for (const item of items) {
        if (!item.producto_id) continue;
        await connection.execute(
          `UPDATE productos
           SET stock = stock + ?
           WHERE id = ? AND tienda_id = ? AND deleted_at IS NULL`,
          [item.cantidad || 1, item.producto_id, tiendaId]
        );
      }

      await connection.execute(
        `UPDATE ventas
         SET anulada = 1, anulada_at = NOW(), anulada_por = ?
         WHERE id = ?`,
        [usuarioId, ventaId]
      );

      await connection.commit();
      return true;
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
