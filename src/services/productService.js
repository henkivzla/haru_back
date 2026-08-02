const db = require('../../config/db');
const { normalizeCodigoRef } = require('../utils/productCode');

async function resolveCategoriaId(tiendaId, categoriaNombre) {
  const normalizedCategoria = (categoriaNombre || 'General').trim();
  const [catRows] = await db.query(
    `SELECT id FROM categorias_producto
     WHERE tienda_id = ? AND LOWER(nombre) = LOWER(?) AND deleted_at IS NULL
     LIMIT 1`,
    [tiendaId, normalizedCategoria]
  );

  if (catRows[0]?.id) return { categoriaId: catRows[0].id, categoriaNombre: normalizedCategoria };

  const [insertCat] = await db.query(
    `INSERT INTO categorias_producto (tienda_id, nombre) VALUES (?, ?)`,
    [tiendaId, normalizedCategoria]
  );
  return { categoriaId: insertCat.insertId, categoriaNombre: normalizedCategoria };
}

async function codigoExists(tiendaId, codigoRef, excludeId = null) {
  const params = [tiendaId, codigoRef];
  let sql = `SELECT id FROM productos
             WHERE tienda_id = ? AND codigo_ref = ? AND deleted_at IS NULL`;
  if (excludeId) {
    sql += ' AND id <> ?';
    params.push(excludeId);
  }
  sql += ' LIMIT 1';
  const [rows] = await db.query(sql, params);
  return rows.length > 0;
}

async function insertProduct({
  tiendaId,
  creadoPorId,
  nombre,
  codigo,
  categoria,
  precioUsd,
  stock,
  minStock,
  codigoSuffixFallback,
}) {
  if (!nombre?.trim()) {
    throw new Error('El nombre del producto es requerido');
  }

  const parsedPrecio = Number(precioUsd);
  if (!Number.isFinite(parsedPrecio) || parsedPrecio < 0) {
    throw new Error('El precio USD debe ser un número válido');
  }

  const codigoRef = normalizeCodigoRef(codigo, codigoSuffixFallback || Date.now());
  if (await codigoExists(tiendaId, codigoRef)) {
    throw new Error(`Ya existe un producto con el código ${codigoRef}`);
  }

  const { categoriaId } = await resolveCategoriaId(tiendaId, categoria);
  const stockVal = Number.isFinite(Number(stock)) ? parseInt(stock, 10) : 0;
  const minStockVal = Number.isFinite(Number(minStock)) ? parseInt(minStock, 10) : 5;

  const [result] = await db.query(
    `INSERT INTO productos (tienda_id, categoria_id, codigo_ref, nombre, precio_usd, stock, stock_minimo, creado_por_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      tiendaId,
      categoriaId,
      codigoRef,
      nombre.trim(),
      parsedPrecio,
      Math.max(0, stockVal),
      Math.max(0, minStockVal),
      creadoPorId || null,
    ]
  );

  return { id: result.insertId, codigo: codigoRef };
}

module.exports = {
  resolveCategoriaId,
  insertProduct,
  codigoExists,
};
