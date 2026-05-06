// ── canvas setup ───────────────────────────────────────────
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let W = 0, H = 0, DPR = 1;
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.floor(W * DPR);
  canvas.height = Math.floor(H * DPR);
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.imageSmoothingEnabled = false;
}
window.addEventListener('resize', resize);
resize();

// ── pixel patterns (9x7 grids, two animation frames each) ──
const SPRITES = {
  ad: [
    [[0,0,1,0,0,0,1,0,0],[0,0,0,1,0,1,0,0,0],[0,1,1,1,1,1,1,1,0],[1,1,0,1,1,1,0,1,1],[1,1,1,1,1,1,1,1,1],[0,1,0,0,0,0,0,1,0],[1,0,1,0,0,0,1,0,1]],
    [[0,0,1,0,0,0,1,0,0],[1,0,0,1,0,1,0,0,1],[1,1,1,1,1,1,1,1,1],[1,1,0,1,1,1,0,1,1],[0,1,1,1,1,1,1,1,0],[0,0,1,0,0,0,1,0,0],[0,1,0,1,0,1,0,1,0]],
  ],
  tracker: [
    [[0,0,0,1,1,1,0,0,0],[0,1,1,1,1,1,1,1,0],[1,1,0,1,1,1,0,1,1],[1,1,1,1,1,1,1,1,1],[1,0,1,0,0,0,1,0,1],[0,0,1,0,1,0,1,0,0],[1,1,0,0,0,0,0,1,1]],
    [[0,0,0,1,1,1,0,0,0],[0,1,1,1,1,1,1,1,0],[1,1,0,1,1,1,0,1,1],[1,1,1,1,1,1,1,1,1],[0,1,0,1,0,1,0,1,0],[1,0,1,0,0,0,1,0,1],[0,1,0,0,0,0,0,1,0]],
  ],
  analytics: [
    [[0,1,0,0,0,0,0,1,0],[0,0,1,1,1,1,1,0,0],[0,1,1,1,1,1,1,1,0],[1,1,1,0,1,0,1,1,1],[1,1,1,1,1,1,1,1,1],[0,1,0,1,0,1,0,1,0],[1,0,0,0,1,0,0,0,1]],
    [[0,1,0,0,0,0,0,1,0],[0,0,1,1,1,1,1,0,0],[0,1,1,1,1,1,1,1,0],[1,1,1,0,1,0,1,1,1],[1,1,1,1,1,1,1,1,1],[0,0,1,0,0,0,1,0,0],[0,1,1,0,0,0,1,1,0]],
  ],
  telemetry: [
    [[0,0,1,1,1,1,1,0,0],[0,1,1,0,1,0,1,1,0],[1,1,1,1,1,1,1,1,1],[1,0,1,1,1,1,1,0,1],[1,0,0,1,1,1,0,0,1],[0,1,0,0,0,0,0,1,0],[1,0,1,0,0,0,1,0,1]],
    [[0,0,1,1,1,1,1,0,0],[0,1,1,0,1,0,1,1,0],[1,1,1,1,1,1,1,1,1],[1,0,1,1,1,1,1,0,1],[1,0,0,1,1,1,0,0,1],[0,0,1,0,0,0,1,0,0],[0,1,0,0,1,0,0,1,0]],
  ],
};
const GLYPHS = { ad: '$', tracker: '◉', analytics: '%', telemetry: '⬢' };
const SPRITE_W = 9, SPRITE_H = 7, PX = 4; // pixel size for classic/blocky

// ── domain classification (mirrors design) ─────────────────
const CAT_DOMAINS = {
  analytics: ['google-analytics.com','googletagmanager.com','segment.io','mixpanel.com','amplitude.com','hotjar.com','fullstory.com','app-measurement.com','heap.io','optimizely.com'],
  ad: ['doubleclick.net','googlesyndication.com','googleadservices.com','adservice.google.com','criteo.com','pubmatic.com','rubiconproject.com','openx.net','adnxs.com','taboola.com','outbrain.com','mgid.com','adsrvr.org','casalemedia.com','3lift.com','bidswitch.net','amazon-adsystem.com'],
  tracker: ['scorecardresearch.com','facebook.net','facebook.com','tiktok.com','twitter.com','linkedin.com','linksynergy.com','shareasale.com','skimresources.com','yandex.ru','yandex.com','branch.io'],
  telemetry: ['telemetry.mozilla.org','data.microsoft.com','firebaselogging-pa.googleapis.com','newrelic.com','sentry.io','crashlytics.com','metrics.icloud.com'],
};
function categoryOf(domain) {
  const d = String(domain || '').toLowerCase();
  for (const [cat, list] of Object.entries(CAT_DOMAINS)) {
    if (list.some(suffix => d.endsWith(suffix))) return cat;
  }
  return 'ad';
}

