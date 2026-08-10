const db = require('../../config/db');

const BS_METODOS = ['EFECTIVO_BS', 'PAGO_MOVIL', 'PUNTO_VENTA'];
const EUR_METODOS = ['EFECTIVO_EUR'];

const VENTAS_RESUMEN_SQL = `
  SELECT
    COUNT(*) AS cantidad,
    COALESCE(SUM(
      CASE
        WHEN v.metodo_pago IN (?) THEN v.monto_total_bs
        ELSE 0
      END
    ), 0) AS cobradoBs,
    COALESCE(SUM(
      CASE
        WHEN v.metodo_pago IN (?) THEN v.monto_total_usd
        ELSE 0
      END
    ), 0) AS cobradoEurUsd,
    COALESCE(SUM(
      CASE
        WHEN v.metodo_pago NOT IN (?) THEN v.monto_total_usd
        ELSE 0
      END
    ), 0) AS cobradoUsd
  FROM ventas v
  JOIN cajas c ON c.id = v.caja_id
  WHERE c.tienda_id = ?
    AND v.anulada = 0
`;

const PERIOD_FILTERS = {
  dia: 'AND DATE(v.created_at) = CURDATE()',
  semana: 'AND YEARWEEK(v.created_at, 1) = YEARWEEK(CURDATE(), 1)',
  mes: 'AND MONTH(v.created_at) = MONTH(CURDATE()) AND YEAR(v.created_at) = YEAR(CURDATE())',
};

const ITEMS_VENDIDOS_SQL = `
  SELECT
    iv.producto_id AS productoId,
    iv.nombre_producto AS nombre,
    COALESCE(SUM(iv.cantidad), 0) AS cantidad,
    COALESCE(SUM(iv.subtotal_usd), 0) AS totalUsd,
    COUNT(DISTINCT v.id) AS ventasCount
  FROM items_venta iv
  JOIN ventas v ON v.id = iv.venta_id
  JOIN cajas c ON c.id = v.caja_id
  WHERE c.tienda_id = ?
    AND v.anulada = 0
`;

function mapItemVendidoRow(row = {}) {
  return {
    productoId: row.productoId != null ? Number(row.productoId) : null,
    nombre: String(row.nombre || 'Producto').trim() || 'Producto',
    cantidad: parseFloat(row.cantidad || 0),
    totalUsd: parseFloat(row.totalUsd || 0),
    ventasCount: Number(row.ventasCount || 0),
  };
}

async function getItemsVendidosForPeriod(tiendaId, periodKey, limit = 15) {
  const dateFilter = PERIOD_FILTERS[periodKey];
  if (!dateFilter) return [];

  const safeLimit = Math.min(Math.max(Number(limit) || 15, 1), 50);
  const [rows] = await db.query(
    `${ITEMS_VENDIDOS_SQL} ${dateFilter}
     GROUP BY iv.producto_id, iv.nombre_producto
     ORDER BY cantidad DESC, totalUsd DESC
     LIMIT ${safeLimit}`,
    [tiendaId]
  );

  return rows.map(mapItemVendidoRow);
}

async function getItemsVendidos(tiendaId) {
  const [dia, semana, mes] = await Promise.all([
    getItemsVendidosForPeriod(tiendaId, 'dia'),
    getItemsVendidosForPeriod(tiendaId, 'semana'),
    getItemsVendidosForPeriod(tiendaId, 'mes'),
  ]);

  return { dia, semana, mes };
}

function mapResumenRow(row = {}) {
  return {
    cantidad: Number(row.cantidad || 0),
    usd: parseFloat(row.cobradoUsd || 0),
    bs: parseFloat(row.cobradoBs || 0),
    eurUsd: parseFloat(row.cobradoEurUsd || 0),
  };
}

async function getVentasResumenForPeriod(tiendaId, periodKey) {
  const dateFilter = PERIOD_FILTERS[periodKey];
  if (!dateFilter) {
    return { cantidad: 0, usd: 0, bs: 0, eurUsd: 0 };
  }

  const excludedUsdMetodos = [...BS_METODOS, ...EUR_METODOS];
  const [rows] = await db.query(
    `${VENTAS_RESUMEN_SQL} ${dateFilter}`,
    [BS_METODOS, EUR_METODOS, excludedUsdMetodos, tiendaId]
  );

  return mapResumenRow(rows[0]);
}

async function getVentasResumen(tiendaId) {
  const [dia, semana, mes] = await Promise.all([
    getVentasResumenForPeriod(tiendaId, 'dia'),
    getVentasResumenForPeriod(tiendaId, 'semana'),
    getVentasResumenForPeriod(tiendaId, 'mes'),
  ]);

  return { dia, semana, mes };
}

module.exports = {
  getVentasResumen,
  getItemsVendidos,
};
