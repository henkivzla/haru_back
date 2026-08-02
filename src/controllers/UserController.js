const bcrypt = require('bcryptjs');
const UserModel = require('../models/UserModel');
const { assertCanAddUser } = require('../services/planLimitService');

const VALID_ESTADOS = ['ACTIVO', 'INACTIVO', 'BLOQUEADO'];
const VALID_ROLES = ['SUPERADMIN', 'ADMIN', 'CAJERO'];

class UserController {
  static async listUsers(req, res, next) {
    try {
      const { search, estado, rol, tiendaId, includeDeleted } = req.query;
      const users = await UserModel.findAllForAdmin({
        search,
        estado,
        rol,
        tiendaId: tiendaId ? parseInt(tiendaId, 10) : undefined,
        includeDeleted: includeDeleted === 'true'
      });
      res.json({ success: true, users });
    } catch (err) {
      next(err);
    }
  }

  static async createUser(req, res, next) {
    try {
      const { nombre, email, password, rolNombre, tiendaId } = req.body;

      if (!nombre || !email || !password) {
        return res.status(400).json({ success: false, error: 'nombre, email y password son requeridos' });
      }
      if (String(password).length < 8) {
        return res.status(400).json({ success: false, error: 'La contraseña debe tener al menos 8 caracteres' });
      }

      const rol = (rolNombre || 'ADMIN').toUpperCase();
      if (!VALID_ROLES.includes(rol)) {
        return res.status(400).json({ success: false, error: 'Rol inválido' });
      }
      if (rol === 'SUPERADMIN' && tiendaId) {
        return res.status(400).json({ success: false, error: 'SUPERADMIN no puede tener tienda asignada' });
      }

      if (tiendaId && rol !== 'SUPERADMIN') {
        await assertCanAddUser(tiendaId);
      }

      const existing = await UserModel.findByEmailIncludingInactive(email.trim().toLowerCase());
      if (existing && !existing.deleted_at) {
        return res.status(409).json({ success: false, error: 'El correo ya está registrado' });
      }

      const passwordHash = bcrypt.hashSync(password, 10);
      const id = await UserModel.create({
        tiendaId: tiendaId || null,
        nombre: nombre.trim(),
        email: email.trim().toLowerCase(),
        passwordHash,
        rolNombre: rol,
        estado: 'ACTIVO'
      });

      const user = await UserModel.findByIdForAdmin(id);
      res.status(201).json({ success: true, message: 'Usuario creado', user });
    } catch (err) {
      next(err);
    }
  }

  static async updateUser(req, res, next) {
    try {
      const userId = parseInt(req.params.id, 10);
      const { nombre, email, rolNombre, tiendaId } = req.body;

      const target = await UserModel.findByIdForAdmin(userId);
      if (!target || target.deleted_at) {
        return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
      }

      if (rolNombre) {
        const rol = rolNombre.toUpperCase();
        if (!VALID_ROLES.includes(rol)) {
          return res.status(400).json({ success: false, error: 'Rol inválido' });
        }
      }

      if (email) {
        const dup = await UserModel.findByEmailIncludingInactive(email.trim().toLowerCase());
        if (dup && dup.id !== userId && !dup.deleted_at) {
          return res.status(409).json({ success: false, error: 'El correo ya está en uso' });
        }
      }

      await UserModel.updateProfile(userId, {
        nombre: nombre?.trim(),
        email: email?.trim().toLowerCase(),
        rolNombre: rolNombre?.toUpperCase(),
        tiendaId: tiendaId === undefined ? undefined : (tiendaId || null)
      });

      const user = await UserModel.findByIdForAdmin(userId);
      res.json({ success: true, message: 'Usuario actualizado', user });
    } catch (err) {
      next(err);
    }
  }

  static async updateUserStatus(req, res, next) {
    try {
      const userId = parseInt(req.params.id, 10);
      const { estado } = req.body;

      if (!VALID_ESTADOS.includes(estado)) {
        return res.status(400).json({ success: false, error: 'Estado inválido. Use ACTIVO, INACTIVO o BLOQUEADO' });
      }

      if (userId === req.user.id && estado !== 'ACTIVO') {
        return res.status(400).json({ success: false, error: 'No puedes desactivar o bloquear tu propia cuenta' });
      }

      const target = await UserModel.findByIdForAdmin(userId);
      if (!target || target.deleted_at) {
        return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
      }

      if (target.rol === 'SUPERADMIN' && estado !== 'ACTIVO' && userId !== req.user.id) {
        // allow blocking other superadmins? safer to prevent blocking last superadmin - skip for now
      }

      if (estado === 'ACTIVO' && target.tiendaId && target.estado !== 'ACTIVO') {
        await assertCanAddUser(target.tiendaId);
      }

      await UserModel.setEstado(userId, estado);
      const user = await UserModel.findByIdForAdmin(userId);
      res.json({ success: true, message: `Usuario ${estado.toLowerCase()}`, user });
    } catch (err) {
      next(err);
    }
  }

  static async deleteUser(req, res, next) {
    try {
      const userId = parseInt(req.params.id, 10);

      if (userId === req.user.id) {
        return res.status(400).json({ success: false, error: 'No puedes eliminar tu propia cuenta' });
      }

      const target = await UserModel.findByIdForAdmin(userId);
      if (!target || target.deleted_at) {
        return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
      }

      await UserModel.softDelete(userId);
      res.json({ success: true, message: 'Usuario eliminado (soft delete)' });
    } catch (err) {
      next(err);
    }
  }

  static async restoreUser(req, res, next) {
    try {
      const userId = parseInt(req.params.id, 10);
      const target = await UserModel.findByIdForAdmin(userId, true);

      if (!target) {
        return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
      }
      if (!target.deleted_at) {
        return res.status(400).json({ success: false, error: 'El usuario no está eliminado' });
      }

      if (target.tiendaId) {
        await assertCanAddUser(target.tiendaId);
      }

      await UserModel.restore(userId);
      const user = await UserModel.findByIdForAdmin(userId);
      res.json({ success: true, message: 'Usuario restaurado', user });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = UserController;