// ── themes ─────────────────────────────────────────────────
const THEMES = {
  crt: {
    name: 'Retro CRT',
    bg: '#050a08',
    cat: { ad: '#7fff9f', tracker: '#ffd166', analytics: '#5be7ff', telemetry: '#ff6b9d' },
    accent: '#caffd0',
    glow: '#7fff9f',
    drawBg(ctx, w, h) {
      const g = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w, h) * 0.7);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,0.55)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = '#7fff9f';
      for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
      ctx.restore();
    },
    drawDefender(ctx, x, y, firing) {
      ctx.save();
      ctx.translate(x - 20, y - 11);
      ctx.shadowColor = '#7fff9f';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#7fff9f';
      ctx.fillRect(18, 0, 4, 6);
      ctx.fillRect(14, 6, 12, 4);
      ctx.fillRect(2, 10, 36, 6);
      ctx.fillStyle = '#caffd0';
      ctx.fillRect(0, 16, 40, 4);
      if (firing) { ctx.fillStyle = '#fff'; ctx.fillRect(18, -6, 4, 6); }
      ctx.restore();
    },
    drawShot(ctx, x, y) {
      ctx.save();
      ctx.shadowColor = '#7fff9f'; ctx.shadowBlur = 6;
      ctx.fillStyle = '#caffd0';
      ctx.fillRect(x - 1.5, y - 6, 3, 12);
      ctx.restore();
    },
    drawBurst(ctx, x, y, t, color) {
      const r = t * 24, o = 1 - t;
      ctx.save();
      ctx.globalAlpha = o;
      ctx.strokeStyle = color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = o * 0.5;
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(x, y, r * 0.6, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    },
  },

  minimal: {
    name: 'Minimal',
    bg: '#fafaf7',
    cat: { ad: '#1a1a1a', tracker: '#1a1a1a', analytics: '#666666', telemetry: '#999999' },
    accent: '#1a1a1a',
    glow: 'rgba(0,0,0,0.15)',
    drawBg(ctx, w, h) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      for (let y = 0; y < h; y += 20) {
        for (let x = 0; x < w; x += 20) {
          ctx.fillRect(x, y, 1.2, 1.2);
        }
      }
      ctx.restore();
    },
    drawDefender(ctx, x, y) {
      ctx.save();
      ctx.translate(x - 16, y - 7);
      ctx.fillStyle = '#1a1a1a';
      roundRect(ctx, 0, 8, 32, 3, 1); ctx.fill();
      roundRect(ctx, 14, 0, 4, 10, 1); ctx.fill();
      ctx.restore();
    },
    drawShot(ctx, x, y) {
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(x - 1, y - 5, 2, 10);
    },
    drawBurst(ctx, x, y, t) {
      const r = t * 18, o = 1 - t;
      ctx.save();
      ctx.globalAlpha = o;
      ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    },
  },

  cyber: {
    name: 'Cyberpunk',
    bg: '#0a0014',
    cat: { ad: '#ff4dd2', tracker: '#5be7ff', analytics: '#b15bff', telemetry: '#ffaf3a' },
    accent: '#5be7ff',
    glow: '#5be7ff',
    drawBg(ctx, w, h) {
      const g = ctx.createRadialGradient(w/2, h, 0, w/2, h, Math.max(w, h));
      g.addColorStop(0, 'rgba(125,45,255,0.25)');
      g.addColorStop(1, 'rgba(125,45,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = 'rgba(255,77,210,0.08)'; ctx.lineWidth = 1;
      for (let y = 0; y < h; y += 24) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(91,231,255,0.06)';
      for (let x = 0; x < w; x += 24) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      ctx.restore();
    },
    drawDefender(ctx, x, y, firing) {
      ctx.save();
      ctx.translate(x - 22, y - 12);
      ctx.shadowColor = '#5be7ff'; ctx.shadowBlur = 10;
      ctx.fillStyle = '#5be7ff';
      ctx.beginPath(); ctx.moveTo(22, 0); ctx.lineTo(14, 14); ctx.lineTo(30, 14); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#7d2dff';
      ctx.fillRect(2, 14, 40, 6);
      ctx.fillStyle = '#ff4dd2';
      ctx.fillRect(0, 20, 44, 3);
      if (firing) { ctx.fillStyle = '#5be7ff'; ctx.fillRect(20, -6, 4, 8); }
      ctx.restore();
    },
    drawShot(ctx, x, y) {
      ctx.save();
      ctx.shadowColor = '#5be7ff'; ctx.shadowBlur = 8;
      const g = ctx.createLinearGradient(x, y - 7, x, y + 7);
      g.addColorStop(0, '#5be7ff'); g.addColorStop(1, '#ff4dd2');
      ctx.fillStyle = g;
      ctx.fillRect(x - 1, y - 7, 2, 14);
      ctx.restore();
    },
    drawBurst(ctx, x, y, t, color) {
      const r = t * 26, o = 1 - t;
      ctx.save();
      ctx.globalAlpha = o;
      ctx.strokeStyle = color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = o * 0.4;
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(x, y, r * 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = o * 0.6;
      ctx.lineWidth = 1;
      for (let a = 0; a < 360; a += 60) {
        const rad = a * Math.PI / 180;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(rad) * r * 1.2, y + Math.sin(rad) * r * 1.2);
        ctx.stroke();
      }
      ctx.restore();
    },
  },

  pop: {
    name: 'Pop',
    bg: 'gradient',
    bgGradient: ['#ffe6c4', '#ffb8d4'],
    cat: { ad: '#e63946', tracker: '#f4a261', analytics: '#7d2dff', telemetry: '#06a77d' },
    accent: '#e63946',
    glow: 'rgba(58,26,26,0.25)',
    drawBg(ctx, w, h) {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#ffe6c4'); g.addColorStop(1, '#ffb8d4');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = 'rgba(58,26,26,0.15)';
      for (let y = 0; y < h; y += 14) {
        for (let x = 0; x < w; x += 14) {
          ctx.fillRect(x, y, 1, 1);
        }
      }
      ctx.restore();
    },
    drawDefender(ctx, x, y, firing) {
      ctx.save();
      ctx.translate(x - 21, y - 12);
      ctx.fillStyle = '#3a1a1a';
      roundRect(ctx, 0, 10, 42, 10, 3); ctx.fill();
      ctx.fillStyle = '#e63946';
      roundRect(ctx, 2, 12, 38, 6, 2); ctx.fill();
      ctx.fillStyle = '#3a1a1a';
      roundRect(ctx, 18, 0, 6, 12, 2); ctx.fill();
      ctx.fillStyle = '#fff4d6';
      ctx.fillRect(19, 2, 4, 8);
      if (firing) {
        ctx.fillStyle = '#ffd166';
        ctx.beginPath(); ctx.arc(21, -3, 3, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    },
    drawShot(ctx, x, y) {
      ctx.save();
      ctx.fillStyle = '#3a1a1a';
      ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffd166';
      ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    },
    drawBurst(ctx, x, y, t, color) {
      const o = 1 - t;
      ctx.save();
      ctx.globalAlpha = o;
      ctx.fillStyle = color;
      for (let a = 0; a < 360; a += 45) {
        const rad = a * Math.PI / 180;
        const d = t * 22;
        ctx.beginPath();
        ctx.arc(x + Math.cos(rad) * d, y + Math.sin(rad) * d, Math.max(0.5, 3 - t * 2), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#3a1a1a';
      ctx.font = `900 ${Math.max(8, 14 - t * 4)}px ui-sans-serif, system-ui, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('POP!', x, y);
      ctx.restore();
    },
  },
};
const THEME_LIST = ['crt', 'minimal', 'cyber', 'pop'];
const SPRITE_LIST = ['classic', 'blocky', 'dot', 'glyph'];

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// ── sprite cache (offscreen rasterized pixel art) ──────────
const spriteCache = new Map();
function getSpriteCanvas(category, frame, color, blocky) {
  const key = `${category}|${frame}|${color}|${blocky ? 'b' : 'c'}`;
  let c = spriteCache.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  const W = SPRITE_W * PX, H = SPRITE_H * PX;
  c.width = W; c.height = H;
  const cx = c.getContext('2d');
  cx.fillStyle = color;
  const grid = SPRITES[category][frame];
  for (let y = 0; y < SPRITE_H; y++) {
    for (let x = 0; x < SPRITE_W; x++) {
      if (!grid[y][x]) continue;
      if (blocky) {
        cx.beginPath();
        const r = PX * 0.3;
        roundRect(cx, x * PX, y * PX, PX, PX, r);
        cx.fill();
      } else {
        cx.fillRect(x * PX, y * PX, PX, PX);
      }
    }
  }
  spriteCache.set(key, c);
  return c;
}

function drawInvader(inv, theme, spriteStyle, frame, hovered) {
  const color = theme.cat[inv.category];
  const sx = inv.x, sy = inv.y;

  if (spriteStyle === 'dot') {
    ctx.save();
    if (hovered) { ctx.shadowColor = color; ctx.shadowBlur = 10; }
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(sx, sy, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.arc(sx, sy, 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    return;
  }
  if (spriteStyle === 'glyph') {
    ctx.save();
    if (hovered) { ctx.shadowColor = color; ctx.shadowBlur = 12; }
    ctx.fillStyle = color;
    ctx.font = '700 26px ui-monospace, monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(GLYPHS[inv.category] || '?', sx, sy);
    ctx.restore();
    return;
  }

  const blocky = spriteStyle === 'blocky';
  const sprite = getSpriteCanvas(inv.category, frame, color, blocky);
  ctx.save();
  if (hovered) { ctx.shadowColor = color; ctx.shadowBlur = 8; }
  ctx.drawImage(sprite, Math.round(sx - sprite.width / 2), Math.round(sy - sprite.height / 2));
  ctx.restore();
}

// ── state ──────────────────────────────────────────────────
const CLIENT_NAMES = ['kitchen-tv', 'macbook-pro', 'iphone-15', 'roku-living', 'pixel-9', 'office-laptop', 'thermostat'];
function pickClient(real) { return real || CLIENT_NAMES[Math.floor(Math.random() * CLIENT_NAMES.length)]; }
function hash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0; return Math.abs(h); }

const state = {
  config: {
    pollIntervalMs: 2000,
    title: 'ADVADERS',
  },
  theme: 'crt',
  spriteStyle: 'classic',
  invaders: [],
  shots: [],
  bursts: [],
  defender: { x: 0.5, fireT: 0, charge: 0 },
  blocked: 0,
  startTime: Date.now(),
  feed: [],
  connected: false,
  connectionMsg: 'CONNECTING…',
  hovered: null,
  selected: null,
  mouseX: -1, mouseY: -1,
  spawnQueue: [],
};
let demoMode = false;
let demoTimer = null;

let nextId = 1;

// ── input ──────────────────────────────────────────────────
canvas.addEventListener('mousemove', (e) => {
  const r = canvas.getBoundingClientRect();
  state.mouseX = e.clientX - r.left;
  state.mouseY = e.clientY - r.top;
});
canvas.addEventListener('mouseleave', () => { state.mouseX = -1; state.mouseY = -1; });
canvas.addEventListener('click', () => {
  const inv = hitTest(state.mouseX, state.mouseY);
  if (inv) {
    state.selected = { ...inv };
    renderDetail();
  } else {
    state.selected = null;
    renderDetail();
  }
});

function hitTest(mx, my) {
  if (mx < 0 || my < 0) return null;
  let closest = null, best = 26 * 26;
  for (const inv of state.invaders) {
    if (inv.dead) continue;
    const dx = inv.x - mx, dy = inv.y - my;
    const d = dx * dx + dy * dy;
    if (d < best) { best = d; closest = inv; }
  }
  return closest;
}

// ── data fetching ──────────────────────────────────────────
let lastTimestamp = 0;
let pollInflight = false;
let lastSeenIds = new Set();

async function pollPihole() {
  if (demoMode || pollInflight) return;
  pollInflight = true;
  try {
    const r = await fetch(`api/queries?since=${lastTimestamp}`);
    if (!r.ok) throw new Error(`http ${r.status}`);
    const data = await r.json();
    if (data.connected) {
      stopDemo();
      state.connected = true;
      state.connectionMsg = 'CONNECTED';
      const blocked = (data.blocked || []).filter(q => !lastSeenIds.has(q.id));
      blocked.forEach(q => lastSeenIds.add(q.id));
      if (lastSeenIds.size > 1000) {
        const arr = [...lastSeenIds]; lastSeenIds = new Set(arr.slice(-500));
      }
      const interval = state.config.pollIntervalMs;
      const stagger = blocked.length > 0 ? Math.max(40, Math.floor(interval / Math.max(blocked.length, 1))) : 0;
      blocked.forEach((q, i) => setTimeout(() => state.spawnQueue.push(q), i * stagger));
      lastTimestamp = data.timestamp || lastTimestamp;
    } else {
      startDemo();
    }
  } catch {
    startDemo();
  } finally {
    pollInflight = false;
    updateConnectionDOM();
  }
}

// ── demo mode ──────────────────────────────────────────────
// Built-in fallback for when no Pi-hole is reachable (GitHub Pages,
// dev preview, misconfigured deployment). Picks domains from the same
// classification used for live data so categories render consistently.
const DEMO_DOMAINS_BY_CAT = {
  analytics: ['google-analytics.com','googletagmanager.com','segment.io','mixpanel.com','amplitude.com','hotjar.com','fullstory.com','app-measurement.com','heap.io','optimizely.com','cdn.heapanalytics.com'],
  ad: ['doubleclick.net','googlesyndication.com','googleadservices.com','adservice.google.com','criteo.com','pubmatic.com','rubiconproject.com','openx.net','adnxs.com','taboola.com','outbrain.com','mgid.com','adsrvr.org','casalemedia.com','3lift.com','bidswitch.net','amazon-adsystem.com'],
  tracker: ['scorecardresearch.com','connect.facebook.net','graph.facebook.com','pixel.facebook.com','analytics.tiktok.com','pixel.tiktok.com','analytics.twitter.com','static.ads-twitter.com','snap.licdn.com','px.ads.linkedin.com','mc.yandex.ru','branch.io'],
  telemetry: ['incoming.telemetry.mozilla.org','settings-services.mozilla.com','v10.events.data.microsoft.com','firebaselogging-pa.googleapis.com','newrelic.com','sentry.io','crashlytics.com','metrics.icloud.com'],
};
const DEMO_CATS = Object.keys(DEMO_DOMAINS_BY_CAT);
const DEMO_CLIENTS = ['192.168.1.42', '192.168.1.108', '192.168.1.205', '10.0.0.15'];

function startDemo() {
  if (demoMode) return;
  demoMode = true;
  state.connected = false;
  state.connectionMsg = 'DEMO';
  if (!demoTimer) demoTimer = setInterval(tickDemo, 250);
}
function stopDemo() {
  if (!demoMode) return;
  demoMode = false;
  if (demoTimer) { clearInterval(demoTimer); demoTimer = null; }
}
function tickDemo() {
  // Mean ~2.4 blocks/sec with occasional bursts (mimics page-load DNS clusters).
  const r = Math.random();
  const n = r < 0.45 ? 0 : r < 0.85 ? 1 : r < 0.97 ? 2 : 5;
  for (let i = 0; i < n; i++) {
    const cat = DEMO_CATS[Math.floor(Math.random() * DEMO_CATS.length)];
    const list = DEMO_DOMAINS_BY_CAT[cat];
    const domain = list[Math.floor(Math.random() * list.length)];
    state.spawnQueue.push({
      id: 'demo-' + (nextId++),
      domain, time: Date.now() / 1000,
      status: 'GRAVITY',
      client: DEMO_CLIENTS[Math.floor(Math.random() * DEMO_CLIENTS.length)],
    });
  }
}

// ── sim ────────────────────────────────────────────────────
function spawnInvader(q) {
  const cat = categoryOf(q.domain);
  state.invaders.push({
    id: nextId++,
    domain: q.domain,
    category: cat,
    client: pickClient(q.client),
    list: pickList(q.status),
    time: q.time ? q.time * 1000 : Date.now(),
    status: q.status,
    x: 50 + Math.random() * Math.max(100, W - 100),
    y: -30 - Math.random() * 40,
    vy: 18 + Math.random() * 12,
    vx: (Math.random() - 0.5) * 8,
    seed: hash(q.domain || ''),
    spawnT: performance.now(),
    dead: false,
    deathT: 0,
  });
}
function pickList(status) {
  const map = { GRAVITY: 'StevenBlack', GRAVITY_CNAME: 'StevenBlack', REGEX: 'AdGuard', REGEX_CNAME: 'AdGuard', DENYLIST: 'OISD', DENYLIST_CNAME: 'OISD' };
  return map[status] || 'EasyList';
}

function step(dt, t) {
  // drain spawn queue (1-3 per frame so floods don't pop in)
  let drainBudget = 3;
  while (drainBudget-- > 0 && state.spawnQueue.length) {
    spawnInvader(state.spawnQueue.shift());
  }

  // move invaders
  for (const inv of state.invaders) {
    if (inv.dead) continue;
    inv.y += inv.vy * dt;
    inv.x += inv.vx * dt;
    if (inv.x < 24) { inv.x = 24; inv.vx = Math.abs(inv.vx); }
    if (inv.x > W - 24) { inv.x = W - 24; inv.vx = -Math.abs(inv.vx); }
  }

  // ── never miss: any invader past the kill-line is auto-detonated ──
  // Defender lives at H - 38; invaders that get within 60px get instant
  // burst regardless of shot status. Pi-hole always blocks.
  const killLine = H - 80;
  for (const inv of state.invaders) {
    if (inv.dead) continue;
    if (inv.y > killLine) {
      inv.dead = true;
      inv.deathT = t;
      state.bursts.push({ id: 'auto-' + inv.id, x: inv.x, y: inv.y, t, category: inv.category });
      onBlocked(inv);
    }
  }

  // defender targets nearest-to-bottom live invader
  const live = state.invaders.filter(i => !i.dead);
  if (live.length) {
    const target = live.reduce((a, b) => (b.y > a.y ? b : a));
    const tx = target.x / Math.max(1, W);
    state.defender.x += (tx - state.defender.x) * Math.min(1, dt * 5);
    state.defender.charge += dt;
    // fire rate scales with pressure, capped at ~10/s
    const cooldown = Math.max(0.08, 0.18 - live.length * 0.005);
    if (state.defender.charge > cooldown) {
      state.defender.charge = 0;
      state.defender.fireT = t;
      state.shots.push({
        id: 's' + nextId++,
        x: state.defender.x * W,
        y: H - 50,
        targetId: target.id,
      });
    }
  }

  // shots home toward target
  for (const s of state.shots) {
    const inv = state.invaders.find(i => i.id === s.targetId && !i.dead);
    if (!inv) { s.dead = true; continue; }
    const dx = inv.x - s.x, dy = inv.y - s.y;
    const d = Math.hypot(dx, dy) || 1;
    const speed = 620;
    s.x += (dx / d) * speed * dt;
    s.y += (dy / d) * speed * dt;
    if (d < 14) {
      s.dead = true;
      inv.dead = true;
      inv.deathT = t;
      state.bursts.push({ id: s.id, x: inv.x, y: inv.y, t, category: inv.category });
      onBlocked(inv);
    }
  }

  // GC
  state.shots = state.shots.filter(s => !s.dead && s.y > -40 && s.y < H + 40);
  state.bursts = state.bursts.filter(b => t - b.t < 600);
  state.invaders = state.invaders.filter(i => {
    if (i.dead) return t - (i.deathT || t) < 400;
    return i.y < H + 40;
  });

  // hover
  const inv = hitTest(state.mouseX, state.mouseY);
  state.hovered = inv;
}

function onBlocked(inv) {
  state.blocked++;
  state.feed.unshift({
    id: inv.id, domain: inv.domain, category: inv.category, time: inv.time,
  });
  if (state.feed.length > 9) state.feed.pop();
  renderFeed();
  renderStats();
}

// ── drawing ────────────────────────────────────────────────
function drawFrame() {
  const t = performance.now();
  const theme = THEMES[state.theme];

  ctx.fillStyle = theme.bg === 'gradient' ? '#ffe6c4' : theme.bg;
  ctx.fillRect(0, 0, W, H);
  theme.drawBg(ctx, W, H, t);

  const frame = Math.floor(t / 380) % 2;

  // invaders
  for (const inv of state.invaders) {
    if (inv.dead) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - (t - inv.deathT) / 400);
      drawInvader(inv, theme, state.spriteStyle, frame, false);
      ctx.restore();
    } else {
      const fade = Math.min(1, (t - inv.spawnT) / 200);
      ctx.save();
      ctx.globalAlpha = fade;
      drawInvader(inv, theme, state.spriteStyle, frame, state.hovered === inv);
      ctx.restore();
    }
  }

  // shots
  for (const s of state.shots) theme.drawShot(ctx, s.x, s.y);

  // bursts
  for (const b of state.bursts) {
    const bt = (t - b.t) / 600;
    theme.drawBurst(ctx, b.x, b.y, bt, theme.cat[b.category] || theme.accent);
  }

  // defender
  theme.drawDefender(
    ctx,
    state.defender.x * W,
    H - 38,
    state.defender.fireT && (t - state.defender.fireT) < 100
  );
}

// ── DOM HUD ────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const dom = {
  title: $('hud-title'), blocked: $('hud-blocked'), rate: $('hud-rate'),
  connDot: $('conn-dot'), connText: $('conn-text'),
  themeSeg: $('theme-seg'), spriteSeg: $('sprite-seg'),
  feedList: $('feed-list'),
  tooltip: $('tooltip'), ttDomain: $('tt-domain'), ttMeta: $('tt-meta'),
  detail: $('detail'), detailDomain: $('detail-domain'), detailGrid: $('detail-grid'),
  detailClose: $('detail-close'),
};

function renderStats() {
  dom.blocked.textContent = state.blocked.toLocaleString();
  const elapsedMin = (Date.now() - state.startTime) / 60000;
  const r = elapsedMin > 0.05 ? Math.round(state.blocked / elapsedMin) : 0;
  dom.rate.textContent = `${r}/min`;
}

function renderFeed() {
  dom.feedList.innerHTML = '';
  for (const f of state.feed) {
    const li = document.createElement('li');
    li.innerHTML = `<span class="x">×</span><span class="cat">${f.category}</span><span class="dom">${escapeHtml(f.domain)}</span>`;
    dom.feedList.appendChild(li);
  }
}
function escapeHtml(s) { return String(s).replace(/[<>&"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c])); }

function updateConnectionDOM() {
  dom.connText.textContent = state.connectionMsg;
  dom.connDot.className = 'status-dot ' + (state.connected ? 'live' : 'demo');
}

function renderTooltip() {
  const inv = state.hovered;
  if (!inv || inv.dead) { dom.tooltip.hidden = true; return; }
  dom.tooltip.hidden = false;
  dom.ttDomain.textContent = inv.domain;
  dom.ttMeta.textContent = `${inv.category} · ${inv.client}`;
  const TT_W = dom.tooltip.offsetWidth, TT_H = dom.tooltip.offsetHeight;
  let x = inv.x + 18, y = inv.y - TT_H - 8;
  if (x + TT_W > W - 8) x = inv.x - TT_W - 18;
  if (y < 8) y = inv.y + 22;
  dom.tooltip.style.left = x + 'px';
  dom.tooltip.style.top = y + 'px';
}

function renderDetail() {
  const inv = state.selected;
  if (!inv) { dom.detail.hidden = true; return; }
  dom.detail.hidden = false;
  dom.detailDomain.textContent = inv.domain;
  dom.detailGrid.innerHTML = `
    <dt>category</dt><dd>${inv.category}</dd>
    <dt>client</dt><dd>${escapeHtml(inv.client || '—')}</dd>
    <dt>blocklist</dt><dd>${inv.list || '—'}</dd>
    <dt>status</dt><dd>${inv.status || '—'}</dd>
    <dt>time</dt><dd>${new Date(inv.time).toLocaleTimeString()}</dd>
  `;
}
dom.detailClose.addEventListener('click', () => { state.selected = null; renderDetail(); });

// ── selectors ──────────────────────────────────────────────
function buildSegment(container, options, current, onChange) {
  container.innerHTML = '';
  for (const opt of options) {
    const b = document.createElement('button');
    b.textContent = opt.toUpperCase();
    b.dataset.val = opt;
    if (opt === current) b.classList.add('active');
    b.addEventListener('click', () => onChange(opt));
    container.appendChild(b);
  }
}
function setActive(container, val) {
  for (const b of container.children) {
    b.classList.toggle('active', b.dataset.val === val);
  }
}
function applyTheme(name) {
  if (!THEMES[name]) return;
  state.theme = name;
  document.body.className = 'theme-' + name;
  setActive(dom.themeSeg, name);
  try { localStorage.setItem('advaders.theme', name); } catch {}
}
function applySprite(name) {
  if (!SPRITE_LIST.includes(name)) return;
  state.spriteStyle = name;
  setActive(dom.spriteSeg, name);
  try { localStorage.setItem('advaders.sprite', name); } catch {}
}

// ── main loop ──────────────────────────────────────────────
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  step(dt, now);
  drawFrame();
  renderTooltip();
  requestAnimationFrame(loop);
}

// ── boot ───────────────────────────────────────────────────
async function boot() {
  let cfg = {};
  try {
    const r = await fetch('api/config');
    if (r.ok) cfg = await r.json();
  } catch {}
  state.config = { ...state.config, ...cfg };
  if (cfg.title) {
    dom.title.textContent = cfg.title;
    document.title = cfg.title;
  }

  const params = new URLSearchParams(location.search);
  const urlTheme = params.get('theme');
  const urlSprite = params.get('sprite');
  const savedTheme = (() => { try { return localStorage.getItem('advaders.theme'); } catch { return null; } })();
  const savedSprite = (() => { try { return localStorage.getItem('advaders.sprite'); } catch { return null; } })();
  const initialTheme = (THEMES[urlTheme] && urlTheme) || savedTheme || cfg.defaultTheme || 'crt';
  const initialSprite = (SPRITE_LIST.includes(urlSprite) && urlSprite) || savedSprite || cfg.defaultSprite || 'classic';

  buildSegment(dom.themeSeg, THEME_LIST, initialTheme, applyTheme);
  buildSegment(dom.spriteSeg, SPRITE_LIST, initialSprite, applySprite);
  applyTheme(initialTheme);
  applySprite(initialSprite);

  renderStats();
  renderFeed();
  updateConnectionDOM();

  // ?seed=N — pre-populate field with N invaders spread across the screen
  // (used by the screenshot script to capture nicely distributed frames).
  const seedN = Math.min(60, Number(params.get('seed') || 0));
  if (seedN > 0) seedField(seedN);

  pollPihole();
  setInterval(pollPihole, state.config.pollIntervalMs);
  setInterval(renderStats, 1000);

  requestAnimationFrame(loop);
}

const SEED_DOMAINS = [
  { d: 'doubleclick.net', c: 'ad' }, { d: 'googlesyndication.com', c: 'ad' },
  { d: 'adnxs.com', c: 'ad' }, { d: 'criteo.com', c: 'ad' },
  { d: 'taboola.com', c: 'ad' }, { d: 'pubmatic.com', c: 'ad' },
  { d: 'connect.facebook.net', c: 'tracker' }, { d: 'analytics.tiktok.com', c: 'tracker' },
  { d: 'scorecardresearch.com', c: 'tracker' }, { d: 'analytics.twitter.com', c: 'tracker' },
  { d: 'mc.yandex.ru', c: 'tracker' },
  { d: 'google-analytics.com', c: 'analytics' }, { d: 'mixpanel.com', c: 'analytics' },
  { d: 'segment.io', c: 'analytics' }, { d: 'amplitude.com', c: 'analytics' },
  { d: 'hotjar.com', c: 'analytics' },
  { d: 'incoming.telemetry.mozilla.org', c: 'telemetry' },
  { d: 'app-measurement.com', c: 'telemetry' }, { d: 'sentry.io', c: 'telemetry' },
  { d: 'crashlytics.com', c: 'telemetry' }, { d: 'newrelic.com', c: 'telemetry' },
];

function seedField(n) {
  // Distribute Y across upper 65% of viewport so the defender's lasers
  // are visibly in flight and the lower third stays clean.
  const rng = mulberry32(0xa1ad);
  const cols = Math.max(4, Math.ceil(Math.sqrt(n * (W / Math.max(H, 1)))));
  for (let i = 0; i < n; i++) {
    const pick = SEED_DOMAINS[i % SEED_DOMAINS.length];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cellW = W / cols;
    const x = cellW * (col + 0.5) + (rng() - 0.5) * cellW * 0.6;
    const y = 60 + row * 70 + (rng() - 0.5) * 30;
    if (y > H * 0.7) continue;
    state.invaders.push({
      id: nextId++, domain: pick.d, category: pick.c, client: '192.168.1.42',
      list: 'StevenBlack', time: Date.now(), status: 'GRAVITY',
      x, y, vy: 18 + rng() * 12, vx: (rng() - 0.5) * 6,
      seed: hash(pick.d), spawnT: performance.now() - 800,
      dead: false, deathT: 0,
    });
  }
  // populate feed + counter so HUD looks alive
  for (let i = 0; i < Math.min(8, SEED_DOMAINS.length); i++) {
    const p = SEED_DOMAINS[(i * 3 + 1) % SEED_DOMAINS.length];
    state.feed.push({ id: -i - 1, domain: p.d, category: p.c, time: Date.now() - i * 1100 });
  }
  state.blocked = 1247 + Math.floor(rng() * 800);
  state.startTime = Date.now() - 60 * 60 * 1000; // pretend an hour of uptime
  renderFeed(); renderStats();
}
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

boot();
