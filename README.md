# Haru POS — Backend API

Backend Express + MySQL para el ERP/POS venezolano **Haru**: autenticación JWT, multi-tenant por tienda, planes SaaS, caja, ventas, inventario y panel SUPERADMIN.

## Inicio rápido (local)

```powershell
npm install
copy .env.example .env
mysql -u root -p < database/schema.sql
npm run dev
```

API: `http://localhost:5000/api` · Health: `/health`

## Base de datos

Importar **`database/schema.sql`** — recrea `haru_db` con catálogo + **3 super administradores** (pass inicial `haru2026`). Sin tiendas demo.

Reset de contraseñas: `npm run seed:users`

## Variables de entorno

| Archivo | Uso |
|---------|-----|
| `.env.example` | Desarrollo local (XAMPP) |
| `.env.production.example` | cPanel — copiar a Environment Variables |

**Nunca commitear `.env`.**

## Documentación

La documentación operativa (credenciales, cPanel, SQL, flujos) vive en **`docs/` local**, excluida del repositorio. Mantén una copia privada; índice en `docs/README.md` si la tienes localmente.

## Stack

Express 5 · mysql2 · bcryptjs · jsonwebtoken · nodemailer · helmet · cors

## Estructura

```
src/controllers/  src/models/  src/routes/
src/middlewares/  src/services/  config/
database/schema.sql   database/migrations/
```

## Roles

- **SUPERADMIN** — plataforma SaaS
- **ADMIN** — administración de tienda
- **CAJERO** — POS

## Licencia

ISC
