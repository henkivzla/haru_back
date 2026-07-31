const db = require('../../config/db');

// Schema normalizado v2.0: columnas renombradas (monto_zelle, monto_pago_movil, monto_pos)
class CashRegisterModel {
  static async findActiveByUser(usuarioId) {
    const [rows] = await db.execute(
      `SELECT * FROM cajas WHERE usuario_id = ? AND estado = 'ABIERTA' ORDER BY id DESC LIMIT 1`,
      [usuarioId]
    );
    return rows[0] || null;
  }

  static async open({ tiendaId, usuarioId, montoUsd, montoBs, desgloseUsd, desgloseBs, zelle, pagoMovil, pos, tasaBcv }) {
    const [result] = await db.execute(
      `INSERT INTO cajas
       (tienda_id, usuario_id, monto_apertura_usd, monto_apertura_bs,
        desglose_usd, desglose_bs, monto_zelle, monto_pago_movil, monto_pos, tasa_bcv_apertura)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tiendaId, usuarioId,
        montoUsd || 0, montoBs || 0,
        JSON.stringify(desgloseUsd || {}),
        JSON.stringify(desgloseBs || {}),
        zelle || 0, pagoMovil || 0, pos || 0,
        tasaBcv
      ]
    );
    return result.insertId;
  }

  static async close(cajaId) {
    const [result] = await db.execute(
      `UPDATE cajas SET estado = 'CERRADA', cerrada_at = NOW() WHERE id = ?`,
      [cajaId]
    );
    return result.affectedRows > 0;
  }
}

module.exports = CashRegisterModel;
