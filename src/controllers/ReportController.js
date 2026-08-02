const db = require('../../config/db');

class ReportController {
  static async getResumen(req, res, next) {
    try {
      const tiendaId = req.user?.tiendaId;
      const features = req.user?.features || [];
      const hasCuentas = features.includes('cuentas');

      const [[ventas]] = await db.query(
        `SELECT COALESCE(SUM(v.monto_total_usd), 0) AS facturacionMes,
                COUNT(*) AS totalVentas
         FROM ventas v
         JOIN cajas c ON c.id = v.caja_id
         WHERE c.tienda_id = ?
           AND v.anulada = 0
           AND MONTH(v.created_at) = MONTH(NOW())
           AND YEAR(v.created_at) = YEAR(NOW())`,
        [tiendaId]
      );

      let gastosMes = 0;
      try {
        const [[gastos]] = await db.query(
          `SELECT COALESCE(SUM(monto_usd), 0) AS total
           FROM gastos_administrativos
           WHERE tienda_id = ? AND deleted_at IS NULL
             AND MONTH(fecha) = MONTH(NOW()) AND YEAR(fecha) = YEAR(NOW())`,
          [tiendaId]
        );
        gastosMes = parseFloat(gastos?.total || 0);
      } catch {
        gastosMes = 0;
      }

      let cuentasPendientes = 0;
      if (hasCuentas) {
        const [[cuentas]] = await db.query(
          `SELECT COALESCE(SUM(monto_usd), 0) AS total
           FROM cuentas_pagar
           WHERE tienda_id = ? AND deleted_at IS NULL
             AND estado IN ('PENDIENTE', 'VENCIDA', 'PARCIAL')`,
          [tiendaId]
        );
        cuentasPendientes = parseFloat(cuentas?.total || 0);
      }

      const facturacionMes = parseFloat(ventas?.facturacionMes || 0);
      const utilidadEstimada = facturacionMes - gastosMes;

      res.json({
        success: true,
        data: {
          facturacionMes,
          totalVentas: ventas?.totalVentas || 0,
          gastosMes,
          cuentasPendientes,
          utilidadEstimada,
          incluyeCuentas: hasCuentas
        }
      });
    } catch (err) {
      next(err);
    }
  }

  static async getEstadisticas(req, res, next) {
    try {
      const tiendaId = req.user?.tiendaId;

      const [ventasPorDia] = await db.query(
        `SELECT DATE(v.created_at) AS fecha,
                COALESCE(SUM(v.monto_total_usd), 0) AS totalUsd,
                COUNT(*) AS cantidad
         FROM ventas v
         JOIN cajas c ON c.id = v.caja_id
         WHERE c.tienda_id = ? AND v.anulada = 0
           AND v.created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
         GROUP BY DATE(v.created_at)
         ORDER BY fecha ASC`,
        [tiendaId]
      );

      const [topProductos] = await db.query(
        `SELECT iv.nombre_producto AS nombre,
                SUM(iv.cantidad) AS unidades,
                SUM(iv.subtotal_usd) AS totalUsd
         FROM items_venta iv
         JOIN ventas v ON v.id = iv.venta_id
         JOIN cajas c ON c.id = v.caja_id
         WHERE c.tienda_id = ? AND v.anulada = 0
           AND v.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
         GROUP BY iv.nombre_producto
         ORDER BY totalUsd DESC
         LIMIT 8`,
        [tiendaId]
      );

      const [[totales]] = await db.query(
        `SELECT COALESCE(SUM(v.monto_total_usd), 0) AS semanaUsd,
                COUNT(*) AS ventasSemana
         FROM ventas v
         JOIN cajas c ON c.id = v.caja_id
         WHERE c.tienda_id = ? AND v.anulada = 0
           AND v.created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)`,
        [tiendaId]
      );

      res.json({
        success: true,
        data: {
          ventasPorDia,
          topProductos,
          semanaUsd: parseFloat(totales?.semanaUsd || 0),
          ventasSemana: totales?.ventasSemana || 0
        }
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = ReportController;
