const app = require('./app');
const env = require('./config/env');

const PORT = env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`🚀 Fina POS Backend API iniciado en el puerto ${PORT}`);
  console.log(`🇻🇪 Enrutado para Venezuela & cPanel Passenger Server`);
  console.log(`=================================================`);
  console.log(`Servidor activo en http://localhost:${PORT}`);
  console.log(`Presiona Ctrl+C para detener.`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ El puerto ${PORT} ya está en uso. Cierra la otra instancia o cambia PORT en .env`);
  } else {
    console.error('❌ Error al iniciar el servidor:', err.message);
  }
  process.exit(1);
});
