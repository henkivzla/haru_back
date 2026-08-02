const mysql = require('mysql2/promise');
require('dotenv').config();

class Database {
  constructor() {
    if (!Database.instance) {
      this.pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'lilit_db',
        port: process.env.DB_PORT || 3306,
        waitForConnections: true,
        connectionLimit: parseInt(process.env.DB_POOL_LIMIT, 10) || 10,
        queueLimit: 0
      });
      Database.instance = this;
    }
    return Database.instance;
  }

  getPool() {
    return this.pool;
  }
}

module.exports = new Database().getPool();
