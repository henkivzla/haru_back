/** Días antes de proximo_pago para empezar avisos diarios al usuario. */
const SUBSCRIPTION_WARNING_DAYS = Number(process.env.SUBSCRIPTION_WARNING_DAYS) || 3;

/** Días de gracia después de proximo_pago antes de suspender (bloqueo salvo reporte de pago). */
const SUBSCRIPTION_GRACE_DAYS = Number(process.env.SUBSCRIPTION_GRACE_DAYS) || 2;

module.exports = {
  SUBSCRIPTION_WARNING_DAYS,
  SUBSCRIPTION_GRACE_DAYS,
};
