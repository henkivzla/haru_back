const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/UserModel');
const env = require('../../config/env');

class AuthController {
  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Correo y contraseña son requeridos' });
      }

      const user = await UserModel.findByEmail(email);

      // Si no existe, simulamos login con usuario demo
      if (!user) {
        if (email === 'diego@negocio.ve') {
          const token = jwt.sign(
            { id: 1, tiendaId: 1, email: 'diego@negocio.ve', rol: 'ADMIN' },
            env.JWT_SECRET,
            { expiresIn: env.JWT_EXPIRES_IN }
          );

          return res.json({
            success: true,
            message: 'Inicio de sesión exitoso (Usuario Demo)',
            token,
            user: {
              id: 1,
              nombre: 'Diego Aponte',
              email: 'diego@negocio.ve',
              rol: 'ADMIN',
              tiendaNombre: 'Inversiones Fina Vzla'
            }
          });
        }
        return res.status(401).json({ success: false, error: 'Credenciales inválidas' });
      }

      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({ success: false, error: 'Credenciales inválidas' });
      }

      const token = jwt.sign(
        { id: user.id, tiendaId: user.tienda_id, email: user.email, rol: user.rol },
        env.JWT_SECRET,
        { expiresIn: env.JWT_EXPIRES_IN }
      );

      return res.json({
        success: true,
        token,
        user: {
          id: user.id,
          nombre: user.nombre,
          email: user.email,
          rol: user.rol,
          tiendaNombre: user.tienda_nombre
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req, res, next) {
    try {
      const user = await UserModel.findById(req.user.id);
      return res.json({ success: true, user });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
