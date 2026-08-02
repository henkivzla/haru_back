require('dotenv').config();

/**
 * MAIL_ENV: local | production
 * Correo: SMTP de cPanel (mail.tudominio.ve) — misma config en XAMPP y en hosting
 */
const MAIL_ENV = (process.env.MAIL_ENV || (process.env.NODE_ENV === 'production' ? 'production' : 'local')).toLowerCase();
const MAIL_PROVIDER = (process.env.MAIL_PROVIDER || 'smtp').toLowerCase();

function isSmtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function isResendConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.startsWith('re_'));
}

function isMailConfigured() {
  if (MAIL_PROVIDER === 'resend') return isResendConfigured();
  if (MAIL_PROVIDER === 'smtp') return isSmtpConfigured();
  return isResendConfigured() || isSmtpConfigured();
}

function getFromAddress() {
  if (MAIL_PROVIDER === 'resend' && isResendConfigured()) {
    return process.env.RESEND_FROM || 'lilit POS <onboarding@resend.dev>';
  }
  return process.env.SMTP_FROM || 'lilit POS <noreply@lilit.ve>';
}

function getMailProfileLabel() {
  if (!isMailConfigured()) return 'sin configurar';
  if (MAIL_PROVIDER === 'resend') return `resend (${MAIL_ENV})`;
  const host = (process.env.SMTP_HOST || '').toLowerCase();
  if (host.startsWith('mail.')) return `cpanel (${MAIL_ENV})`;
  return `cpanel-smtp (${MAIL_ENV})`;
}

module.exports = {
  MAIL_ENV,
  MAIL_PROVIDER,
  isSmtpConfigured,
  isResendConfigured,
  isMailConfigured,
  getFromAddress,
  getMailProfileLabel,
  FRONTEND_URL: (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '')
};
