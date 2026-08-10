const db = require('../../config/db');
const { getVentasResumen, getItemsVendidos } = require('../services/dashboardSalesService');
const { normalizeCodigoRef } = require('../utils/productCode');
const { insertProduct, resolveProductPriceUpdate } = require('../services/productService');
const { assertCanAddProducts, getProductLimitInfo } = require('../services/planLimitService');
const { resolveInversionFromRequest } = require('../services/priceConversionService');
const { saveProductImage, deleteStoredImage, cleanupTempFile } = require('../services/productImageService');
const { resolveMediaUrl } = require('../../config/uploads');

const PLAN_BY_AMOUNT = { 15: 1, 18: 2, 22: 3 };

function mapProductRow(row) {
  if (!row) return row;
  return {
    ...row,
    imagenUrl: resolveMediaUrl(row.imagenUrl),
  };
}

const PRODUCT_SELECT = `
  p.id,
  p.codigo_ref AS codigo,
  p.nombre,
  COALESCE(cp.nombre, 'General') AS categoria,
  p.precio_usd AS precioUsd,
  p.moneda_entrada AS monedaEntrada,
  p.precio_entrada AS precioEntrada,
  p.tasa_bcv_snapshot AS tasaBcvSnapshot,
  p.tasa_eur_snapshot AS tasaEurSnapshot,
  p.precio_bs_snapshot AS precioBsSnapshot,
  p.precio_eur_snapshot AS precioEurSnapshot,
  p.precio_registrado_at AS precioRegistradoAt,
  p.moneda_inversion AS monedaInversion,
  p.inversion_entrada AS inversionEntrada,
  p.inversion_usd AS inversionUsd,
  p.stock,
  p.stock_minimo AS minStock,
  p.descripcion,
  p.imagen_url AS imagenUrl,
  p.activo,
  p.created_at AS createdAt,
  p.updated_at AS updatedAt,
  u.nombre AS creadoPor,
  u.email AS creadoPorEmail
`;

const PRODUCT_FROM = `
  FROM productos p
  LEFT JOIN categorias_producto cp ON cp.id = p.categoria_id AND cp.deleted_at IS NULL
  LEFT JOIN usuarios u ON u.id = p.creado_por_id AND u.deleted_at IS NULL
`;

class AdminController {

