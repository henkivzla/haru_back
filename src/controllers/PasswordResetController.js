const bcrypt = require('bcryptjs');
const UserModel = require('../models/UserModel');
const PasswordResetModel = require('../models/PasswordResetModel');
const { sendPasswordResetEmail, isMailConfigured } = require('../services/EmailService');
const { resolveFrontendUrl } = require('../utils/resolveFrontendUrl');

const GENERIC_MESSAGE =
  'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.';

class PasswordResetController {
  static async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, error: 'El correo es requerido' });
      }

      const user = await UserModel.findByEmail(email.trim().toLowerCase());
      let devResetUrl = null;

      if (user) {
        const rawToken = await PasswordResetModel.createToken(user.id, 60);
        const frontendUrl = resolveFrontendUrl(req);
        const resetUrl = `${frontendUrl}/restablecer-contrasena?token=${rawToken}`;

        try {
          const emailResult = await sendPasswordResetEmail({
            to: user.email,
            userName: user.nombre,
            resetUrl
          });

          if (emailResult.devMode) {
            devResetUrl = resetUrl;
          }
        } catch (emailErr) {
          console.error('[haru Email] Error al enviar recuperación:', emailErr.message);
          if (!isMailConfigured()) {
            devResetUrl = resetUrl;
          } else {
            return res.status(502).json({
              success: false,
              error: emailErr.message || 'No se pudo enviar el correo. Revisa la configuración de Resend/SMTP.'
            });
          }
        }
      }

      const response = {
        success: true,
        message: GENERIC_MESSAGE,
        emailSent: Boolean(user && isMailConfigured() && !devResetUrl)
      };

      if (devResetUrl && !isMailConfigured()) {
        response.devResetUrl = devResetUrl;
        response.message = 'Enlace de recuperación generado. Ábrelo abajo (modo local sin correo).';
      } else if (user && isMailConfigured()) {
        response.message = 'Te enviamos un enlace a tu correo. Revisa bandeja y spam.';
      }

      res.json(response);
    } catch (err) {
      next(err);
    }
  }

  static async resetPassword(req, res, next) {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ success: false, error: 'token y newPassword son requeridos' });
      }

      if (String(newPassword).length < 8) {
        return res.status(400).json({ success: false, error: 'La contraseña debe tener al menos 8 caracteres' });
      }

      const record = await PasswordResetModel.findValidToken(token);
      if (!record) {
        return res.status(400).json({ success: false, error: 'Enlace inválido o expirado' });
      }

      const passwordHash = bcrypt.hashSync(newPassword, 10);
      await UserModel.updatePassword(record.usuario_id, passwordHash);
      await PasswordResetModel.markUsed(record.id);

      res.json({
        success: true,
        message: 'Contraseña actualizada. Ya puedes iniciar sesión.'
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = PasswordResetController;
