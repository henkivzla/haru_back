const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const apiRoutes = require('./src/routes/apiRoutes');
const errorHandler = require('./src/middlewares/errorHandler');

const app = express();

// MIDDLEWARES DE SEGURIDAD
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// RUTA DE HEALTHCHECK
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Fina POS Venezuela API funcionando correctamente', timestamp: new Date() });
});

// RUTAS API
app.use('/api', apiRoutes);

// CONTROLADOR DE ERRORES GLOBAL
app.use(errorHandler);

module.exports = app;
