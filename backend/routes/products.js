const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const upload = require('../middleware/upload');

// GET all products (optional ?category= filter)
router.get('/', async (req, res) => {
  try {
    const filter = req.query.category && req.query.category !== 'All'
      ? { category: req.query.category }
      : {};
    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single product
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create product with image upload
router.post('/', upload.single('file'), async (req, res) => {
  try {
    const { name, category, price, description, stock } = req.body;
    const image = req.file ? `/media/products/${req.file.filename}` : req.body.image;

    const product = await Product.create({
      name, category,
      price: Number(price),
      image, description,
      stock: Number(stock) || 0,
    });
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH update product
router.patch('/:id', upload.single('file'), async (req, res) => {
  try {
    const updates = { ...req.body };
    if (req.file) updates.image = `/media/products/${req.file.filename}`;
    const product = await Product.findByIdAndUpdate(req.params.id, updates, { new: true });
    res.json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE product
router.delete('/:id', async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
