require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const connectDB = require('./config/db');

const app = express();

connectDB();

// ── Static media ──────────────────────────────────────────────────────────────
const MEDIA_DIR = process.env.MEDIA_DIR || 'C:\\Users\\HP\\Downloads\\Motown_Media';
app.use('/media', express.static(MEDIA_DIR));

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/gallery',        require('./routes/gallery'));
app.use('/api/products',       require('./routes/products'));
app.use('/api/media',          require('./routes/media'));
app.use('/api/students',       require('./routes/students'));
app.use('/api/teachers',       require('./routes/teachers'));
app.use('/api/admins',         require('./routes/admins'));
app.use('/api/announcements',  require('./routes/announcements'));
app.use('/api/map-locations',  require('./routes/mapLocations'));
app.use('/api/school-profile', require('./routes/schoolProfile'));
app.use('/api/posts',          require('./routes/pagePosts'));
app.use('/api/orders',         require('./routes/orders'));

app.get('/', (req, res) => res.json({ message: 'Motown API running' }));

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);

// Graceful error: port already in use — print clear message instead of crashing
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n[ERROR] Port ${PORT} is already in use.`);
    console.error(`Run this in PowerShell to free it:`);
    console.error(`  Get-NetTCPConnection -LocalPort ${PORT} | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }\n`);
  } else {
    console.error('[ERROR]', err.message);
  }
  process.exit(1);
});

// Graceful shutdown on Ctrl+C / nodemon restart
process.on('SIGTERM', () => { server.close(); process.exit(0); });
process.on('SIGINT',  () => { server.close(); process.exit(0); });
