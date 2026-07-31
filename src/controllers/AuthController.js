const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../../config/env');

// Usuarios demo en memoria (mientras no hay BD conectada)
const DEMO_USERS = [
  {
    id: 1,
    tienda_id: 1,
    nombre: 'Diego Aponte (Dueño)',
    email: 'dueno@lilit.ve',
    password: 'lilit2026',
    rol: 'SUPERADMIN',
    tienda_nombre: 'lilit Admin'
  },
  {
    id: 2,
    tienda_id: 2,
    nombre: 'Carlos Mendoza (Gerente)',
    email: 'gerente@tienda.ve',
    password: 'lilit2026',
    rol: 'ADMIN',
    tienda_nombre: 'Comercio Demo lilit'
  },
  {
    id: 3,
    tienda_id: 2,
    nombre: 'María Gómez (Cajera)',
    email: 'cajero@tienda.ve',
    password: 'lilit2026',
    rol: 'CAJERO',
    tienda_nombre: 'Comercio Demo lilit'
  },
  // Usuario original por compatibilidad
  {
    id: 4,
    tienda_id: 1,
    nombre: 'Diego Aponte',
    email: 'diego@negocio.ve',
    password: 'lilit2026',
    rol: 'ADMIN',
    tienda_nombre: 'Inversiones lilit Vzla'
  }
];

class AuthController {
  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Correo y contraseña son requeridos' });
      }

      // Buscar usuario en la lista demo (sin BD activa)
      const demoUser = DEMO_USERS.find(u => u.email === email);
      if (demoUser && password === demoUser.password) {
        const token = jwt.sign(
          { id: demoUser.id, tiendaId: demoUser.tienda_id, email: demoUser.email, role: demoUser.rol },
          env.JWT_SECRET,
          { expiresIn: env.JWT_EXPIRES_IN || '8h' }
        );

        return res.json({
          success: true,
          message: 'Inicio de sesión exitoso',
          token,
          user: {
            id: demoUser.id,
            nombre: demoUser.nombre,
            email: demoUser.email,
            role: demoUser.rol,
            tiendaNombre: demoUser.tienda_nombre
          }
        });
      }

      // Si hay BD disponible, intentar consulta real
      try {
        const UserModel = require('../models/UserModel');
        const user = await UserModel.findByEmail(email);

        if (!user) {
          return res.status(401).json({ success: false, error: 'Credenciales inválidas' });
        }

        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
          return res.status(401).json({ success: false, error: 'Credenciales inválidas' });
        }

        const token = jwt.sign(
          { id: user.id, tiendaId: user.tienda_id, email: user.email, role: user.rol },
          env.JWT_SECRET,
          { expiresIn: env.JWT_EXPIRES_IN || '8h' }
        );

        return res.json({
          success: true,
          token,
          user: {
            id: user.id,
            nombre: user.nombre,
            email: user.email,
            role: user.rol,
            tiendaNombre: user.tienda_nombre
          }
        });
      } catch (dbErr) {
        // BD no disponible y credenciales no coinciden con demo
        return res.status(401).json({ success: false, error: 'Credenciales inválidas' });
      }
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req, res, next) {
    try {
      const demoUser = DEMO_USERS.find(u => u.id === req.user.id);
      if (demoUser) {
        return res.json({
          success: true,
          user: {
            id: demoUser.id,
            nombre: demoUser.nombre,
            email: demoUser.email,
            role: demoUser.rol,
            tiendaNombre: demoUser.tienda_nombre
          }
        });
      }

      try {
        const UserModel = require('../models/UserModel');
        const user = await UserModel.findById(req.user.id);
        return res.json({ success: true, user });
      } catch (dbErr) {
        return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
      }
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
