const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');

// Generic upload to any sub-folder: POST /api/media/upload/:folder
// folder can be: gallery | products | page | avatars | chat-attachments
router.post('/upload/:folder', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  // req.file.path is the full https://res.cloudinary.com/... URL;
  // req.file.filename is Cloudinary's public_id, not useful as a URL.
  res.status(201).json({ url: req.file.path, filename: req.file.filename });
});

module.exports = router;
