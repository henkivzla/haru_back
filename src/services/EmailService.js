const nodemailer = require('nodemailer');
const { Resend } = require('resend');
const mailConfig = require('../../config/mail');

function createSmtpTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

function buildPasswordResetHtml({ userName, resetUrl }) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; color: #0f172a;">
      <h2 style="color: #2563EB; margin-bottom: 8px;">lilit POS</h2>
      <p>Hola ${userName || 'usuario'},</p>
      <p>Recibimos una solicitud para restablecer tu contraseña. Haz clic en el botón:</p>
      <p style="margin: 24px 0;">
        <a href="${resetUrl}" style="background:#2563EB;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">
          Restablecer contraseña
        </a>
      </p>
      <p style="color:#64748B;font-size:13px;">Este enlace expira en 1 hora. Si no solicitaste esto, ignora el correo.</p>
      <p style="color:#94A3B8;font-size:12px;word-break:break-all;">${resetUrl}</p>
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

  console.log(`[lilit Email] Resend OK → ${to} (id: ${data?.id})`);
  return { sent: true, devMode: false, provider: 'resend', id: data?.id };
}

async function sendViaSmtp({ to, subject, html }) {
  const transporter = createSmtpTransporter();
  const from = mailConfig.getFromAddress();
  await transporter.sendMail({ from, to, subject, html });
  return { sent: true, devMode: false, provider: 'smtp' };
}

async function sendPasswordResetEmail({ to, userName, resetUrl }) {
  const subject = 'Restablece tu contraseña — lilit POS';
  const html = buildPasswordResetHtml({ userName, resetUrl });

  if (mailConfig.MAIL_PROVIDER === 'resend' && mailConfig.isResendConfigured()) {
    return sendViaResend({ to, subject, html });
  }

  if (mailConfig.isSmtpConfigured()) {
    return sendViaSmtp({ to, subject, html });
  }

  console.log('\n[lilit Email DEV] Recuperación de contraseña');
  console.log('Para:', to);
  console.log('Enlace:', resetUrl);
  console.log('Configura RESEND_API_KEY o SMTP en .env para envío real.\n');
  return { sent: false, devMode: true, provider: 'console' };
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
  verifyMailConfig,
  isSmtpConfigured: mailConfig.isSmtpConfigured,
  isResendConfigured: mailConfig.isResendConfigured,
  isMailConfigured: mailConfig.isMailConfigured
};
