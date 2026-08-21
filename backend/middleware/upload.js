const multer = require('multer');
const path = require('path');
const fs = require('fs');

const MEDIA_DIR = process.env.MEDIA_DIR || 'C:\\Users\\HP\\Downloads\\Motown_Media';

// Ensure sub-folders exist at startup
['gallery', 'products', 'page', 'avatars', 'chat-attachments'].forEach(sub => {
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

// Images everywhere; chat attachments may additionally be voice notes, whose
// container varies by browser (webm on Chrome/Firefox, mp4/m4a on Safari).
const IMAGE_EXT = /^\.(jpeg|jpg|png|gif|webp|svg)$/;
const AUDIO_EXT = /^\.(webm|ogg|oga|mp3|m4a|mp4|wav|aac)$/;

const fileFilter = (req, file, cb) => {
  const ext  = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype || '';

  if (IMAGE_EXT.test(ext) && mime.startsWith('image/')) return cb(null, true);
  if (req.params.folder === 'chat-attachments' && AUDIO_EXT.test(ext) && mime.startsWith('audio/'))
    return cb(null, true);

  cb(new Error(req.params.folder === 'chat-attachments' ? 'Images and voice notes only' : 'Images only'));
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

module.exports = upload;
