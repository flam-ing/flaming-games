// Gameplay verification with Playwright. usage: node scripts/play.mjs [id ...] [--port N] [--humans N]
// Starts each game, sets N human players, mashes each human's keys for ~6s, screenshots, reports page errors.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pw = require(process.env.PW_MODULE || 'playwright-core');
import { spawn } from 'child_process';
import fs from 'fs';
const argv = process.argv.slice(2); const port = +(argv[argv.indexOf('--port') + 1] || 0) || 8798; const humans = +(argv[argv.indexOf('--humans') + 1] || 0) || 2;
const ids = argv.filter(a => !a.startsWith('--') && !/^\d+$/.test(a));
const all = fs.readdirSync('games').filter(f => f.endsWith('.html') && !f.startsWith('_')).map(f => f.replace('.html', ''));
const list = ids.length ? ids : all;
const KEYS = [
  { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', a: 'Space', b: 'Enter' },
  { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', a: 'KeyC', b: 'KeyV' },
  { up: 'KeyI', down: 'KeyK', left: 'KeyJ', right: 'KeyL', a: 'Comma', b: 'Period' },
  { up: 'KeyT', down: 'KeyG', left: 'KeyF', right: 'KeyH', a: 'KeyB', b: 'KeyN' },
];
const srv = spawn('python3', ['-m', 'http.server', String(port)], { stdio: 'ignore' }); await new Promise(r => setTimeout(r, 800));
const browser = await pw.chromium.launch({ executablePath: process.env.CHROME || undefined });
let failed = 0; fs.mkdirSync('scripts/out', { recursive: true });
for (const id of list) {
  const page = await browser.newPage({ viewport: { width: 1000, height: 620 } });
  const errors = []; page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await page.goto(`http://localhost:${port}/games/${id}.html`, { waitUntil: 'load' });
  await page.waitForTimeout(300);
  await page.keyboard.press('Digit' + humans); await page.waitForTimeout(100);
  await page.keyboard.press('Space'); // start
  await page.waitForTimeout(3300); // countdown
  const t0 = Date.now(); let n = 0;
  while (Date.now() - t0 < 6000) {
    for (let h = 0; h < humans; h++) {
      const k = KEYS[h]; const acts = ['a', 'left', 'right', 'up', 'down', 'b'];
      const act = acts[(n + h) % acts.length]; n++;
      if (n % 5 === 0) { await page.keyboard.down(k.a); await page.waitForTimeout(220); await page.keyboard.up(k.a); }
      else { await page.keyboard.press(k[act]); }
      await page.waitForTimeout(35);
    }
  }
  await page.screenshot({ path: `scripts/out/${id}-play.png` });
  const ok = errors.length === 0;
  console.log((ok ? 'ok  ' : 'FAIL') + ' ' + id + (ok ? '' : '  ' + errors.slice(0, 3).join(' | ')));
  if (!ok) failed++;
  await page.close();
}
await browser.close(); srv.kill(); process.exit(failed ? 1 : 0);
