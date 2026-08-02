const bcrypt = require('bcryptjs');
const UserModel = require('../models/UserModel');
const { assertCanAddUser, getMaxUsuarios } = require('../services/planLimitService');

const VALID_ROLES = ['ADMIN', 'CAJERO'];

class TeamController {
  static async listTeam(req, res, next) {
    try {
      const tiendaId = req.user?.tiendaId;
      if (!tiendaId) {
        return res.status(400).json({ success: false, error: 'Usuario sin tienda asociada' });
      }

      const users = await UserModel.findAllForAdmin({ tiendaId, includeDeleted: false });
      const activos = await UserModel.countActiveByTienda(tiendaId);
      const maxUsuarios = await getMaxUsuarios(tiendaId);

      res.json({
        success: true,
        data: {
          users: users.filter(u => u.rol !== 'SUPERADMIN'),
          activos,
          maxUsuarios,
          puedeAgregar: activos < maxUsuarios
        }
      });
    } catch (err) {
      next(err);
    }
  }

  static async createTeamMember(req, res, next) {
    try {
      const tiendaId = req.user?.tiendaId;
      if (!tiendaId) {
        return res.status(400).json({ success: false, error: 'Usuario sin tienda asociada' });
      }

      const { nombre, email, password, rolNombre } = req.body;
      if (!nombre || !email || !password) {
        return res.status(400).json({ success: false, error: 'nombre, email y password son requeridos' });
      }
      if (String(password).length < 8) {
        return res.status(400).json({ success: false, error: 'La contraseña debe tener al menos 8 caracteres' });
      }

      const rol = (rolNombre || 'CAJERO').toUpperCase();
      if (!VALID_ROLES.includes(rol)) {
        return res.status(400).json({ success: false, error: 'Rol inválido. Use ADMIN o CAJERO' });
      }

      await assertCanAddUser(tiendaId);

      const existing = await UserModel.findByEmailIncludingInactive(email.trim().toLowerCase());
      if (existing && !existing.deleted_at) {
        return res.status(409).json({ success: false, error: 'El correo ya está registrado' });
      }

      const passwordHash = bcrypt.hashSync(password, 10);
      const id = await UserModel.create({
        tiendaId,
        nombre: nombre.trim(),
        email: email.trim().toLowerCase(),
        passwordHash,
        rolNombre: rol,
        estado: 'ACTIVO'
      });

      const user = await UserModel.findByIdForAdmin(id);
      res.status(201).json({ success: true, message: 'Usuario del equipo creado', user });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = TeamController;
