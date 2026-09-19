// Integration QA for the migrated collection. Optional URL points at its stadium root.
// Usage: node scripts/integration.mjs [https://your-host/flamingo-stadium/] [id ...]
// Uses isolated browser contexts, accelerates only the animation clock, and mutes audio.
// Full rounds run the real update rules; rendering is sampled to keep headless QA fast.
// Env: PW_MODULE, CHROME, QA_ROOT, QA_NO_FULL=1, QA_REPORT, QA_CLEAN_URLS=0
// Uses installed Chrome by default. GitHub Pages checks use .html URLs automatically.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile, stat, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_MODULE || 'playwright-core');
const stadiumRoot = fileURLToPath(new URL('../', import.meta.url));
const root = path.resolve(process.env.QA_ROOT || path.join(stadiumRoot, '..'));
const reportPath = process.env.QA_REPORT || path.join(stadiumRoot, 'scripts/out/integration-report.json');
const args = process.argv.slice(2);
let base = args[0]?.startsWith('http') ? args.shift() : null;
let server;
if (!base) {
  server = createServer(async (req, res) => {
    try {
      let relative = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/flaming-games\//, '');
      let file = path.join(root, relative);
      if (file !== root && !file.startsWith(root + path.sep)) throw Error('outside root');
      let info = await stat(file).catch(() => null);
      if (info?.isDirectory()) file = path.join(file, 'index.html');
      else if (!info && relative.endsWith('/')) file = path.join(root, relative.replace(/\/$/, '') + '.html');
      else if (!info && !path.extname(relative)) file += '.html';
      const body = await readFile(file);
      res.writeHead(200, { 'Content-Type': ({'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'})[path.extname(file)] || 'application/octet-stream' });
      res.end(body);
    } catch { res.writeHead(404); res.end('Not found'); }
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}/flaming-games/flamingo-stadium/`;
}
base = base.replace(/\/?$/, '/');
const cleanUrls = process.env.QA_CLEAN_URLS !== '0' && !new URL(base).hostname.endsWith('.github.io');
const browser = await chromium.launch({ ...(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' }), headless: true, args:['--enable-unsafe-swiftshader'] });
const results = [];
const errors = [];
async function step(page, n=1) { await page.evaluate(n=>window.__qaStep(n), n); }
async function tap(page, code) { await page.keyboard.down(code); await step(page); await page.keyboard.up(code); await step(page); }
async function snapshot(page) { return page.evaluate(() => ({ state: g.state(), humans: g.humans, players: typeof P === 'undefined' ? null : P.map(p=>({i:p.i,human:p.human,x:p.x,y:p.y,count:p.count,dist:p.dist,spin:p.spin,ko:p.ko,holding:p.holding,fin:p.fin})), mp: window.__qaMP, renderer: typeof stadiumView === 'undefined' ? null : {enabled:stadiumView.enabled,available:!!stadiumView.view?.available,failed:stadiumView.failed} })); }
async function openGame(id, clean=false, disableWebGL=false) {
  const context = await browser.newContext({viewport:{width:1200,height:820}});
  if (disableWebGL) await context.addInitScript(()=>{ const original=HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:original.call(this,type,...args);}; });
  await context.addInitScript(() => {
    let clock = performance.now(), queue = [], next=0;
    window.requestAnimationFrame = cb => {queue.push([++next,cb]); return next;};
    window.cancelAnimationFrame = id => {queue=queue.filter(x=>x[0]!==id);};
    window.__qaStep = n => {for(let i=0;i<n;i++){clock+=50;const frames=queue;queue=[];frames.forEach(([,cb])=>cb(clock));}};
    window.__qaMP={calls:[0,0,0,0],hits:[0,0,0,0]};
    let real;
    Object.defineProperty(window,'STADIUM',{configurable:true,get(){return real;},set(v){real=v;for(const k of Object.keys(v.sfx))v.sfx[k]=()=>{};const Game=v.Game;v.Game=function(cfg){const draw=cfg.draw;let draws=0;cfg.draw=function(...a){if(++draws%(window.__qaDrawEvery||1)===0)return draw.apply(this,a);};const api=Game(cfg);const p=api.p;api.p=i=>new Proxy(p(i),{get(t,k){if(k==='hit'||k==='down')return(...a)=>{__qaMP.calls[i]++;const yes=t[k](...a);if(yes)__qaMP.hits[i]++;return yes;};if(k==='axis')return()=>{__qaMP.calls[i]++;const r=t.axis();if(r.x||r.y)__qaMP.hits[i]++;return r;};return t[k];}});return api;};}});
  });
  const page=await context.newPage();
  const pageErrors=[];page.on('pageerror',e=>pageErrors.push(String(e)));
  const missing=[];page.on('response',r=>{if(r.status()>=400)missing.push(`${r.status()} ${r.url()}`);});
  await page.goto(`${base}games/${id}${clean?'/':'.html'}`, {waitUntil:'networkidle'});
  await page.waitForFunction(()=>typeof STADIUM!=='undefined'&&typeof g!=='undefined',{},{timeout:20000});
  await step(page,2);
  return {page,context,pageErrors,missing};
}
async function test(name,fn) {try{const data=await fn();results.push({name,ok:true,...data});console.log(`OK ${name}`);}catch(e){errors.push({name,error:String(e)});console.error(`FAIL ${name}: ${e.message}`);}}
const lobby=await browser.newPage();
await lobby.goto(base, {waitUntil:'networkidle'});
const ids=args.length?args:await lobby.evaluate(()=>window.GAMES_DATA.map(g=>g.id));
await test('lobby collection',async()=>{const data=await lobby.evaluate(()=>({count:window.GAMES_DATA.length,links:[...document.querySelectorAll('a[href*="games/"]')].map(a=>a.href)}));assert.equal(data.count,21);return data;});
await lobby.close();
for(const id of ids){await test(`${id}: title, 4 humans, start, finish, replay`,async()=>{
  const {page,context,pageErrors,missing}=await openGame(id);
  try{
    assert.equal((await snapshot(page)).state,'title');
    await tap(page,'Digit4');assert.equal((await snapshot(page)).humans,4);
    await tap(page,'Space');await step(page,65);assert.equal((await snapshot(page)).state,'play');
    if(id==='says'||id==='stampede'){let waits=0;const target=id==='says'?'input':'stream';while(await page.evaluate(()=>phase)!==target&&waits++<200)await step(page,1);}
    for(const codes of [['ArrowLeft','KeyA','KeyJ','KeyF'],['ArrowRight','KeyD','KeyL','KeyH'],['ArrowUp','KeyW','KeyI','KeyT'],['ArrowDown','KeyS','KeyK','KeyG'],['Space','KeyC','Comma','KeyB'],['Enter','KeyV','Period','KeyN']]){
      for(const code of codes)await page.keyboard.down(code);await step(page,3);for(const code of codes)await page.keyboard.up(code);await step(page,3);
    }
    const state=await snapshot(page);assert(state.mp.calls.every(x=>x>0),'all player inputs read');assert(state.mp.hits.every(x=>x>0),'all player inputs registered');
    if(id==='dig'){let frames=0;while((await snapshot(page)).state==='play'&&frames<4000){await step(page,100);frames+=100;}}else await page.evaluate(()=>g.finish());await step(page,18);assert.equal((await snapshot(page)).state,'end');
    await tap(page,'Space');await step(page,65);assert.equal((await snapshot(page)).state,'play');
    assert.deepEqual(pageErrors,[]);assert.deepEqual(missing,[]);
    return {humans:state.humans,input:state.mp,renderer:state.renderer};
  }finally{await context.close();}
});}
// Exercise the alternate URL shape used by Vercel cleanUrls + trailingSlash.
for(const id of cleanUrls ? ids : []){await test(`${id}: clean URL assets and title`,async()=>{
  const {page,context,pageErrors,missing}=await openGame(id,true);
  try{assert.equal((await snapshot(page)).state,'title');assert.deepEqual(pageErrors,[]);assert.deepEqual(missing,[]);return {httpErrors:missing};}
  finally{await context.close();}
});}
for(const id of ['splash','run','topsy'].filter(id=>ids.includes(id))){
  await test(`${id}: 3D renderer, independent 4P behavior, toggle and touch`,async()=>{
    const {page,context,pageErrors,missing}=await openGame(id);
    try{
      await page.waitForFunction(()=>stadiumView.view?.available||stadiumView.failed,{},{timeout:20000});
      assert.equal((await snapshot(page)).renderer.available,true,'WebGL renderer available');
      assert.equal((await snapshot(page)).renderer.enabled,true,'3D enabled by default');
      await tap(page,'Digit4');await tap(page,'Space');await step(page,65);
      const actions=['Space','KeyC','Comma','KeyB'];
      const independent=[];
      for(let i=0;i<4;i++){
        const before=await snapshot(page);
        if(id==='splash'){await page.keyboard.down(actions[i]);await step(page,5);await page.keyboard.up(actions[i]);await step(page,15);const after=await snapshot(page);assert(after.players[i].count>before.players[i].count,`${i+1}P bell score increased`);assert(after.players.every((p,j)=>i===j||p.count===before.players[j].count),'only targeted player scored');}
        else if(id==='run'){await tap(page,actions[i]);await step(page,2);const after=await snapshot(page);assert(after.players[i].dist>before.players[i].dist,`${i+1}P ran`);assert(after.players.slice(i+1).every(p=>p.dist===0),'untouched players stayed still');}
        else {await tap(page,actions[i]);const after=await snapshot(page);assert(after.players[i].spin>0,`${i+1}P spin attack started`);assert(after.players.slice(i+1).every(p=>p.spin===0),'untouched players did not spin');}
        independent.push((await snapshot(page)).players[i]);
      }
      const stable=(await snapshot(page)).players;
      await page.locator('.view-toggle').evaluate(b=>b.click());
      assert.equal((await snapshot(page)).renderer.enabled,false);assert.deepEqual((await snapshot(page)).players,stable,'2D switch preserved match');
      await page.locator('.view-toggle').evaluate(b=>b.click());
      assert.equal((await snapshot(page)).renderer.enabled,true);assert.deepEqual((await snapshot(page)).players,stable,'3D switch preserved match');
      await page.setViewportSize({width:600,height:900});await step(page,95);
      const hitBefore=(await snapshot(page)).mp.hits[0];
      const button=page.locator('.touch-controls button').last();const box=await button.boundingBox();assert(box,'touch action visible');
      await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await step(page,5);await page.mouse.up();await step(page,15);
      assert((await snapshot(page)).mp.hits[0]>hitBefore,'touch action reached player one');
      assert.deepEqual(pageErrors,[]);assert.deepEqual(missing,[]);assert.equal((await snapshot(page)).renderer.failed,false,'renderer remained healthy');
      return {independent,renderer:(await snapshot(page)).renderer};
    }finally{await context.close();}
  });
}
for(const id of ['splash','run','topsy'].filter(id=>ids.includes(id))){
  await test(`${id}: ${cleanUrls ? 'clean URL' : 'HTML URL'}, naturally finished round and replay`,async()=>{
    const {page,context,pageErrors,missing}=await openGame(id,cleanUrls);
    try{
      assert.equal((await snapshot(page)).state,'title');
      await tap(page,'Space');await step(page,65);
      await page.evaluate(()=>window.__qaDrawEvery=20);let n=0;while((await snapshot(page)).state==='play'&&n<2500){await step(page,50);n+=50;}
      await page.evaluate(()=>window.__qaDrawEvery=1);await step(page);assert.equal((await snapshot(page)).state,'end','game naturally reaches end');
      const end=await snapshot(page);assert.equal(end.renderer.failed,false,'renderer remained healthy at end');
      await step(page,20);await tap(page,'Space');await step(page,65);assert.equal((await snapshot(page)).state,'play');
      assert.deepEqual(pageErrors,[]);assert.deepEqual(missing,[]);
      return {seconds:n/20,end};
    }finally{await context.close();}
  });
}
if(!process.env.QA_NO_FULL)await test('splash: WebGL unavailable retains playable fallback',async()=>{
  const {page,context,pageErrors,missing}=await openGame('splash',false,true);
  try{await tap(page,'Space');await step(page,65);assert.equal((await snapshot(page)).state,'play');assert.equal((await snapshot(page)).renderer.enabled,false);assert.equal((await snapshot(page)).renderer.failed,true);assert.deepEqual(pageErrors,[]);assert.deepEqual(missing,[]);return {snapshot:await snapshot(page)};}finally{await context.close();}
});
await browser.close();if(server)await new Promise(r=>server.close(r));
const report={base,cleanUrls,createdAt:new Date().toISOString(),results,errors};
await mkdir(path.dirname(reportPath),{recursive:true});
await writeFile(reportPath,JSON.stringify(report,null,2));
console.log(`Report: ${reportPath}`);
console.log(`${results.length} passed, ${errors.length} failed`);
process.exitCode=errors.length?1:0;
