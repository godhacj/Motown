const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');

// Generic upload to any sub-folder: POST /api/media/upload/:folder
// folder can be: gallery | products | page | avatars
router.post('/upload/:folder', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const url = `/media/${req.params.folder}/${req.file.filename}`;
  res.status(201).json({ url, filename: req.file.filename });
});

module.exports = router;
