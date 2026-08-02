const bcrypt = require('bcryptjs');
const db = require('../../config/db');
const UserModel = require('../models/UserModel');
const { issueAuthToken } = require('./authPayload');

const VALID_PLANS = { economico: 1, estandar: 2, pro: 3 };

class RegisterController {
  async register(req, res, next) {
    const conn = await db.getConnection();
    try {
      const {
        nombre,
        email,
        password,
        telefono,
        nombreComercio,
        rif,
        rubro,
        planSlug = 'estandar'
      } = req.body;

      if (!nombre || !email || !password || !nombreComercio) {
        return res.status(400).json({
          success: false,
          error: 'Completa nombre, correo, contraseña y nombre del comercio'
        });
      }
      if (String(password).length < 8) {
        return res.status(400).json({ success: false, error: 'La contraseña debe tener al menos 8 caracteres' });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const rawRif = (rif || '').trim();
      const normalizedRif = rawRif ? rawRif.toUpperCase() : null;
      const slug = (planSlug || 'estandar').toLowerCase();
      const planId = VALID_PLANS[slug] || 2;

      const existingUser = await UserModel.findByEmailIncludingInactive(normalizedEmail);
      if (existingUser && !existingUser.deleted_at) {
        return res.status(409).json({ success: false, error: 'Este correo ya está registrado' });
      }

      const [rifRows] = normalizedRif
        ? await conn.execute(
            'SELECT id FROM tiendas WHERE rif = ? AND deleted_at IS NULL LIMIT 1',
            [normalizedRif]
          )
        : [[]];
      if (rifRows.length) {
        return res.status(409).json({ success: false, error: 'Este RIF ya está registrado en lilit' });
      }

      await conn.beginTransaction();

      const direccion = rubro ? `Rubro: ${rubro}` : null;
      const [tiendaResult] = await conn.execute(
        `INSERT INTO tiendas (nombre, rif, direccion, telefono, activo)
         VALUES (?, ?, ?, ?, 1)`,
        [nombreComercio.trim(), normalizedRif, direccion, telefono?.trim() || null]
      );
      const tiendaId = tiendaResult.insertId;

      await conn.execute(
        `INSERT INTO suscripciones (tienda_id, plan_id, ciclo, estado, fecha_inicio, proximo_pago)
         VALUES (?, ?, 'MENSUAL', 'PRUEBA', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 14 DAY))`,
        [tiendaId, planId]
      );

      const passwordHash = bcrypt.hashSync(password, 10);
      const [userResult] = await conn.execute(
        `INSERT INTO usuarios (tienda_id, rol_id, nombre, email, password_hash, activo, estado)
         VALUES (?, 2, ?, ?, ?, 1, 'ACTIVO')`,
        [tiendaId, nombre.trim(), normalizedEmail, passwordHash]
      );
      const userId = userResult.insertId;

      await conn.commit();

      const user = await UserModel.findById(userId);
      const subscription = await UserModel.findSubscriptionByTiendaId(tiendaId);
      const { token, user: userResponse } = issueAuthToken(user, subscription);

      return res.status(201).json({
        success: true,
        message: 'Cuenta creada. ¡Bienvenido a lilit!',
        token,
        user: userResponse
      });
    } catch (error) {
      try { await conn.rollback(); } catch { /* sin transacción activa */ }
      next(error);
    } finally {
      conn.release();
    }
  }
}

module.exports = new RegisterController();
