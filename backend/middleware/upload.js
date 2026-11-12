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
  return req.uploadFolder || req.params.folder || BASE_URL_FOLDER[req.baseUrl] || 'gallery';
}

// Library folders may also take PDFs (books, notes, past papers).
const DOCUMENT_FOLDERS = new Set(['library', 'library-uploads']);
const isPdf = (file) => file.mimetype === 'application/pdf';

const storage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => {
    // PDFs go up as 'raw' so Cloudinary serves them as-is. Raw assets keep
    // no format of their own, so the extension has to be in public_id for
    // the URL to end in .pdf and open in the browser's viewer.
    if (isPdf(file)) {
      const base = path.basename(file.originalname, path.extname(file.originalname))
        .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'document';
      return {
        folder: `motown/${resolveFolder(req)}`,
        resource_type: 'raw',
        public_id: `${base}-${Date.now()}.pdf`,
      };
    }
    return {
      folder: `motown/${resolveFolder(req)}`,
      resource_type: file.mimetype?.startsWith('audio/') ? 'video' : 'image', // Cloudinary files audio under 'video'
      // Cloudinary appends its own random suffix to public_id when one isn't
      // given, which is enough for uniqueness — no need to hand-roll one.
    };
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
  if (resolveFolder(req) === 'chat-attachments' && AUDIO_EXT.test(ext) && mime.startsWith('audio/'))
    return cb(null, true);
  if (DOCUMENT_FOLDERS.has(resolveFolder(req)) && ext === '.pdf' && isPdf(file))
    return cb(null, true);

  const folder = resolveFolder(req);
  cb(new Error(
    folder === 'chat-attachments' ? 'Images and voice notes only'
      : DOCUMENT_FOLDERS.has(folder) ? 'Images or PDF files only'
      : 'Images only'
  ));
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

module.exports = upload;
