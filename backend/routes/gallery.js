const express = require('express');
const router = express.Router();
const GalleryImage = require('../models/GalleryImage');
const upload = require('../middleware/upload');

// GET all images
router.get('/', async (req, res) => {
  try {
    const images = await GalleryImage.find().sort({ createdAt: -1 });
    res.json(images);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single image
router.get('/:id', async (req, res) => {
  try {
    const image = await GalleryImage.findById(req.params.id);
    if (!image) return res.status(404).json({ error: 'Not found' });
    res.json(image);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST upload a new gallery image
router.post('/', upload.single('file'), async (req, res) => {
  try {
    const { title, description, category, aspectRatio, date, publisher, location } = req.body;
    const src = req.file ? `/media/gallery/${req.file.filename}` : req.body.src;
    const avatar = req.body.avatarUrl || null;

    const image = await GalleryImage.create({
      src, title, description, category,
      aspectRatio: Number(aspectRatio) || 1,
      date, publisher, avatar, location,
    });
    res.status(201).json(image);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST add a comment
router.post('/:id/comments', async (req, res) => {
  try {
    const image = await GalleryImage.findById(req.params.id);
    if (!image) return res.status(404).json({ error: 'Not found' });
    image.comments.push(req.body);
    await image.save();
    res.status(201).json(image.comments.at(-1));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE image
router.delete('/:id', async (req, res) => {
  try {
    await GalleryImage.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
