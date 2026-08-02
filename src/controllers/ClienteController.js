const db = require('../../config/db');

class ClienteController {
  static async list(req, res, next) {
    try {
      const tiendaId = req.user?.tiendaId;
      const [rows] = await db.query(
        `SELECT id, nombre, rif_cedula AS rifCedula, telefono, email, direccion, activo
         FROM clientes
         WHERE tienda_id = ? AND deleted_at IS NULL
         ORDER BY nombre ASC`,
        [tiendaId]
      );
      res.json({ success: true, data: rows });
    } catch (err) {
      next(err);
    }
  }

  static async create(req, res, next) {
    try {
      const tiendaId = req.user?.tiendaId;
      const { nombre, rifCedula, telefono, email, direccion } = req.body;
      if (!nombre?.trim()) {
        return res.status(400).json({ success: false, error: 'El nombre del cliente es requerido' });
      }

      const [result] = await db.query(
        `INSERT INTO clientes (tienda_id, nombre, rif_cedula, telefono, email, direccion)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          tiendaId,
          nombre.trim(),
          rifCedula?.trim() || null,
          telefono?.trim() || null,
          email?.trim() || null,
          direccion?.trim() || null
        ]
      );

      res.status(201).json({ success: true, id: result.insertId, message: 'Cliente registrado' });
    } catch (err) {
      next(err);
    }
  }

  static async remove(req, res, next) {
    try {
      const tiendaId = req.user?.tiendaId;
      const id = parseInt(req.params.id, 10);
      await db.query(
        `UPDATE clientes SET deleted_at = NOW() WHERE id = ? AND tienda_id = ?`,
        [id, tiendaId]
      );
      res.json({ success: true, message: 'Cliente eliminado' });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = ClienteController;
