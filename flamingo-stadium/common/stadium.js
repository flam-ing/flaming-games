/* Flamingo Stadium shared library v2. Vanilla JS, no deps. Load before the game script.
   Provides: STADIUM.palette, drawFlamingo, drawPlayerTag, Game shell (title/setup/countdown/play/end),
   per-player input (1–4 humans, rebindable keys, persisted), sfx, helpers, slots().
   Every game: 960x540 canvas, id="game". Shell handles overlays; game implements init/update(dt)/draw(ctx)/result(). */
(function () {
  const palette = {
    pink: '#FF7BAC', pinkDark: '#E2558C', pinkLight: '#FFC1DA', cream: '#FFF6EA', sand: '#F5D9A6',
    sky: '#BDEFFF', water: '#7FD3F2', grass: '#9BE38D', ink: '#3A2430', beak: '#2B2B2B', beakTip: '#111',
    leg: '#F2A3C0', white: '#FFFFFF', gold: '#FFD166', red: '#FF5A5F', blue: '#5AA9FF', green: '#4FD37A', purple: '#B388FF',
    players: ['#FF7BAC', '#5AA9FF', '#FFD166', '#4FD37A'],
    rivals: ['#5AA9FF', '#FFD166', '#4FD37A']
  };
  const NAMES = ['1P', '2P', '3P', '4P'];

  function shade(hex, amt) { const n = parseInt(hex.slice(1), 16); let r = (n >> 16) + amt, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt; r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b)); return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0'); }

  // pose: idle | jump | run | sleep | dig | eat | dizzy | harden | fly | ball | hit ; t = time; color = body; opts: {flip, rot, alpha}
  function drawFlamingo(ctx, x, y, s, pose = 'idle', t = 0, color = palette.pink, opts = {}) {
    ctx.save(); ctx.translate(x, y); if (opts.rot) ctx.rotate(opts.rot); ctx.scale(s, s);
    if (opts.flip) ctx.scale(-1, 1);
    if (opts.alpha != null) ctx.globalAlpha = opts.alpha;
    const body = pose === 'harden' ? '#9C8AA5' : color;
    const wingC = pose === 'harden' ? '#7E6C88' : shade(color, -18);
    if (pose === 'ball') {
      ctx.fillStyle = body; ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = wingC; ctx.beginPath(); ctx.ellipse(-2, 2, 12, 7, 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = body; ctx.beginPath(); ctx.arc(10, -8, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = palette.beak; ctx.beginPath(); ctx.moveTo(15, -10); ctx.lineTo(24, -4); ctx.lineTo(15, -3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = palette.white; ctx.beginPath(); ctx.arc(11, -10, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = palette.ink; ctx.beginPath(); ctx.arc(11.5, -10, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore(); return;
    }
    const bob = pose === 'run' ? Math.sin(t * 20) * 2 : pose === 'idle' ? Math.sin(t * 3) * 1.5 : pose === 'fly' ? Math.sin(t * 8) * 3 : 0;
    ctx.translate(0, bob);
    // legs
    ctx.strokeStyle = palette.leg; ctx.lineWidth = 3; ctx.lineCap = 'round';
    const legSwing = pose === 'run' ? Math.sin(t * 20) * 10 : 0;
    if (pose === 'sleep' || pose === 'harden') { /* tucked */ }
    else if (pose === 'fly') { ctx.beginPath(); ctx.moveTo(-4, 8); ctx.lineTo(-18, 18); ctx.moveTo(4, 8); ctx.lineTo(-10, 20); ctx.stroke(); }
    else {
      ctx.beginPath(); ctx.moveTo(-4, 8); ctx.lineTo(-4 + legSwing * 0.3, 30); ctx.lineTo(-10 + legSwing, 34); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(4, 8); ctx.lineTo(4 - legSwing * 0.3, pose === 'idle' ? 18 : 30); if (pose !== 'idle') ctx.lineTo(10 - legSwing, 34); ctx.stroke();
    }
    // body
    ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(0, 0, 20, 14, 0, 0, Math.PI * 2); ctx.fill();
    // wing(s)
    ctx.fillStyle = wingC;
    if (pose === 'fly') {
      const f = Math.sin(t * 14) * 0.7;
      ctx.save(); ctx.translate(-4, -4); ctx.rotate(-0.9 + f); ctx.beginPath(); ctx.ellipse(0, -10, 8, 22, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      ctx.save(); ctx.translate(2, -2); ctx.rotate(0.9 - f); ctx.beginPath(); ctx.ellipse(0, -10, 8, 22, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    } else {
      const flap = pose === 'jump' ? -0.6 : pose === 'dig' ? Math.sin(t * 25) * 0.5 : pose === 'hit' ? -1.2 : 0;
      ctx.save(); ctx.translate(-2, -2); ctx.rotate(flap); ctx.beginPath(); ctx.ellipse(0, 4, 13, 7, 0.3, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    // tail
    ctx.fillStyle = shade(color, -25); ctx.beginPath(); ctx.moveTo(-18, -4); ctx.lineTo(-30, -12); ctx.lineTo(-24, 2); ctx.closePath(); ctx.fill();
    // neck
    ctx.strokeStyle = body; ctx.lineWidth = 7;
    const neckLean = pose === 'eat' ? 18 : pose === 'dig' ? 22 : pose === 'sleep' ? -10 : pose === 'hit' ? -6 : 0;
    const headY = pose === 'eat' || pose === 'dig' ? -8 : pose === 'sleep' ? -14 : pose === 'hit' ? -26 : -34;
    ctx.beginPath(); ctx.moveTo(12, -4); ctx.quadraticCurveTo(24, -20, 18 + neckLean, headY + 2); ctx.stroke();
    // head
    const hx = 18 + neckLean, hy = headY;
    ctx.fillStyle = body; ctx.beginPath(); ctx.arc(hx, hy, 8, 0, Math.PI * 2); ctx.fill();
    // beak
    ctx.fillStyle = palette.beak; ctx.beginPath(); ctx.moveTo(hx + 5, hy - 2); ctx.lineTo(hx + 18, hy + 4); ctx.lineTo(hx + 6, hy + 6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = palette.beakTip; ctx.beginPath(); ctx.moveTo(hx + 13, hy + 1.5); ctx.lineTo(hx + 18, hy + 4); ctx.lineTo(hx + 12, hy + 5.5); ctx.closePath(); ctx.fill();
    // eye
    ctx.fillStyle = palette.white; ctx.beginPath(); ctx.arc(hx + 1, hy - 2, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = palette.ink;
    if (pose === 'sleep') { ctx.lineWidth = 1.5; ctx.strokeStyle = palette.ink; ctx.beginPath(); ctx.moveTo(hx - 2, hy - 2); ctx.lineTo(hx + 4, hy - 2); ctx.stroke(); }
    else if (pose === 'dizzy' || pose === 'hit') { ctx.lineWidth = 1.5; ctx.strokeStyle = palette.ink; ctx.beginPath(); ctx.moveTo(hx - 1, hy - 4); ctx.lineTo(hx + 3, hy); ctx.moveTo(hx + 3, hy - 4); ctx.lineTo(hx - 1, hy); ctx.stroke(); }
    else { ctx.beginPath(); ctx.arc(hx + 1.5, hy - 2, 1.5, 0, Math.PI * 2); ctx.fill(); }
    if (pose === 'sleep') { ctx.fillStyle = palette.ink; ctx.font = 'bold 10px sans-serif'; ctx.fillText('z', hx + 10, hy - 12 - (t * 20 % 10)); }
    ctx.restore();
  }

  // small badge "1P" / "CPU" in player color
  function drawPlayerTag(ctx, x, y, i, label) {
    const s = slots()[i]; const txt = label || (s.human ? s.name : s.name + ' CPU');
    ctx.save(); ctx.font = 'bold 13px sans-serif'; const w = ctx.measureText(txt).width + 14;
    ctx.fillStyle = s.color; ctx.beginPath(); ctx.roundRect(x - w / 2, y - 11, w, 22, 11); ctx.fill();
    ctx.fillStyle = i === 2 ? palette.ink : palette.white; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, x, y + 1); ctx.restore();
  }

  // --- sfx (WebAudio beeps) ---
  let actx = null;
  function beep(freq = 440, dur = 0.08, type = 'square', vol = 0.05) {
    try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); const o = actx.createOscillator(); const g = actx.createGain(); o.type = type; o.frequency.value = freq; g.gain.value = vol; o.connect(g); g.connect(actx.destination); o.start(); g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + dur); o.stop(actx.currentTime + dur); } catch (e) { }
  }
  const sfx = {
    beep,
    tap: () => beep(660, 0.05), good: () => { beep(880, 0.08); setTimeout(() => beep(1320, 0.1), 60); }, bad: () => beep(160, 0.2, 'sawtooth'),
    win: () => [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, 0.15), i * 90)), lose: () => [400, 300, 200].forEach((f, i) => setTimeout(() => beep(f, 0.2, 'triangle'), i * 120)),
    tick: () => beep(1000, 0.03, 'sine', 0.03), count: () => beep(740, 0.12, 'sine', 0.06), go: () => beep(1180, 0.25, 'sine', 0.07),
    hit: () => beep(220, 0.12, 'square', 0.06), pop: () => beep(1500, 0.04, 'sine', 0.05)
  };

  // --- settings (persisted, shared by all games on this origin) ---
  const ACTIONS = ['up', 'down', 'left', 'right', 'a', 'b'];
  const ACTION_LABEL = { up: '↑', down: '↓', left: '←', right: '→', a: 'A', b: 'B' };
  const DEFAULT_KEYS = [
    { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', a: 'Space', b: 'Enter' },
    { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', a: 'KeyC', b: 'KeyV' },
    { up: 'KeyI', down: 'KeyK', left: 'KeyJ', right: 'KeyL', a: 'Comma', b: 'Period' },
    { up: 'KeyT', down: 'KeyG', left: 'KeyF', right: 'KeyH', a: 'KeyB', b: 'KeyN' },
  ];
  const SKEY = 'flamingo-stadium:settings:v2';
  let settings = { humans: 1, keys: DEFAULT_KEYS.map(k => ({ ...k })) };
  try { const s = JSON.parse(localStorage.getItem(SKEY) || 'null'); if (s && s.keys && s.keys.length === 4) settings = { humans: Math.min(4, Math.max(1, s.humans | 0 || 1)), keys: s.keys.map((k, i) => ({ ...DEFAULT_KEYS[i], ...k })) }; } catch (e) { }
  function saveSettings() { try { localStorage.setItem(SKEY, JSON.stringify(settings)); } catch (e) { } }
  function keyLabel(code) { if (!code) return '—'; const AR = { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→' }; if (AR[code]) return AR[code]; return code.replace(/^Key/, '').replace(/^Digit/, '').replace(/^Arrow/, '').replace('Space', 'SPACE').replace('Enter', 'ENTER').replace('Comma', ',').replace('Period', '.').replace('Numpad', 'N').replace('Shift', 'SHIFT').replace('Control', 'CTRL'); }

  function slots() { return NAMES.map((name, i) => ({ i, name, color: palette.players[i], human: i < settings.humans, keys: settings.keys[i] })); }
  const humans = () => settings.humans;
  const isHuman = i => i < settings.humans;
  const nameOf = i => NAMES[i];

  // --- input ---
  const keys = {}; const pressed = {}; let captureCb = null;
  window.addEventListener('keydown', e => {
    if (captureCb) { e.preventDefault(); const cb = captureCb; captureCb = null; cb(e.code); return; }
    if (!keys[e.code]) pressed[e.code] = true; keys[e.code] = true;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', e => { keys[e.code] = false; });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
  const pcache = [];
  function pInput(i) {
    if (!pcache[i]) pcache[i] = {
      i, hit: a => !!pressed[settings.keys[i][a]], down: a => !!keys[settings.keys[i][a]], code: a => settings.keys[i][a],
      get human() { return i < settings.humans; }, axis() { const k = settings.keys[i]; return { x: (keys[k.right] ? 1 : 0) - (keys[k.left] ? 1 : 0), y: (keys[k.down] ? 1 : 0) - (keys[k.up] ? 1 : 0) }; }
    };
    return pcache[i];
  }
  const input = { down: c => !!keys[c], hit: c => !!pressed[c], p: pInput, _flush: () => { for (const k in pressed) delete pressed[k]; } };

  // --- Game shell ---
  // cfg: { id, title, howto (string[]), duration (s, 0 = untimed → call api.finish()), init(), update(dt), draw(ctx),
  //        result() -> { scores:[4 numbers], text?, lowerIsBetter? }  (legacy: { score, text, win } still accepted) }
  function Game(cfg) {
    const canvas = document.getElementById('game'); const ctx = canvas.getContext('2d');
    const W = canvas.width = 960, H = canvas.height = 540;
    let state = 'title', t = 0, timeLeft = cfg.duration || 0, last = performance.now(), countdown = 0, result = null, endLock = 0, go = 0;
    let cur = { r: 0, c: 0 }, waiting = false, flash = 0;
    const hsKey = 'flamingo-stadium:' + cfg.id; let best = +(localStorage.getItem(hsKey) || 0);
    function start() { state = 'count'; countdown = 3; cfg.init(); sfx.count(); }
    function finish() {
      if (state !== 'play') return;
      state = 'end'; endLock = 0.8; const r = cfg.result() || {};
      if (Array.isArray(r.scores)) {
        const sc = r.scores.slice(0, 4).map(v => +v || 0);
        const order = sc.map((v, i) => i).sort((a, b) => r.lowerIsBetter ? sc[a] - sc[b] : sc[b] - sc[a]);
        const ranks = []; order.forEach((pi, k) => { ranks[pi] = k > 0 && sc[pi] === sc[order[k - 1]] ? ranks[order[k - 1]] : k + 1; });
        const win = ranks[0] === 1 || slots().some(s => s.human && ranks[s.i] === 1);
        result = { scores: sc, ranks, order, text: r.text || '', win, score: sc[0] };
      } else result = { score: +r.score || 0, text: r.text || '', win: !!r.win };
      if (result.score > best) { best = result.score; try { localStorage.setItem(hsKey, best); } catch (e) { } }
      result.win ? sfx.win() : sfx.lose();
    }
    const api = { W, H, ctx, get time() { return t; }, get timeLeft() { return timeLeft; }, finish, get best() { return best; }, state: () => state, get humans() { return settings.humans; }, slots, isHuman, nameOf, p: pInput };
    let inited = false; // first init happens on the first frame, after `g = Game(...)` has been assigned in the game script
    function loop(now) {
      if (!inited) { inited = true; cfg.init(); }
      const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt; if (flash > 0) flash -= dt;
      if (state === 'title') {
        if (input.hit('Space') || input.hit('Enter')) start();
        for (let d = 1; d <= 4; d++) if (input.hit('Digit' + d) || input.hit('Numpad' + d)) { settings.humans = d; saveSettings(); sfx.pop(); }
        if (input.hit('KeyK') || input.hit('Tab')) { state = 'setup'; cur = { r: 0, c: 0 }; sfx.tap(); }
      } else if (state === 'setup') {
        if (!waiting) {
          if (input.hit('ArrowUp')) cur.r = (cur.r + 3) % 4; if (input.hit('ArrowDown')) cur.r = (cur.r + 1) % 4;
          if (input.hit('ArrowLeft')) cur.c = (cur.c + 5) % 6; if (input.hit('ArrowRight')) cur.c = (cur.c + 1) % 6;
          if (input.hit('Enter') || input.hit('Space')) { waiting = true; captureCb = code => { if (code !== 'Escape') { settings.keys[cur.r][ACTIONS[cur.c]] = code; saveSettings(); sfx.good(); } waiting = false; }; }
          if (input.hit('KeyR')) { settings.keys = DEFAULT_KEYS.map(k => ({ ...k })); saveSettings(); flash = 0.5; sfx.pop(); }
          if (input.hit('Escape') || input.hit('KeyK') || input.hit('Tab')) { state = 'title'; sfx.tap(); }
        }
      } else if (state === 'count') {
        const before = Math.ceil(countdown); countdown -= dt;
        if (Math.ceil(countdown) < before && countdown > 0) sfx.count();
        if (countdown <= 0) { state = 'play'; timeLeft = cfg.duration || 0; go = 0.8; sfx.go(); }
      } else if (state === 'play') {
        if (go > 0) go -= dt;
        cfg.update(dt);
        if (cfg.duration && state === 'play') { timeLeft -= dt; if (timeLeft <= 0) { timeLeft = 0; finish(); } }
      } else if (state === 'end') {
        endLock -= dt;
        for (let d = 1; d <= 4; d++) if (input.hit('Digit' + d) || input.hit('Numpad' + d)) { settings.humans = d; saveSettings(); sfx.pop(); }
        if (endLock <= 0 && (input.hit('Space') || input.hit('Enter'))) start();
      }
      ctx.clearRect(0, 0, W, H);
      cfg.draw(ctx);
      if (state === 'play' && cfg.duration) hud(ctx, `${timeLeft.toFixed(1)}s`, `BEST ${best}`);
      if (state === 'play' && go > 0) big(ctx, 'GO!', 1 - Math.max(0, 0.8 - go) / 0.8 * 0.5);
      if (state === 'title') titleScreen(ctx);
      if (state === 'setup') setupScreen(ctx);
      if (state === 'count') { overlayDim(ctx, 0.25); big(ctx, String(Math.ceil(countdown))); }
      if (state === 'end') endScreen(ctx);
      input._flush();
      requestAnimationFrame(loop);
    }
    function hud(ctx, l, r) { ctx.save(); ctx.font = 'bold 22px sans-serif'; ctx.fillStyle = palette.ink; ctx.textAlign = 'left'; ctx.fillText(l, 16, 32); ctx.textAlign = 'right'; ctx.fillText(r, W - 16, 32); ctx.restore(); }
    function overlayDim(ctx, a) { ctx.save(); ctx.fillStyle = `rgba(58,36,48,${a})`; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    function big(ctx, s, alpha = 1) { ctx.save(); ctx.globalAlpha = alpha; ctx.font = 'bold 120px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = palette.white; ctx.strokeStyle = palette.pinkDark; ctx.lineWidth = 8; ctx.strokeText(s, W / 2, H / 2 + 40); ctx.fillText(s, W / 2, H / 2 + 40); ctx.restore(); }
    function titleScreen(ctx) {
      overlayDim(ctx, 0.55); ctx.save(); ctx.textAlign = 'center';
      ctx.fillStyle = palette.cream; ctx.strokeStyle = palette.pinkDark; ctx.lineWidth = 6; ctx.font = 'bold 54px sans-serif'; ctx.strokeText(cfg.title, W / 2, 150); ctx.fillText(cfg.title, W / 2, 150);
      ctx.font = '22px sans-serif'; ctx.fillStyle = palette.white; (cfg.howto || []).forEach((l, i) => ctx.fillText(l, W / 2, 205 + i * 32));
      // player slots
      const sl = slots();
      sl.forEach((s, i) => { const x = W / 2 - 240 + i * 160; ctx.fillStyle = s.human ? s.color : 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.roundRect(x - 64, 350, 128, 54, 12); ctx.fill(); ctx.fillStyle = s.human ? (i === 2 ? palette.ink : palette.white) : 'rgba(255,255,255,.6)'; ctx.font = 'bold 20px sans-serif'; ctx.fillText(s.name + (s.human ? '' : ' CPU'), x, 373); ctx.font = '12px sans-serif'; ctx.fillText(s.human ? `${keyLabel(s.keys.left)}${keyLabel(s.keys.right)} ${keyLabel(s.keys.a)}` : '컴퓨터', x, 394); });
      ctx.font = 'bold 26px sans-serif'; ctx.fillStyle = palette.gold; ctx.fillText('SPACE 로 시작', W / 2, H - 70);
      ctx.font = 'bold 19px sans-serif'; ctx.fillStyle = palette.pinkLight; ctx.fillText(`같이 하려면 숫자 1~4 로 사람 수를 정하세요 (지금 ${settings.humans}명)`, W / 2, H - 36);
      ctx.font = '14px sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.65)'; ctx.fillText('K : 키 설정', W / 2, H - 15);
      drawFlamingo(ctx, 90, H - 110, 1.6, 'idle', t); drawFlamingo(ctx, W - 90, H - 110, 1.6, 'idle', t + 1, palette.players[1], { flip: true });
      ctx.restore();
    }
    function setupScreen(ctx) {
      overlayDim(ctx, 0.8); ctx.save(); ctx.textAlign = 'center';
      ctx.fillStyle = palette.cream; ctx.font = 'bold 36px sans-serif'; ctx.fillText('키 설정', W / 2, 70);
      ctx.font = '15px sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillText('방향키로 이동 · ENTER 누른 뒤 원하는 키 입력 · R 초기화 · ESC 닫기', W / 2, 100);
      const x0 = 150, y0 = 150, cw = 118, rh = 70;
      ACTIONS.forEach((a, c) => { ctx.fillStyle = palette.pinkLight; ctx.font = 'bold 18px sans-serif'; ctx.fillText(ACTION_LABEL[a], x0 + 60 + c * cw + 60, y0 - 12); });
      slots().forEach((s, r) => {
        const y = y0 + r * rh; drawPlayerTag(ctx, x0 - 40, y + 30, r, s.name + (s.human ? '' : ' CPU'));
        ACTIONS.forEach((a, c) => {
          const x = x0 + 60 + c * cw, sel = cur.r === r && cur.c === c;
          ctx.fillStyle = sel ? (waiting ? palette.gold : palette.pink) : 'rgba(255,255,255,.12)'; ctx.beginPath(); ctx.roundRect(x + 6, y + 8, cw - 12, 44, 10); ctx.fill();
          ctx.fillStyle = sel ? palette.ink : palette.white; ctx.font = 'bold 18px sans-serif'; ctx.fillText(sel && waiting ? '키 입력…' : keyLabel(s.keys[a]), x + cw / 2, y + 37);
        });
      });
      if (flash > 0) { ctx.fillStyle = palette.gold; ctx.font = 'bold 20px sans-serif'; ctx.fillText('기본값으로 되돌렸습니다', W / 2, H - 40); }
      ctx.restore();
    }
    function endScreen(ctx) {
      overlayDim(ctx, 0.6); ctx.save(); ctx.textAlign = 'center';
      const title = result.win ? '승리!' : '종료';
      ctx.fillStyle = palette.cream; ctx.strokeStyle = palette.pinkDark; ctx.lineWidth = 6; ctx.font = 'bold 54px sans-serif'; ctx.strokeText(title, W / 2, 120); ctx.fillText(title, W / 2, 120);
      if (result.scores) {
        const sl = slots();
        result.order.forEach((pi, k) => {
          const y = 175 + k * 52, s = sl[pi], rank = result.ranks[pi];
          ctx.fillStyle = rank === 1 ? 'rgba(255,209,102,.25)' : 'rgba(255,255,255,.1)'; ctx.beginPath(); ctx.roundRect(W / 2 - 220, y - 22, 440, 44, 10); ctx.fill();
          ctx.textAlign = 'left'; ctx.fillStyle = palette.white; ctx.font = 'bold 24px sans-serif'; ctx.fillText(rank + '위', W / 2 - 200, y + 8);
          drawPlayerTag(ctx, W / 2 - 100, y, pi);
          ctx.textAlign = 'right'; ctx.fillStyle = s.color; ctx.font = 'bold 26px sans-serif'; ctx.fillText(String(result.scores[pi]), W / 2 + 200, y + 9);
        });
        ctx.textAlign = 'center'; ctx.font = '20px sans-serif'; ctx.fillStyle = palette.white; if (result.text) ctx.fillText(result.text, W / 2, 400);
      } else { ctx.font = '24px sans-serif'; ctx.fillStyle = palette.white; ctx.fillText(result.text, W / 2, 230); }
      ctx.font = '18px sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillText(`최고 기록 ${best}`, W / 2, 430);
      ctx.font = 'bold 26px sans-serif'; ctx.fillStyle = palette.gold; ctx.fillText('SPACE 로 다시', W / 2, H - 52);
      ctx.font = '15px sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillText(`숫자 1~4 로 사람 수 바꾸기 (지금 ${settings.humans}명)`, W / 2, H - 26);
      ctx.restore();
    }
    requestAnimationFrame(loop);
    return api;
  }

  // --- helpers ---
  function bg(ctx, W, H, top = palette.sky, bottom = palette.cream) { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, top); g.addColorStop(1, bottom); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  function text(ctx, s, x, y, size = 22, color = palette.ink, align = 'center', weight = 'bold') { ctx.save(); ctx.font = `${weight} ${size}px sans-serif`; ctx.fillStyle = color; ctx.textAlign = align; ctx.fillText(s, x, y); ctx.restore(); }
  function rr(ctx, x, y, w, h, r, fill) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fillStyle = fill; ctx.fill(); }
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;

  window.STADIUM = { palette, drawFlamingo, drawPlayerTag, Game, input, sfx, bg, text, rr, rand, clamp, lerp, shade, slots, humans, isHuman, nameOf, keyLabel, ACTIONS, settings: () => settings };
})();
