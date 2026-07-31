const db = require('../../config/db');

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
          s.plan,
          s.precio_mensual AS planMonto,
          s.ciclo,
          s.estado,
          s.proximo_pago AS proximoPago,
          COUNT(DISTINCT u2.id) AS usuariosActuales,
          CASE s.plan
            WHEN 'ECONOMICO' THEN 1
            WHEN 'ESTANDAR' THEN 3
            WHEN 'PRO' THEN 999
            ELSE 1
          END AS usuariosPermitidos
        FROM tiendas t
        LEFT JOIN usuarios u ON u.tienda_id = t.id AND u.rol = 'ADMIN'
        LEFT JOIN suscripciones s ON s.tienda_id = t.id
        LEFT JOIN usuarios u2 ON u2.tienda_id = t.id
        GROUP BY t.id, s.id
        ORDER BY t.id ASC
      `);

      const [mrrRow] = await db.query(`
        SELECT COALESCE(SUM(precio_mensual), 0) AS mrr
        FROM suscripciones
        WHERE estado = 'ACTIVATED'
      `);

      const [statsRow] = await db.query(`
        SELECT
          COUNT(CASE WHEN estado = 'ACTIVATED' THEN 1 END) AS totalActivas,
          COUNT(CASE WHEN estado = 'SUSPENDED' THEN 1 END) AS totalSuspendidas,
          COUNT(CASE WHEN estado = 'TRIAL' THEN 1 END) AS totalTrial
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
      if (!storeId || !plan) {
        return res.status(400).json({ success: false, error: 'storeId y plan son requeridos' });
      }

      const planEnum = plan.toUpperCase().replace('Ó', 'O').replace('Á', 'A');
      await db.query(
        `UPDATE suscripciones SET plan = ?, precio_mensual = ? WHERE tienda_id = ?`,
        [planEnum, monto, storeId]
      );

      res.json({
        success: true,
        message: `Plan del comercio #${storeId} actualizado a ${plan} ($${monto}/mes)`
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

      const estadoEnum = estado === 'Activa' ? 'ACTIVATED' : 'SUSPENDED';
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
          rp.plan AS planReportado,
          rp.metodo_pago AS metodo,
          rp.referencia,
          rp.monto,
          rp.banco_emisor AS bancoEmisor,
          rp.estado,
          rp.created_at AS fecha
        FROM reportes_pago rp
        JOIN tiendas t ON t.id = rp.tienda_id
        LEFT JOIN usuarios u ON u.tienda_id = rp.tienda_id AND u.rol = 'ADMIN'
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

      // Marcar pago como aprobado
      await db.query(`UPDATE reportes_pago SET estado = 'APROBADO' WHERE id = ?`, [pagoId]);

      // Calcular nuevo proximo_pago (30 días desde hoy)
      const proximoPago = new Date();
      proximoPago.setDate(proximoPago.getDate() + 30);

      // Activar suscripción de la tienda
      await db.query(
        `UPDATE suscripciones SET estado = 'ACTIVATED', proximo_pago = ? WHERE tienda_id = ?`,
        [proximoPago.toISOString().split('T')[0], pago.tienda_id]
      );

      res.json({
        success: true,
        message: `Pago #${pagoId} aprobado. Suscripción activada hasta ${proximoPago.toLocaleDateString('es-VE')}`
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

  // Productos: inventario real desde BD
  static async getProducts(req, res, next) {
    try {
      const tiendaId = req.user?.tiendaId || 1;
      const [products] = await db.query(
        `SELECT id, codigo_ref AS codigo, nombre, categoria, precio_usd AS precioUsd, stock, stock_minimo AS minStock
         FROM productos WHERE tienda_id = ? ORDER BY nombre ASC`,
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

      const [result] = await db.query(
        `INSERT INTO productos (tienda_id, codigo_ref, nombre, categoria, precio_usd, stock, stock_minimo)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [tiendaId, codigo, nombre, categoria || 'General', precioUsd, stock || 0, minStock || 5]
      );
      res.status(201).json({ success: true, id: result.insertId, message: 'Producto creado' });
    } catch (err) {
      next(err);
    }
  }

  // Cuentas por pagar: desde BD
  static async getAccounts(req, res, next) {
    try {
      const tiendaId = req.user?.tiendaId || 1;
      const [accounts] = await db.query(
        `SELECT id, proveedor, producto, monto_usd AS montoUsd, estado, fecha_vencimiento AS fechaVencimiento
         FROM cuentas_pagar WHERE tienda_id = ? AND estado = 'Pendiente' ORDER BY fecha_vencimiento ASC`,
        [tiendaId]
      );
      res.json({ success: true, data: accounts });
    } catch (err) {
      next(err);
    }
  }

  // Dashboard stats desde BD
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

      const [[cuentas]] = await db.query(
        `SELECT COALESCE(SUM(monto_usd), 0) AS totalPendiente
         FROM cuentas_pagar WHERE tienda_id = ? AND estado = 'Pendiente'`,
        [tiendaId]
      );

      res.json({
        success: true,
        data: {
          facturacionUsd: parseFloat(ventas?.totalUsd || 0),
          totalVentas: ventas?.totalVentas || 0,
          lowStock: inventario?.lowStock || 0,
          emptyStock: inventario?.emptyStock || 0,
          totalPendienteUsd: parseFloat(cuentas?.totalPendiente || 0)
        }
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AdminController;
