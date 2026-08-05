require('dotenv').config();

const WEAK_JWT_SECRETS = new Set([
  'haru_secret_key_vzla_2026',
  'cambia_esta_clave',
  '',
]);

function assertProductionEnv() {
  if (process.env.NODE_ENV !== 'production') return;

  const secret = process.env.JWT_SECRET || '';
  if (WEAK_JWT_SECRETS.has(secret)) {
    throw new Error('JWT_SECRET debe ser una clave larga y única en producción');
  }

  if (!process.env.CORS_ORIGIN) {
    throw new Error('CORS_ORIGIN debe definir el dominio del frontend en producción');
  }
}

assertProductionEnv();

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET || 'haru_secret_key_vzla_2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '',
  FRONTEND_URL: process.env.FRONTEND_URL || '',
  DB: {
    HOST: process.env.DB_HOST || 'localhost',
    USER: process.env.DB_USER || 'root',
    PASSWORD: process.env.DB_PASSWORD || process.env.DB_PASS || '',
    NAME: process.env.DB_NAME || 'haru_db',
    PORT: process.env.DB_PORT || 3306,
  },
};
