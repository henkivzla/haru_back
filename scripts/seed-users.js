/**
 * Resetea contraseñas de usuarios demo a: lilit2026
 * Ejecutar: node scripts/seed-users.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../config/db');

const DEMO_PASSWORD = 'lilit2026';
const DEMO_EMAILS = [
  'dueno@lilit.ve',
  'gerente@tienda.ve',
  'cajero@tienda.ve',
  'diego@negocio.ve'
];

async function main() {
  const hash = bcrypt.hashSync(DEMO_PASSWORD, 10);

  for (const email of DEMO_EMAILS) {
    const [result] = await db.query(
      'UPDATE usuarios SET password_hash = ?, activo = 1 WHERE email = ?',
      [hash, email]
    );
    console.log(`${email}: ${result.affectedRows ? 'actualizado' : 'no encontrado'}`);
  }

  console.log('\nListo. Usa cualquier email demo con password: lilit2026');
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
