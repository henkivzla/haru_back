## Tu hosting — henki.com.ve

| Variable | Valor |
|----------|-------|
| `SMTP_HOST` | `mail.henki.com.ve` |
| `SMTP_USER` | `lilit@henki.com.ve` |
| `SMTP_FROM` | `lilit POS <lilit@henki.com.ve>` |
| `FRONTEND_URL` (prod) | `https://henki.com.ve` |

Local ya configurado en `.env`. Producción: copia las variables de `.env.production.example` al Node.js App de cPanel.

---

## Paso 1 — Crear correo en cPanel

1. Entra a **cPanel** de tu hosting  
2. **Email Accounts** → **Create**  
3. Email: `noreply@tudominio.ve`  
4. Contraseña: anótala  
5. **Create**

---

## Paso 2 — Datos SMTP

1. cPanel → **Email Accounts** → **Connect Devices** (junto al correo)  
2. Anota:

| Campo | Ejemplo |
|-------|---------|
| Servidor | `mail.tudominio.ve` |
| Puerto | `587` (TLS) o `465` (SSL) |
| Usuario | `noreply@tudominio.ve` |
| Contraseña | la que creaste |

---

## Paso 3 — LOCAL (XAMPP)

Edita `.env` en el backend:

```env
MAIL_PROVIDER=smtp
SMTP_HOST=mail.tudominio.ve
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@tudominio.ve
SMTP_PASS=tu_contraseña
SMTP_FROM=lilit POS <noreply@tudominio.ve>
FRONTEND_URL=http://localhost:5173
```

```powershell
npm run dev
npm run test:email -- gomezeiborth@gmail.com
```

Deberías ver: `✅ Correo listo [cpanel (local)]`

---

## Paso 4 — PRODUCCIÓN (cPanel Node.js)

En **Setup Node.js App** → **Environment Variables**, las mismas variables de correo más:

```env
NODE_ENV=production
MAIL_ENV=production
FRONTEND_URL=https://tudominio.ve
CORS_ORIGIN=https://tudominio.ve
DB_HOST=localhost
DB_USER=...
DB_PASSWORD=...
DB_NAME=...
JWT_SECRET=...
```

(Ver `.env.production.example` completo.)

---

## Base de datos

**Local:** importa `database/schema.sql` en XAMPP/phpMyAdmin  

**Producción:** crea BD en cPanel → MySQL® Databases → importa `schema.sql` en phpMyAdmin

---

## Problemas frecuentes

| Problema | Solución |
|----------|----------|
| SMTP auth failed | Revisa usuario/contraseña del correo cPanel |
| Connection timeout | Algunos ISP bloquean puerto 587; prueba `465` + `SMTP_SECURE=true` |
| Correo en spam | Normal al inicio; el destinatario marca como “No es spam” |
| Link reset roto | `FRONTEND_URL` debe ser la URL real del frontend |
