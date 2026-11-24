const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { requireAdminPortal } = require('../middleware/adminAuth');
const { requireUser, rateLimit } = require('../middleware/auth');

// Run multer and turn its errors (wrong type, too large) into JSON the
// client can show, instead of Express's default HTML error page.
const singleFile = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (!err) return next();
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'Files must be 10 MB or smaller' : err.message;
    res.status(400).json({ error: message || 'Upload failed' });
  });
};

const sendUploaded = (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  // req.file.path is the full https://res.cloudinary.com/... URL;
  // req.file.filename is Cloudinary's public_id, not useful as a URL.
  res.status(201).json({ url: req.file.path, filename: req.file.filename });
};

// Library catalogue covers and digital books — library admins only.
router.post('/upload/library', requireAdminPortal('library'), (req, res, next) => {
  req.uploadFolder = 'library';
  next();
}, singleFile, sendUploaded);

// Generic upload to any sub-folder: POST /api/media/upload/:folder
// folder can be: gallery | products | page | avatars | chat-attachments | library-uploads
// Prospective students apply before they have an account, so "avatars"
// (photo + application documents) accepts anonymous uploads, rate-limited.
// Every other folder needs a signed-in user.
const anonUploadLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 30, message: 'Too many uploads. Please try again later.' });
const uploadGuard = (req, res, next) => {
  if (req.auth) return next();
  if (req.params.folder === 'avatars') return anonUploadLimiter(req, res, next);
  return requireUser()(req, res, next);
};

router.post('/upload/:folder', uploadGuard, singleFile, sendUploaded);

module.exports = router;
