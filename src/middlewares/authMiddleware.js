const jwt = require('jsonwebtoken');
const env = require('../../config/env');
const db = require('../../config/db');
const { syncRequestSubscriptionState } = require('../services/subscriptionLifecycleService');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Acceso no autorizado: Token no provisto' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Token inválido o expirado' });
  }
};

const checkRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Usuario no autenticado' });
    }

    const userRole = (req.user.role || 'ADMIN').toUpperCase();
    const formattedAllowed = allowedRoles.map(r => r.toUpperCase());

    if (userRole === 'SUPERADMIN' || formattedAllowed.includes(userRole)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: `Acceso denegado: Tu rol (${userRole}) no tiene permisos para esta acción`
    });
  };
};

const subscriptionSuspendedResponse = () => ({
  success: false,
  error: 'Tu suscripción está suspendida. Renueva tu plan para continuar.',
  subscriptionSuspended: true,
  upgradeUrl: '/planes',
});

const checkSubscriptionActive = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Usuario no autenticado' });
    }

    const userRole = (req.user.role || '').toUpperCase();
    if (userRole === 'SUPERADMIN') {
      return next();
    }

    await syncRequestSubscriptionState(db, req);

    if (req.user.subscriptionActive === false) {
      return res.status(403).json(subscriptionSuspendedResponse());
    }

    next();
  } catch (err) {
    next(err);
  }
};

const checkFeature = (feature) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Usuario no autenticado' });
      }

      const userRole = (req.user.role || '').toUpperCase();
      if (userRole === 'SUPERADMIN') {
        return next();
      }

      await syncRequestSubscriptionState(db, req);

      if (req.user.subscriptionActive === false) {
        return res.status(403).json(subscriptionSuspendedResponse());
      }

      const features = req.user.features || [];
      if (!features.includes(feature)) {
        return res.status(403).json({
          success: false,
          error: 'Tu plan actual no incluye esta funcionalidad',
          requiredFeature: feature,
          upgradeUrl: '/planes'
        });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = {
  verifyToken,
  checkRole,
  checkSubscriptionActive,
  checkFeature
};
