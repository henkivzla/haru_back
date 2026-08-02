const db = require('../../config/db');

const PLAN_BY_AMOUNT = { 15: 1, 18: 2, 22: 3 };

class AdminController {

  static async getStores(req, res, next) {
    try {
      const [stores] = await db.query(`
        SELECT
          t.id,
          t.nombre,
          t.rif,
          t.telefono,
          u.nombre AS dueno,
          u.email,
          p.nombre AS plan,
          p.precio_mensual AS planMonto,
          s.ciclo,
          s.estado,
          s.proximo_pago AS proximoPago,
          COUNT(DISTINCT u2.id) AS usuariosActuales,
          p.max_usuarios AS usuariosPermitidos
        FROM tiendas t
        LEFT JOIN suscripciones s ON s.tienda_id = t.id
        LEFT JOIN planes p ON p.id = s.plan_id
        LEFT JOIN usuarios u ON u.tienda_id = t.id AND u.rol_id = 2
        LEFT JOIN usuarios u2 ON u2.tienda_id = t.id AND u2.deleted_at IS NULL AND u2.estado = 'ACTIVO'
        WHERE t.deleted_at IS NULL
        GROUP BY t.id, s.id, p.id, u.id, u.nombre, u.email
        ORDER BY t.id ASC
      `);

      const [mrrRow] = await db.query(`
        SELECT COALESCE(SUM(p.precio_mensual), 0) AS mrr
        FROM suscripciones s
        JOIN planes p ON p.id = s.plan_id
        WHERE s.estado = 'ACTIVA'
      `);

      const [statsRow] = await db.query(`
        SELECT
          COUNT(CASE WHEN estado = 'ACTIVA' THEN 1 END) AS totalActivas,
          COUNT(CASE WHEN estado = 'SUSPENDIDA' THEN 1 END) AS totalSuspendidas,
          COUNT(CASE WHEN estado = 'PRUEBA' THEN 1 END) AS totalTrial
        FROM suscripciones
      `);

      res.json({
        success: true,
        mrrTotal: parseFloat(mrrRow[0]?.mrr || 0),
        totalActivas: statsRow[0]?.totalActivas || 0,
        totalSuspendidas: statsRow[0]?.totalSuspendidas || 0,
        totalTrial: statsRow[0]?.totalTrial || 0,
        stores
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateStorePlan(req, res, next) {
    try {
      const { storeId, plan, monto } = req.body;
      if (!storeId || !monto) {
        return res.status(400).json({ success: false, error: 'storeId y monto son requeridos' });
      }

      const planId = PLAN_BY_AMOUNT[parseInt(monto, 10)] || 2;
      await db.query(
        `UPDATE suscripciones SET plan_id = ? WHERE tienda_id = ?`,
        [planId, storeId]
      );

      res.json({
        success: true,
        message: `Plan del comercio #${storeId} actualizado a ${plan || monto} ($${monto}/mes)`
      });
    } catch (err) {
      next(err);
    }
  }

  static async toggleStoreStatus(req, res, next) {
    try {
      const { storeId, estado } = req.body;
      if (!storeId || !estado) {
        return res.status(400).json({ success: false, error: 'storeId y estado son requeridos' });
      }

      const estadoEnum = estado === 'Activa' ? 'ACTIVA' : 'SUSPENDIDA';
      await db.query(
        `UPDATE suscripciones SET estado = ? WHERE tienda_id = ?`,
        [estadoEnum, storeId]
      );

      res.json({
        success: true,
        message: `Estado del comercio #${storeId} cambiado a ${estado}`
      });
    } catch (err) {
      next(err);
    }
  }

  static async getPendingPayments(req, res, next) {
    try {
      const [payments] = await db.query(`
        SELECT
          rp.id,
          t.nombre AS tiendaNombre,
          u.nombre AS dueno,
          u.email,
          pl.nombre AS planReportado,
          rp.metodo_pago AS metodo,
          rp.referencia,
          rp.monto_usd AS monto,
          rp.banco_emisor AS bancoEmisor,
          rp.estado,
          rp.created_at AS fecha
        FROM reportes_pago rp
        JOIN tiendas t ON t.id = rp.tienda_id
        JOIN planes pl ON pl.id = rp.plan_id
        LEFT JOIN usuarios u ON u.tienda_id = rp.tienda_id AND u.rol_id = 2
        WHERE rp.estado = 'PENDIENTE'
        ORDER BY rp.created_at DESC
      `);

      res.json({ success: true, data: payments });
    } catch (err) {
      next(err);
    }
  }

  static async approvePayment(req, res, next) {
    try {
      const { pagoId } = req.params;

      const [rows] = await db.query(`SELECT * FROM reportes_pago WHERE id = ?`, [pagoId]);
      if (!rows.length) {
        return res.status(404).json({ success: false, error: 'Pago no encontrado' });
      }

      const pago = rows[0];
      await db.query(`UPDATE reportes_pago SET estado = 'APROBADO' WHERE id = ?`, [pagoId]);

      const proximoPago = new Date();
      proximoPago.setDate(proximoPago.getDate() + 30);

      await db.query(
        `UPDATE suscripciones SET estado = 'ACTIVA', plan_id = ?, proximo_pago = ? WHERE tienda_id = ?`,
        [pago.plan_id, proximoPago.toISOString().split('T')[0], pago.tienda_id]
      );

      res.json({
        success: true,
        message: `Pago #${pagoId} aprobado. Suscripción activada hasta ${proximoPago.toLocaleDateString('es-VE')}`,
        tiendaId: pago.tienda_id
      });
    } catch (err) {
      next(err);
    }
  }

  static async rejectPayment(req, res, next) {
    try {
      const { pagoId } = req.params;
      await db.query(`UPDATE reportes_pago SET estado = 'RECHAZADO' WHERE id = ?`, [pagoId]);
      res.json({ success: true, message: `Pago #${pagoId} rechazado` });
    } catch (err) {
      next(err);
    }
  }

  static async getProducts(req, res, next) {
    try {
      const tiendaId = req.user?.tiendaId || 1;
      const [products] = await db.query(
        `SELECT p.id,
                p.codigo_ref AS codigo,
                p.nombre,
                COALESCE(cp.nombre, 'General') AS categoria,
                p.precio_usd AS precioUsd,
                p.stock,
                p.stock_minimo AS minStock
         FROM productos p
         LEFT JOIN categorias_producto cp ON cp.id = p.categoria_id
         WHERE p.tienda_id = ?
         ORDER BY p.nombre ASC`,
        [tiendaId]
      );
      res.json({ success: true, data: products });
    } catch (err) {
      next(err);
    }
  }

  static async createProduct(req, res, next) {
    try {
      const tiendaId = req.user?.tiendaId || 1;
      const { codigo, nombre, categoria, precioUsd, stock, minStock } = req.body;

      const normalizedCategoria = (categoria || 'General').trim();
      const [catRows] = await db.query(
        `SELECT id FROM categorias_producto WHERE tienda_id = ? AND nombre = ? LIMIT 1`,
        [tiendaId, normalizedCategoria]
      );

      let categoriaId = catRows[0]?.id || null;
      if (!categoriaId) {
        const [insertCat] = await db.query(
          `INSERT INTO categorias_producto (tienda_id, nombre) VALUES (?, ?)`,
          [tiendaId, normalizedCategoria]
        );
        categoriaId = insertCat.insertId;
      }

      const [result] = await db.query(
        `INSERT INTO productos (tienda_id, categoria_id, codigo_ref, nombre, precio_usd, stock, stock_minimo)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [tiendaId, categoriaId, codigo, nombre, precioUsd, stock || 0, minStock || 5]
      );
      res.status(201).json({ success: true, id: result.insertId, message: 'Producto creado' });
    } catch (err) {
      next(err);
    }
  }

  static async getDashboardStats(req, res, next) {
    try {
      const tiendaId = req.user?.tiendaId || 1;

      const [[ventas]] = await db.query(
        `SELECT
          COALESCE(SUM(monto_total_usd), 0) AS totalUsd,
          COUNT(*) AS totalVentas
         FROM ventas v
         JOIN cajas c ON c.id = v.caja_id
         WHERE c.tienda_id = ? AND MONTH(v.created_at) = MONTH(NOW()) AND YEAR(v.created_at) = YEAR(NOW())`,
        [tiendaId]
      );

      const [[inventario]] = await db.query(
        `SELECT
          COUNT(CASE WHEN stock > 0 AND stock <= stock_minimo THEN 1 END) AS lowStock,
          COUNT(CASE WHEN stock = 0 THEN 1 END) AS emptyStock
         FROM productos WHERE tienda_id = ?`,
        [tiendaId]
      );

      const hasCuentasFeature = Array.isArray(req.user?.features)
        && req.user.features.includes('cuentas');
      const isSuperAdmin = (req.user?.role || '').toUpperCase() === 'SUPERADMIN';

      let totalPendienteUsd = 0;
      if (hasCuentasFeature || isSuperAdmin) {
        const [[cuentas]] = await db.query(
          `SELECT COALESCE(SUM(monto_usd), 0) AS totalPendiente
           FROM cuentas_pagar WHERE tienda_id = ? AND estado IN ('PENDIENTE', 'VENCIDA', 'PARCIAL')`,
          [tiendaId]
        );
        totalPendienteUsd = parseFloat(cuentas?.totalPendiente || 0);
      }

      res.json({
        success: true,
        data: {
          facturacionUsd: parseFloat(ventas?.totalUsd || 0),
          totalVentas: ventas?.totalVentas || 0,
          lowStock: inventario?.lowStock || 0,
          emptyStock: inventario?.emptyStock || 0,
          totalPendienteUsd
        }
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AdminController;
