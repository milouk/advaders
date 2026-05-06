// Capture one screenshot per theme using a headless browser. Requires the
// dev server to be running on http://localhost:3000.
//
//   node server.js &              # in another shell
//   npm run screenshots
//
// Resulting PNGs are written to docs/screenshots/.

const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME = process.env.CHROME_PATH || (process.platform === 'darwin'
  ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  : '/usr/bin/google-chrome');
const URL = process.env.URL || 'http://localhost:3000';
const OUT = path.join(__dirname, '..', 'docs', 'screenshots');
const WIDTH = Number(process.env.WIDTH || 1280);
const HEIGHT = Number(process.env.HEIGHT || 800);
const SETTLE_MS = Number(process.env.SETTLE_MS || 1500);
const SEED = Number(process.env.SEED || 22);

const SHOTS = [
  { theme: 'crt',     sprite: 'classic' },
  { theme: 'minimal', sprite: 'classic' },
  { theme: 'cyber',   sprite: 'classic' },
  { theme: 'pop',     sprite: 'classic' },
  { theme: 'cyber',   sprite: 'glyph', file: 'cyber-glyph' },
  { theme: 'pop',     sprite: 'dot',   file: 'pop-dot' },
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    defaultViewport: { width: WIDTH, height: HEIGHT, deviceScaleFactor: 2 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();

  for (const s of SHOTS) {
    const target = `${URL}/?theme=${s.theme}&sprite=${s.sprite}&seed=${SEED}`;
    process.stdout.write(`→ ${s.theme}/${s.sprite} ... `);
    await page.goto(target, { waitUntil: 'networkidle2', timeout: 15000 });
    await new Promise((r) => setTimeout(r, SETTLE_MS));
    const file = path.join(OUT, `${s.file || s.theme}.png`);
    await page.screenshot({ path: file, omitBackground: false });
    console.log(`saved ${path.relative(process.cwd(), file)}`);
  }

  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
