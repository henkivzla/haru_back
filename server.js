const os = require('os');
const app = require('./app');
const env = require('./config/env');
const db = require('./config/db');
const { verifyMailConfig, isMailConfigured } = require('./src/services/EmailService');

const PORT = env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

function getLocalIpv4() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return 'localhost';
}

async function checkDatabase() {
  try {
    await db.query('SELECT 1');
    console.log('✅ MySQL conectado correctamente');

    const [rifCol] = await db.query(
      `SELECT IS_NULLABLE AS nullable
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'tiendas'
         AND COLUMN_NAME = 'rif'
       LIMIT 1`
    );
    if (rifCol[0]?.nullable === 'NO') {
      console.warn('⚠️  tiendas.rif es NOT NULL — ejecuta database/migrations/005_tiendas_rif_optional.sql');
    }
  } catch (err) {
    console.error('❌ MySQL no disponible:', err.code || err.message);
    console.error('   → Inicia el servicio MySQL80 (Services.msc) e importa database/schema.sql');
  }
}

const server = app.listen(PORT, HOST, () => {
  const mode = env.NODE_ENV || 'development';
  const lanIp = getLocalIpv4();
  console.log(`=================================================`);
  console.log(`🚀 Haru Backend API — puerto ${PORT} (${mode})`);
  console.log(`🇻🇪 Listo para Venezuela / cPanel Passenger`);
  console.log(`=================================================`);
  console.log(`→ http://localhost:${PORT}`);
  if (lanIp !== 'localhost') {
    console.log(`→ Red local: http://${lanIp}:${PORT}`);
  }
  console.log(`→ Health: http://localhost:${PORT}/health`);
  if (mode !== 'production') {
    console.log(`→ Modo dev: logs de cada petición abajo. Usa npm run dev para auto-reinicio.`);
  }
  console.log(`Presiona Ctrl+C para detener.`);
  checkDatabase();
  checkMail();
});

async function checkMail() {
  const mailConfig = require('./config/mail');

  if (!isMailConfigured()) {
    console.warn(`⚠️  Correo no configurado (${mailConfig.MAIL_ENV}) — olvidé contraseña mostrará enlace local`);
    if (mailConfig.MAIL_ENV === 'local') {
      console.warn('   → Local: configura SMTP cPanel en .env (ver docs/configuracion-correo.md)');
    } else {
      console.warn('   → Producción: configura SMTP cPanel (ver .env.production.example)');
    }
    return;
  }

  try {
    const status = await verifyMailConfig();
    console.log(`✅ Correo listo [${mailConfig.getMailProfileLabel()}] — remitente: ${status.from}`);
    if (mailConfig.PAYMENT_NOTIFY_EMAIL) {
      console.log(`   Avisos de pago → ${mailConfig.PAYMENT_NOTIFY_EMAIL}`);
    }
  } catch (err) {
    console.error('❌ Correo mal configurado:', err.message);
    if (/535|authentication/i.test(err.message)) {
      console.error('   → El buzón SMTP_USER no existe en cPanel o SMTP_PASS es incorrecta.');
      console.error(`   → Crea ${process.env.SMTP_USER || 'haru@henki.com.ve'} en cPanel → Email Accounts.`);
      console.error('   → Prueba: npm run test:email -- gomezeiborth@gmail.com');
      console.error('   → Guía: docs/configuracion-correo.md');
    }
  }
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ El puerto ${PORT} ya está en uso. Cierra la otra instancia o cambia PORT en .env`);
  } else {
    console.error('❌ Error al iniciar el servidor:', err.message);
  }
  process.exit(1);
});
