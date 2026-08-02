const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { getUploadsRoot } = require('../../config/uploads');

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const tmpDir = path.join(getUploadsRoot(), 'tmp');
    fs.mkdirSync(tmpDir, { recursive: true });
    cb(null, tmpDir);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    cb(null, `upload-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter(req, file, cb) {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error('Solo se permiten imágenes JPG, PNG o WebP'));
  },
});

module.exports = {
  uploadProductImageMiddleware: upload.single('imagen'),
};
