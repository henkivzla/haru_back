require('dotenv').config();
const {
  sendPasswordResetEmail,
  sendPaymentReportNotification,
  verifyMailConfig,
  isMailConfigured,
} = require('../src/services/EmailService');
const mailConfig = require('../config/mail');

async function main() {
  const to = process.argv[2];
  const mode = (process.argv[3] || 'all').toLowerCase();

  if (!to) {
    console.error('Uso: npm run test:email -- tu@correo.com [reset|pago|all]');
    process.exit(1);
  }

  if (!isMailConfigured()) {
    console.error('❌ Configura SMTP en .env (ver docs/configuracion-correo.md).');
    process.exit(1);
  }

  try {
    const status = await verifyMailConfig();
    console.log(`✅ SMTP OK [${mailConfig.getMailProfileLabel()}] — remitente: ${status.from}`);
    console.log(`   Avisos de pago → ${mailConfig.PAYMENT_NOTIFY_EMAIL}\n`);

    if (mode === 'reset' || mode === 'all') {
      const resetUrl = `${mailConfig.FRONTEND_URL}/restablecer-contrasena?token=prueba-local`;
      await sendPasswordResetEmail({
        to,
        userName: 'Prueba Haru',
        resetUrl,
      });
      console.log('✅ Correo de olvidé contraseña enviado a', to);
    }

    if (mode === 'pago' || mode === 'all') {
      await sendPaymentReportNotification({
        reportId: 9999,
        storeName: 'Comercio Demo Haru',
        userName: 'Usuario de prueba',
        userEmail: 'cliente@ejemplo.com',
        planLabel: 'Plan Pro ($7)',
        metodoPago: 'Pago Móvil (Bs)',
        referencia: 'REF-TEST-123456',
        montoUsd: 7,
        bancoEmisor: 'Banesco',
      });
      console.log('✅ Aviso de reporte de pago enviado a', mailConfig.PAYMENT_NOTIFY_EMAIL);
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
    if (/535|authentication/i.test(err.message)) {
      console.error('\n→ Crea el buzón SMTP_USER en cPanel y usa la misma contraseña en SMTP_PASS.');
    }
    process.exit(1);
  }
}

main();
