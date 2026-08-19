const path = require('path');

// Where uploaded/served media lives. Defaults to a folder inside the backend so
// the app runs anywhere (Linux containers included) without extra setup.
// In production set MEDIA_DIR to a mounted persistent disk — a container's own
// filesystem is wiped on every redeploy.
const MEDIA_DIR = process.env.MEDIA_DIR
  ? path.resolve(process.env.MEDIA_DIR)
  : path.join(__dirname, '..', 'media');

const MEDIA_SUBFOLDERS = ['gallery', 'products', 'page', 'avatars', 'chat-attachments'];

module.exports = { MEDIA_DIR, MEDIA_SUBFOLDERS };
