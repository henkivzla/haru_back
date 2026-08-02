# Imágenes de producto (local + cPanel)

Las fotos **no se guardan en MySQL**. Solo se almacena la ruta en `productos.imagen_url` y el archivo queda en disco.

## Variables de entorno

| Variable | Local | cPanel (producción) |
|----------|-------|---------------------|
| `UPLOAD_DIR` | `./uploads` | `/home/TU_USUARIO/haru-pos-backend/uploads` |
| `API_PUBLIC_URL` | `http://localhost:5000` | `https://api.tudominio.com` |

El frontend debe poder abrir `{API_PUBLIC_URL}/uploads/productos/{tienda}/{archivo}.webp`.

## Migración

Si la BD ya existía, ejecuta:

```sql
-- database/migrations/011_producto_imagen_url.sql
ALTER TABLE productos
  ADD COLUMN imagen_url VARCHAR(500) NULL DEFAULT NULL AFTER descripcion;
```

O reimporta `database/schema.sql` v2.6 en un entorno nuevo.

## Local

1. En `.env`:
   ```
   API_PUBLIC_URL=http://localhost:5000
   UPLOAD_DIR=./uploads
   ```
2. `npm run dev`
3. Sube imagen desde Inventario → crear/editar producto

Las imágenes quedan en `uploads/productos/{tienda_id}/`.

## cPanel (Node.js App)

1. Crea la carpeta persistente (fuera de `public_html` si es posible):
   ```
   /home/usuario/haru-pos-backend/uploads
   ```
2. En **Setup Node.js App → Environment Variables**:
   ```
   UPLOAD_DIR=/home/usuario/haru-pos-backend/uploads
   API_PUBLIC_URL=https://api.tudominio.com
   ```
3. Reinicia la aplicación Node.
4. Verifica: `https://api.tudominio.com/health` y sube una imagen de prueba.

### Backups

Incluye en tus respaldos de cPanel:

- Base de datos MySQL
- Carpeta `uploads/` completa

### Permisos

La carpeta `uploads` debe ser escribible por el usuario del proceso Node (típicamente tu usuario cPanel):

```bash
chmod 755 uploads
chmod 755 uploads/productos
```

## API

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/productos/:id/imagen` | Subir/reemplazar (multipart, campo `imagen`) |
| `DELETE` | `/api/productos/:id/imagen` | Quitar imagen |

Formatos: JPG, PNG, WebP. Máximo 2 MB.
