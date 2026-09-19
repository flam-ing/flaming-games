// Verifies each game actually reads input for every human slot.
// Patches STADIUM.input.p to count hit/down calls per player index and how many returned true.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pw = require(process.env.PW_MODULE || 'playwright-core');
import { spawn } from 'child_process'; import fs from 'fs';
const port = +(process.env.PORT || 8871);
const KEYS = [
  { up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight',a:'Space',b:'Enter' },
  { up:'KeyW',down:'KeyS',left:'KeyA',right:'KeyD',a:'KeyC',b:'KeyV' },
  { up:'KeyI',down:'KeyK',left:'KeyJ',right:'KeyL',a:'Comma',b:'Period' },
  { up:'KeyT',down:'KeyG',left:'KeyF',right:'KeyH',a:'KeyB',b:'KeyN' },
];
const ids = process.argv.slice(2).filter(a=>!a.startsWith('--'));
const all = fs.readdirSync('games').filter(f=>f.endsWith('.html')&&!f.startsWith('_')).map(f=>f.replace('.html',''));
const list = ids.length?ids:all;
const srv = spawn('python3',['-m','http.server',String(port)],{stdio:'ignore'}); await new Promise(r=>setTimeout(r,800));
const browser = await pw.chromium.launch({ executablePath: process.env.CHROME });
let bad=[];
for (const id of list) {
  const page = await browser.newPage({ viewport:{width:1000,height:620} });
  const errs=[]; page.on('pageerror',e=>errs.push(String(e)));
  await page.addInitScript(() => {
    window.__mp = { calls: [0, 0, 0, 0], hits: [0, 0, 0, 0] };
    let real;
    Object.defineProperty(window, 'STADIUM', {
      configurable: true,
      get() { return real; },
      set(v) {
        real = v;
        const origGame = v.Game;
        v.Game = function (cfg) {
          const api = origGame(cfg);
          const origP = api.p;
          api.p = function (i) {
            const o = origP(i);
            return new Proxy(o, { get(t, k) {
              if (k === 'hit' || k === 'down') return (...a) => { window.__mp.calls[i]++; const r = t[k](...a); if (r) window.__mp.hits[i]++; return r; };
              if (k === 'axis') return (...a) => { window.__mp.calls[i]++; const r = t.axis(...a); if (r.x || r.y) window.__mp.hits[i]++; return r; };
              return t[k];
            }});
          };
          return api;
        };
      }
    });
  });
  await page.goto(`http://localhost:${port}/games/${id}.html`,{waitUntil:'load'});
  await page.waitForTimeout(250);
  await page.keyboard.press('Digit4'); await page.waitForTimeout(120);
  const humans = await page.evaluate(()=>STADIUM.humans());
  await page.keyboard.press('Space'); await page.waitForTimeout(3400);
  const t0=Date.now(); const DUR = +(process.env.MP_DUR||9000);
  while (Date.now()-t0 < DUR) {
    for (let h=0; h<4; h++) {
      const k=KEYS[h];
      // hold a direction (for hold-based games), then the other, then tap buttons
      await page.keyboard.down(k.left); await page.waitForTimeout(90); await page.keyboard.up(k.left);
      await page.keyboard.down(k.down); await page.waitForTimeout(90); await page.keyboard.up(k.down);
      await page.keyboard.down(k.right); await page.waitForTimeout(90); await page.keyboard.up(k.right);
      await page.keyboard.down(k.up); await page.waitForTimeout(70); await page.keyboard.up(k.up);
      await page.keyboard.down(k.a); await page.waitForTimeout(70); await page.keyboard.up(k.a);
      await page.keyboard.press(k.b);
    }
  }
  const mp = await page.evaluate(()=>window.__mp);
  const ok = humans===4 && mp.calls.every(c=>c>0) && mp.hits.every(h=>h>0) && !errs.length;
  if (!ok) bad.push(id);
  console.log(`${ok?'ok  ':'FAIL'} ${id.padEnd(10)} humans=${humans} calls=[${mp.calls}] hits=[${mp.hits}]${errs.length?' ERR '+errs[0].slice(0,80):''}`);
  await page.close();
}
await browser.close(); srv.kill();
console.log(bad.length?`\nFAIL: ${bad.join(' ')}`:'\nall games read all 4 players');
process.exit(bad.length?1:0);
