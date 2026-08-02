# Configuración del backend — Haru POS API

## Requisitos

- Node.js 18+
- MySQL 8+ (local o remoto)
- npm

## 1. Clonar e instalar

```powershell
cd haru-pos-backend
npm install
```

## 2. Variables de entorno

Copia la plantilla (**.env nunca se commitea** — está en `.gitignore`):

```powershell
copy .env.example .env
```

Edita `.env`:

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_clave_mysql
DB_NAME=haru_db
JWT_SECRET=clave_larga_y_aleatoria
CORS_ORIGIN=http://localhost:5173
FRONTEND_URL=http://localhost:5173

# Correo (opcional en local)
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@haru.ve
```

> El código acepta `DB_PASS` o `DB_PASSWORD`.

## 3. Base de datos

### Opción A — Schema completo (BD nueva)

```powershell
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS haru_db CHARACTER SET utf8mb4;"
mysql -u root -p haru_db < database/schema.sql
```

### Opción B — BD existente (solo migraciones nuevas)

```powershell
mysql -u root -p haru_db < database/migrations/003_password_reset_tokens.sql
mysql -u root -p haru_db < database/migrations/004_soft_delete_and_user_status.sql
```

## 4. Resetear contraseñas demo

```powershell
npm run seed:users
```

Contraseña resultante: **`haru2026`** (ver `docs/usuarios-demo.md`).

## 5. Arrancar servidor

```powershell
npm run dev
```

Health check: [http://localhost:5000/health](http://localhost:5000/health)

API base: `http://localhost:5000/api`

## 6. Probar login (curl)

```powershell
curl -X POST http://localhost:5000/api/auth/login `
  -H "Content-Type: application/json" `
  -d "{\"email\":\"gomezeiborth@gmail.com\",\"password\":\"haru2026\"}"
```

## 7. Probar gestión usuarios (SUPERADMIN)

```powershell
$token = "TU_JWT_AQUI"
curl http://localhost:5000/api/admin/users `
  -H "Authorization: Bearer $token"
```

## Solución de problemas

| Error | Causa | Solución |
|-------|-------|----------|
| `ECONNREFUSED` MySQL | MySQL apagado | Iniciar servicio MySQL |
| `Unknown column 'estado'` | Falta migración 004 | Ejecutar migración |
| `Access denied` DB | Credenciales `.env` | Revisar user/password |
| Email no llega | SMTP vacío | Normal en local — ver consola backend |

## Seguridad

- No commitear `.env` (`.gitignore` lo excluye)
- Cambiar `JWT_SECRET` en producción
- Usar HTTPS en producción
- Configurar SMTP real para recuperación de contraseña
