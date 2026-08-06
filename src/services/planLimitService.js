const db = require('../../config/db');
const UserModel = require('../models/UserModel');

const DEFAULT_MAX_PRODUCTOS = 75;

async function getMaxUsuarios(tiendaId) {
  const subscription = await UserModel.findSubscriptionByTiendaId(tiendaId);
  return subscription?.maxUsuarios || 1;
}

async function assertCanAddUser(tiendaId) {
  const max = await getMaxUsuarios(tiendaId);
  const count = await UserModel.countActiveByTienda(tiendaId);
  if (count >= max) {
    const err = new Error(
      `Límite de usuarios alcanzado (${count}/${max}). Mejora tu plan para agregar más miembros al equipo.`
    );
    err.statusCode = 403;
    err.code = 'USER_LIMIT';
    throw err;
  }
}

async function getMaxProductos(tiendaId) {
  const subscription = await UserModel.findSubscriptionByTiendaId(tiendaId);
  if (!subscription) return DEFAULT_MAX_PRODUCTOS;
  if (subscription.maxProductos == null) return null;
  return Number(subscription.maxProductos) || DEFAULT_MAX_PRODUCTOS;
}

async function countActiveProducts(tiendaId) {
  const [rows] = await db.execute(
    `SELECT COUNT(*) AS total
     FROM productos
     WHERE tienda_id = ? AND deleted_at IS NULL`,
    [tiendaId]
  );
  return Number(rows[0]?.total || 0);
}

async function getProductLimitInfo(tiendaId) {
  const maxProductos = await getMaxProductos(tiendaId);
  const activos = await countActiveProducts(tiendaId);
  const unlimited = maxProductos == null;

  if (unlimited) {
    return {
      activos,
      maxProductos: null,
      unlimited: true,
      puedeAgregar: true,
      restantes: null,
    };
  }

  const restantes = Math.max(0, maxProductos - activos);
  return {
    activos,
    maxProductos,
    unlimited: false,
    puedeAgregar: activos < maxProductos,
    restantes,
  };
}

async function assertCanAddProducts(tiendaId, count = 1) {
  const info = await getProductLimitInfo(tiendaId);
  if (info.unlimited) return info;

  const qty = Math.max(1, Number(count) || 1);
  if (info.activos + qty > info.maxProductos) {
    const err = new Error(
      info.restantes === 0
        ? `Límite de productos alcanzado (${info.activos}/${info.maxProductos}). Mejora tu plan para agregar más productos.`
        : `Solo puedes agregar ${info.restantes} producto(s) más (${info.activos}/${info.maxProductos}). Mejora tu plan para ampliar el catálogo.`
    );
    err.statusCode = 403;
    err.code = 'PRODUCT_LIMIT';
    throw err;
  }

  return info;
}

module.exports = {
  getMaxUsuarios,
  assertCanAddUser,
  getMaxProductos,
  countActiveProducts,
  getProductLimitInfo,
  assertCanAddProducts,
};
