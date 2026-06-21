const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  category:    { type: String, required: true },
  price:       { type: Number, required: true, min: 0 },
  image:       { type: String },
  description: { type: String },
  stock:       { type: Number, default: 0, min: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
