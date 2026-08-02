const app = require('./app');
const env = require('./config/env');
const db = require('./config/db');

const PORT = env.PORT || 5000;

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

const server = app.listen(PORT, () => {
  const mode = env.NODE_ENV || 'development';
  console.log(`=================================================`);
  console.log(`🚀 lilit Backend API — puerto ${PORT} (${mode})`);
  console.log(`🇻🇪 Listo para Venezuela / cPanel Passenger`);
  console.log(`=================================================`);
  console.log(`→ http://localhost:${PORT}`);
  console.log(`→ Health: http://localhost:${PORT}/health`);
  if (mode !== 'production') {
    console.log(`→ Modo dev: logs de cada petición abajo. Usa npm run dev para auto-reinicio.`);
  }
  console.log(`Presiona Ctrl+C para detener.`);
  checkDatabase();
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ El puerto ${PORT} ya está en uso. Cierra la otra instancia o cambia PORT en .env`);
  } else {
    console.error('❌ Error al iniciar el servidor:', err.message);
  }
  process.exit(1);
});
