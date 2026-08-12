const jwt = require('jsonwebtoken');
const env = require('../../config/env');
const { resolveFeatures } = require('../config/planFeatures');
const { resolveAppearance } = require('../constants/accentPalette');
const { resolveModoVentas } = require('../services/tiendaSettingsService');
const { computeSubscriptionReminder } = require('../services/subscriptionReminderService');

function buildAuthPayload(user, subscription, extras = {}) {
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
  const pendingPayment = extras.pendingPayment ?? null;
  const modoVentas = resolveModoVentas(user);
  const storeRif = String(user.tienda_rif || '').trim() || null;

  const subscriptionReminder = !isSuperAdmin && subscription
    ? computeSubscriptionReminder({
        proximoPago: subscription.proximoPago,
        subscriptionEstado: subscription.estado,
        subscriptionActive,
        pendingPayment,
      })
    : null;

  return {
    tokenPayload: {
      id: user.id,
      tiendaId: user.tienda_id,
      email: user.email,
      role,
      planSlug,
      features,
      subscriptionActive,
      modoVentas,
    },
    userResponse: {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      role,
      tiendaNombre: user.tienda_nombre,
      storeRif,
      planSlug,
      planNombre: subscription?.planNombre || (isSuperAdmin ? 'Plan Pro' : 'Plan Económico'),
      planMonto: subscription?.planMonto || (planSlug === 'pro' ? 7 : planSlug === 'estandar' ? 5 : 3),
      subscriptionEstado: subscription?.estado || (isSuperAdmin ? 'ACTIVA' : 'PRUEBA'),
      proximoPago: subscription?.proximoPago || null,
      maxUsuarios: subscription?.maxUsuarios || (planSlug === 'pro' ? 999 : planSlug === 'estandar' ? 3 : 1),
      maxProductos: isSuperAdmin
        ? null
        : (subscription?.maxProductos ?? (planSlug === 'pro' ? null : planSlug === 'estandar' ? 300 : 75)),
      features,
      subscriptionActive,
      appearance,
      canCustomizeAppearance,
      pendingPayment,
      subscriptionReminder,
      ultimoLogin: user.ultimo_login || null,
      createdAt: user.created_at || null,
      accountEstado: user.estado || 'ACTIVO',
      modoVentas,
    }
  };
}

function issueAuthToken(user, subscription, extras = {}) {
  const { tokenPayload, userResponse } = buildAuthPayload(user, subscription, extras);
  const token = jwt.sign(tokenPayload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN || '8h'
  });
  return { token, user: userResponse, tokenPayload };
}

module.exports = { buildAuthPayload, issueAuthToken };
