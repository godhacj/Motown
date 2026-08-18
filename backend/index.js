require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const http     = require('http');
const express  = require('express');
const cors     = require('cors');
const connectDB = require('./config/db');
const { attachSignaling } = require('./socket');

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
app.use('/api/portal',         require('./routes/teacherPortal'));
app.use('/api/classes',        require('./routes/classes'));
app.use('/api/campus-highlights', require('./routes/campusHighlights'));
app.use('/api/library',        require('./routes/library'));
app.use('/api/syllabus',       require('./routes/syllabus'));
app.use('/api/messages',       require('./routes/messages'));
app.use('/api/reports',        require('./routes/reports'));
app.use('/api/conferences',    require('./routes/conferences'));
// ── Admin portal family ───────────────────────────────────────────────────────
app.use('/api/admin',             require('./routes/adminPortal'));
// Phase 2: specific sub-paths BEFORE house router (house has /:id wildcard)
app.use('/api/approvals',         require('./routes/approvals'));
app.use('/api/admin/approvals',   require('./routes/approvals'));
const { studentClearanceRouter, adminClearanceRouter } = require('./routes/clearance');
app.use('/api/students',          studentClearanceRouter);
app.use('/api/admin/clearance',   adminClearanceRouter);
// Phase 3: remaining portals
app.use('/api/admin/academics',   require('./routes/adminAcademics'));
app.use('/api/admin/data',        require('./routes/adminData'));
app.use('/api/admin/domestic',    require('./routes/adminDomestic'));
app.use('/api/admin/chapel',      require('./routes/adminChapel'));
app.use('/api/admin/library',     require('./routes/adminLibrary'));
app.use('/api/admin/club',        require('./routes/adminClub'));
app.use('/api/admin/media',       require('./routes/adminMedia'));
app.use('/api/admin/management',  require('./routes/adminManagement'));
app.use('/api/admin/accounts',    require('./routes/adminAccounts'));
// House LAST — its /:id wildcard must not swallow any of the above
app.use('/api/admin/house',       require('./routes/adminHouse'));

app.get('/', (req, res) => res.json({ message: 'Motown API running' }));

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);
attachSignaling(server);
server.listen(PORT, () =>
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
