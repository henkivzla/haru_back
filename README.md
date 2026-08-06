# Haru POS — Backend API

Backend **Express 5 + MySQL** para el ERP/POS venezolano **Haru**: autenticación JWT, multi-tenant por tienda, planes SaaS, caja, ventas, inventario con multimoneda (USD / Bs. / EUR) y panel SUPERADMIN.

Repositorio complementario del frontend: **[haru-pos-front](https://github.com/Henki/haru-pos-front)** (ajusta la URL a tu org en GitHub).

---

## Requisitos

| Herramienta | Versión recomendada |
|-------------|---------------------|
| Node.js | 20 LTS o superior |
| MySQL / MariaDB | 8.x / 10.x |
| npm | 10+ |

Opcional en local: **XAMPP** (MySQL + phpMyAdmin).

---

## Clonar e instalar

```powershell
git clone https://github.com/TU_USUARIO/haru-pos-backend.git
cd haru-pos-backend
npm install
```

---

## Configuración (.env)

1. Copia la plantilla:

```powershell
copy .env.example .env
```

2. Edita `.env` con tus valores. **Nunca subas `.env` a GitHub.**

### Variables esenciales (desarrollo)

| Variable | Descripción | Ejemplo local |
|----------|-------------|---------------|
| `PORT` | Puerto del API | `5000` |
| `HOST` | Escucha en red local (celular/tablet) | `0.0.0.0` |
| `DB_HOST` | Servidor MySQL | `localhost` |
| `DB_USER` | Usuario MySQL | `root` |
| `DB_PASSWORD` | Contraseña MySQL | *(vacío en XAMPP)* |
| `DB_NAME` | Base de datos | `haru_db` |
| `JWT_SECRET` | Clave para tokens (cámbiala) | string largo aleatorio |
| `CORS_ORIGIN` | URL del frontend | `http://localhost:5173` |
| `FRONTEND_URL` | Enlaces en correos | `http://localhost:5173` |
| `API_PUBLIC_URL` | URL pública del API | `http://localhost:5000` |
| `UPLOAD_DIR` | Carpeta de imágenes de productos | `./uploads` |

### Correo (opcional en local)

Para recuperar contraseña y avisos de pago de suscripción, configura SMTP en `.env` (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, etc.). Ver comentarios en `.env.example`.

Plantilla de **producción cPanel**: `.env.production.example`

---

## Base de datos

### Instalación nueva (recomendado)

Importa el esquema completo. Crea la base `haru_db` y todas las tablas:

**phpMyAdmin:** Importar → `database/schema.sql`

**CLI** (si `mysql` está en el PATH):

```bash
mysql -u root -p < database/schema.sql
```

El `schema.sql` incluye:

- Catálogo de planes SaaS
- Roles (SUPERADMIN, ADMIN, CAJERO)
- **3 usuarios SUPERADMIN** con contraseña inicial `haru2026` (cámbiala en producción)

### Base de datos ya existente (migraciones)

Si el proyecto ya estaba desplegado, aplica solo lo que falte en `database/migrations/` **en orden numérico** (003 → 022).

Las más recientes relevantes:

| Migración | Qué hace |
|-----------|----------|
| `020_producto_inversion_compra.sql` | Campos de inversión de compra en productos |
| `021_producto_inversion_backfill.sql` | Relleno legacy inversión ← precio |
| `022_plan_max_productos.sql` | Límite de productos por plan |

En phpMyAdmin: abre cada `.sql` y ejecuta. Si un `ALTER` falla con *Duplicate column*, esa parte ya está aplicada.

---

## Arrancar en desarrollo

```powershell
npm run dev
```

| Endpoint | URL |
|----------|-----|
| API | `http://localhost:5000/api` |
| Health | `http://localhost:5000/health` |

### Probar desde celular en la misma WiFi

1. Backend con `HOST=0.0.0.0` en `.env`
2. Permite el puerto **5000** en el firewall de Windows
3. Frontend abierto con la IP de la PC (ej. `http://192.168.1.10:5173`)

---

## Scripts npm

| Comando | Acción |
|---------|--------|
| `npm run dev` | Servidor con recarga (`node --watch`) |
| `npm start` | Producción |
| `npm run seed:users` | Resetea contraseñas seed a `haru2026` |
| `npm run test:email` | Prueba envío SMTP |

---

## Planes SaaS y límites

Definidos en la tabla `planes`:

| Plan | Precio | Usuarios | Productos |
|------|--------|----------|-----------|
| Económico | $15/mes | 1 | 75 |
| Estándar | $18/mes | 3 | 300 |
| Pro | $22/mes | 999 (ilimitado*) | Ilimitado |

\* El plan Pro usa `999` usuarios en BD; productos Pro usan `max_productos = NULL` (sin tope).

Los límites se validan en el API al crear productos o usuarios del equipo.

---

## Estructura del proyecto

```
haru-pos-backend/
├── server.js              # Entrada
├── app.js                 # Express app
├── config/                # env, db, uploads
├── src/
│   ├── controllers/       # HTTP handlers
│   ├── models/            # Acceso a datos
│   ├── routes/            # Rutas /api
│   ├── middlewares/       # Auth, features, errores
│   └── services/          # Lógica de negocio
├── database/
│   ├── schema.sql         # Instalación limpia
│   └── migrations/        # Parches incrementales
├── uploads/               # Imágenes (no versionar contenido)
└── scripts/               # Utilidades
```

---

## Roles

| Rol | Acceso |
|-----|--------|
| **SUPERADMIN** | Plataforma SaaS, tiendas, pagos, usuarios globales |
| **ADMIN** | Administración de su tienda |
| **CAJERO** | POS, caja, ventas (según features del plan) |

---

## Despliegue en producción (cPanel)

1. Sube el repo o conéctalo vía Git en cPanel → **Setup Node.js App**
2. **Application root:** carpeta del backend  
3. **Startup file:** `server.js`  
4. Copia variables de `.env.production.example` a **Environment Variables**
5. Importa / actualiza MySQL (schema o migraciones)
6. Crea carpeta `uploads/` con permisos de escritura
7. Apunta un subdominio (ej. `api.tudominio.com`) al puerto de la app Node

Asegura que `CORS_ORIGIN` y `FRONTEND_URL` coincidan con la URL real del frontend.

---

## Qué no subir a GitHub

- `.env` (secretos)
- `uploads/*` (archivos de usuarios)
- `database/haru_db_export.sql` u otros dumps locales
- Carpeta `docs/` privada (si la usas localmente)

El `.gitignore` del repo ya excluye lo sensible; revisa antes de cada push.

---

## Solución de problemas

| Problema | Qué revisar |
|----------|-------------|
| `ECONNREFUSED` MySQL | XAMPP/MySQL activo, `DB_*` en `.env` |
| CORS en el navegador | `CORS_ORIGIN` = URL exacta del frontend (con puerto) |
| Login 401 | Usuario existe, `JWT_SECRET` igual en todos los entornos |
| Imágenes no cargan | `UPLOAD_DIR` existe y `API_PUBLIC_URL` es correcto |
| Límite de productos | Plan actual y migración `022` aplicada |

---

## Stack

Express 5 · mysql2 · bcryptjs · jsonwebtoken · nodemailer · helmet · cors · multer

---

## Licencia

ISC
