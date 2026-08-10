const db = require('../../config/db');

function hasTiendaRif(userOrTienda = {}) {
  const rif = userOrTienda.tienda_rif ?? userOrTienda.rif ?? '';
  return Boolean(String(rif || '').trim());
}

function resolveModoVentas(userOrTienda = {}) {
  const role = String(userOrTienda.rol || userOrTienda.role || '').toUpperCase();
  if (role === 'SUPERADMIN') return 'turno';
  if (!hasTiendaRif(userOrTienda)) return 'directo';
  return userOrTienda.tienda_modo_ventas === 'directo' || userOrTienda.modo_ventas === 'directo'
    ? 'directo'
    : 'turno';
}

async function getModoVentas(tiendaId) {
  if (!tiendaId) return 'turno';

  const [rows] = await db.execute(
    `SELECT modo_ventas, rif
     FROM tiendas
     WHERE id = ? AND deleted_at IS NULL
     LIMIT 1`,
    [tiendaId]
  );

  return resolveModoVentas(rows[0] || {});
}

function isValidModoVentas(value) {
  return value === 'turno' || value === 'directo';
}

module.exports = {
  getModoVentas,
  resolveModoVentas,
  hasTiendaRif,
  isValidModoVentas,
};
