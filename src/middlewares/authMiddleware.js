const jwt = require('jsonwebtoken');
const env = require('../../config/env');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Acceso no autorizado: Token no provisto' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Token inválido o expirado' });
  }
};

const checkRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Usuario no autenticado' });
    }

    const userRole = (req.user.role || 'ADMIN').toUpperCase();
    const formattedAllowed = allowedRoles.map(r => r.toUpperCase());

    if (!formattedAllowed.includes(userRole) && !formattedAllowed.includes('SUPERADMIN') && userRole !== 'SUPERADMIN') {
      return res.status(403).json({ 
        success: false, 
        error: `Acceso denegado: Tu rol (${userRole}) no tiene permisos para esta acción` 
      });
    }

    next();
  };
};

module.exports = {
  verifyToken,
  checkRole
};
