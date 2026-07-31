const db = require('../../config/db');

class UserModel {
  // Buscar usuario por email con JOIN a roles y tiendas (schema normalizado v2.0)
  static async findByEmail(email) {
    const [rows] = await db.execute(
      `SELECT
         u.id,
         u.tienda_id,
         u.nombre,
         u.email,
         u.password_hash,
         u.activo,
         r.nombre  AS rol,
         t.nombre  AS tienda_nombre
       FROM usuarios u
       JOIN roles  r ON r.id = u.rol_id
       LEFT JOIN tiendas t ON t.id = u.tienda_id
       WHERE u.email = ? AND u.activo = 1`,
      [email]
    );
    return rows[0] || null;
  }

  static async findById(id) {
    const [rows] = await db.execute(
      `SELECT
         u.id,
         u.tienda_id,
         u.nombre,
         u.email,
         u.activo,
         r.nombre  AS rol,
         t.nombre  AS tienda_nombre
       FROM usuarios u
       JOIN roles  r ON r.id = u.rol_id
       LEFT JOIN tiendas t ON t.id = u.tienda_id
       WHERE u.id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  static async create({ tiendaId, nombre, email, passwordHash, rolNombre = 'ADMIN' }) {
    // Resolver rol_id desde la tabla roles
    const [rolRows] = await db.execute(
      `SELECT id FROM roles WHERE nombre = ? LIMIT 1`,
      [rolNombre.toUpperCase()]
    );
    const rolId = rolRows[0]?.id || 2; // Default: ADMIN

    const [result] = await db.execute(
      `INSERT INTO usuarios (tienda_id, rol_id, nombre, email, password_hash)
       VALUES (?, ?, ?, ?, ?)`,
      [tiendaId || null, rolId, nombre, email, passwordHash]
    );
    return result.insertId;
  }

  static async updateLastLogin(id) {
    await db.execute(
      `UPDATE usuarios SET ultimo_login = NOW() WHERE id = ?`,
      [id]
    );
  }
}

module.exports = UserModel;
