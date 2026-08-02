const fs = require('fs');
const path = require('path');

const UPLOAD_ROOT = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(__dirname, '..', 'uploads');

const API_PUBLIC_URL = (process.env.API_PUBLIC_URL || '').replace(/\/$/, '');

function ensureUploadDirs() {
  fs.mkdirSync(path.join(UPLOAD_ROOT, 'tmp'), { recursive: true });
  fs.mkdirSync(path.join(UPLOAD_ROOT, 'productos'), { recursive: true });
}

function getUploadsRoot() {
  return UPLOAD_ROOT;
}

function getProductsUploadDir(tiendaId) {
  const dir = path.join(UPLOAD_ROOT, 'productos', String(tiendaId));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function resolveMediaUrl(storedPath) {
  if (!storedPath) return null;
  if (/^https?:\/\//i.test(storedPath)) return storedPath;

  const normalized = storedPath.startsWith('/uploads/')
    ? storedPath
    : `/uploads/${String(storedPath).replace(/^\/+/, '')}`;

  return API_PUBLIC_URL ? `${API_PUBLIC_URL}${normalized}` : normalized;
}

function toStoredRelativePath(tiendaId, filename) {
  return `productos/${tiendaId}/${filename}`;
}

function resolveStoredFilePath(storedPath) {
  if (!storedPath || /^https?:\/\//i.test(storedPath)) return null;
  const relative = storedPath.replace(/^\/uploads\//, '').replace(/^\/+/, '');
  const full = path.join(UPLOAD_ROOT, relative);
  if (!full.startsWith(UPLOAD_ROOT)) return null;
  return full;
}

module.exports = {
  ensureUploadDirs,
  getUploadsRoot,
  getProductsUploadDir,
  resolveMediaUrl,
  toStoredRelativePath,
  resolveStoredFilePath,
  API_PUBLIC_URL,
};
