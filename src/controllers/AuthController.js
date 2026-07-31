const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../../config/env');
const UserModel = require('../models/UserModel');
const { resolveFeatures } = require('../config/planFeatures');

function buildAuthPayload(user, subscription) {
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
      subscriptionActive
    }
  };
}

class AuthController {
  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Correo y contraseña son requeridos' });
      }

      const user = await UserModel.findByEmailIncludingInactive(email.trim().toLowerCase());
      if (!user || user.deleted_at) {
        return res.status(401).json({ success: false, error: 'Credenciales inválidas' });
      }

      if (user.estado === 'BLOQUEADO') {
        return res.status(403).json({ success: false, error: 'Tu cuenta está bloqueada. Contacta al administrador.' });
      }
      if (user.estado === 'INACTIVO') {
        return res.status(403).json({ success: false, error: 'Tu cuenta está inactiva. Contacta al administrador.' });
      }

      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({ success: false, error: 'Credenciales inválidas' });
      }

      await UserModel.updateLastLogin(user.id);

      const subscription = await UserModel.findSubscriptionByTiendaId(user.tienda_id);
      const { tokenPayload, userResponse } = buildAuthPayload(user, subscription);

      const token = jwt.sign(tokenPayload, env.JWT_SECRET, {
        expiresIn: env.JWT_EXPIRES_IN || '8h'
      });

      return res.json({
        success: true,
        message: 'Inicio de sesión exitoso',
        token,
        user: userResponse
      });
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req, res, next) {
    try {
      const user = await UserModel.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
      }

      const subscription = await UserModel.findSubscriptionByTiendaId(user.tienda_id);
      const { userResponse } = buildAuthPayload(user, subscription);

      return res.json({ success: true, user: userResponse });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
