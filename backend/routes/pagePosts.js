const express = require('express')
const { PagePost } = require('../schema')
const upload  = require('../middleware/upload')
const router  = express.Router()

router.get('/', async (req, res) => {
  try {
    const filter = { isPublished: true }
    if (req.query.category) filter.category = req.query.category
    const posts = await PagePost.find(filter).sort({ publishedAt: -1 })
    res.json(posts)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.get('/:id', async (req, res) => {
  try {
    const post = await PagePost.findById(req.params.id)
    if (!post) return res.status(404).json({ error: 'Not found' })
    res.json(post)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/', upload.single('cover'), async (req, res) => {
  try {
    const data = { ...req.body }
    if (req.file) data.coverImage = `/media/page/${req.file.filename}`
    const post = await PagePost.create(data)
    res.status(201).json(post)
  } catch (err) { res.status(400).json({ error: err.message }) }
})

router.post('/:id/comments', async (req, res) => {
  try {
    const post = await PagePost.findById(req.params.id)
    if (!post) return res.status(404).json({ error: 'Not found' })
    post.comments.push(req.body)
    await post.save()
    res.status(201).json(post.comments.at(-1))
  } catch (err) { res.status(400).json({ error: err.message }) }
})

router.patch('/:id', async (req, res) => {
  try {
    const post = await PagePost.findByIdAndUpdate(req.params.id, req.body, { new: true })
    res.json(post)
  } catch (err) { res.status(400).json({ error: err.message }) }
})

router.delete('/:id', async (req, res) => {
  try {
    await PagePost.findByIdAndDelete(req.params.id)
    res.json({ message: 'Deleted' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
