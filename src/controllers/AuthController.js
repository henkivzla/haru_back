const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../../config/db');
const env = require('../../config/env');
const UserModel = require('../models/UserModel');
const { issueAuthToken } = require('./authPayload');
const { refreshSubscriptionForStore } = require('../services/subscriptionLifecycleService');
const { findPendingReportByTienda } = require('../services/subscriptionPaymentService');

async function resolveAuthExtras(user) {
  if (!user?.tienda_id || user.rol === 'SUPERADMIN') {
    return { pendingPayment: null };
  }
  const pendingPayment = await findPendingReportByTienda(db, user.tienda_id);
  return { pendingPayment };
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

      const subscription = user.rol === 'SUPERADMIN'
        ? null
        : await refreshSubscriptionForStore(db, user.tienda_id);
      const extras = await resolveAuthExtras(user);
      const { token, user: userResponse } = issueAuthToken(user, subscription, extras);

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

      const subscription = user.rol === 'SUPERADMIN'
        ? null
        : await refreshSubscriptionForStore(db, user.tienda_id);
      const extras = await resolveAuthExtras(user);
      const { token, user: userResponse } = issueAuthToken(user, subscription, extras);

      return res.json({ success: true, user: userResponse, token });
    } catch (error) {
      next(error);
    }
  }

  async verifyAdminAction(req, res, next) {
    try {
      const role = (req.user?.role || '').toUpperCase();
      if (role !== 'ADMIN' && role !== 'SUPERADMIN') {
        return res.status(403).json({ success: false, error: 'Solo administradores pueden confirmar esta acción' });
      }

      const { password } = req.body;
      if (!password) {
        return res.status(400).json({ success: false, error: 'La contraseña es requerida' });
      }

      const user = await UserModel.findById(req.user.id);
      if (!user?.password_hash) {
        return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
      }

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ success: false, error: 'Contraseña incorrecta' });
      }

      const reauthToken = jwt.sign(
        { sub: user.id, purpose: 'admin_action' },
        env.JWT_SECRET,
        { expiresIn: '5m' }
      );

      return res.json({
        success: true,
        reauthToken,
        expiresIn: 300,
        message: 'Acción confirmada'
      });
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          error: 'Indica tu contraseña actual y la nueva',
        });
      }

      if (String(newPassword).length < 8) {
        return res.status(400).json({
          success: false,
          error: 'La contraseña debe tener al menos 8 caracteres',
        });
      }

      if (!/[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]/.test(newPassword) || !/\d/.test(newPassword)) {
        return res.status(400).json({
          success: false,
          error: 'La contraseña debe incluir al menos una letra y un número',
        });
      }

      if (currentPassword === newPassword) {
        return res.status(400).json({
          success: false,
          error: 'La nueva contraseña debe ser distinta a la actual',
        });
      }

      const user = await UserModel.findByIdWithPassword(req.user.id);
      if (!user?.password_hash) {
        return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
      }

      const valid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!valid) {
        return res.status(401).json({ success: false, error: 'La contraseña actual no es correcta' });
      }

      const passwordHash = bcrypt.hashSync(newPassword, 10);
      await UserModel.updatePassword(user.id, passwordHash);

      return res.json({
        success: true,
        message: 'Contraseña actualizada correctamente',
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
