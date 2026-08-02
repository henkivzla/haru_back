const jwt = require('jsonwebtoken');
const env = require('../../config/env');

function requireAdminReauth(req, res, next) {
  const role = (req.user?.role || '').toUpperCase();
  if (role !== 'ADMIN' && role !== 'SUPERADMIN') {
    return res.status(403).json({
      success: false,
      error: 'Solo administradores pueden realizar esta acción'
    });
  }

  const token = req.headers['x-admin-reauth'];
  if (!token) {
    return res.status(403).json({
      success: false,
      error: 'Confirma con tu contraseña de administrador',
      requiresAdminPassword: true
    });
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (decoded.purpose !== 'admin_action' || String(decoded.sub) !== String(req.user.id)) {
      throw new Error('invalid');
    }
    next();
  } catch {
    return res.status(403).json({
      success: false,
      error: 'Confirmación expirada o inválida. Vuelve a ingresar tu contraseña.',
      requiresAdminPassword: true
    });
  }
}

module.exports = requireAdminReauth;
