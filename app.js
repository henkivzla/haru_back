const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const env = require('./config/env');
const { getUploadsRoot, ensureUploadDirs } = require('./config/uploads');
const apiRoutes = require('./src/routes/apiRoutes');
const errorHandler = require('./src/middlewares/errorHandler');
const requestLogger = require('./src/middlewares/requestLogger');

ensureUploadDirs();

const app = express();

// MIDDLEWARES DE SEGURIDAD
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(getUploadsRoot(), {
  maxAge: env.NODE_ENV === 'production' ? '7d' : 0,
  fallthrough: true,
}));

if (env.NODE_ENV !== 'production') {
  app.use(requestLogger);
}

// RUTA DE HEALTHCHECK
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Haru POS Venezuela API funcionando correctamente', timestamp: new Date() });
});

// RUTAS API
app.use('/api', apiRoutes);

// CONTROLADOR DE ERRORES GLOBAL
app.use(errorHandler);

module.exports = app;
