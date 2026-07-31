# Usuarios demo — lilit POS

Contraseña común para todos los usuarios de prueba: **`lilit2026`**

> Regenerar hashes: `npm run seed:users` en el backend.

## Tabla de acceso

| Email | Contraseña | Rol | Tienda | Plan (tienda) | Uso |
|-------|------------|-----|--------|---------------|-----|
| `dueno@lilit.ve` | lilit2026 | SUPERADMIN | — | Pro (global) | Panel SaaS, gestión de usuarios, comercios y pagos |
| `diego@negocio.ve` | lilit2026 | ADMIN | Comercio Demo lilit (#1) | Pro | Dueño del comercio demo, todas las features Pro |
| `gerente@tienda.ve` | lilit2026 | ADMIN | Inversiones lilit Vzla (#2) | Estándar | Admin tienda 2, cuentas y clientes |
| `cajero@tienda.ve` | lilit2026 | CAJERO | Inversiones lilit Vzla (#2) | Estándar | Solo POS y caja |

## Estados de usuario

| Estado | ¿Puede login? | Descripción |
|--------|---------------|-------------|
| `ACTIVO` | Sí | Usuario operativo |
| `INACTIVO` | No | Deshabilitado temporalmente |
| `BLOQUEADO` | No | Bloqueo por abuso o incumplimiento |
| Eliminado (`deleted_at`) | No | Soft delete — restaurable desde panel SUPERADMIN |

## Recuperación de contraseña

1. Login → **¿Olvidaste tu contraseña?**
2. Ingresa el correo registrado
3. **Sin SMTP:** el enlace aparece en consola del backend y en pantalla (modo dev)
4. **Con SMTP:** llega correo con enlace a `/restablecer-contrasena?token=...`

## Panel SUPERADMIN — gestión de usuarios

Ruta: `/admin` → pestaña **Usuarios**

Acciones disponibles:
- Crear usuario (nombre, email, contraseña, rol, tienda)
- Editar datos
- **Activar** / **Inactivar** / **Bloquear**
- **Eliminar** (soft delete)
- **Restaurar** usuarios eliminados
