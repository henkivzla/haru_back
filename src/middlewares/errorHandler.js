module.exports = (err, req, res, next) => {
  console.error('Error no capturado:', err);

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      error: 'La imagen no puede superar 2 MB',
    });
  }

  if (err.message?.includes('Solo se permiten imágenes')) {
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }

  const isDbDown = err.code === 'ECONNREFUSED'
    || err.code === 'ENOTFOUND'
    || err.code === 'ER_ACCESS_DENIED_ERROR'
    || err.code === 'ER_BAD_DB_ERROR'
    || err.fatal === true;

  const isRifNotNull = err.code === 'ER_BAD_NULL_ERROR'
    && /rif/i.test(err.message || '');

  const isFkTienda = err.code === 'ER_NO_REFERENCED_ROW_2'
    && /reportes_pago.*tienda_id|tienda_id.*tiendas/i.test(err.message || '');

  const status = isDbDown ? 503 : (err.statusCode || (isRifNotNull ? 503 : 500));
  let message = err.message || 'Error interno del servidor';

  if (/cannot read propert|undefined is not|null is not|is not a function/i.test(message)) {
    message = 'No se pudo completar la operación. Intenta de nuevo.';
  } else if (isDbDown) {
    message = 'No se pudo conectar a la base de datos. Verifica que MySQL esté activo e importa schema.sql.';
  } else if (isRifNotNull) {
    message = 'La base de datos aún exige RIF. Ejecuta la migración 005_tiendas_rif_optional.sql y reinicia el backend.';
  } else if (isFkTienda) {
    message = 'Tu comercio no está vinculado correctamente. Cierra sesión, vuelve a entrar o contacta soporte.';
  }

  return res.status(status).json({
    success: false,
    error: message,
    code: isDbDown ? 'DB_UNAVAILABLE' : err.code,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};
