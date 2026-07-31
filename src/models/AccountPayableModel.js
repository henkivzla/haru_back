const db = require('../../config/db');

// Modelo actualizado para la tabla cuentas_pagar (schema normalizado v2.0)
// Antes: cuentas_por_pagar (nombre incorrecto en schema v1)
// Ahora: cuentas_pagar con JOIN a proveedores

class AccountPayableModel {
  static async findPendingByStore(tiendaId) {
    const [rows] = await db.execute(
      `SELECT
         cp.id,
         cp.descripcion       AS producto,
         cp.monto_usd,
         cp.tasa_origen,
         cp.fecha_vencimiento,
         cp.estado,
         cp.monto_pagado_usd,
         p.nombre             AS proveedor,
         p.rif                AS proveedor_rif
       FROM cuentas_pagar cp
       LEFT JOIN proveedores p ON p.id = cp.proveedor_id
       WHERE cp.tienda_id = ?
         AND cp.estado IN ('PENDIENTE', 'VENCIDA', 'PARCIAL')
       ORDER BY cp.fecha_vencimiento ASC`,
      [tiendaId]
    );
    return rows;
  }

  static async markAsPaid(id) {
    const [result] = await db.execute(
      `UPDATE cuentas_pagar
       SET estado = 'PAGADA', pagada_at = NOW(), monto_pagado_usd = monto_usd
       WHERE id = ?`,
      [id]
    );
    return result.affectedRows > 0;
  }
}

module.exports = AccountPayableModel;
