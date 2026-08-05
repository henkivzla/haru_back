const { SUBSCRIPTION_WARNING_DAYS, SUBSCRIPTION_GRACE_DAYS } = require('../constants/subscriptionPolicy');

function parseDateOnly(value) {
  if (!value) return null;
  const raw = value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
  const [y, m, d] = raw.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function diffCalendarDays(from, to) {
  const ms = to.getTime() - from.getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

function formatDateEs(date) {
  return date.toLocaleDateString('es-VE', { day: 'numeric', month: 'long', year: 'numeric' });
}

function buildReminderMessage({ phase, daysUntilDue, daysOverdue, graceDaysRemaining, proximoPago, pendingPayment }) {
  const dueLabel = proximoPago ? formatDateEs(parseDateOnly(proximoPago)) : 'pronto';

  if (pendingPayment && phase === 'suspended') {
    return 'Tu suscripción está suspendida. Ya reportaste un pago: lo estamos revisando. Te avisaremos cuando se active.';
  }

  switch (phase) {
    case 'warning':
      return daysUntilDue === 1
        ? `Tu plan vence mañana (${dueLabel}). Reporta tu pago para evitar interrupciones.`
        : `Tu plan vence en ${daysUntilDue} días (${dueLabel}). Reporta tu pago a tiempo.`;
    case 'due_today':
      return `Hoy vence tu plan (${dueLabel}). Tienes ${SUBSCRIPTION_GRACE_DAYS} días de gracia para reportar el pago.`;
    case 'grace':
      return graceDaysRemaining === 1
        ? `Tu plan venció. Te queda 1 día de gracia para reportar el pago antes de bloquear el acceso.`
        : `Tu plan venció. Te quedan ${graceDaysRemaining} días de gracia para reportar el pago.`;
    case 'suspended':
      return 'Tu suscripción está suspendida. Solo puedes reportar tu pago para reactivar Haru.';
    default:
      return null;
  }
}

/**
 * Calcula fase de aviso: ok | warning | due_today | grace | suspended
 */
function computeSubscriptionReminder({
  proximoPago,
  subscriptionEstado,
  subscriptionActive,
  pendingPayment = null,
  warningDays = SUBSCRIPTION_WARNING_DAYS,
  graceDays = SUBSCRIPTION_GRACE_DAYS,
} = {}) {
  const dueDate = parseDateOnly(proximoPago);
  const today = startOfToday();

  if (!dueDate || !subscriptionEstado) {
    return {
      phase: 'ok',
      daysUntilDue: null,
      daysOverdue: 0,
      graceDaysRemaining: graceDays,
      showDailyNotification: false,
      message: null,
      proximoPago: proximoPago || null,
      warningDays,
      graceDays,
    };
  }

  const daysUntilDue = diffCalendarDays(today, dueDate);
  const daysOverdue = daysUntilDue < 0 ? Math.abs(daysUntilDue) : 0;

  let phase = 'ok';

  if (!subscriptionActive || subscriptionEstado === 'SUSPENDIDA') {
    phase = 'suspended';
  } else if (daysOverdue > graceDays) {
    phase = 'suspended';
  } else if (daysOverdue > 0) {
    phase = 'grace';
  } else if (daysUntilDue === 0) {
    phase = 'due_today';
  } else if (daysUntilDue <= warningDays) {
    phase = 'warning';
  }

  const graceDaysRemaining = phase === 'grace'
    ? Math.max(0, graceDays - daysOverdue)
    : phase === 'due_today'
      ? graceDays
      : 0;

  const showDailyNotification = ['warning', 'due_today', 'grace', 'suspended'].includes(phase);

  const message = buildReminderMessage({
    phase,
    daysUntilDue,
    daysOverdue,
    graceDaysRemaining,
    proximoPago,
    pendingPayment,
  });

  return {
    phase,
    daysUntilDue,
    daysOverdue,
    graceDaysRemaining,
    showDailyNotification,
    message,
    proximoPago,
    warningDays,
    graceDays,
  };
}

module.exports = {
  computeSubscriptionReminder,
  SUBSCRIPTION_WARNING_DAYS,
  SUBSCRIPTION_GRACE_DAYS,
};
