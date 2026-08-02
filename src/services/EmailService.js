const nodemailer = require('nodemailer');
const { Resend } = require('resend');
const mailConfig = require('../../config/mail');
const { getSmtpTransportOptions } = require('../../config/smtp');

function createSmtpTransporter() {
  return nodemailer.createTransport(getSmtpTransportOptions());
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildPasswordResetHtml({ userName, resetUrl }) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; color: #0f172a;">
      <h2 style="color: #2563EB; margin-bottom: 8px;">Haru POS</h2>
      <p>Hola ${escapeHtml(userName || 'usuario')},</p>
      <p>Recibimos una solicitud para restablecer tu contraseña. Haz clic en el botón:</p>
      <p style="margin: 24px 0;">
        <a href="${escapeHtml(resetUrl)}" style="background:#2563EB;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">
          Restablecer contraseña
        </a>
      </p>
      <p style="color:#64748B;font-size:13px;">Este enlace expira en 1 hora. Si no solicitaste esto, ignora el correo.</p>
      <p style="color:#94A3B8;font-size:12px;word-break:break-all;">${escapeHtml(resetUrl)}</p>
    </div>
  `;
}

function buildPaymentReportHtml({
  reportId,
  storeName,
  userName,
  userEmail,
  planLabel,
  metodoPago,
  referencia,
  montoUsd,
  bancoEmisor,
  adminUrl,
}) {
  const rows = [
    ['Comercio', storeName],
    ['Usuario', userName],
    ['Correo', userEmail],
    ['Plan', planLabel],
    ['Método', metodoPago],
    ['Referencia', referencia],
    ['Monto', `$${montoUsd} USD`],
  ];
  if (bancoEmisor) rows.push(['Banco emisor', bancoEmisor]);

  const tableRows = rows.map(([label, value]) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#64748b;width:140px;">${escapeHtml(label)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#0f172a;font-weight:600;">${escapeHtml(value)}</td>
    </tr>
  `).join('');

  return `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #0f172a;">
      <h2 style="color: #2563EB; margin-bottom: 8px;">Haru POS</h2>
      <p>Nuevo reporte de pago <strong>#${escapeHtml(reportId)}</strong> pendiente de validación.</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;background:#f8fafc;border-radius:8px;overflow:hidden;">
        ${tableRows}
      </table>
      <p style="margin: 24px 0;">
        <a href="${escapeHtml(adminUrl)}" style="background:#2563EB;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">
          Revisar en panel admin
        </a>
      </p>
      <p style="color:#64748B;font-size:13px;">Recibiste este correo porque eres el administrador de pagos de Haru POS.</p>
    </div>
  `;
}

async function sendViaResend({ to, subject, html }) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = mailConfig.getFromAddress();
  const { data, error } = await resend.emails.send({ from, to, subject, html });

  if (error) {
    const msg = error.message || 'Resend no pudo enviar el correo';
    if (/only send testing emails to your own email/i.test(msg)) {
      throw new Error(
        'Resend (plan gratis): solo puedes enviar a henkivzla@gmail.com hasta verificar un dominio. '
        + 'Usa ese correo en olvidé contraseña o verifica tu dominio en resend.com/domains.'
      );
    }
    throw new Error(msg);
  }

  console.log(`[haru Email] Resend OK → ${to} (id: ${data?.id})`);
  return { sent: true, devMode: false, provider: 'resend', id: data?.id };
}

async function sendViaSmtp({ to, subject, html }) {
  const transporter = createSmtpTransporter();
  const from = mailConfig.getFromAddress();
  await transporter.sendMail({ from, to, subject, html });
  return { sent: true, devMode: false, provider: 'smtp' };
}

async function deliverEmail({ to, subject, html, devLabel }) {
  if (mailConfig.MAIL_PROVIDER === 'resend' && mailConfig.isResendConfigured()) {
    return sendViaResend({ to, subject, html });
  }

  if (mailConfig.isSmtpConfigured()) {
    return sendViaSmtp({ to, subject, html });
  }

  console.log(`\n[haru Email DEV] ${devLabel || subject}`);
  console.log('Para:', to);
  console.log('Configura RESEND_API_KEY o SMTP en .env para envío real.\n');
  return { sent: false, devMode: true, provider: 'console' };
}

async function sendPasswordResetEmail({ to, userName, resetUrl }) {
  const subject = 'Restablece tu contraseña — Haru POS';
  const html = buildPasswordResetHtml({ userName, resetUrl });
  return deliverEmail({ to, subject, html, devLabel: 'Recuperación de contraseña' });
}

async function sendPaymentReportNotification({
  reportId,
  storeName,
  userName,
  userEmail,
  planLabel,
  metodoPago,
  referencia,
  montoUsd,
  bancoEmisor,
}) {
  const to = mailConfig.PAYMENT_NOTIFY_EMAIL;
  if (!to) {
    console.warn('[haru Email] PAYMENT_NOTIFY_EMAIL no configurado — omitiendo aviso de pago');
    return { sent: false, devMode: true, provider: 'none' };
  }

  const subject = `[Haru POS] Nuevo pago reportado — ${storeName || 'Comercio'} ($${montoUsd})`;
  const html = buildPaymentReportHtml({
    reportId,
    storeName,
    userName,
    userEmail,
    planLabel,
    metodoPago,
    referencia,
    montoUsd,
    bancoEmisor,
    adminUrl: `${mailConfig.FRONTEND_URL}/admin`,
  });

  return deliverEmail({ to, subject, html, devLabel: 'Aviso de reporte de pago' });
}

async function verifyMailConfig() {
  if (mailConfig.MAIL_PROVIDER === 'resend' && mailConfig.isResendConfigured()) {
    return { ok: true, provider: 'resend', from: mailConfig.getFromAddress() };
  }

  if (mailConfig.isSmtpConfigured()) {
    const transporter = createSmtpTransporter();
    await transporter.verify();
    return { ok: true, provider: 'smtp', from: mailConfig.getFromAddress() };
  }

  return { ok: false, provider: 'none' };
}

module.exports = {
  sendPasswordResetEmail,
  sendPaymentReportNotification,
  verifyMailConfig,
  isSmtpConfigured: mailConfig.isSmtpConfigured,
  isResendConfigured: mailConfig.isResendConfigured,
  isMailConfigured: mailConfig.isMailConfigured
};
