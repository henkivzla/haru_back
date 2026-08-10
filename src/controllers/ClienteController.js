const db = require('../../config/db');

class ClienteController {
  static async list(req, res, next) {
    try {
      const tiendaId = req.user?.tiendaId;
      const [rows] = await db.query(
        `SELECT id, nombre, apellido, rif_cedula AS rifCedula, telefono, email, direccion, activo
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
      const { nombre, apellido, rifCedula, telefono, email, direccion } = req.body;
      const nombreFinal = nombre?.trim() || apellido?.trim();
      if (!nombreFinal) {
        return res.status(400).json({ success: false, error: 'Indica al menos nombre o apellido' });
      }

      const [result] = await db.query(
        `INSERT INTO clientes (tienda_id, nombre, apellido, rif_cedula, telefono, email, direccion)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          tiendaId,
          nombreFinal,
          apellido?.trim() || null,
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

  static async update(req, res, next) {
    try {
      const tiendaId = req.user?.tiendaId;
      const id = parseInt(req.params.id, 10);
      const { nombre, apellido, rifCedula, telefono, email, direccion } = req.body;

      if (!id) {
        return res.status(400).json({ success: false, error: 'Cliente no válido' });
      }

      const nombreFinal = nombre?.trim() || apellido?.trim();
      if (!nombreFinal) {
        return res.status(400).json({ success: false, error: 'Indica al menos nombre o apellido' });
      }

      const [result] = await db.query(
        `UPDATE clientes
         SET nombre = ?, apellido = ?, rif_cedula = ?, telefono = ?, email = ?, direccion = ?
         WHERE id = ? AND tienda_id = ? AND deleted_at IS NULL`,
        [
          nombreFinal,
          apellido?.trim() || null,
          rifCedula?.trim() || null,
          telefono?.trim() || null,
          email?.trim() || null,
          direccion?.trim() || null,
          id,
          tiendaId,
        ]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, error: 'Cliente no encontrado' });
      }

      res.json({ success: true, message: 'Cliente actualizado' });
    } catch (err) {
      next(err);
    }
  }

  static async remove(req, res, next) {
    try {
      const tiendaId = req.user?.tiendaId;
      const id = parseInt(req.params.id, 10);
      const [result] = await db.query(
        `UPDATE clientes SET deleted_at = NOW(), activo = 0 WHERE id = ? AND tienda_id = ? AND deleted_at IS NULL`,
        [id, tiendaId]
      );
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, error: 'Cliente no encontrado' });
      }
      res.json({ success: true, message: 'Cliente eliminado' });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = ClienteController;
