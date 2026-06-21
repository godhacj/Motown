const multer = require('multer');
const path = require('path');
const fs = require('fs');

const MEDIA_DIR = process.env.MEDIA_DIR || 'C:\\Users\\HP\\Downloads\\Motown_Media';

// Ensure sub-folders exist at startup
['gallery', 'products', 'page', 'avatars'].forEach(sub => {
  fs.mkdirSync(path.join(MEDIA_DIR, sub), { recursive: true });
});

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const folder = req.params.folder || 'gallery';
    cb(null, path.join(MEDIA_DIR, folder));
  },
  filename(req, file, cb) {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, unique + path.extname(file.originalname).toLowerCase());
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp|svg/;
  const ok = allowed.test(path.extname(file.originalname).toLowerCase())
           && allowed.test(file.mimetype.split('/')[1]);
  ok ? cb(null, true) : cb(new Error('Images only'));
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

module.exports = upload;
