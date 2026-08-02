const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  getProductsUploadDir,
  toStoredRelativePath,
  resolveMediaUrl,
  resolveStoredFilePath,
} = require('../../config/uploads');

const ALLOWED_MIME = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const MAX_BYTES = 2 * 1024 * 1024;

function assertValidImage(file) {
  if (!file) {
    throw new Error('Selecciona una imagen');
  }

  const ext = ALLOWED_MIME[file.mimetype];
  if (!ext) {
    throw new Error('Formato no permitido. Usa JPG, PNG o WebP.');
  }

  if (file.size > MAX_BYTES) {
    throw new Error('La imagen no puede superar 2 MB.');
  }

  return ext;
}

function deleteStoredImage(storedPath) {
  const fullPath = resolveStoredFilePath(storedPath);
  if (fullPath && fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
}

function saveProductImage({ tiendaId, productId, file }) {
  const ext = assertValidImage(file);
  const dir = getProductsUploadDir(tiendaId);
  const filename = `prod-${productId}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
  const destination = path.join(dir, filename);

  fs.renameSync(file.path, destination);

  const storedPath = toStoredRelativePath(tiendaId, filename);
  return {
    storedPath,
    imagenUrl: resolveMediaUrl(storedPath),
  };
}

function cleanupTempFile(file) {
  if (file?.path && fs.existsSync(file.path)) {
    fs.unlinkSync(file.path);
  }
}

module.exports = {
  saveProductImage,
  deleteStoredImage,
  cleanupTempFile,
};
