const db = require('../../config/db');
const UserModel = require('../models/UserModel');
const { isValidAccentKey, isValidThemeMode, normalizeAccentKey, normalizeThemeMode, resolveAppearance } = require('../constants/accentPalette');
const { issueAuthToken } = require('./authPayload');
const { refreshSubscriptionForStore } = require('../services/subscriptionLifecycleService');
const { isValidModoVentas, hasTiendaRif } = require('../services/tiendaSettingsService');

class AppearanceController {
  async updateStoreAppearance(req, res, next) {
    try {
      const role = (req.user?.role || '').toUpperCase();
      if (role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: 'Solo el administrador del comercio puede personalizar la apariencia',
        });
      }

      const tiendaId = req.user?.tiendaId;
      if (!tiendaId) {
        return res.status(400).json({ success: false, error: 'No hay comercio asociado a tu cuenta' });
      }

      const { themeMode, accentKey, modoVentas } = req.body || {};
      if (themeMode !== undefined && !isValidThemeMode(themeMode)) {
        return res.status(400).json({ success: false, error: 'Modo de tema inválido' });
      }
      if (accentKey !== undefined && !isValidAccentKey(accentKey)) {
        return res.status(400).json({ success: false, error: 'Color de acento inválido' });
      }
      if (modoVentas !== undefined && !isValidModoVentas(modoVentas)) {
        return res.status(400).json({ success: false, error: 'Modo de ventas inválido' });
      }

      const [tiendaRows] = await db.execute(
        'SELECT rif FROM tiendas WHERE id = ? AND deleted_at IS NULL LIMIT 1',
        [tiendaId]
      );
      const tiendaHasRif = hasTiendaRif(tiendaRows[0] || {});

      if (modoVentas === 'turno' && !tiendaHasRif) {
        return res.status(400).json({
          success: false,
          error: 'Para usar turno de caja debes registrar el RIF de tu comercio.',
        });
      }

      let nextModoVentas = modoVentas;
      if (!tiendaHasRif) {
        nextModoVentas = 'directo';
      }

      const nextThemeMode = themeMode !== undefined
        ? normalizeThemeMode(themeMode)
        : undefined;
      const nextAccentKey = accentKey !== undefined
        ? normalizeAccentKey(accentKey)
        : undefined;

      const fields = [];
      const params = [];

      if (nextThemeMode !== undefined) {
        fields.push('theme_mode = ?');
        params.push(nextThemeMode);
      }
      if (nextAccentKey !== undefined) {
        fields.push('accent_key = ?');
        params.push(nextAccentKey);
      }
      if (nextModoVentas !== undefined) {
        fields.push('modo_ventas = ?');
        params.push(nextModoVentas);
      }

      if (!fields.length) {
        return res.status(400).json({ success: false, error: 'No hay cambios para guardar' });
      }

      params.push(tiendaId);
      await db.execute(
        `UPDATE tiendas SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ? AND deleted_at IS NULL`,
        params
      );

      const user = await UserModel.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
      }

      const subscription = await refreshSubscriptionForStore(db, tiendaId);
      const { token, user: userResponse } = issueAuthToken(user, subscription);

      return res.json({
        success: true,
        message: 'Configuración del comercio actualizada. Tu equipo la verá al iniciar sesión.',
        appearance: userResponse.appearance,
        user: userResponse,
        token,
      });
    } catch (error) {
      next(error);
    }
  }

  async updatePersonalAppearance(req, res, next) {
    try {
      const role = (req.user?.role || '').toUpperCase();
      if (role !== 'SUPERADMIN') {
        return res.status(403).json({
          success: false,
          error: 'Solo el superadmin puede personalizar su panel',
        });
      }

      const { themeMode, accentKey } = req.body || {};
      if (themeMode !== undefined && !isValidThemeMode(themeMode)) {
        return res.status(400).json({ success: false, error: 'Modo de tema inválido' });
      }
      if (accentKey !== undefined && !isValidAccentKey(accentKey)) {
        return res.status(400).json({ success: false, error: 'Color de acento inválido' });
      }

      const nextThemeMode = themeMode !== undefined
        ? normalizeThemeMode(themeMode)
        : undefined;
      const nextAccentKey = accentKey !== undefined
        ? normalizeAccentKey(accentKey)
        : undefined;

      const fields = [];
      const params = [];

      if (nextThemeMode !== undefined) {
        fields.push('theme_mode = ?');
        params.push(nextThemeMode);
      }
      if (nextAccentKey !== undefined) {
        fields.push('accent_key = ?');
        params.push(nextAccentKey);
      }

      if (!fields.length) {
        return res.status(400).json({ success: false, error: 'No hay cambios para guardar' });
      }

      params.push(req.user.id);
      await db.execute(
        `UPDATE usuarios SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ? AND deleted_at IS NULL`,
        params
      );

      const user = await UserModel.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
      }

      const { user: userResponse } = issueAuthToken(user, null);

      return res.json({
        success: true,
        message: 'Tu apariencia personal fue actualizada',
        appearance: userResponse.appearance,
        user: userResponse,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAppearance(req, res, next) {
    try {
      const user = await UserModel.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
      }

      const appearance = resolveAppearance(user);
      const role = (user.rol || '').toUpperCase();

      return res.json({
        success: true,
        appearance,
        canCustomize: role === 'ADMIN' || role === 'SUPERADMIN',
        customizeScope: role === 'SUPERADMIN' ? 'user' : role === 'ADMIN' ? 'store' : null,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AppearanceController();
