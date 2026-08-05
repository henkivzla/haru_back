const db = require('../../config/db');

function mapCajaRow(row) {
  if (!row) return null;
  const parseJson = (value) => {
    if (!value) return {};
    if (typeof value === 'object') return value;
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  };

  return {
    id: row.id,
    tiendaId: row.tienda_id,
    usuarioId: row.usuario_id,
    usuarioNombre: row.usuario_nombre || row.usuarioNombre || null,
    cerradoPorId: row.cerrado_por_id || null,
    cerradoPorNombre: row.cerrado_por_nombre || row.cerradoPorNombre || null,
    estado: row.estado,
    tasaBcvApertura: row.tasa_bcv_apertura,
    tasaEurApertura: row.tasa_eur_apertura,
    montoAperturaUsd: row.monto_apertura_usd,
    montoAperturaBs: row.monto_apertura_bs,
    montoAperturaEur: row.monto_apertura_eur,
    desgloseUsd: parseJson(row.desglose_usd),
    desgloseBs: parseJson(row.desglose_bs),
    desgloseEur: parseJson(row.desglose_eur),
    montoZelle: row.monto_zelle,
    montoPagoMovil: row.monto_pago_movil,
    montoPos: row.monto_pos,
    montoCierreUsd: row.monto_cierre_usd,
    montoCierreBs: row.monto_cierre_bs,
    montoCierreEur: row.monto_cierre_eur,
    desgloseCierreUsd: parseJson(row.desglose_cierre_usd),
    desgloseCierreBs: parseJson(row.desglose_cierre_bs),
    desgloseCierreEur: parseJson(row.desglose_cierre_eur),
    ventasTotalUsd: row.ventas_total_usd,
    ventasTotalBs: row.ventas_total_bs,
    ventasTotalEur: row.ventas_total_eur,
    ventasCantidad: row.ventas_cantidad,
    tasaBcvCierre: row.tasa_bcv_cierre,
    tasaEurCierre: row.tasa_eur_cierre,
    notasCierre: row.notas_cierre,
    abiertaAt: row.abierta_at,
    cerradaAt: row.cerrada_at,
  };
}

class CashRegisterModel {
  static async findActiveByUser(usuarioId) {
    const [rows] = await db.execute(
      `SELECT c.*, u.nombre AS usuario_nombre
       FROM cajas c
       JOIN usuarios u ON u.id = c.usuario_id
       WHERE c.usuario_id = ? AND c.estado = 'ABIERTA'
       ORDER BY c.id DESC LIMIT 1`,
      [usuarioId]
    );
    return mapCajaRow(rows[0]);
  }

