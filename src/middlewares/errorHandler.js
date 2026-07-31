module.exports = (err, req, res, next) => {
  console.error('Error no capturado:', err);
  const status = err.statusCode || 500;
  const message = err.message || 'Error interno del servidor';

  return res.status(status).json({
    success: false,
    error: message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};
