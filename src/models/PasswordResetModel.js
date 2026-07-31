const crypto = require('crypto');
const db = require('../../config/db');

class PasswordResetModel {
  static hashToken(rawToken) {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  static generateRawToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  static async invalidateUserTokens(usuarioId) {
    await db.execute(
      `UPDATE password_reset_tokens SET used_at = NOW()
       WHERE usuario_id = ? AND used_at IS NULL`,
      [usuarioId]
    );
  }

  static async createToken(usuarioId, expiresInMinutes = 60) {
    const rawToken = PasswordResetModel.generateRawToken();
    const tokenHash = PasswordResetModel.hashToken(rawToken);

    await PasswordResetModel.invalidateUserTokens(usuarioId);

    await db.execute(
      `INSERT INTO password_reset_tokens (usuario_id, token_hash, expires_at)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
      [usuarioId, tokenHash, expiresInMinutes]
    );

    return rawToken;
  }

  static async findValidToken(rawToken) {
    const tokenHash = PasswordResetModel.hashToken(rawToken);
    const [rows] = await db.execute(
      `SELECT prt.id, prt.usuario_id, prt.expires_at, u.email, u.nombre
       FROM password_reset_tokens prt
       JOIN usuarios u ON u.id = prt.usuario_id
       WHERE prt.token_hash = ?
         AND prt.used_at IS NULL
         AND prt.expires_at > NOW()
       LIMIT 1`,
      [tokenHash]
    );
    return rows[0] || null;
  }

  static async markUsed(tokenId) {
    await db.execute(
      `UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?`,
      [tokenId]
    );
  }
}

module.exports = PasswordResetModel;