  static async open({
    tiendaId,
    usuarioId,
    montoUsd,
    montoBs,
    montoEur,
    desgloseUsd,
    desgloseBs,
    desgloseEur,
    zelle,
    pagoMovil,
    pos,
    tasaBcv,
    tasaEur,
  }) {
    const active = await CashRegisterModel.findActiveByUser(usuarioId);
    if (active) {
      throw new Error('Ya tienes una caja abierta. Ciérrala antes de abrir otra.');
    }

    const [result] = await db.execute(
      `INSERT INTO cajas (
         tienda_id, usuario_id,
         monto_apertura_usd, monto_apertura_bs, monto_apertura_eur,
         desglose_usd, desglose_bs, desglose_eur,
         monto_zelle, monto_pago_movil, monto_pos,
         tasa_bcv_apertura, tasa_eur_apertura
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tiendaId,
        usuarioId,
        montoUsd || 0,
        montoBs || 0,
        montoEur || 0,
        JSON.stringify(desgloseUsd || {}),
        JSON.stringify(desgloseBs || {}),
        JSON.stringify(desgloseEur || {}),
        zelle || 0,
        pagoMovil || 0,
        pos || 0,
        tasaBcv,
        tasaEur || null,
      ]
    );
    return result.insertId;
  }

  static async getVentasSummary(cajaId) {
    const [rows] = await db.execute(
      `SELECT
         COUNT(*) AS cantidad,
         COALESCE(SUM(monto_total_usd), 0) AS totalUsd,
         COALESCE(SUM(monto_total_bs), 0) AS totalBs
       FROM ventas
       WHERE caja_id = ? AND anulada = 0`,
      [cajaId]
    );
    return {
      cantidad: Number(rows[0]?.cantidad || 0),
      totalUsd: Number(rows[0]?.totalUsd || 0),
      totalBs: Number(rows[0]?.totalBs || 0),
    };
  }

  static async close(cajaId, payload) {
    const [result] = await db.execute(
      `UPDATE cajas SET
         estado = 'CERRADA',
         cerrada_at = NOW(),
         monto_cierre_usd = ?,
         monto_cierre_bs = ?,
         monto_cierre_eur = ?,
         desglose_cierre_usd = ?,
         desglose_cierre_bs = ?,
         desglose_cierre_eur = ?,
         ventas_total_usd = ?,
         ventas_total_bs = ?,
         ventas_total_eur = ?,
         ventas_cantidad = ?,
         tasa_bcv_cierre = ?,
         tasa_eur_cierre = ?,
         cerrado_por_id = ?,
         notas_cierre = ?
       WHERE id = ? AND estado = 'ABIERTA'`,
      [
        payload.montoCierreUsd,
        payload.montoCierreBs,
        payload.montoCierreEur,
        JSON.stringify(payload.desgloseCierreUsd || {}),
        JSON.stringify(payload.desgloseCierreBs || {}),
        JSON.stringify(payload.desgloseCierreEur || {}),
        payload.ventasTotalUsd,
        payload.ventasTotalBs,
        payload.ventasTotalEur,
        payload.ventasCantidad,
        payload.tasaBcvCierre,
        payload.tasaEurCierre,
        payload.cerradoPorId,
        payload.notasCierre || null,
        cajaId,
      ]
    );
    return result.affectedRows > 0;
  }

  static async listHistorial(tiendaId, { fecha = null, limit = 60 } = {}) {
    const params = [tiendaId];
    let dateFilter = '';
    if (fecha) {
      dateFilter = ' AND DATE(c.cerrada_at) = ?';
      params.push(fecha);
    }
    params.push(Math.min(Math.max(Number(limit) || 60, 1), 200));

    const [rows] = await db.execute(
      `SELECT c.*,
              u.nombre AS usuario_nombre,
              uc.nombre AS cerrado_por_nombre
       FROM cajas c
       JOIN usuarios u ON u.id = c.usuario_id
       LEFT JOIN usuarios uc ON uc.id = c.cerrado_por_id
       WHERE c.tienda_id = ? AND c.estado = 'CERRADA'
       ${dateFilter}
       ORDER BY c.cerrada_at DESC
       LIMIT ?`,
      params
    );
    return rows.map(mapCajaRow);
  }

  static async getCierreById(cajaId, tiendaId) {
    const [rows] = await db.execute(
      `SELECT c.*,
              u.nombre AS usuario_nombre,
              uc.nombre AS cerrado_por_nombre
       FROM cajas c
       JOIN usuarios u ON u.id = c.usuario_id
       LEFT JOIN usuarios uc ON uc.id = c.cerrado_por_id
       WHERE c.id = ? AND c.tienda_id = ? AND c.estado = 'CERRADA'
       LIMIT 1`,
      [cajaId, tiendaId]
    );
    const caja = mapCajaRow(rows[0]);
    if (!caja) return null;

    const [ventas] = await db.execute(
      `SELECT id, metodo_pago AS metodoPago, monto_total_usd AS montoUsd,
              monto_total_bs AS montoBs, created_at AS createdAt
       FROM ventas
       WHERE caja_id = ? AND anulada = 0
       ORDER BY created_at ASC`,
      [cajaId]
    );

    return { ...caja, ventas };
  }
}

module.exports = CashRegisterModel;
