const db = require('../../config/db');

class CashRegisterModel {
  static async findActiveByUser(usuarioId) {
    const [rows] = await db.execute(
      `SELECT * FROM cajas WHERE usuario_id = ? AND estado = 'ABIERTA' ORDER BY id DESC LIMIT 1`,
      [usuarioId]
    );
    return rows[0] || null;
  }

  static async open({ tiendaId, usuarioId, montoUsd, montoBs, desgloseUsd, desgloseBs, zelle, pagoMovil, pos, tasaBcv }) {
    const jsonUsd = JSON.stringify(desgloseUsd || {});
    const jsonBs = JSON.stringify(desgloseBs || {});

    const [result] = await db.execute(
      `INSERT INTO cajas 
       (tienda_id, usuario_id, monto_apertura_usd, monto_apertura_bs, desglose_usd, desglose_bs, monto_zelle_usd, monto_pago_movil_bs, monto_pos_bs, tasa_bcv_apertura, estado) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ABIERTA')`,
      [tiendaId, usuarioId, montoUsd, montoBs, jsonUsd, jsonBs, zelle || 0, pagoMovil || 0, pos || 0, tasaBcv]
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
