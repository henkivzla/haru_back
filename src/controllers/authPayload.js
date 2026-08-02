const jwt = require('jsonwebtoken');
const env = require('../../config/env');
const { resolveFeatures } = require('../config/planFeatures');
const { resolveAppearance } = require('../constants/accentPalette');

function buildAuthPayload(user, subscription) {
  if (!user) {
    throw new Error('Usuario no encontrado');
  }

  const role = user.rol;
  const isSuperAdmin = role === 'SUPERADMIN';
  const subscriptionActive = !subscription || ['ACTIVA', 'PRUEBA'].includes(subscription.estado);
  const planSlug = isSuperAdmin ? 'pro' : (subscription?.planSlug || 'economico');

  let features = isSuperAdmin
    ? resolveFeatures('pro')
    : resolveFeatures(planSlug);

  if (!isSuperAdmin && subscription && !subscriptionActive) {
    features = ['planes'];
  }

  const appearance = resolveAppearance(user);
  const canCustomizeAppearance = isSuperAdmin || role === 'ADMIN';

  return {
    tokenPayload: {
      id: user.id,
      tiendaId: user.tienda_id,
      email: user.email,
      role,
      planSlug,
      features,
      subscriptionActive
    },
    userResponse: {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      role,
      tiendaNombre: user.tienda_nombre,
      planSlug,
      planNombre: subscription?.planNombre || (isSuperAdmin ? 'Plan Pro' : 'Plan Económico'),
      planMonto: subscription?.planMonto || (planSlug === 'pro' ? 22 : planSlug === 'estandar' ? 18 : 15),
      subscriptionEstado: subscription?.estado || (isSuperAdmin ? 'ACTIVA' : 'PRUEBA'),
      proximoPago: subscription?.proximoPago || null,
      maxUsuarios: subscription?.maxUsuarios || (planSlug === 'pro' ? 999 : planSlug === 'estandar' ? 3 : 1),
      features,
      subscriptionActive,
      appearance,
      canCustomizeAppearance
    }
  };
}

function issueAuthToken(user, subscription) {
  const { tokenPayload, userResponse } = buildAuthPayload(user, subscription);
  const token = jwt.sign(tokenPayload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN || '8h'
  });
  return { token, user: userResponse, tokenPayload };
}

module.exports = { buildAuthPayload, issueAuthToken };
