require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET || 'fina_secret_key_vzla_2026',
  JWT_EXPIRES_IN: '7d',
  DB: {
    HOST: process.env.DB_HOST || 'localhost',
    USER: process.env.DB_USER || 'root',
    PASSWORD: process.env.DB_PASSWORD || process.env.DB_PASS || '',
    NAME: process.env.DB_NAME || 'lilit_db',
    PORT: process.env.DB_PORT || 3306
  }
};
