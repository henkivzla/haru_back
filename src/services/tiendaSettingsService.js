const db = require('../../config/db');

async function getModoVentas(tiendaId) {
  if (!tiendaId) return 'turno';
  const [rows] = await db.execute(
    `SELECT modo_ventas FROM tiendas WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
    [tiendaId]
  );
  return rows[0]?.modo_ventas === 'directo' ? 'directo' : 'turno';
}

function isValidModoVentas(value) {
  return value === 'turno' || value === 'directo';
}

module.exports = { getModoVentas, isValidModoVentas };
