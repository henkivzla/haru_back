const UserModel = require('../models/UserModel');

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

module.exports = { getMaxUsuarios, assertCanAddUser };
