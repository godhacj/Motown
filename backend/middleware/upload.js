const multer = require('multer');
const path = require('path');
const cloudinary = require('../config/cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Routes mounted with a :folder param (currently just media.js's
// POST /upload/:folder) pass the folder explicitly. Routes that don't have
// that param resolve it from their own mount path instead, so each keeps
// landing in the Cloudinary folder its constructed URL always claimed —
// gallery.js, pagePosts.js and products.js each call upload.single(...)
// with no :folder param, so previously they all silently fell back to one
// hardcoded default on disk regardless of what the saved URL said.
const BASE_URL_FOLDER = {
  '/api/gallery':  'gallery',
  '/api/posts':    'page',
  '/api/products': 'products',
};

function resolveFolder(req) {
  return req.params.folder || BASE_URL_FOLDER[req.baseUrl] || 'gallery';
}

const storage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => ({
    folder: `motown/${resolveFolder(req)}`,
    resource_type: file.mimetype?.startsWith('audio/') ? 'video' : 'image', // Cloudinary files audio under 'video'
    // Cloudinary appends its own random suffix to public_id when one isn't
    // given, which is enough for uniqueness — no need to hand-roll one.
  }),
});

// Images everywhere; chat attachments may additionally be voice notes, whose
// container varies by browser (webm on Chrome/Firefox, mp4/m4a on Safari).
const IMAGE_EXT = /^\.(jpeg|jpg|png|gif|webp|svg)$/;
const AUDIO_EXT = /^\.(webm|ogg|oga|mp3|m4a|mp4|wav|aac)$/;

const fileFilter = (req, file, cb) => {
  const ext  = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype || '';

  if (IMAGE_EXT.test(ext) && mime.startsWith('image/')) return cb(null, true);
  if (resolveFolder(req) === 'chat-attachments' && AUDIO_EXT.test(ext) && mime.startsWith('audio/'))
    return cb(null, true);

  cb(new Error(resolveFolder(req) === 'chat-attachments' ? 'Images and voice notes only' : 'Images only'));
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

module.exports = upload;
