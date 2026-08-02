const db = require('../../config/db');

class SucursalController {
  static async list(req, res, next) {
    try {
      const tiendaId = req.user?.tiendaId;
      const [rows] = await db.query(
        `SELECT id, nombre, direccion, telefono, activa
         FROM sucursales
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
      const { nombre, direccion, telefono } = req.body;
      if (!nombre?.trim()) {
        return res.status(400).json({ success: false, error: 'El nombre de la sucursal es requerido' });
      }

      const [result] = await db.query(
        `INSERT INTO sucursales (tienda_id, nombre, direccion, telefono)
         VALUES (?, ?, ?, ?)`,
        [tiendaId, nombre.trim(), direccion?.trim() || null, telefono?.trim() || null]
      );

      res.status(201).json({ success: true, id: result.insertId, message: 'Sucursal creada' });
    } catch (err) {
      next(err);
    }
  }

  static async update(req, res, next) {
    try {
      const tiendaId = req.user?.tiendaId;
      const id = parseInt(req.params.id, 10);
      const { nombre, direccion, telefono, activa } = req.body;

      await db.query(
        `UPDATE sucursales
         SET nombre = COALESCE(?, nombre),
             direccion = COALESCE(?, direccion),
             telefono = COALESCE(?, telefono),
             activa = COALESCE(?, activa)
         WHERE id = ? AND tienda_id = ? AND deleted_at IS NULL`,
        [
          nombre?.trim() || null,
          direccion?.trim() || null,
          telefono?.trim() || null,
          activa === undefined ? null : (activa ? 1 : 0),
          id,
          tiendaId
        ]
      );

      res.json({ success: true, message: 'Sucursal actualizada' });
    } catch (err) {
      next(err);
    }
  }

  static async remove(req, res, next) {
    try {
      const tiendaId = req.user?.tiendaId;
      const id = parseInt(req.params.id, 10);
      const [result] = await db.query(
        `UPDATE sucursales SET deleted_at = NOW(), activa = 0 WHERE id = ? AND tienda_id = ? AND deleted_at IS NULL`,
        [id, tiendaId]
      );
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, error: 'Sucursal no encontrada' });
      }
      res.json({ success: true, message: 'Sucursal eliminada' });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = SucursalController;
