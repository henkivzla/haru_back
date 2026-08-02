const METODO_MAP = {
  'Pago Móvil (Bs)': 'PAGO_MOVIL',
  'Binance (USDT)': 'BINANCE',
  'Transferencia Bancaria': 'TRANSFERENCIA',
};

const PLAN_BY_LABEL = {
  'Plan Económico ($15)': 1,
  'Plan Estándar ($18)': 2,
  'Plan Pro ($22)': 3,
};

const PLAN_BY_AMOUNT = { 15: 1, 18: 2, 22: 3 };
const VALID_AMOUNTS = new Set([15, 18, 22]);
const BINANCE_METHOD = 'Binance (USDT)';

function resolvePlanId(plan, montoUsd) {
  if (plan && PLAN_BY_LABEL[plan]) return PLAN_BY_LABEL[plan];
  const amount = parseFloat(montoUsd);
  return PLAN_BY_AMOUNT[amount] || 2;
}

function normalizeReferencia(ref) {
  return String(ref || '').trim().slice(0, 100);
}

function validateReportPayload(body) {
  const { plan, metodoPago, referencia, montoUsd, bancoEmisor } = body || {};
  const ref = normalizeReferencia(referencia);
  const amount = parseFloat(montoUsd);

  if (!ref) {
    return { ok: false, status: 400, error: 'La referencia del pago es requerida' };
  }
  if (!Number.isFinite(amount) || !VALID_AMOUNTS.has(amount)) {
    return { ok: false, status: 400, error: 'Monto inválido. Debe ser $15, $18 o $22' };
  }
  if (!METODO_MAP[metodoPago]) {
    return { ok: false, status: 400, error: 'Método de pago no válido' };
  }
  if (metodoPago !== BINANCE_METHOD && !String(bancoEmisor || '').trim()) {
    return { ok: false, status: 400, error: 'El banco emisor es requerido para este método de pago' };
  }

  return {
    ok: true,
    data: {
      planId: resolvePlanId(plan, amount),
      metodo: METODO_MAP[metodoPago],
      referencia: ref,
      montoUsd: amount,
      bancoEmisor: metodoPago === BINANCE_METHOD ? null : String(bancoEmisor).trim().slice(0, 100),
    },
  };
}

async function findPendingDuplicate(db, tiendaId, referencia) {
  const [rows] = await db.query(
    `SELECT id FROM reportes_pago
     WHERE tienda_id = ? AND referencia = ? AND estado = 'PENDIENTE' AND deleted_at IS NULL
     LIMIT 1`,
    [tiendaId, referencia]
  );
  return rows[0] || null;
}

async function findPendingReportByTienda(db, tiendaId) {
  const [rows] = await db.query(
    `SELECT rp.id,
            rp.referencia,
            rp.monto_usd AS montoUsd,
            rp.metodo_pago AS metodoPago,
            rp.banco_emisor AS bancoEmisor,
            rp.created_at AS createdAt,
            pl.nombre AS planNombre
     FROM reportes_pago rp
     JOIN planes pl ON pl.id = rp.plan_id
     WHERE rp.tienda_id = ?
       AND rp.estado = 'PENDIENTE'
       AND rp.deleted_at IS NULL
     ORDER BY rp.created_at DESC
     LIMIT 1`,
    [tiendaId]
  );
  return rows[0] || null;
}

async function listReportsByTienda(db, tiendaId, limit = 50) {
  const [rows] = await db.query(
    `SELECT rp.id,
            rp.referencia,
            rp.monto_usd AS montoUsd,
            rp.metodo_pago AS metodoPago,
            rp.banco_emisor AS bancoEmisor,
            rp.estado,
            rp.created_at AS createdAt,
            rp.updated_at AS updatedAt,
            pl.nombre AS planNombre
     FROM reportes_pago rp
     JOIN planes pl ON pl.id = rp.plan_id
     WHERE rp.tienda_id = ? AND rp.deleted_at IS NULL
     ORDER BY rp.created_at DESC
     LIMIT ?`,
    [tiendaId, limit]
  );
  return rows;
}

async function tiendaExists(db, tiendaId) {
  const [rows] = await db.query(
    `SELECT id FROM tiendas WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
    [tiendaId]
  );
  return rows.length > 0;
}

/** Crea tienda + suscripción si el usuario quedó con tienda_id huérfano. */
async function repairOrphanUserStore(db, user) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const storeName = `Comercio de ${String(user.nombre || 'Usuario').slice(0, 130)}`;
    const [tiendaResult] = await conn.execute(
      `INSERT INTO tiendas (nombre, rif, telefono, activo) VALUES (?, NULL, NULL, 1)`,
      [storeName]
    );
    const tiendaId = tiendaResult.insertId;

    await conn.execute(`UPDATE usuarios SET tienda_id = ? WHERE id = ?`, [tiendaId, user.id]);

    await conn.execute(
      `INSERT INTO suscripciones (tienda_id, plan_id, ciclo, estado, fecha_inicio, proximo_pago)
       VALUES (?, 1, 'MENSUAL', 'PRUEBA', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 14 DAY))`,
      [tiendaId]
    );

    await conn.commit();
    return { tiendaId, repaired: true };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function createPaymentReport(db, { tiendaId, suscripcionId, ...data }) {
  const exists = await tiendaExists(db, tiendaId);
  if (!exists) {
    const err = new Error('Tienda no encontrada para registrar el pago');
    err.statusCode = 409;
    throw err;
  }

  const [result] = await db.query(
    `INSERT INTO reportes_pago
       (tienda_id, suscripcion_id, plan_id, metodo_pago, referencia, monto_usd, banco_emisor)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      tiendaId,
      suscripcionId,
      data.planId,
      data.metodo,
      data.referencia,
      data.montoUsd,
      data.bancoEmisor,
    ]
  );
  return result.insertId;
}

/** Resuelve tienda_id desde BD; repara huérfanos automáticamente. */
async function resolveTiendaForPayment(db, userId) {
  const [userRows] = await db.query(
    `SELECT u.id, u.tienda_id, u.nombre, u.email
     FROM usuarios u
     WHERE u.id = ? AND u.deleted_at IS NULL
     LIMIT 1`,
    [userId]
  );
  const user = userRows[0];
  if (!user) {
    return { ok: false, status: 404, error: 'Usuario no encontrado' };
  }
  if (!user.tienda_id) {
    return {
      ok: false,
      status: 400,
      error: 'Tu cuenta no tiene un comercio asociado. Regístrate de nuevo o contacta soporte.',
    };
  }

  if (await tiendaExists(db, user.tienda_id)) {
    return { ok: true, tiendaId: user.tienda_id };
  }

  try {
    const { tiendaId, repaired } = await repairOrphanUserStore(db, user);
    return {
      ok: true,
      tiendaId,
      repaired,
      message: 'Comercio reparado automáticamente. Vuelve a reportar tu pago si es necesario.',
    };
  } catch {
    return {
      ok: false,
      status: 409,
      error: 'Tu comercio no está registrado en la base de datos. Importa schema.sql o contacta soporte.',
    };
  }
}

module.exports = {
  validateReportPayload,
  findPendingDuplicate,
  findPendingReportByTienda,
  listReportsByTienda,
  createPaymentReport,
  resolveTiendaForPayment,
  repairOrphanUserStore,
};
