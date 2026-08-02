const db = require('../../config/db');

class GastoController {
  static async list(req, res, next) {
    try {
      const tiendaId = req.user?.tiendaId;
      const [rows] = await db.query(
        `SELECT id, concepto, monto_usd AS montoUsd, categoria, fecha, notas
         FROM gastos_administrativos
         WHERE tienda_id = ? AND deleted_at IS NULL
         ORDER BY fecha DESC, id DESC`,
        [tiendaId]
      );
      res.json({ success: true, data: rows });
    } catch (err) {
      next(err);
    }
  }

  static async create(req, res, next) {
    try {
      const tiendaId = req.user?.tiendaId;
      const { concepto, montoUsd, categoria, fecha, notas } = req.body;
      if (!concepto?.trim() || !montoUsd) {
        return res.status(400).json({ success: false, error: 'concepto y montoUsd son requeridos' });
      }

      const [result] = await db.query(
        `INSERT INTO gastos_administrativos (tienda_id, concepto, monto_usd, categoria, fecha, notas)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          tiendaId,
          concepto.trim(),
          parseFloat(montoUsd),
          (categoria || 'General').trim(),
          fecha || new Date().toISOString().slice(0, 10),
          notas?.trim() || null
        ]
      );

      res.status(201).json({ success: true, id: result.insertId, message: 'Gasto registrado' });
    } catch (err) {
      next(err);
    }
  }

  static async remove(req, res, next) {
    try {
      const tiendaId = req.user?.tiendaId;
      const id = parseInt(req.params.id, 10);
      await db.query(
        `UPDATE gastos_administrativos SET deleted_at = NOW() WHERE id = ? AND tienda_id = ?`,
        [id, tiendaId]
      );
      res.json({ success: true, message: 'Gasto eliminado' });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = GastoController;
