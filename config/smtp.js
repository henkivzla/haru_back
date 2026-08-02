require('dotenv').config();

/**
 * Transporte SMTP cPanel — misma config en local (XAMPP) y producción (Node en hosting).
 * Usado por: olvidé contraseña, aviso de reporte de pago y test:email.
 */
function getSmtpTransportOptions() {
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true';

  const options = {
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  };

  // cPanel puerto 587: STARTTLS (recomendado)
  if (!secure && port === 587) {
    options.requireTLS = true;
  }

  if (process.env.SMTP_TLS_REJECT_UNAUTHORIZED === 'false') {
    options.tls = { ...(options.tls || {}), rejectUnauthorized: false };
  }

  return options;
}

module.exports = { getSmtpTransportOptions };
