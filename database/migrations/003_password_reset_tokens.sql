-- Tokens de recuperación de contraseña
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id   INT UNSIGNED NOT NULL,
  token_hash   VARCHAR(64)  NOT NULL,
  expires_at   TIMESTAMP    NOT NULL,
  used_at      TIMESTAMP    NULL,
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_token_hash (token_hash),
  INDEX idx_usuario_expires (usuario_id, expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Tokens temporales para restablecer contraseña';
