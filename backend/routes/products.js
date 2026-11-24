/**
 * /api/products — the public PTA shop catalogue (read-only).
 * Products and banners are managed by the PTA portal at /api/admin/pta.
 * Supplier details and documents are admin-only and never returned here.
 *
 * GET /          — products (?category=)
 * GET /banners   — active billboard slides, in order
 * GET /:id       — one product
 */
const express = require('express');
const mongoose = require('mongoose');
const { Product, ShopBanner } = require('../schema');
const router = express.Router();

const PUBLIC_FIELDS = '-supplier -supplierDocuments';

router.get('/', async (req, res) => {
  try {
    const filter = req.query.category && req.query.category !== 'All' ? { category: req.query.category } : {};
    const products = await Product.find(filter).select(PUBLIC_FIELDS).sort({ createdAt: -1 }).lean();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/banners', async (req, res) => {
  try {
    res.json(await ShopBanner.find({ isActive: true }).sort({ order: 1, createdAt: 1 }).lean());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid ID' });
    const product = await Product.findById(req.params.id).select(PUBLIC_FIELDS).lean();
    if (!product) return res.status(404).json({ error: 'Not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
