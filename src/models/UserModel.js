const db = require('../../config/db');

const USER_SELECT = `
  u.id,
  u.tienda_id,
  u.nombre,
  u.email,
  u.activo,
  u.estado,
  u.ultimo_login,
  u.created_at,
  u.updated_at,
  u.deleted_at,
  r.nombre AS rol,
  t.nombre AS tienda_nombre
`;

class UserModel {
  static async findByEmail(email) {
    const [rows] = await db.execute(
      `SELECT ${USER_SELECT}, u.password_hash
       FROM usuarios u
       JOIN roles r ON r.id = u.rol_id
       LEFT JOIN tiendas t ON t.id = u.tienda_id
       WHERE u.email = ? AND u.deleted_at IS NULL AND u.estado = 'ACTIVO'`,
      [email]
    );
    return rows[0] || null;
  }

  static async findByEmailIncludingInactive(email) {
    const [rows] = await db.execute(
      `SELECT ${USER_SELECT}, u.password_hash
       FROM usuarios u
       JOIN roles r ON r.id = u.rol_id
       LEFT JOIN tiendas t ON t.id = u.tienda_id
       WHERE u.email = ?`,
      [email]
    );
    return rows[0] || null;
  }

  static async findById(id) {
    const [rows] = await db.execute(
      `SELECT ${USER_SELECT}
       FROM usuarios u
       JOIN roles r ON r.id = u.rol_id
       LEFT JOIN tiendas t ON t.id = u.tienda_id
       WHERE u.id = ? AND u.deleted_at IS NULL`,
      [id]
    );
    return rows[0] || null;
  }

  static async findByIdForAdmin(id, includeDeleted = false) {
    const deletedClause = includeDeleted ? '' : 'AND u.deleted_at IS NULL';
    const [rows] = await db.execute(
      `SELECT ${USER_SELECT}
       FROM usuarios u
       JOIN roles r ON r.id = u.rol_id
       LEFT JOIN tiendas t ON t.id = u.tienda_id
       WHERE u.id = ? ${deletedClause}`,
      [id]
    );
    return rows[0] || null;
  }

  static async findAllForAdmin({ search, estado, rol, tiendaId, includeDeleted = false } = {}) {
    const conditions = [];
    const params = [];

    if (!includeDeleted) {
      conditions.push('u.deleted_at IS NULL');
    }
    if (estado) {
      conditions.push('u.estado = ?');
      params.push(estado.toUpperCase());
    }
    if (rol) {
      conditions.push('r.nombre = ?');
      params.push(rol.toUpperCase());
    }
    if (tiendaId) {
      conditions.push('u.tienda_id = ?');
      params.push(tiendaId);
    }
    if (search) {
      conditions.push('(u.nombre LIKE ? OR u.email LIKE ?)');
      const q = `%${search}%`;
      params.push(q, q);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows] = await db.execute(
      `SELECT ${USER_SELECT}
       FROM usuarios u
       JOIN roles r ON r.id = u.rol_id
       LEFT JOIN tiendas t ON t.id = u.tienda_id
       ${where}
       ORDER BY u.created_at DESC`,
      params
    );
    return rows.map(UserModel.toPublicAdmin);
  }

  static toPublicAdmin(row) {
    if (!row) return null;
    return {
      id: row.id,
      nombre: row.nombre,
      email: row.email,
      rol: row.rol,
      tiendaId: row.tienda_id,
      tiendaNombre: row.tienda_nombre,
      estado: row.estado,
      activo: row.activo === 1,
      ultimoLogin: row.ultimo_login,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at
    };
  }

  static async findSubscriptionByTiendaId(tiendaId) {
    if (!tiendaId) return null;

    const [rows] = await db.execute(
      `SELECT
         s.estado,
         s.proximo_pago AS proximoPago,
         p.id AS planId,
         p.slug AS planSlug,
         p.nombre AS planNombre,
         p.precio_mensual AS planMonto,
         p.max_usuarios AS maxUsuarios
       FROM suscripciones s
       JOIN planes p ON p.id = s.plan_id
       WHERE s.tienda_id = ? AND s.deleted_at IS NULL
       ORDER BY s.id DESC
       LIMIT 1`,
      [tiendaId]
    );
    return rows[0] || null;
  }

  static async resolveRolId(rolNombre = 'ADMIN') {
    const [rolRows] = await db.execute(
      `SELECT id FROM roles WHERE nombre = ? LIMIT 1`,
      [rolNombre.toUpperCase()]
    );
    return rolRows[0]?.id || 2;
  }

  static async create({ tiendaId, nombre, email, passwordHash, rolNombre = 'ADMIN', estado = 'ACTIVO' }) {
    const rolId = await UserModel.resolveRolId(rolNombre);
    const activo = estado === 'ACTIVO' ? 1 : 0;

    const [result] = await db.execute(
      `INSERT INTO usuarios (tienda_id, rol_id, nombre, email, password_hash, activo, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [tiendaId || null, rolId, nombre, email, passwordHash, activo, estado]
    );
    return result.insertId;
  }

  static async updateProfile(id, { nombre, email, rolNombre, tiendaId }) {
    const fields = [];
    const params = [];

    if (nombre !== undefined) {
      fields.push('nombre = ?');
      params.push(nombre);
    }
    if (email !== undefined) {
      fields.push('email = ?');
      params.push(email);
    }
    if (rolNombre !== undefined) {
      const rolId = await UserModel.resolveRolId(rolNombre);
      fields.push('rol_id = ?');
      params.push(rolId);
    }
    if (tiendaId !== undefined) {
      fields.push('tienda_id = ?');
      params.push(tiendaId);
    }

    if (!fields.length) return;

    fields.push('updated_at = NOW()');
    params.push(id);

    await db.execute(
      `UPDATE usuarios SET ${fields.join(', ')} WHERE id = ? AND deleted_at IS NULL`,
      params
    );
  }

  static async setEstado(id, estado) {
    const activo = estado === 'ACTIVO' ? 1 : 0;
    await db.execute(
      `UPDATE usuarios SET estado = ?, activo = ?, updated_at = NOW()
       WHERE id = ? AND deleted_at IS NULL`,
      [estado, activo, id]
    );
  }

  static async softDelete(id) {
    await db.execute(
      `UPDATE usuarios
       SET deleted_at = NOW(), estado = 'INACTIVO', activo = 0, updated_at = NOW()
       WHERE id = ? AND deleted_at IS NULL`,
      [id]
    );
  }

  static async restore(id) {
    await db.execute(
      `UPDATE usuarios
       SET deleted_at = NULL, estado = 'INACTIVO', activo = 0, updated_at = NOW()
       WHERE id = ?`,
      [id]
    );
  }

  static async updateLastLogin(id) {
    await db.execute(
      `UPDATE usuarios SET ultimo_login = NOW() WHERE id = ?`,
      [id]
    );
  }

  static async updatePassword(id, passwordHash) {
    await db.execute(
      `UPDATE usuarios SET password_hash = ?, updated_at = NOW() WHERE id = ? AND deleted_at IS NULL`,
      [passwordHash, id]
    );
  }

  static async countActiveByTienda(tiendaId) {
    const [rows] = await db.execute(
      `SELECT COUNT(*) AS total FROM usuarios
       WHERE tienda_id = ? AND deleted_at IS NULL AND estado = 'ACTIVO'`,
      [tiendaId]
    );
    return rows[0]?.total || 0;
  }
}

module.exports = UserModel;
