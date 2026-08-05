/**
 * Resetea contraseñas de super administradores a: haru2026
 * Ejecutar: node scripts/seed-users.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../config/db');

const DEMO_PASSWORD = 'haru2026';
const SUPERADMIN_EMAILS = [
  'gomezeiborth@gmail.com',
  'carlaborgesce@gmail.com',
  'haru@henki.com.ve'
];

async function main() {
  const hash = bcrypt.hashSync(DEMO_PASSWORD, 10);

  for (const email of SUPERADMIN_EMAILS) {
    const [result] = await db.query(
      'UPDATE usuarios SET password_hash = ?, activo = 1, estado = \'ACTIVO\' WHERE email = ?',
      [hash, email]
    );
    console.log(`${email}: ${result.affectedRows ? 'actualizado' : 'no encontrado'}`);
  }

  console.log('\nListo. Super admins con password: haru2026');
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
