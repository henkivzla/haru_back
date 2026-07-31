const nodemailer = require('nodemailer');

function isSmtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function createTransporter() {
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

async function sendPasswordResetEmail({ to, userName, resetUrl }) {
  const from = process.env.SMTP_FROM || 'noreply@lilit.ve';
  const subject = 'Restablece tu contraseña — lilit POS';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto;">
      <h2 style="color: #2563EB;">lilit POS</h2>
      <p>Hola ${userName || 'usuario'},</p>
      <p>Recibimos una solicitud para restablecer tu contraseña. Haz clic en el botón:</p>
      <p style="margin: 24px 0;">
        <a href="${resetUrl}" style="background:#2563EB;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold;">
          Restablecer contraseña
        </a>
      </p>
      <p style="color:#64748B;font-size:13px;">Este enlace expira en 1 hora. Si no solicitaste esto, ignora el correo.</p>
      <p style="color:#94A3B8;font-size:12px;word-break:break-all;">${resetUrl}</p>
    </div>
  `;

  if (!isSmtpConfigured()) {
    console.log('\n[lilit Email DEV] Recuperación de contraseña');
    console.log('Para:', to);
    console.log('Enlace:', resetUrl);
    console.log('');
    return { sent: false, devMode: true };
  }

  const transporter = createTransporter();
  await transporter.sendMail({ from, to, subject, html });
  return { sent: true, devMode: false };
}

module.exports = {
  sendPasswordResetEmail,
  isSmtpConfigured
};
