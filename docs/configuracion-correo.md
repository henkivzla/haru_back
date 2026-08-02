# Correo Haru POS — cPanel (local + producción)

Un solo bloque SMTP sirve para **olvidé contraseña** y **aviso de reporte de pago**.

| Uso | Destinatario |
|-----|--------------|
| Olvidé contraseña | El correo que el usuario escribió en el formulario |
| Reporte de pago | `PAYMENT_NOTIFY_EMAIL` (admin, ej. `gomezeiborth@gmail.com`) |

---

## Tu hosting — henki.com.ve

| Variable | Local (`.env`) | Producción (cPanel Node) |
|----------|----------------|---------------------------|
| `MAIL_ENV` | `local` | `production` |
| `MAIL_PROVIDER` | `smtp` | `smtp` |
| `SMTP_HOST` | `mail.henki.com.ve` | `mail.henki.com.ve` |
| `SMTP_PORT` | `587` | `587` |
| `SMTP_SECURE` | `false` | `false` |
| `SMTP_USER` | `haru@henki.com.ve` | `haru@henki.com.ve` |
| `SMTP_PASS` | contraseña del buzón | misma contraseña |
| `SMTP_FROM` | `Haru POS <haru@henki.com.ve>` | igual |
| `FRONTEND_URL` | `http://localhost:5173` | `https://henki.com.ve` |
| `PAYMENT_NOTIFY_EMAIL` | `gomezeiborth@gmail.com` | igual |

Plantillas: `.env.example` (local) y `.env.production.example` (cPanel).

---

## Paso 1 — Crear buzón en cPanel (obligatorio)

1. cPanel → **Email Accounts** → **Create**
2. Email: **`haru@henki.com.ve`**
3. Contraseña: anótala (la misma irá en `SMTP_PASS`)
4. **Create**

`SMTP_USER` y la dirección en `SMTP_FROM` deben ser ese buzón real.

---

## Paso 2 — LOCAL (XAMPP + `npm run dev`)

Copia `.env.example` → `.env` y completa:

```env
MAIL_ENV=local
MAIL_PROVIDER=smtp
SMTP_HOST=mail.henki.com.ve
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=haru@henki.com.ve
SMTP_PASS=contraseña_del_buzón
SMTP_FROM=Haru POS <haru@henki.com.ve>
FRONTEND_URL=http://localhost:5173
PAYMENT_NOTIFY_EMAIL=gomezeiborth@gmail.com
```

```powershell
npm run dev
npm run test:email -- gomezeiborth@gmail.com
```

Deberías ver:

```
✅ Correo listo [cpanel (local)] — remitente: Haru POS <haru@henki.com.ve>
   Avisos de pago → gomezeiborth@gmail.com
```

Prueba solo olvidé contraseña o solo aviso de pago:

```powershell
npm run test:email -- gomezeiborth@gmail.com reset
npm run test:email -- gomezeiborth@gmail.com pago
```

---

## Paso 3 — PRODUCCIÓN (cPanel Node.js)

En **Setup Node.js App** → **Environment Variables**, copia las variables de `.env.production.example` (mismo bloque SMTP + `PAYMENT_NOTIFY_EMAIL`).

Importante en producción:

```env
NODE_ENV=production
MAIL_ENV=production
FRONTEND_URL=https://henki.com.ve
CORS_ORIGIN=https://henki.com.ve
```

Reinicia la app Node en cPanel después de guardar variables.

---

## Error 535 — Incorrect authentication data

| Causa | Solución |
|-------|----------|
| Buzón no existe | Crea `haru@henki.com.ve` en cPanel |
| Contraseña distinta | `SMTP_PASS` = misma contraseña del buzón |
| Puerto bloqueado | Prueba `SMTP_PORT=465` y `SMTP_SECURE=true` |

---

## Problemas frecuentes

| Problema | Solución |
|----------|----------|
| SMTP auth failed (535) | Ver tabla arriba |
| Connection timeout | ISP bloquea 587; prueba 465 + `SMTP_SECURE=true` |
| Correo en spam | Marca como “No es spam” la primera vez |
| Link reset roto | `FRONTEND_URL` debe ser la URL real del frontend |
| No llega aviso de pago | Revisa `PAYMENT_NOTIFY_EMAIL` y que SMTP esté OK (`test:email`) |
