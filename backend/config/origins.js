// Allowed browser origins for CORS (Express) and Socket.IO.
// CLIENT_ORIGIN accepts a comma-separated list so one deployment can serve
// e.g. a production frontend plus a preview URL.
function clientOrigins() {
  const raw = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
  return raw.split(',').map(o => o.trim()).filter(Boolean);
}

module.exports = { clientOrigins };
