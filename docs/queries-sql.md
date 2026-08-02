# Queries SQL — Haru POS

Base de datos: **`haru_db`** (MySQL 8+).  
Schema completo: `database/schema.sql`

---

## 1. Roles y planes

```sql
-- Todos los roles
SELECT * FROM roles;

-- Planes activos
SELECT id, slug, nombre, precio_mensual, max_usuarios FROM planes WHERE activo = 1;
```

---

## 2. Tiendas (comercios)

```sql
-- Listar tiendas activas (no eliminadas)
SELECT * FROM tiendas WHERE deleted_at IS NULL;

-- Tiendas con suscripción y plan
SELECT t.id, t.nombre, t.rif, s.estado AS sub_estado, p.nombre AS plan, p.precio_mensual
FROM tiendas t
LEFT JOIN suscripciones s ON s.tienda_id = t.id AND s.deleted_at IS NULL
LEFT JOIN planes p ON p.id = s.plan_id
WHERE t.deleted_at IS NULL;

-- Soft delete tienda
UPDATE tiendas SET deleted_at = NOW(), activo = 0 WHERE id = ?;
```

---

## 3. Usuarios

```sql
-- Usuarios activos con rol y tienda
SELECT u.id, u.nombre, u.email, u.estado, r.nombre AS rol, t.nombre AS tienda
FROM usuarios u
JOIN roles r ON r.id = u.rol_id
LEFT JOIN tiendas t ON t.id = u.tienda_id
WHERE u.deleted_at IS NULL;

-- Usuarios bloqueados o inactivos
SELECT id, nombre, email, estado FROM usuarios
WHERE deleted_at IS NULL AND estado IN ('INACTIVO', 'BLOQUEADO');

-- Contar usuarios activos por tienda
SELECT tienda_id, COUNT(*) AS activos
FROM usuarios
WHERE deleted_at IS NULL AND estado = 'ACTIVO'
GROUP BY tienda_id;

-- Cambiar estado manualmente
UPDATE usuarios SET estado = 'BLOQUEADO', activo = 0, updated_at = NOW() WHERE id = ?;

-- Soft delete usuario
UPDATE usuarios SET deleted_at = NOW(), estado = 'INACTIVO', activo = 0 WHERE id = ?;

-- Restaurar usuario
UPDATE usuarios SET deleted_at = NULL, estado = 'INACTIVO', activo = 0 WHERE id = ?;

-- Últimos logins
SELECT nombre, email, ultimo_login FROM usuarios
WHERE deleted_at IS NULL ORDER BY ultimo_login DESC LIMIT 20;
```

---

## 4. Suscripciones y pagos

```sql
-- Suscripciones activas
SELECT s.*, t.nombre AS tienda, p.nombre AS plan
FROM suscripciones s
JOIN tiendas t ON t.id = s.tienda_id
JOIN planes p ON p.id = s.plan_id
WHERE s.estado = 'ACTIVA' AND s.deleted_at IS NULL;

-- MRR (ingreso recurrente mensual)
SELECT SUM(p.precio_mensual) AS mrr
FROM suscripciones s
JOIN planes p ON p.id = s.plan_id
WHERE s.estado = 'ACTIVA';

-- Pagos pendientes de verificación
SELECT rp.*, t.nombre AS tienda
FROM reportes_pago rp
JOIN tiendas t ON t.id = rp.tienda_id
WHERE rp.estado = 'PENDIENTE' AND rp.deleted_at IS NULL;

-- Aprobar pago manualmente
UPDATE reportes_pago SET estado = 'APROBADO', updated_at = NOW() WHERE id = ?;
UPDATE suscripciones SET estado = 'ACTIVA', proximo_pago = DATE_ADD(CURDATE(), INTERVAL 30 DAY)
WHERE tienda_id = ?;
```

---

## 5. Tasa BCV

```sql
-- Tasa más reciente
SELECT * FROM tasas_bcv ORDER BY fecha_registro DESC LIMIT 1;

-- Insertar tasa manual
INSERT INTO tasas_bcv (tasa, fuente) VALUES (750.0000, 'manual');
```

---

## 6. Caja registradora

```sql
-- Caja abierta por tienda
SELECT c.*, u.nombre AS cajero
FROM cajas c
JOIN usuarios u ON u.id = c.usuario_id
WHERE c.estado = 'ABIERTA' AND c.tienda_id = ?;

-- Historial de cajas del día
SELECT * FROM cajas WHERE DATE(abierta_at) = CURDATE() ORDER BY abierta_at DESC;
```

