const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../../config/db');
const env = require('../../config/env');
const UserModel = require('../models/UserModel');
const { issueAuthToken } = require('./authPayload');
const { refreshSubscriptionForStore } = require('../services/subscriptionLifecycleService');

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
      const { token, user: userResponse } = issueAuthToken(user, subscription);

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
      const { token, user: userResponse } = issueAuthToken(user, subscription);

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
}

module.exports = new AuthController();
