const db = require('../../config/db');

class UserModel {
  static async findByEmail(email) {
    const [rows] = await db.execute(
      `SELECT u.*, t.nombre as tienda_nombre 
       FROM usuarios u 
       JOIN tiendas t ON u.tienda_id = t.id 
       WHERE u.email = ?`,
      [email]
    );
    return rows[0] || null;
  }

  static async findById(id) {
    const [rows] = await db.execute(
      `SELECT u.id, u.nombre, u.email, u.rol, u.tienda_id, t.nombre as tienda_nombre 
       FROM usuarios u 
       JOIN tiendas t ON u.tienda_id = t.id 
       WHERE u.id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  static async create({ tiendaId, nombre, email, passwordHash, rol = 'ADMIN' }) {
    const [result] = await db.execute(
      `INSERT INTO usuarios (tienda_id, nombre, email, password_hash, rol) 
       VALUES (?, ?, ?, ?, ?)`,
      [tiendaId, nombre, email, passwordHash, rol]
    );
    return result.insertId;
  }
}

module.exports = UserModel;