---

## 7. Productos e inventario

```sql
-- Productos activos de una tienda
SELECT p.*, c.nombre AS categoria
FROM productos p
LEFT JOIN categorias_producto c ON c.id = p.categoria_id
WHERE p.tienda_id = ? AND p.deleted_at IS NULL AND p.activo = 1;

-- Stock bajo o agotado
SELECT codigo_ref, nombre, stock, stock_minimo
FROM productos
WHERE tienda_id = ? AND deleted_at IS NULL AND stock <= stock_minimo;

-- Soft delete producto
UPDATE productos SET deleted_at = NOW(), activo = 0 WHERE id = ?;
```

---

## 8. Ventas

```sql
-- Ventas del día por caja
SELECT v.*, c.tienda_id
FROM ventas v
JOIN cajas c ON c.id = v.caja_id
WHERE DATE(v.id) = CURDATE() AND v.anulada = 0;

-- Detalle de una venta
SELECT v.*, iv.nombre_producto, iv.cantidad, iv.subtotal_usd
FROM ventas v
JOIN items_venta iv ON iv.venta_id = v.id
WHERE v.id = ?;

-- Total vendido hoy (USD)
SELECT COALESCE(SUM(v.monto_total_usd), 0) AS total_usd
FROM ventas v
JOIN cajas c ON c.id = v.caja_id
WHERE c.tienda_id = ? AND v.anulada = 0 AND DATE(v.id) = CURDATE();
```

---

## 9. Cuentas por pagar

```sql
-- Pendientes y vencidas
SELECT cp.*, pr.nombre AS proveedor
FROM cuentas_pagar cp
LEFT JOIN proveedores pr ON pr.id = cp.proveedor_id
WHERE cp.tienda_id = ? AND cp.deleted_at IS NULL AND cp.estado IN ('PENDIENTE', 'VENCIDA');

-- Marcar como pagada
UPDATE cuentas_pagar
SET estado = 'PAGADA', monto_pagado_usd = monto_usd, pagada_at = NOW()
WHERE id = ?;
```

---

## 10. Clientes y proveedores

```sql
SELECT * FROM clientes WHERE tienda_id = ? AND deleted_at IS NULL AND activo = 1;
SELECT * FROM proveedores WHERE tienda_id = ? AND deleted_at IS NULL AND activo = 1;
```

---

## 11. Recuperación de contraseña

```sql
-- Tokens vigentes
SELECT prt.*, u.email
FROM password_reset_tokens prt
JOIN usuarios u ON u.id = prt.usuario_id
WHERE prt.used_at IS NULL AND prt.expires_at > NOW();

-- Invalidar tokens de un usuario
UPDATE password_reset_tokens SET used_at = NOW()
WHERE usuario_id = ? AND used_at IS NULL;
```

---

## 12. Auditoría / mantenimiento

```sql
-- Usuarios sin tienda (excepto SUPERADMIN)
SELECT u.*, r.nombre AS rol FROM usuarios u
JOIN roles r ON r.id = u.rol_id
WHERE u.tienda_id IS NULL AND r.nombre != 'SUPERADMIN';

-- Limpiar tokens expirados
DELETE FROM password_reset_tokens WHERE expires_at < NOW() - INTERVAL 7 DAY;

-- Resumen por tienda
SELECT
  t.nombre,
  COUNT(DISTINCT u.id) AS usuarios,
  COUNT(DISTINCT p.id) AS productos,
  (SELECT COUNT(*) FROM ventas v JOIN cajas c ON c.id = v.caja_id WHERE c.tienda_id = t.id) AS ventas
FROM tiendas t
LEFT JOIN usuarios u ON u.tienda_id = t.id AND u.deleted_at IS NULL
LEFT JOIN productos p ON p.tienda_id = t.id AND p.deleted_at IS NULL
WHERE t.deleted_at IS NULL
GROUP BY t.id;
```

---

## Migraciones

| Archivo | Contenido |
|---------|-----------|
| `003_password_reset_tokens.sql` | Tabla tokens recuperación |
| `004_soft_delete_and_user_status.sql` | Soft delete + estado usuarios |

```bash
mysql -u root -p haru_db < database/migrations/004_soft_delete_and_user_status.sql
```
