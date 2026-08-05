const db = require('../../config/db');
const { resolvePriceFromRequest } = require('../services/priceConversionService');

class GastoController {
  static async list(req, res, next) {
    try {
      const tiendaId = req.user?.tiendaId;
      const [rows] = await db.query(
        `SELECT id, concepto,
                monto_usd AS montoUsd,
                moneda_entrada AS monedaEntrada,
                monto_entrada AS montoEntrada,
                monto_bs_snapshot AS montoBsSnapshot,
                monto_eur_snapshot AS montoEurSnapshot,
                tasa_bcv_snapshot AS tasaBcvSnapshot,
                tasa_eur_snapshot AS tasaEurSnapshot,
                categoria, fecha, notas
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
      const { concepto, montoUsd, monedaEntrada, precioEntrada, montoEntrada, categoria, fecha, notas } = req.body;
      if (!concepto?.trim()) {
        return res.status(400).json({ success: false, error: 'concepto es requerido' });
      }

      const price = await resolvePriceFromRequest({
        monedaEntrada,
        precioEntrada: precioEntrada ?? montoEntrada,
        precioUsd: montoUsd,
      });

      const [result] = await db.query(
        `INSERT INTO gastos_administrativos (
           tienda_id, concepto, monto_usd, moneda_entrada, monto_entrada,
           tasa_bcv_snapshot, tasa_eur_snapshot, monto_bs_snapshot, monto_eur_snapshot,
           categoria, fecha, notas
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tiendaId,
          concepto.trim(),
          price.precioUsd,
          price.monedaEntrada,
          price.precioEntrada,
          price.tasaBcvSnapshot,
          price.tasaEurSnapshot,
          price.precioBsSnapshot,
          price.precioEurSnapshot,
          (categoria || 'General').trim(),
          fecha || new Date().toISOString().slice(0, 10),
          notas?.trim() || null,
        ]
      );

      res.status(201).json({ success: true, id: result.insertId, message: 'Gasto registrado' });
    } catch (err) {
      if (err.message?.includes('precio') || err.message?.includes('tasa') || err.message?.includes('Moneda')) {
        return res.status(400).json({ success: false, error: err.message });
      }
      next(err);
    }
  }

  static async remove(req, res, next) {
    try {
      const tiendaId = req.user?.tiendaId;
      const id = parseInt(req.params.id, 10);
      const [result] = await db.query(
        `UPDATE gastos_administrativos SET deleted_at = NOW() WHERE id = ? AND tienda_id = ? AND deleted_at IS NULL`,
        [id, tiendaId]
      );
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, error: 'Gasto no encontrado' });
      }
      res.json({ success: true, message: 'Gasto eliminado' });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = GastoController;
