require('dotenv').config();
const { sendPasswordResetEmail, verifyMailConfig, isMailConfigured } = require('../src/services/EmailService');
const mailConfig = require('../config/mail');

async function main() {
  const to = process.argv[2];

  if (!to) {
    console.error('Uso: node scripts/test-email.js tu@correo.com');
    process.exit(1);
  }

  if (!isMailConfigured()) {
    console.error('❌ Configura RESEND_API_KEY o SMTP en .env primero.');
    process.exit(1);
  }

  try {
    const status = await verifyMailConfig();
    console.log(`Verificando correo (${status.provider})... OK`);

    const resetUrl = `${mailConfig.FRONTEND_URL}/restablecer-contrasena?token=prueba-local`;
    const result = await sendPasswordResetEmail({
      to,
      userName: 'Prueba lilit',
      resetUrl
    });

    console.log('✅ Correo enviado a', to);
    if (result.id) console.log('ID Resend:', result.id);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

main();
