# Haru POS — Backend API

Backend Express + MySQL para el ERP/POS venezolano **Haru**: autenticación JWT, multi-tenant por tienda, planes SaaS, caja, ventas, inventario y panel SUPERADMIN.

## Repos relacionados

| Repo | Descripción |
|------|-------------|
| **haru-pos-backend** (este) | API REST |
| **haru-pos-front** | Frontend React + Vite |

## Inicio rápido

```powershell
npm install
copy .env.example .env
# Configurar MySQL en .env
mysql -u root -p haru_db < database/schema.sql
npm run seed:users
npm run dev
```

API: `http://localhost:5000/api`

## Documentación

| Documento | Contenido |
|-----------|-----------|
| [docs/usuarios-demo.md](docs/usuarios-demo.md) | Usuarios y contraseñas de prueba |
| [docs/queries-sql.md](docs/queries-sql.md) | Consultas SQL útiles |
| [docs/flujo-sistema-y-roles.md](docs/flujo-sistema-y-roles.md) | Arquitectura, roles y flujos |
| [docs/configuracion-backend.md](docs/configuracion-backend.md) | Setup detallado del backend |

Frontend: ver README en `haru-pos-front`.

## Stack

- Express 5, mysql2, bcryptjs, jsonwebtoken, nodemailer, helmet, cors

## Estructura

```
src/
  controllers/   # Lógica HTTP
  models/        # Acceso a BD
  routes/        # apiRoutes.js
  middlewares/   # JWT, roles, features
  services/      # Email, etc.
  config/        # env, planFeatures
database/
  schema.sql     # Schema + seeds
  migrations/    # ALTER incremental
```

## Roles

- **SUPERADMIN** — plataforma SaaS + gestión usuarios
- **ADMIN** — administración de tienda
- **CAJERO** — POS

## Variables de entorno

Ver `.env.example`. **Nunca commitear `.env`.**

## Licencia

ISC
