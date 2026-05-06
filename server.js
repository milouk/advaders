const http = require('http');
const fs = require('fs');
const path = require('path');

// ── env helpers ──────────────────────────────────────────────
const envStr = (k, d) => {
  const v = process.env[k];
  return v === undefined || v === '' ? d : v;
};
const envNum = (k, d) => {
  const v = process.env[k];
  if (v === undefined || v === '') return d;
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};
const envBool = (k, d) => {
  const v = process.env[k];
  if (v === undefined || v === '') return d;
  return /^(1|true|yes|on)$/i.test(String(v));
};

const CONFIG = {
  PORT: envNum('PORT', 3000),
  HOST: envStr('HOST', '0.0.0.0'),

  PIHOLE_URL: envStr('PIHOLE_URL', '').replace(/\/+$/, ''),
  PIHOLE_PASSWORD: envStr('PIHOLE_PASSWORD', ''),
  PIHOLE_INSECURE_TLS: envBool('PIHOLE_INSECURE_TLS', false),
  PIHOLE_QUERY_LENGTH: envNum('PIHOLE_QUERY_LENGTH', 200),

  POLL_INTERVAL_MS: envNum('POLL_INTERVAL_MS', 2000),

  DEFAULT_THEME: envStr('DEFAULT_THEME', 'crt'),
  DEFAULT_SPRITE: envStr('DEFAULT_SPRITE', 'classic'),
  DEFAULT_DENSITY: envStr('DEFAULT_DENSITY', 'normal'),
  TITLE: envStr('TITLE', 'ADVADERS'),
};

if (CONFIG.PIHOLE_INSECURE_TLS) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const PIHOLE_CONFIGURED = Boolean(CONFIG.PIHOLE_URL && CONFIG.PIHOLE_PASSWORD);

const BLOCKED_STATUSES = new Set([
  'GRAVITY', 'REGEX', 'DENYLIST',
  'EXTERNAL_BLOCKED_IP', 'EXTERNAL_BLOCKED_NULL', 'EXTERNAL_BLOCKED_NXRA',
  'GRAVITY_CNAME', 'REGEX_CNAME', 'DENYLIST_CNAME',
  'DBBUSY', 'SPECIAL_DOMAIN',
]);

// ── pi-hole v6 client ────────────────────────────────────────
let session = null;
let sessionExpires = 0;

async function authenticate() {
  if (!PIHOLE_CONFIGURED) return null;
  if (session && Date.now() < sessionExpires) return session;

  const r = await fetch(`${CONFIG.PIHOLE_URL}/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: CONFIG.PIHOLE_PASSWORD }),
  });
  if (!r.ok) throw new Error(`auth ${r.status}`);
  const data = await r.json();
  session = data.session.sid;
  sessionExpires = Date.now() + (data.session.validity * 1000) - 30000;
  return session;
}

async function fetchQueries(since) {
  const sid = await authenticate();
  if (!sid) return null;

  const params = new URLSearchParams({ length: String(CONFIG.PIHOLE_QUERY_LENGTH) });
  if (since) params.set('from', String(since));

  const r = await fetch(`${CONFIG.PIHOLE_URL}/api/queries?${params}`, {
    headers: { 'X-FTL-SID': sid },
  });
  if (r.status === 401) { session = null; throw new Error('session expired'); }
  if (!r.ok) throw new Error(`queries ${r.status}`);
  return r.json();
}

// ── http server ──────────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};
const PUBLIC = path.join(__dirname, 'public');

function clientConfig() {
  return {
    pollIntervalMs: CONFIG.POLL_INTERVAL_MS,
    defaultTheme: CONFIG.DEFAULT_THEME,
    defaultSprite: CONFIG.DEFAULT_SPRITE,
    defaultDensity: CONFIG.DEFAULT_DENSITY,
    title: CONFIG.TITLE,
  };
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://${req.headers.host}`);

  if (u.pathname === '/api/config') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(clientConfig()));
    return;
  }

  if (u.pathname === '/api/queries') {
    if (!PIHOLE_CONFIGURED) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ connected: false }));
      return;
    }
    const since = parseFloat(u.searchParams.get('since')) || 0;
    try {
      const data = await fetchQueries(since);
      const queries = (data && data.queries) || [];
      const blocked = queries
        .filter(q => BLOCKED_STATUSES.has(q.status))
        .map(q => ({
          id: q.id,
          domain: q.domain,
          time: q.time,
          status: q.status,
          client: q.client && (q.client.name || q.client.ip) || null,
        }));
      const latest = queries.reduce((m, q) => Math.max(m, q.time || 0), since);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ connected: true, blocked, timestamp: latest }));
    } catch (e) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ connected: false, error: e.message }));
    }
    return;
  }

  const rel = u.pathname === '/' ? '/index.html' : u.pathname;
  const filePath = path.join(PUBLIC, rel);
  if (!filePath.startsWith(PUBLIC)) { res.writeHead(403); res.end(); return; }

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(CONFIG.PORT, CONFIG.HOST, () => {
  console.log(`\n  ${CONFIG.TITLE}  →  http://${CONFIG.HOST}:${CONFIG.PORT}`);
  if (PIHOLE_CONFIGURED) console.log(`  pi-hole   →  ${CONFIG.PIHOLE_URL}`);
  else console.log(`  pi-hole   →  not configured (frontend will run in demo mode)`);
  console.log(`  theme/sprite  →  ${CONFIG.DEFAULT_THEME} / ${CONFIG.DEFAULT_SPRITE}`);
  console.log('');
});
