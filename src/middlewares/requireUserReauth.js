const jwt = require('jsonwebtoken');
const env = require('../../config/env');

function requireUserReauth(req, res, next) {
  const token = req.headers['x-user-reauth'];
  if (!token) {
    return res.status(403).json({
      success: false,
      error: 'Confirma con tu contraseña para continuar',
      requiresUserPassword: true,
    });
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (decoded.purpose !== 'user_action' || String(decoded.sub) !== String(req.user.id)) {
      throw new Error('invalid');
    }
    next();
  } catch {
    return res.status(403).json({
      success: false,
      error: 'Confirmación expirada o inválida. Vuelve a ingresar tu contraseña.',
      requiresUserPassword: true,
    });
  }
}

module.exports = requireUserReauth;
