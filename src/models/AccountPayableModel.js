const db = require('../../config/db');

class AccountPayableModel {
  static async findPendingByStore(tiendaId) {
    const [rows] = await db.execute(
      `SELECT * FROM cuentas_por_pagar WHERE tienda_id = ? AND estado != 'PAGADA' ORDER BY fecha_vencimiento ASC`,
      [tiendaId]
    );
    return rows;
  }

  static async markAsPaid(id) {
    const [result] = await db.execute(
      `UPDATE cuentas_por_pagar SET estado = 'PAGADA' WHERE id = ?`,
      [id]
    );
    return result.affectedRows > 0;
  }
}

module.exports = AccountPayableModel;
