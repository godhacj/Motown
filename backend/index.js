require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

const app = express();

connectDB();

// Serve all files from Motown_Media at /media
const MEDIA_DIR = process.env.MEDIA_DIR || 'C:\\Users\\HP\\Downloads\\Motown_Media';
app.use('/media', express.static(MEDIA_DIR));

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// Routes
app.use('/api/gallery',  require('./routes/gallery'));
app.use('/api/products', require('./routes/products'));
app.use('/api/media',    require('./routes/media'));

app.get('/', (req, res) => res.json({ message: 'Motown API running' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
