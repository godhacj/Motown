const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  author:  { type: String, required: true },
  avatar:  { type: String },
  text:    { type: String, required: true },
}, { timestamps: true });

const galleryImageSchema = new mongoose.Schema({
  src:         { type: String, required: true },
  title:       { type: String, required: true },
  description: { type: String },
  category:    { type: String },
  aspectRatio: { type: Number, default: 1 },
  date:        { type: String },
  publisher:   { type: String },
  avatar:      { type: String },
  location:    { type: String },
  comments:    [commentSchema],
}, { timestamps: true });

module.exports = mongoose.model('GalleryImage', galleryImageSchema);
