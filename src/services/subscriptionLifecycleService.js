const UserModel = require('../models/UserModel');

/**
 * Suspende PRUEBA/ACTIVA cuando proximo_pago + GRACE_DAYS venció.
 * Tras la gracia el usuario puede iniciar sesión pero solo reportar pago.
 */
const { SUBSCRIPTION_GRACE_DAYS } = require('../constants/subscriptionPolicy');

async function enforceSubscriptionExpiry(db, tiendaId) {
  if (!tiendaId) {
    return { changed: false, suspended: false, gracePendingPayment: false };
  }

  const [result] = await db.query(
    `UPDATE suscripciones s
     SET s.estado = 'SUSPENDIDA', s.updated_at = NOW()
     WHERE s.tienda_id = ?
       AND s.deleted_at IS NULL
       AND s.estado IN ('PRUEBA', 'ACTIVA')
       AND s.proximo_pago < DATE_SUB(CURDATE(), INTERVAL ? DAY)`,
    [tiendaId, SUBSCRIPTION_GRACE_DAYS]
  );

  const changed = (result.affectedRows || 0) > 0;

  let gracePendingPayment = false;
  if (!changed) {
    const [graceRows] = await db.query(
      `SELECT 1
       FROM suscripciones s
       JOIN reportes_pago rp
         ON rp.tienda_id = s.tienda_id
        AND rp.estado = 'PENDIENTE'
        AND rp.deleted_at IS NULL
       WHERE s.tienda_id = ?
         AND s.deleted_at IS NULL
         AND s.estado IN ('PRUEBA', 'ACTIVA')
         AND s.proximo_pago < CURDATE()
       LIMIT 1`,
      [tiendaId]
    );
    gracePendingPayment = graceRows.length > 0;
  }

  return {
    changed,
    suspended: changed,
    gracePendingPayment,
  };
}

async function refreshSubscriptionForStore(db, tiendaId) {
  if (!tiendaId) return null;
  await enforceSubscriptionExpiry(db, tiendaId);
  return UserModel.findSubscriptionByTiendaId(tiendaId);
}

/** Actualiza req.user cuando el JWT quedó desactualizado tras suspender. */
async function syncRequestSubscriptionState(db, req) {
  const role = (req.user?.role || '').toUpperCase();
  if (role === 'SUPERADMIN' || !req.user?.tiendaId) {
    return { changed: false, gracePendingPayment: false };
  }

  const result = await enforceSubscriptionExpiry(db, req.user.tiendaId);

  if (result.changed) {
    req.user.subscriptionActive = false;
    req.user.features = ['planes'];
  }

  return result;
}

module.exports = {
  enforceSubscriptionExpiry,
  refreshSubscriptionForStore,
  syncRequestSubscriptionState,
};
