/**
 * migrate-syllabus.js — one-off: mark syllabi created before the review
 * workflow existed as published, so they stay on the public Syllabus page.
 * Safe to re-run.  Usage: node backend/scripts/migrate-syllabus.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const mongoose = require('mongoose')
const { Syllabus } = require('../schema')

;(async () => {
  await mongoose.connect(process.env.MONGO_URI)
  const res = await Syllabus.collection.updateMany(
    { isPublished: { $exists: false } },
    { $set: { isPublished: true } }
  )
  console.log(`Marked ${res.modifiedCount} legacy syllabus(es) as published`)
  await mongoose.disconnect()
})().catch((err) => { console.error(err); process.exit(1) })