  static async getStores(req, res, next) {
    try {
      const [stores] = await db.query(`
        SELECT
          t.id,
          t.nombre,
          t.rif,
          t.telefono,
          u.nombre AS dueno,
          u.email,
          p.nombre AS plan,
          p.precio_mensual AS planMonto,
          s.ciclo,
          s.estado,
          s.proximo_pago AS proximoPago,
          COUNT(DISTINCT u2.id) AS usuariosActuales,
          p.max_usuarios AS usuariosPermitidos
        FROM tiendas t
        LEFT JOIN suscripciones s ON s.tienda_id = t.id
        LEFT JOIN planes p ON p.id = s.plan_id
        LEFT JOIN usuarios u ON u.tienda_id = t.id AND u.rol_id = 2
        LEFT JOIN usuarios u2 ON u2.tienda_id = t.id AND u2.deleted_at IS NULL AND u2.estado = 'ACTIVO'
        WHERE t.deleted_at IS NULL
        GROUP BY t.id, s.id, p.id, u.id, u.nombre, u.email
        ORDER BY t.id ASC
      `);

      const [mrrRow] = await db.query(`
        SELECT COALESCE(SUM(p.precio_mensual), 0) AS mrr
        FROM suscripciones s
        JOIN planes p ON p.id = s.plan_id
        WHERE s.estado = 'ACTIVA'
      `);

      const [statsRow] = await db.query(`
        SELECT
          COUNT(CASE WHEN estado = 'ACTIVA' THEN 1 END) AS totalActivas,
          COUNT(CASE WHEN estado = 'SUSPENDIDA' THEN 1 END) AS totalSuspendidas,
          COUNT(CASE WHEN estado = 'PRUEBA' THEN 1 END) AS totalTrial
        FROM suscripciones
      `);

      res.json({
        success: true,
        mrrTotal: parseFloat(mrrRow[0]?.mrr || 0),
        totalActivas: statsRow[0]?.totalActivas || 0,
        totalSuspendidas: statsRow[0]?.totalSuspendidas || 0,
        totalTrial: statsRow[0]?.totalTrial || 0,
        stores
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateStorePlan(req, res, next) {
    try {
      const { storeId, plan, monto } = req.body;
      if (!storeId || !monto) {
        return res.status(400).json({ success: false, error: 'storeId y monto son requeridos' });
      }

      const planId = PLAN_BY_AMOUNT[parseInt(monto, 10)] || 2;
      await db.query(
        `UPDATE suscripciones SET plan_id = ? WHERE tienda_id = ?`,
        [planId, storeId]
      );

      res.json({
        success: true,
        message: `Plan del comercio #${storeId} actualizado a ${plan || monto} ($${monto}/mes)`
      });
    } catch (err) {
      next(err);
    }
  }

  static async toggleStoreStatus(req, res, next) {
    try {
      const { storeId, estado } = req.body;
      if (!storeId || !estado) {
        return res.status(400).json({ success: false, error: 'storeId y estado son requeridos' });
      }

      const estadoEnum = estado === 'Activa' ? 'ACTIVA' : 'SUSPENDIDA';
      await db.query(
        `UPDATE suscripciones SET estado = ? WHERE tienda_id = ?`,
        [estadoEnum, storeId]
      );

      res.json({
        success: true,
        message: `Estado del comercio #${storeId} cambiado a ${estado}`
      });
    } catch (err) {
      next(err);
    }
  }

  static async getPendingPayments(req, res, next) {
    try {
      const [payments] = await db.query(`
        SELECT
          rp.id,
          t.nombre AS tiendaNombre,
          u.nombre AS dueno,
          u.email,
          pl.nombre AS planReportado,
          rp.metodo_pago AS metodo,
          rp.referencia,
          rp.monto_usd AS monto,
          rp.banco_emisor AS bancoEmisor,
          rp.estado,
          rp.created_at AS fecha
        FROM reportes_pago rp
        JOIN tiendas t ON t.id = rp.tienda_id
        JOIN planes pl ON pl.id = rp.plan_id
        LEFT JOIN usuarios u ON u.tienda_id = rp.tienda_id AND u.rol_id = 2
        WHERE rp.estado = 'PENDIENTE'
        ORDER BY rp.created_at DESC
      `);

      res.json({ success: true, data: payments });
    } catch (err) {
      next(err);
    }
  }

  static async approvePayment(req, res, next) {
    try {
      const { pagoId } = req.params;

      const [rows] = await db.query(`SELECT * FROM reportes_pago WHERE id = ?`, [pagoId]);
      if (!rows.length) {
        return res.status(404).json({ success: false, error: 'Pago no encontrado' });
      }

      const pago = rows[0];
      await db.query(`UPDATE reportes_pago SET estado = 'APROBADO' WHERE id = ?`, [pagoId]);

      const proximoPago = new Date();
      proximoPago.setDate(proximoPago.getDate() + 30);

      await db.query(
        `UPDATE suscripciones SET estado = 'ACTIVA', plan_id = ?, proximo_pago = ? WHERE tienda_id = ?`,
        [pago.plan_id, proximoPago.toISOString().split('T')[0], pago.tienda_id]
      );

      res.json({
        success: true,
        message: `Pago #${pagoId} aprobado. Suscripción activada hasta ${proximoPago.toLocaleDateString('es-VE')}`,
        tiendaId: pago.tienda_id
      });
    } catch (err) {
      next(err);
    }
  }

  static async rejectPayment(req, res, next) {
    try {
      const { pagoId } = req.params;
      await db.query(`UPDATE reportes_pago SET estado = 'RECHAZADO' WHERE id = ?`, [pagoId]);
      res.json({ success: true, message: `Pago #${pagoId} rechazado` });
    } catch (err) {
      next(err);
    }
  }

  static async getCategories(req, res, next) {
    try {
      const tiendaId = req.user?.tiendaId || 1;
      const [rows] = await db.query(
        `SELECT id, nombre
         FROM categorias_producto
         WHERE tienda_id = ? AND deleted_at IS NULL
         ORDER BY nombre ASC`,
        [tiendaId]
      );
      res.json({ success: true, data: rows });
    } catch (err) {
      next(err);
    }
  }

  static async getProducts(req, res, next) {
    try {
      const tiendaId = req.user?.tiendaId || 1;
      const [products] = await db.query(
        `SELECT ${PRODUCT_SELECT}
         ${PRODUCT_FROM}
         WHERE p.tienda_id = ? AND p.deleted_at IS NULL
         ORDER BY p.created_at DESC, p.id DESC`,
        [tiendaId]
      );
      const limit = await getProductLimitInfo(tiendaId);
      res.json({ success: true, data: products.map(mapProductRow), limit });
    } catch (err) {
      next(err);
    }
  }

  static async getProductById(req, res, next) {
    try {
      const tiendaId = req.user?.tiendaId || 1;
      const id = parseInt(req.params.id, 10);
      if (!id) {
        return res.status(400).json({ success: false, error: 'ID inválido' });
      }

      const [rows] = await db.query(
        `SELECT ${PRODUCT_SELECT}
         ${PRODUCT_FROM}
         WHERE p.id = ? AND p.tienda_id = ? AND p.deleted_at IS NULL
         LIMIT 1`,
        [id, tiendaId]
      );

      if (!rows.length) {
        return res.status(404).json({ success: false, error: 'Producto no encontrado' });
      }

      res.json({ success: true, data: mapProductRow(rows[0]) });
    } catch (err) {
      next(err);
    }
  }

  static async createProduct(req, res, next) {
    try {
      const tiendaId = req.user?.tiendaId || 1;
      const { codigo, nombre, categoria, precioUsd, monedaEntrada, precioEntrada, monedaInversion, inversionEntrada, stock, minStock } = req.body;

      await assertCanAddProducts(tiendaId, 1);

      const result = await insertProduct({
        tiendaId,
        creadoPorId: req.user?.id,
        nombre,
        codigo,
        categoria,
        precioUsd,
        monedaEntrada,
        precioEntrada,
        monedaInversion,
        inversionEntrada,
        stock,
        minStock,
      });

      res.status(201).json({ success: true, id: result.id, message: 'Producto creado' });
    } catch (err) {
      if (err.code === 'PRODUCT_LIMIT' || err.statusCode === 403) {
        return res.status(403).json({ success: false, error: err.message, code: err.code || 'PRODUCT_LIMIT' });
      }
      if (err.message?.includes('Ya existe')) {
        return res.status(409).json({ success: false, error: err.message });
      }
      if (err.message?.includes('requerido') || err.message?.includes('precio')) {
        return res.status(400).json({ success: false, error: err.message });
      }
      next(err);
    }
  }

  static async bulkCreateProducts(req, res, next) {
    try {
      const tiendaId = req.user?.tiendaId || 1;
      const creadoPorId = req.user?.id || null;
      const items = req.body.items || req.body.productos || [];

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, error: 'Envía un arreglo "items" con los productos' });
      }
      if (items.length > 500) {
        return res.status(400).json({ success: false, error: 'Máximo 500 productos por carga' });
      }

      const created = [];
      const errors = [];
      const usedCodes = new Set();
      let limitReached = false;

      for (let i = 0; i < items.length; i++) {
        const row = items[i] || {};
        const rowLabel = row.rowNum || i + 1;

        if (limitReached) {
          errors.push({
            row: rowLabel,
            nombre: String(row.nombre || '').trim(),
            error: 'Límite de productos del plan alcanzado',
          });
          continue;
        }

        try {
          await assertCanAddProducts(tiendaId, 1);

          const previewCodigo = normalizeCodigoRef(row.codigo, `${Date.now()}${i}`);
          if (usedCodes.has(previewCodigo)) {
            throw new Error(`Código duplicado en el archivo: ${previewCodigo}`);
          }

          const result = await insertProduct({
            tiendaId,
            creadoPorId,
            nombre: row.nombre,
            codigo: row.codigo,
            categoria: row.categoria,
            precioUsd: row.precioUsd,
            monedaEntrada: row.monedaEntrada || 'USD',
            precioEntrada: row.precioEntrada ?? row.precioUsd,
            monedaInversion: row.monedaInversion,
            inversionEntrada: row.inversionEntrada,
            stock: row.stock,
            minStock: row.minStock,
            codigoSuffixFallback: `${Date.now()}${i}`,
          });

          usedCodes.add(result.codigo);
          created.push({
            row: rowLabel,
            id: result.id,
            codigo: result.codigo,
            nombre: String(row.nombre || '').trim(),
          });
        } catch (err) {
          if (err.code === 'PRODUCT_LIMIT') {
            limitReached = true;
          }
          errors.push({
            row: rowLabel,
            nombre: String(row.nombre || '').trim(),
            error: err.message,
          });
        }
      }

      res.json({
        success: true,
        message: `${created.length} producto(s) importados${errors.length ? `, ${errors.length} con error` : ''}`,
        createdCount: created.length,
        errorCount: errors.length,
        created,
        errors,
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateProduct(req, res, next) {
    try {
      const tiendaId = req.user?.tiendaId || 1;
      const id = parseInt(req.params.id, 10);
      const { nombre, codigo, categoria, precioUsd, monedaEntrada, precioEntrada, monedaInversion, inversionEntrada, stock, minStock } = req.body;

      if (!id) {
        return res.status(400).json({ success: false, error: 'ID inválido' });
      }
      if (!nombre?.trim()) {
        return res.status(400).json({ success: false, error: 'El nombre del producto es requerido' });
      }

      const [existing] = await db.query(
        `SELECT id FROM productos WHERE id = ? AND tienda_id = ? AND deleted_at IS NULL`,
        [id, tiendaId]
      );
      if (!existing.length) {
        return res.status(404).json({ success: false, error: 'Producto no encontrado' });
      }

      const codigoRef = codigo ? normalizeCodigoRef(codigo) : normalizeCodigoRef('', id);
      if (codigoRef) {
        const [dup] = await db.query(
          `SELECT id FROM productos
           WHERE tienda_id = ? AND codigo_ref = ? AND id <> ? AND deleted_at IS NULL LIMIT 1`,
          [tiendaId, codigoRef, id]
        );
        if (dup.length > 0) {
          return res.status(409).json({ success: false, error: 'Ya existe otro producto con ese código' });
        }
      }

      const normalizedCategoria = (categoria || 'General').trim();
      const [catRows] = await db.query(
        `SELECT id FROM categorias_producto
         WHERE tienda_id = ? AND LOWER(nombre) = LOWER(?) AND deleted_at IS NULL LIMIT 1`,
        [tiendaId, normalizedCategoria]
      );
      let categoriaId = catRows[0]?.id || null;
      if (!categoriaId) {
        const [insertCat] = await db.query(
          `INSERT INTO categorias_producto (tienda_id, nombre) VALUES (?, ?)`,
          [tiendaId, normalizedCategoria]
        );
        categoriaId = insertCat.insertId;
      }

      const price = await resolveProductPriceUpdate({ precioUsd, monedaEntrada, precioEntrada });
      const inversion = await resolveInversionFromRequest({ monedaInversion, inversionEntrada });

      await db.query(
        `UPDATE productos
         SET nombre = ?, codigo_ref = ?, categoria_id = ?,
             precio_usd = ?, moneda_entrada = ?, precio_entrada = ?,
             tasa_bcv_snapshot = ?, tasa_eur_snapshot = ?,
             precio_bs_snapshot = ?, precio_eur_snapshot = ?, precio_registrado_at = NOW(),
             moneda_inversion = ?, inversion_entrada = ?, inversion_usd = ?,
             stock = ?, stock_minimo = ?
         WHERE id = ? AND tienda_id = ? AND deleted_at IS NULL`,
        [
          nombre.trim(),
          codigoRef,
          categoriaId,
          price.precioUsd,
          price.monedaEntrada,
          price.precioEntrada,
          price.tasaBcvSnapshot,
          price.tasaEurSnapshot,
          price.precioBsSnapshot,
          price.precioEurSnapshot,
          inversion?.monedaInversion || null,
          inversion?.inversionEntrada ?? null,
          inversion?.inversionUsd ?? null,
          stock ?? 0,
          minStock ?? 5,
          id,
          tiendaId,
        ]
      );

      res.json({ success: true, message: 'Producto actualizado' });
    } catch (err) {
      next(err);
    }
  }

  static async uploadProductImage(req, res, next) {
    try {
      const tiendaId = req.user?.tiendaId || 1;
      const id = parseInt(req.params.id, 10);

      if (!id) {
        cleanupTempFile(req.file);
        return res.status(400).json({ success: false, error: 'ID inválido' });
      }

      if (!req.file) {
        return res.status(400).json({ success: false, error: 'Selecciona una imagen JPG, PNG o WebP (máx. 2 MB)' });
      }

      const [existing] = await db.query(
        `SELECT id, imagen_url AS imagenUrl FROM productos
         WHERE id = ? AND tienda_id = ? AND deleted_at IS NULL LIMIT 1`,
        [id, tiendaId]
      );

      if (!existing.length) {
        cleanupTempFile(req.file);
        return res.status(404).json({ success: false, error: 'Producto no encontrado' });
      }

      const { storedPath, imagenUrl } = saveProductImage({
        tiendaId,
        productId: id,
        file: req.file,
      });

      if (existing[0].imagenUrl) {
        deleteStoredImage(existing[0].imagenUrl);
      }

      await db.query(
        `UPDATE productos SET imagen_url = ? WHERE id = ? AND tienda_id = ?`,
        [storedPath, id, tiendaId]
      );

      res.json({
        success: true,
        imagenUrl,
        message: 'Imagen del producto actualizada',
      });
    } catch (err) {
      cleanupTempFile(req.file);
      if (err.message?.includes('Formato') || err.message?.includes('2 MB') || err.message?.includes('Selecciona')) {
        return res.status(400).json({ success: false, error: err.message });
      }
      next(err);
    }
  }

  static async deleteProductImage(req, res, next) {
    try {
      const tiendaId = req.user?.tiendaId || 1;
      const id = parseInt(req.params.id, 10);

      if (!id) {
        return res.status(400).json({ success: false, error: 'ID inválido' });
      }

      const [existing] = await db.query(
        `SELECT imagen_url AS imagenUrl FROM productos
         WHERE id = ? AND tienda_id = ? AND deleted_at IS NULL LIMIT 1`,
        [id, tiendaId]
      );

      if (!existing.length) {
        return res.status(404).json({ success: false, error: 'Producto no encontrado' });
      }

      if (existing[0].imagenUrl) {
        deleteStoredImage(existing[0].imagenUrl);
      }

      await db.query(
        `UPDATE productos SET imagen_url = NULL WHERE id = ? AND tienda_id = ?`,
        [id, tiendaId]
      );

      res.json({ success: true, message: 'Imagen eliminada' });
    } catch (err) {
      next(err);
    }
  }

  static async deleteProduct(req, res, next) {
    try {
      const tiendaId = req.user?.tiendaId || 1;
      const id = parseInt(req.params.id, 10);
      if (!id) {
        return res.status(400).json({ success: false, error: 'ID inválido' });
      }

      const [existing] = await db.query(
        `SELECT id, imagen_url AS imagenUrl FROM productos
         WHERE id = ? AND tienda_id = ? AND deleted_at IS NULL LIMIT 1`,
        [id, tiendaId]
      );

      if (!existing.length) {
        return res.status(404).json({ success: false, error: 'Producto no encontrado' });
      }

      if (existing[0].imagenUrl) {
        deleteStoredImage(existing[0].imagenUrl);
      }

      const [result] = await db.query(
        `UPDATE productos
         SET deleted_at = NOW(), activo = 0
         WHERE id = ? AND tienda_id = ? AND deleted_at IS NULL`,
        [id, tiendaId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, error: 'Producto no encontrado' });
      }

      res.json({ success: true, message: 'Producto eliminado' });
    } catch (err) {
      next(err);
    }
  }

  static async getDashboardStats(req, res, next) {
    try {
      const tiendaId = req.user?.tiendaId || 1;

      const [[ventas]] = await db.query(
        `SELECT
          COALESCE(SUM(monto_total_usd), 0) AS totalUsd,
          COUNT(*) AS totalVentas
         FROM ventas v
         JOIN cajas c ON c.id = v.caja_id
         WHERE c.tienda_id = ?
           AND v.anulada = 0
           AND MONTH(v.created_at) = MONTH(NOW())
           AND YEAR(v.created_at) = YEAR(NOW())`,
        [tiendaId]
      );

      const [[inventario]] = await db.query(
        `SELECT
          COUNT(CASE WHEN stock > 0 AND stock <= stock_minimo THEN 1 END) AS lowStock,
          COUNT(CASE WHEN stock = 0 THEN 1 END) AS emptyStock
         FROM productos WHERE tienda_id = ? AND deleted_at IS NULL`,
        [tiendaId]
      );

      const hasCuentasFeature = Array.isArray(req.user?.features)
        && req.user.features.includes('cuentas');
      const isSuperAdmin = (req.user?.role || '').toUpperCase() === 'SUPERADMIN';

      let totalPendienteUsd = 0;
      if (hasCuentasFeature || isSuperAdmin) {
        const [[cuentas]] = await db.query(
          `SELECT COALESCE(SUM(monto_usd), 0) AS totalPendiente
           FROM cuentas_pagar
           WHERE tienda_id = ? AND deleted_at IS NULL
             AND estado IN ('PENDIENTE', 'VENCIDA', 'PARCIAL')`,
          [tiendaId]
        );
        totalPendienteUsd = parseFloat(cuentas?.totalPendiente || 0);
      }

      const ventasResumen = await getVentasResumen(tiendaId);
      const itemsVendidos = await getItemsVendidos(tiendaId);

      res.json({
        success: true,
        data: {
          facturacionUsd: parseFloat(ventas?.totalUsd || 0),
          totalVentas: ventas?.totalVentas || 0,
          ventasResumen,
          itemsVendidos,
          lowStock: inventario?.lowStock || 0,
          emptyStock: inventario?.emptyStock || 0,
          totalPendienteUsd
        }
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AdminController;
