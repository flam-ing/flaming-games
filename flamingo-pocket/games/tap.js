import { C, clamp, circle, rect, line, text, bird, bg } from '../draw.js';

const TAU = Math.PI * 2;
const GUIDE = 'https://com2us-h1-biz.gitbook.io/minigameparty/gameplay/game-guide/normal-game';
const APP = 'https://apps.apple.com/us/app/minigame-party-pocket-edition/id1603179211';
const tap = i => Boolean(i.ap || i.pointer?.pressed);
const held = i => Boolean(i.a || i.pointer?.down);
const released = i => Boolean(i.ar || i.pointer?.released);
const raw = a => ({ a: Boolean(a) });
const wrap = a => ((a + Math.PI) % TAU + TAU) % TAU - Math.PI;
const rint = (e, lo, hi) => lo + Math.floor(e.random() * (hi - lo + 1));
function clock(env, seconds = 45) {
  const s = { t: 0, score: 0, done: false, seconds, feedback: '', flash: 0 };
  s.end = (outcome, message) => {
    if (s.done) return;
    s.done = true;
    env.finish({ score: Math.max(0, Math.round(s.score)), outcome, message });
  };
  s.tick = dt => { if (s.done) return false; s.t += dt; s.flash = Math.max(0, s.flash - dt); return true; };
  s.say = (message, good = true) => { s.feedback = message; s.flash = 1.3; env.sound(good ? 'good' : 'bad'); };
  s.hud = (hint, label = '남은 시간', value = `${Math.ceil(Math.max(0, seconds - s.t))}초`) => ({ score: Math.max(0, Math.round(s.score)), label, value, hint: s.flash ? s.feedback : hint, progress: Math.min(1, s.t / seconds) });
  return s;
}
function title(ctx, a, b, color = C.teal, subtitle = C.ink) {
  text(ctx, a, 450, 55, 30, color);
  text(ctx, b, 450, 88, 18, subtitle, 'center', 500);
}
function ribbon(ctx, message, color = C.teal) {
  rect(ctx, 125, 532, 650, 46, C.white, 20);
  text(ctx, message, 450, 563, 20, color);
}
function hearts(ctx, n, total = 3) {
  for (let j = 0; j < total; j++) { circle(ctx, 748 + j * 30, 124, 10, j < n ? C.pink : '#d6dfd1'); }
}
function platform(ctx, x, y, w, color = C.teal) {
  rect(ctx, x - w / 2, y, w, 170, color, 12);
  rect(ctx, x - w / 2 - 4, y, w + 8, 14, C.mint, 5);
}
function spark(ctx, x, y, color = C.gold, size = 12) {
  ctx.fillStyle = color; ctx.beginPath();
  for (let j = 0; j < 10; j++) { const a = -Math.PI / 2 + j * Math.PI / 5, r = j % 2 ? size * .45 : size; const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; if (j) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
  ctx.closePath(); ctx.fill();
}
function accuracy(ctx, x, y, width, ratio, label) {
  rect(ctx, x, y, width, 14, '#dce6d8', 7);
  rect(ctx, x, y, Math.max(0, width * clamp(ratio, 0, 1)), 14, C.pink, 7);
  text(ctx, label, x + width / 2, y + 37, 16);
}
function entry(id, name, kicker, description, controls, objective, inspiration, sourceUrl, adaptation, medal, create) {
  return { id: `tap-${id}`, name, category: 'tap', kicker, description, controls, objective, inspiration, sourceUrl, adaptation, medal, color: '#ee8ca4', create };
}

function spring(env) {
  const s = clock(env); let round = 0, lives = 3, charge = 0, phase = 'ready', x = 170, y = 420, vx = 0, vy = 0, pause = 0, target = 500, width = 100;
  const next = () => { target = rint(env, 405, 665); width = 112 - round * 4; x = 170; y = 420; charge = 0; phase = 'ready'; };
  next();
  return {
    update(dt, i) {
      if (!s.tick(dt)) return;
      if (phase === 'ready') {
        if (held(i)) charge = Math.min(1, charge + dt * .72);
        if (released(i) && charge > 0) { phase = 'flight'; vx = 120 + charge * 400; vy = -480; env.sound('tap'); }
      } else if (phase === 'flight') {
        x += vx * dt; y += vy * dt + 400 * dt * dt; vy += 800 * dt;
        if (y >= 420 && vy > 0) {
          y = 420; const error = Math.abs(x - target);
          if (error <= width / 2 - 9) { s.score += 100 + Math.round(50 * (1 - error / (width / 2))); s.say('착지 성공! 다음 섬으로'); }
          else { lives--; s.say('연못에 풍덩! 힘을 다시 맞춰요', false); }
          round++; phase = 'pause'; pause = .65;
          if (!lives) s.end('fail', `${round}번 도전 · 착지 점수 ${s.score}`);
          else if (round === 8) s.end('clear', '여덟 개의 연못 섬을 모두 도전했어요!');
        }
      } else if ((pause -= dt) <= 0) next();
      if (s.t >= s.seconds) s.end('record', `${round}/8개 섬 도전 · ${s.score}점`);
    },
    draw(ctx) {
      bg(ctx, { sky: '#edf7e5', ground: '#9fcfd0', groundY: 420 });
      title(ctx, '꾹 누르고 · 놓아서 폴짝', `연못 ${Math.min(8, round + 1)} / 8`); hearts(ctx, lives);
      for (let j = 0; j < 5; j++) { circle(ctx, 260 + j * 130, 490 + j % 2 * 20, 22, '#85bdbc'); line(ctx, 245 + j * 130, 490 + j % 2 * 20, 275 + j * 130, 490 + j % 2 * 20, '#effbdf', 3); }
      platform(ctx, 150, 420, 130); platform(ctx, target, 420, width);
      line(ctx, target, 290, target, 420, C.gold, 3); spark(ctx, target, 280, C.gold, 20);
      bird(ctx, x, y, 64, { pose: phase === 'flight' ? 'jump' : 'idle', rotation: phase === 'flight' ? .08 : 0 });
      for (let j = 0; j < 5; j++) line(ctx, 151, 405 - j * (5 + 4 * (1 - charge)), 186, 400 - j * (5 + 4 * (1 - charge)), C.rose, 3);
      accuracy(ctx, 85, 170, 260, charge, `도약 힘 ${Math.round(charge * 100)}%`);
      ribbon(ctx, phase === 'ready' ? 'A / 화면 꾹 누르기 → 손을 떼면 점프' : '섬 한가운데에 내려오면 추가 점수!');
    },
    hud: () => s.hud('길게 누를수록 멀리 뛰어요. 섬 한가운데를 노리세요.'),
    bot() { const goal = ((target - 170) / 1.2 - 120) / 400; return raw(phase === 'ready' && charge < goal); },
    snapshot: () => ({ ...s, round, lives, charge, phase, x, y, vx, vy, target, width })
  };
}

function swing(env) {
  const s = clock(env); let round = 0, lives = 3, phase = 'swing', cycle = 0, x = 0, y = 0, vx = 0, vy = 0, target = 600, pause = 0;
  const pose = () => { const a = .9 * Math.sin(cycle * 2.7 - 1), av = .9 * 2.7 * Math.cos(cycle * 2.7 - 1); return { x: 260 + Math.sin(a) * 230, y: 105 + Math.cos(a) * 230, vx: Math.cos(a) * av * 230, vy: -Math.sin(a) * av * 230, a }; };
  const landing = p => { const flight = (-p.vy + Math.sqrt(p.vy * p.vy + 2 * 760 * (460 - p.y))) / 760; return p.x + p.vx * flight; };
  const next = () => { target = rint(env, 515, 725); cycle = 0; phase = 'swing'; const p = pose(); x = p.x; y = p.y; };
  next();
  return {
    update(dt, i) {
      if (!s.tick(dt)) return;
      if (phase === 'swing') { if (tap(i)) { const p = pose(); x = p.x; y = p.y; vx = p.vx; vy = p.vy; phase = 'flight'; env.sound('tap'); } else { cycle += dt; const p = pose(); x = p.x; y = p.y; } }
      else if (phase === 'flight') {
        const untilFloor = (-vy + Math.sqrt(vy * vy + 1520 * Math.max(0, 460 - y))) / 760;
        const travel = Math.min(dt, untilFloor); x += vx * travel; y += vy * travel + 380 * travel * travel; vy += 760 * travel;
        if (untilFloor <= dt) y = 460;
        if (y >= 460 && vy > 0) { y = 460; const err = Math.abs(x - target); if (err < 47 - round * 2) { s.score += 100 + Math.round(50 * (1 - err / 47)); s.say('그네 착지 성공!'); } else { lives--; s.say('떼는 순간의 방향도 중요해요', false); } round++; phase = 'pause'; pause = .6; if (!lives) s.end('fail', `그네 도전 ${round}번 · ${s.score}점`); else if (round === 8) s.end('clear', '여덟 번의 그네 여행 완료!'); }
      } else if ((pause -= dt) <= 0) next();
      if (s.t >= 45) s.end('record', `그네 여행 ${round}/8 · ${s.score}점`);
    },
    draw(ctx) {
      bg(ctx, { sky: '#fff2df', ground: '#bcd2cf', groundY: 460 }); title(ctx, '흔들흔들 그네 배달', `도착 섬 ${Math.min(8, round + 1)} / 8`); hearts(ctx, lives);
      rect(ctx, 98, 100, 45, 360, '#b69977', 12); line(ctx, 120, 105, 320, 105, '#b69977', 22); circle(ctx, 260, 105, 14, C.gold);
      const p = pose(); line(ctx, 260, 105, phase === 'swing' ? x : p.x, phase === 'swing' ? y - 20 : p.y - 20, C.ink, 4);
      if (phase !== 'swing') rect(ctx, p.x - 26, p.y - 17, 52, 9, C.rose, 4);
      platform(ctx, target, 460, 112 - round * 4); spark(ctx, target, 400, C.gold, 24);
      bird(ctx, x, y, 64, { rotation: phase === 'swing' ? -p.a * .35 : .15 });
      if (phase === 'swing' && p.vx > 0) { text(ctx, '→', x + 55, y - 35, 33, C.teal); }
      ribbon(ctx, '앞으로 흔들릴 때 A / 화면 탭 → 줄을 놓아요');
    },
    hud: () => s.hud('앞으로 날아갈 속도와 높이를 보고 줄을 놓으세요.'),
    bot: () => raw(phase === 'swing' && pose().vx > 100 && Math.abs(landing(pose()) - target) < 18),
    snapshot: () => ({ ...s, round, lives, phase, cycle, x, y, vx, vy, target, predicted: landing(pose()) })
  };
}

function pancake(env) {
  const s = clock(env, 35); let phase = 'rest', y = 404, vy = 0, angle = 0, catches = 0, lives = 3, pause = 0, previous = false;
  return {
    update(dt, i) {
      if (!s.tick(dt)) return;
      if (phase === 'rest' && tap(i)) { phase = 'air'; y = 402; vy = -440; angle = 0; env.sound('tap'); }
      else if (phase === 'air') {
        y += vy * dt + 380 * dt * dt; vy += 760 * dt;
        if (held(i)) angle += dt * 6.1;
        if (y >= 404 && vy > 0) {
          y = 404; const turns = Math.round(angle / Math.PI), flat = Math.abs(wrap(angle - turns * Math.PI));
          if (flat < .23 && turns >= 1) { catches++; s.score += 100 + Math.max(0, turns - 1) * 80 + Math.round(30 * (1 - flat / .23)); s.say('노릇노릇! 평평하게 받았어요'); }
          else { lives--; s.say(turns < 1 ? '공중에서 누르고 있으면 뒤집혀요' : '받기 전에 손을 떼서 수평을 맞춰요', false); }
          phase = 'pause'; pause = .55;
          if (!lives) s.end('fail', `팬케이크 ${catches}장 완성`);
          else if (catches === 8) s.end('clear', '여덟 장의 플라밍고 브런치 완성!');
        }
      } else if (phase === 'pause' && (pause -= dt) <= 0) { phase = 'rest'; angle = 0; }
      previous = held(i);
      if (s.t >= 35) s.end('record', `팬케이크 ${catches}장 · ${s.score}점`);
    },
    draw(ctx) {
      bg(ctx, { sky: '#fff4dd', ground: '#dac7ad', groundY: 455 }); title(ctx, '플라밍고 팬케이크', `브런치 ${catches} / 8장`); hearts(ctx, lives);
      for (let j = 0; j < 5; j++) rect(ctx, 100 + j * 170, 150, 120, 210, j % 2 ? '#f4dfc1' : '#f0e8d3', 10);
      rect(ctx, 100, 458, 700, 35, '#bb987e', 12); bird(ctx, 250, 457, 128, { rotation: -.12 });
      line(ctx, 284, 425, 390, 433, C.ink, 17); rect(ctx, 370, 413, 190, 20, C.ink, 12); rect(ctx, 385, 407, 160, 10, '#63756d', 5);
      ctx.save(); ctx.translate(465, y - 8); ctx.rotate(angle); rect(ctx, -52, -7, 104, 14, '#dba056', 7, '#a87835'); rect(ctx, -40, -7, 80, 5, '#ffe9ad', 3); ctx.restore();
      for (let j = 0; j < Math.min(8, catches); j++) rect(ctx, 666, 439 - j * 9, 74, 8, '#ddb064', 5);
      text(ctx, phase === 'air' ? `${Math.round(angle / Math.PI * 180)}°` : '180° 뒤집고 수평 착지', 670, 205, 20, C.rose);
      ribbon(ctx, 'A / 화면 눌러 띄우기 · 공중에서 꾹 회전 · 손 떼면 회전 정지');
    },
    hud: () => s.hud('한 번 이상 뒤집고, 수평일 때 손을 떼세요.'),
    bot() { if (phase === 'rest') return raw(!previous); return raw(phase === 'air' && angle < Math.PI - .025); },
    snapshot: () => ({ ...s, phase, y, vy, angle, catches, lives })
  };
}

function gate(env) {
  const s = clock(env); let round = 0, lives = 3, phase = 'wait', radius = 0, gap = -Math.PI / 2, omega = .75, pause = 0;
  const next = () => { phase = 'wait'; radius = 0; gap = env.random() * TAU; omega = (.75 + round * .07) * (round % 2 ? -1 : 1); };
  next();
  return {
    update(dt, i) {
      if (!s.tick(dt)) return;
      gap += omega * dt;
      if (phase === 'wait' && tap(i)) { phase = 'dash'; env.sound('tap'); }
      else if (phase === 'dash') {
        const old = radius; radius += dt * 440;
        if (old < 170 && radius >= 170) { const error = Math.abs(wrap(gap + Math.PI / 2)); if (error > .38) { lives--; s.say('문이 오는 시간을 보고 출발해요', false); phase = 'pause'; pause = .55; if (!lives) s.end('fail', `통과한 회전문 ${round}개`); } }
        if (radius >= 235 && phase === 'dash') { round++; s.score += 100; s.say('회전문 통과!'); phase = 'pause'; pause = .45; if (round === 10) s.end('clear', '열 개의 회전문을 통과했어요!'); }
      } else if (phase === 'pause' && (pause -= dt) <= 0) next();
      if (s.t >= 45) s.end('record', `회전문 ${round}/10개 통과`);
    },
    draw(ctx) {
      bg(ctx, { sky: '#edf0f9', ground: '#e5e9d5', groundY: 500 }); title(ctx, '회전문 타이밍', `통과 ${round} / 10`); hearts(ctx, lives);
      circle(ctx, 450, 330, 196, '#d7e1e7'); circle(ctx, 450, 330, 151, '#fff9e8');
      ctx.beginPath(); ctx.arc(450, 330, 170, gap + .49, gap + TAU - .49); ctx.strokeStyle = C.teal; ctx.lineWidth = 27; ctx.stroke();
      for (const a of [gap - .49, gap + .49]) circle(ctx, 450 + Math.cos(a) * 170, 330 + Math.sin(a) * 170, 15, C.gold);
      line(ctx, 450, 330, 450, 120, '#b8c9c7', 3); text(ctx, '↑', 450, 150, 34, C.rose);
      bird(ctx, 450, 350 - radius, 54); text(ctx, omega > 0 ? '↻' : '↺', 700, 365, 58, C.teal);
      ribbon(ctx, 'A / 화면 탭 → 위로 돌진 · 틈이 도착할 시간을 예상해요');
    },
    hud: () => s.hud('이동 중에도 문이 돌아요. 조금 먼저 출발하세요.'),
    bot: () => raw(phase === 'wait' && Math.abs(wrap(gap + omega * (170 / 440) + Math.PI / 2)) < .12),
    snapshot: () => ({ ...s, round, lives, phase, radius, gap, omega })
  };
}

function stack(env) {
  const s = clock(env); let layers = [{ x: 450, width: 240 }], width = 240, x = 175, direction = 1, phase = 'move', drop = 0, previous = false;
  return {
    update(dt, i) {
      if (!s.tick(dt)) return;
      if (phase === 'move') { x += direction * (210 + layers.length * 17) * dt; if (x > 755) { x = 755; direction = -1; } if (x < 145) { x = 145; direction = 1; } if (tap(i)) { phase = 'drop'; drop = 0; env.sound('tap'); } }
      else if (phase === 'drop') {
        drop += dt;
        if (drop > .22) {
          const top = layers.at(-1), left = Math.max(x - width / 2, top.x - top.width / 2), right = Math.min(x + width / 2, top.x + top.width / 2);
          const overlap = right - left;
          if (overlap < 18) { s.end('fail', `${layers.length - 1}층까지 쌓았어요`); phase = 'fallen'; }
          else { const perfect = Math.abs(x - top.x) < 7; width = perfect ? top.width : overlap; x = perfect ? top.x : (left + right) / 2; layers.push({ x, width }); s.score += perfect ? 150 : 100; s.say(perfect ? '딱 맞았어요! 150점' : '겹친 부분만 남아요'); if (layers.length === 13) s.end('clear', '열두 층의 플라밍고 호텔 완공!'); else { x = layers.length % 2 ? 145 : 755; direction = layers.length % 2 ? 1 : -1; phase = 'move'; } }
        }
      }
      previous = held(i); if (s.t >= 45) s.end('record', `${layers.length - 1}층 호텔 · ${s.score}점`);
    },
    draw(ctx) {
      bg(ctx, { sky: '#eaf3e6', ground: '#c3d2bc', groundY: 492 }); title(ctx, '플라밍고 호텔', `쌓은 층 ${layers.length - 1} / 12`);
      circle(ctx, 746, 192, 43, '#f3d9a3'); for (let j = 0; j < 3; j++) { rect(ctx, 58 + j * 90, 353 - j * 40, 65, 140 + j * 40, '#d4dfd0', 10); }
      const step = 24, baseY = 486, topY = baseY - layers.length * step;
      layers.forEach((p, j) => { rect(ctx, p.x - p.width / 2, baseY - j * step, p.width, 22, j % 2 ? C.pink : C.teal, 5); if (p.width > 60) { circle(ctx, p.x, baseY - j * step + 11, 5, C.cream); } });
      if (phase !== 'fallen') { const dropY = topY - 45 + 45 * clamp(drop / .22, 0, 1); rect(ctx, x - width / 2, phase === 'move' ? topY - 45 : dropY, width, 22, C.gold, 5); bird(ctx, x, (phase === 'move' ? topY - 45 : dropY), 46); }
      line(ctx, layers.at(-1).x, 130, layers.at(-1).x, topY, '#b8c4b0', 2);
      ribbon(ctx, 'A / 화면 탭 → 블록 내려놓기 · 어긋난 부분은 잘려요');
    },
    hud: () => s.hud('아래 블록과 중심을 맞춰 탭하세요.'),
    bot: () => raw(phase === 'move' && !previous && Math.abs(x - layers.at(-1).x) < 4.5),
    snapshot: () => ({ ...s, layers: layers.map(p => ({ ...p })), width, x, direction, phase, drop })
  };
}

function bridge(env) {
  const s = clock(env); let round = 0, lives = 3, target = 525, width = 100, length = 0, phase = 'grow', rotation = 0, walk = 0, pause = 0;
  const next = () => { target = rint(env, 440, 710); width = 100 - round * 4; length = 0; phase = 'grow'; rotation = 0; walk = 0; }; next();
  return {
    update(dt, i) {
      if (!s.tick(dt)) return;
      if (phase === 'grow') { if (held(i)) length = Math.min(615, length + 220 * dt); if (released(i) && length > 0) { phase = 'lower'; env.sound('tap'); } }
      else if (phase === 'lower') { rotation = Math.min(Math.PI / 2, rotation + dt * 3.7); if (rotation === Math.PI / 2) phase = 'walk'; }
      else if (phase === 'walk') {
        walk += 320 * dt;
        if (walk >= length) { const error = Math.abs(200 + length - target); const good = error < width / 2; if (good) { s.score += 100 + Math.round(50 * (1 - error / (width / 2))); s.say('다리가 섬에 닿았어요!'); } else { lives--; s.say(200 + length < target ? '조금 더 길게 늘려 보세요' : '다리가 너무 길었어요', false); } round++; phase = 'pause'; pause = .55; if (!lives) s.end('fail', `${round}번 도전 · ${s.score}점`); else if (round === 8) s.end('clear', '여덟 개의 연못 다리 건설 완료!'); }
      } else if ((pause -= dt) <= 0) next();
      if (s.t >= 45) s.end('record', `${round}/8개 다리 도전`);
    },
    draw(ctx) {
      bg(ctx, { sky: '#f7f0df', ground: '#a3c7c7', groundY: 435 }); title(ctx, '쭉쭉 갈대 다리', `다리 ${Math.min(8, round + 1)} / 8`); hearts(ctx, lives);
      platform(ctx, 145, 435, 110); platform(ctx, target, 435, width); rect(ctx, target - 8, 434, 16, 10, C.gold, 2);
      line(ctx, 200, 433, 200 + Math.sin(rotation) * length, 433 - Math.cos(rotation) * length * .52, '#717752', 9);
      if (phase === 'grow') text(ctx, `${Math.round(length)}`, 255, Math.max(145, 435 - length * .52), 22, C.rose);
      bird(ctx, phase === 'walk' || phase === 'pause' ? 195 + Math.min(walk, length) : 165, 433, 64);
      for (let j = 0; j < 7; j++) line(ctx, 240 + j * 95, 480 + j % 2 * 18, 275 + j * 95, 480 + j % 2 * 18, '#c4e0db', 4);
      ribbon(ctx, 'A / 화면 꾹 누르면 자라요 · 손을 떼면 다리가 내려와요');
    },
    hud: () => s.hud('다리 끝이 다음 섬 안에 들어오도록 길이를 맞추세요.'),
    bot: () => raw(phase === 'grow' && length < target - 200),
    snapshot: () => ({ ...s, round, lives, target, width, length, phase, rotation, walk })
  };
}

function signal(env) {
  const s = clock(env, 30); let phase = 'wait', age = 0, delay = .8, good = true, lives = 5, hits = 0, avoided = 0, previous = false;
  const next = () => { phase = 'wait'; age = 0; delay = .55 + env.random() * .8; good = env.random() > .32; }; next();
  const error = message => { lives--; s.score = Math.max(0, s.score - 40); s.say(message, false); phase = 'pause'; age = 0; if (!lives) s.end('fail', `반응 성공 ${hits}회 · 위험 회피 ${avoided}회`); };
  return {
    update(dt, i) {
      if (!s.tick(dt)) return; age += dt;
      if (phase === 'wait') { if (tap(i)) error('아직이에요! 새우가 나온 뒤에 탭'); else if (age >= delay) { phase = 'cue'; age = 0; } }
      else if (phase === 'cue') {
        if (tap(i)) { if (good) { hits++; s.score += Math.round(140 - 90 * clamp(age / .8, 0, 1)); s.say(`${Math.round(age * 1000)}ms · 맛있는 새우!`); phase = 'pause'; age = 0; } else error('선인장은 먹으면 안 돼요!'); }
        else if (age > .85) { if (good) error('새우가 숨어 버렸어요'); else { avoided++; s.score += 35; s.say('참기 성공!'); phase = 'pause'; age = 0; } }
      } else if (age > .28) next();
      previous = held(i); if (s.t >= 30) s.end('record', `새우 ${hits}개 · 선인장 ${avoided}개 피하기`);
    },
    draw(ctx) {
      bg(ctx, { sky: '#f8ecdf', ground: '#d9d7b5', groundY: 455 }); title(ctx, '새우만 콕!', '새우 = 탭 · 선인장 = 기다리기'); hearts(ctx, lives, 5);
      bird(ctx, 220, 450, 125, { rotation: phase === 'pause' && s.flash ? .12 : 0 });
      rect(ctx, 340, 414, 295, 45, C.teal, 18); rect(ctx, 362, 459, 24, 53, C.teal, 5); rect(ctx, 590, 459, 24, 53, C.teal, 5);
      if (phase !== 'cue') { ctx.fillStyle = '#cc8ea1'; ctx.beginPath(); ctx.ellipse(488, 395, 125, 110, 0, Math.PI, TAU); ctx.fill(); circle(ctx, 488, 270, 13, C.gold); text(ctx, '…', 488, 368, 48, C.white); }
      else if (good) { ctx.beginPath(); ctx.arc(488, 349, 40, -.8, 2.5); ctx.strokeStyle = C.pink; ctx.lineWidth = 32; ctx.stroke(); circle(ctx, 516, 313, 5, C.ink); line(ctx, 508, 310, 545, 285, C.rose, 3); text(ctx, '먹자!', 488, 220, 34, C.rose); }
      else { rect(ctx, 468, 296, 42, 115, C.teal, 18); line(ctx, 470, 342, 436, 342, C.teal, 23); line(ctx, 436, 342, 436, 313, C.teal, 23); line(ctx, 504, 369, 542, 369, C.teal, 23); line(ctx, 542, 369, 542, 337, C.teal, 23); for (let j = 0; j < 5; j++) line(ctx, 479, 305 + j * 21, 460, 293 + j * 21, C.cream, 3); text(ctx, '참자!', 488, 220, 34, C.teal); }
      ribbon(ctx, 'A / 화면 탭으로 먹기 · 가짜 신호에는 아무것도 누르지 않아요');
    },
    hud: () => s.hud('새우가 나오면 빠르게 탭! 선인장이면 기다리세요.'),
    bot: () => raw(phase === 'cue' && good && age > .13 && !previous),
    snapshot: () => ({ ...s, phase, age, delay, good, lives, hits, avoided })
  };
}

function orbit(env) {
  const s = clock(env, 40); let angle = -Math.PI / 2, lane = 0, lives = 3, count = 0, previous = false;
  const events = []; let at = angle + 1.2;
  for (let j = 0; j < 62; j++) { events.push({ at, lane: rint(env, 0, 1), done: false }); at += .73 + env.random() * .45; }
  return {
    update(dt, i) {
      if (!s.tick(dt)) return;
      if (tap(i)) { lane = 1 - lane; env.sound('tap'); }
      angle += (1.15 + s.t * .008) * dt;
      for (const e of events) if (!e.done && angle >= e.at) { e.done = true; if (lane === e.lane) { count++; s.score += 80; s.say('별빛 수집!'); } else { lives--; s.say('운석 충돌! 다른 궤도로 바꿔요', false); if (!lives) s.end('fail', `별빛 ${count}개를 모았어요`); } }
      previous = held(i); if (s.t >= 40) s.end('record', `40초 우주 여행 · 별빛 ${count}개`);
    },
    draw(ctx) {
      rect(ctx, 0, 0, 900, 600, '#223c4f'); title(ctx, '별빛 궤도 스위치', '안쪽 ↔ 바깥쪽 · 앞에 오는 별을 따라가요', '#fff0cb', '#d0e0e4'); hearts(ctx, lives);
      for (let j = 0; j < 20; j++) circle(ctx, 35 + (j * 137) % 840, 150 + (j * 83) % 370, j % 3 ? 2 : 3, '#b3ced4');
      circle(ctx, 450, 325, 57, '#eab777'); circle(ctx, 433, 305, 16, '#f7d39b');
      for (const r of [119, 205]) { ctx.beginPath(); ctx.arc(450, 325, r, 0, TAU); ctx.lineWidth = 3; ctx.strokeStyle = '#698b9c'; ctx.stroke(); }
      for (const e of events) if (!e.done && e.at - angle < 3.9) {
        const goodR = e.lane ? 205 : 119, badR = e.lane ? 119 : 205;
        spark(ctx, 450 + Math.cos(e.at) * goodR, 325 + Math.sin(e.at) * goodR, C.gold, 15);
        const bx = 450 + Math.cos(e.at) * badR, by = 325 + Math.sin(e.at) * badR; circle(ctx, bx, by, 17, '#9aa2a9'); line(ctx, bx - 7, by - 7, bx + 7, by + 7, '#405d69', 4); line(ctx, bx + 7, by - 7, bx - 7, by + 7, '#405d69', 4);
      }
      const r = lane ? 205 : 119; bird(ctx, 450 + Math.cos(angle) * r, 325 + Math.sin(angle) * r + 18, 48, { rotation: angle + Math.PI / 2 });
      ribbon(ctx, 'A / 화면 탭 → 궤도 바꾸기 · 별을 모으고 운석을 피해요');
    },
    hud: () => s.hud('별이 있는 궤도로 바꾸세요. 같은 위치의 다른 궤도에는 운석!'),
    bot() { const e = events.find(e => !e.done); return raw(Boolean(e && e.at - angle < .38 && lane !== e.lane && !previous)); },
    snapshot: () => ({ ...s, angle, lane, lives, count, next: events.find(e => !e.done)?.at ?? angle })
  };
}

function elevator(env) {
  const s = clock(env, 40); let y = 466, round = 0, lives = 3, base = 250, phase = 'rise', pause = 0, boarded = 0, lifting = false;
  const targetY = () => base + (round % 2 ? Math.sin(s.t * 1.25) * 28 : 0);
  const next = () => { y = 466; base = rint(env, 175, 350); phase = 'rise'; boarded = 0; }; next();
  return {
    update(dt, i) {
      if (!s.tick(dt)) return;
      lifting = held(i) && phase === 'rise';
      if (phase === 'rise') {
        if (held(i)) y = Math.max(135, y - 130 * dt);
        if (released(i)) { const error = Math.abs(y - targetY()); if (error < 20) { s.score += 100 + Math.round(50 * (1 - error / 20)); s.say('승강장 정렬! 친구가 타요'); phase = 'board'; pause = .7; }
          else { lives--; phase = 'pause'; pause = .6; s.say('승강장 높이에서 손을 떼세요', false); if (!lives) s.end('fail', `안전 배달 ${round}명`); }
        }
      } else if (phase === 'board') { boarded = Math.min(1, boarded + dt / .7); if ((pause -= dt) <= 0) { round++; if (round === 8) s.end('clear', '여덟 친구를 안전하게 태웠어요!'); else next(); } }
      else if ((pause -= dt) <= 0) next();
      if (s.t >= 40) s.end('record', `승강기 배달 ${round}/8명`);
    },
    draw(ctx) {
      bg(ctx, { sky: '#f4eadc', ground: '#cbd4ba', groundY: 498 }); title(ctx, '높이 딱! 승강기', `친구 ${round} / 8명`); hearts(ctx, lives);
      rect(ctx, 302, 128, 196, 370, '#e2d9c7', 18); line(ctx, 335, 135, 335, 488, '#98aaa0', 7); line(ctx, 462, 135, 462, 488, '#98aaa0', 7);
      const floor = phase === 'board' ? y : targetY();
      rect(ctx, 530, floor, 260, 20, C.teal, 7); rect(ctx, 545, floor + 20, 17, 485 - floor, '#aec1a6', 4);
      line(ctx, 305, floor, 530, floor, C.gold, 3); text(ctx, '← 이 높이', 672, floor - 83, 22, C.teal);
      rect(ctx, 313, y - 82, 173, 85, '#e995aa', 12); rect(ctx, 327, y - 67, 145, 67, '#fbeed3', 8); rect(ctx, 307, y, 185, 15, C.rose, 6);
      bird(ctx, 640 - boarded * 240, floor - 2, 66);
      text(ctx, lifting ? '↑' : '■', 260, y - 28, 36, C.rose);
      ribbon(ctx, 'A / 화면 꾹 누르면 상승 · 승강장과 맞을 때 손을 떼요');
    },
    hud: () => s.hud('손을 떼는 순간 문이 열려요. 움직이는 승강장도 있어요.'),
    bot: () => raw(phase === 'rise' && y > targetY() + 2),
    snapshot: () => ({ ...s, y, round, lives, phase, target: targetY(), boarded })
  };
}

function catchFood(env) {
  const s = clock(env, 40); let x = 450, dir = 1, lives = 4, next = .2, caught = 0, missed = 0, previous = false;
  const drops = [];
  const spawn = () => { drops.push({ x: rint(env, 135, 765), y: 140, vy: rint(env, 155, 225), bomb: env.random() < .22, used: false }); next += .82; };
  return {
    update(dt, i) {
      if (!s.tick(dt)) return;
      if (tap(i)) { dir *= -1; env.sound('tap'); }
      x += dir * 220 * dt; if (x < 95) { x = 95; dir = 1; } if (x > 805) { x = 805; dir = -1; }
      if (s.t >= next) spawn();
      for (const p of drops) if (!p.used) {
        p.y += p.vy * dt;
        if (p.y >= 435) { p.used = true; const hit = Math.abs(p.x - x) < 53; if (hit && !p.bomb) { caught++; s.score += 100; s.say('새우 바구니에 쏙!'); } else if (hit && p.bomb) { lives--; s.score = Math.max(0, s.score - 50); s.say('돌은 바구니 밖으로!', false); if (!lives) s.end('fail', `새우 ${caught}개를 받았어요`); } else if (!p.bomb) missed++; }
      }
      previous = held(i); if (s.t >= 40) s.end('record', `새우 ${caught}개 · 놓친 새우 ${missed}개`);
    },
    draw(ctx) {
      bg(ctx, { sky: '#f4f5de', ground: '#c5d3b3', groundY: 490 }); title(ctx, '우왕좌왕 새우 바구니', '한 번 탭할 때마다 걷는 방향이 바뀌어요'); hearts(ctx, lives, 4);
      rect(ctx, 90, 130, 720, 25, '#cfbaa0', 12); for (let j = 0; j < 8; j++) line(ctx, 125 + j * 90, 133, 125 + j * 90, 151, '#a78e74', 4);
      for (const p of drops) if (!p.used) { if (p.bomb) { circle(ctx, p.x, p.y, 17, '#82928b'); line(ctx, p.x - 7, p.y - 7, p.x + 7, p.y + 7, C.ink, 4); line(ctx, p.x + 7, p.y - 7, p.x - 7, p.y + 7, C.ink, 4); } else { ctx.beginPath(); ctx.arc(p.x, p.y, 12, -.8, 2.8); ctx.strokeStyle = C.pink; ctx.lineWidth = 12; ctx.stroke(); circle(ctx, p.x + 9, p.y - 8, 3, C.ink); } }
      bird(ctx, x, 493, 105, { flip: dir < 0 }); rect(ctx, x - 52, 437, 104, 28, '#bc905e', 12); line(ctx, x - 54, 436, x + 54, 436, C.gold, 7);
      text(ctx, dir > 0 ? '→' : '←', x, 400, 35, C.teal);
      ribbon(ctx, 'A / 화면 탭 → 방향 전환 · 새우는 받고 회색 돌은 피하세요');
    },
    hud: () => s.hud('바구니는 계속 움직여요. 탭해서 방향을 바꾸세요.'),
    bot() {
      const list = drops.filter(p => !p.used).sort((a, b) => (435 - a.y) / a.vy - (435 - b.y) / b.vy), p = list[0];
      if (!p) return raw(false);
      const left = (435 - p.y) / p.vy;
      let wanted = dir;
      if (p.bomb) { if (left < .7 && Math.abs(x - p.x) < 120) wanted = x < p.x ? -1 : 1; }
      else { if (Math.abs(p.x - x) > 17) wanted = p.x > x ? 1 : -1; }
      return raw(wanted !== dir && !previous);
    },
    snapshot: () => ({ ...s, x, dir, lives, caught, missed, drops: drops.filter(p => !p.used).map(p => ({ ...p })) })
  };
}

function brake(env) {
  const s = clock(env, 45); let distance = 0, speed = 110, lives = 4, passed = 0, braking = false;
  const gates = Array.from({ length: 14 }, (_, j) => ({ d: 360 + j * 360, slow: j % 3 !== 0, done: false }));
  const finish = 5500;
  const trackX = d => 450 + Math.sin(d / 430) * 190;
  return {
    update(dt, i) {
      if (!s.tick(dt)) return;
      braking = held(i); speed = clamp(speed + (braking ? -450 : 220) * dt, 105, 365); distance += speed * dt;
      for (const g of gates) if (!g.done && distance >= g.d) { g.done = true; passed++; if (g.slow && speed > 178) { lives--; speed = 105; s.say('커브 진입 전에 충분히 감속하세요', false); if (!lives) s.end('fail', `${Math.floor(distance)}m까지 달렸어요`); } else { s.score += g.slow ? 120 : Math.round(speed / 3); s.say(g.slow ? '부드러운 커브! 120점' : '직선 구간 질주!'); } }
      if (distance >= finish) { s.score += Math.round((45 - s.t) * 20); s.end('clear', `${s.t.toFixed(1)}초 만에 갈대 언덕 완주!`); }
      else if (s.t >= 45) s.end('record', `${Math.floor(distance)}/${finish}m · ${passed}개 표지 통과`);
    },
    draw(ctx) {
      bg(ctx, { sky: '#eef4e8', ground: '#d8e3cd', groundY: 120 }); title(ctx, '갈대 언덕 브레이크', `${Math.min(finish, Math.floor(distance))} / ${finish}m`); hearts(ctx, lives, 4);
      ctx.beginPath(); for (let y = 160; y <= 505; y += 8) { const wx = trackX(distance + (435 - y) * 3); if (y === 160) ctx.moveTo(wx, y); else ctx.lineTo(wx, y); } ctx.strokeStyle = '#adc1b0'; ctx.lineWidth = 135; ctx.stroke();
      ctx.beginPath(); for (let y = 160; y <= 505; y += 8) { const wx = trackX(distance + (435 - y) * 3); if (y === 160) ctx.moveTo(wx, y); else ctx.lineTo(wx, y); } ctx.strokeStyle = '#f8f1d5'; ctx.lineWidth = 109; ctx.stroke();
      for (const g of gates) { const sy = 435 - (g.d - distance) / 3; if (sy < 165 || sy > 520) continue; const gx = trackX(g.d); line(ctx, gx - 58, sy, gx + 58, sy, g.slow ? C.rose : C.teal, 6); rect(ctx, gx + 72, sy - 27, 118, 50, g.slow ? C.rose : C.teal, 13); text(ctx, g.slow ? '천천히' : '질주!', gx + 131, sy + 6, 20, C.white); }
      const px = trackX(distance); rect(ctx, px - 31, 445, 64, 15, C.gold, 7); bird(ctx, px, 443, 65, { rotation: Math.cos(distance / 430) * .14 });
      if (braking) { line(ctx, px - 21, 465, px - 24, 493, C.rose, 5); line(ctx, px + 21, 465, px + 24, 493, C.rose, 5); }
      text(ctx, `속도 ${Math.round(speed)}`, 160, 222, 27, braking ? C.rose : C.teal); text(ctx, braking ? '감속 중' : '가속 중', 160, 253, 21, C.ink);
      ribbon(ctx, 'A / 화면 꾹 누르면 브레이크 · 커브 178 이하 · 직선은 손 떼기');
    },
    hud: () => s.hud('분홍 커브에 닿기 전에 감속하고, 초록 직선에서는 달리세요.'),
    bot() { const g = gates.find(g => !g.done && g.slow); const need = Math.max(0, (speed * speed - 150 * 150) / 900) + 30; return raw(Boolean(g && g.d - distance < need)); },
    snapshot: () => ({ ...s, distance, speed, lives, passed, braking, next: gates.find(g => !g.done)?.d ?? finish })
  };
}

function tilt(env) {
  const s = clock(env); let x = 450, y = 158, vx = 0, vy = 0, dir = 1, stage = 0, lives = 3, previous = false, hitCooldown = 0;
  const holes = Array.from({ length: 7 }, (_, j) => (j % 2 ? 610 : 285) + rint(env, -30, 30));
  return {
    update(dt, i) {
      if (!s.tick(dt)) return;
      if (tap(i)) { dir *= -1; env.sound('tap'); }
      hitCooldown = Math.max(0, hitCooldown - dt);
      vx = clamp(vx + dir * 290 * dt, -185, 185); x += vx * dt;
      if (x < 96 || x > 804) { x = clamp(x, 96, 804); vx *= -.55; if (!hitCooldown) { lives--; hitCooldown = .8; s.say('양쪽 가시 벽을 조심하세요', false); if (!lives) s.end('fail', `${stage}/7층을 내려왔어요`); } }
      const floorY = 180 + stage * 125;
      const beforeY = y; vy += 520 * dt; const nextY = y + vy * dt;
      // Only the top surface can catch the ball; leaving a hole after passing
      // below a floor must never teleport it back above that floor.
      if (beforeY <= floorY - 20 && nextY >= floorY - 20 && Math.abs(x - holes[stage]) >= 49) { y = floorY - 20; vy = 0; }
      else y = nextY;
      if (y > floorY + 38) { stage++; s.score += 150; s.say('다음 층으로 쏙!'); if (stage === 7) { s.score += Math.round((45 - s.t) * 10); s.end('clear', '갈대 미로의 둥지에 도착했어요!'); } }
      previous = held(i); if (s.t >= 45) s.end('record', `갈대 미로 ${stage}/7층 통과`);
    },
    draw(ctx) {
      bg(ctx, { sky: '#f3eddb', ground: '#dde0c4', groundY: 130 }); title(ctx, '기울기 미로', `내려온 층 ${stage} / 7`); hearts(ctx, lives);
      const camera = Math.max(0, y - 275);
      ctx.save(); ctx.beginPath(); ctx.rect(78, 140, 744, 370); ctx.clip();
      for (let j = 0; j < 7; j++) {
        const fy = 180 + j * 125 - camera; if (fy < 100 || fy > 560) continue;
        rect(ctx, 80, fy, holes[j] - 80 - 70, 19, j % 2 ? C.teal : '#94a780', 7);
        rect(ctx, holes[j] + 70, fy, 820 - holes[j] - 70, 19, j % 2 ? C.teal : '#94a780', 7);
        line(ctx, holes[j] - 67, fy + 2, holes[j] + 67, fy + 2, C.gold, 3); text(ctx, '↓', holes[j], fy + 39, 34, C.gold);
        for (const wall of [85, 815]) { for (let k = 0; k < 3; k++) spark(ctx, wall, fy - 15 - k * 27, C.rose, 10); }
      }
      circle(ctx, x, y - camera, 24, '#f5c4ce', C.rose, 3); bird(ctx, x, y - camera + 19, 38, { rotation: vx / 500 });
      ctx.restore();
      text(ctx, dir < 0 ? '← 기울임' : '기울임 →', 450, 497, 23, C.teal);
      ribbon(ctx, 'A / 화면 탭 → 기울기 반전 · 노란 틈으로 굴러 내려가세요');
    },
    hud: () => s.hud('관성 때문에 바로 멈추지 않아요. 틈에 닿기 전에 기울기를 바꾸세요.'),
    bot() { const target = holes[Math.min(6, stage)], predicted = x + Math.sign(vx) * vx * vx / 580; const wanted = target > predicted ? 1 : -1; return raw(wanted !== dir && !previous && Math.abs(target - predicted) > 7); },
    snapshot: () => ({ ...s, x, y, vx, vy, dir, stage, lives, hole: holes[Math.min(6, stage)] })
  };
}

export const games = [
  entry('spring', '통통 연못 착지', 'HOLD & RELEASE', '스프링을 눌러 힘을 모으고 연못 건너 작은 섬에 착지하세요.', 'A 또는 화면 꾹 누르기 → 손을 떼어 점프', '여덟 번 도전해 섬 중앙에 착지하면 고득점. 물에 세 번 빠지면 종료.', '미니게임천국의 한 손가락 도약 장르에서 영감을 받은 독자적인 힘 조절 게임', GUIDE, '길게 누르기와 탄도 물리, 8개 섬은 이 패러디만의 규칙입니다.', [300, 700, 1050], spring),
  entry('swing', '흔들흔들 그네 배달', 'SWING & LET GO', '그네가 만든 관성을 이용해 친구가 기다리는 섬까지 날아가세요.', 'A 또는 화면 탭으로 줄 놓기', '그네 8번 도전. 섬 한가운데 착지하면 추가 점수.', '미니게임천국의 외줄 건너기와 모바일 원터치 물리 장르를 재구성', GUIDE, '회전하는 그네의 접선 속도와 직접 설계한 8개 착지 섬을 사용합니다.', [300, 700, 1050], swing),
  entry('pancake', '플라밍고 팬케이크', 'FLIP THE BRUNCH', '팬케이크를 띄운 뒤 회전시켜 팬 위에 평평하게 받으세요.', 'A / 화면 눌러 띄우기 · 공중에서 꾹 회전 · 손 떼어 정지', '한 번 이상 뒤집어 8장을 완성하세요. 세 번 놓치면 종료.', 'Pancake – The Game의 던지고 받는 원버튼 물리 장르에서 영감', 'https://apps.apple.com/us/app/pancake-the-game/id965965461', '독자적인 눌러 회전·떼어 정지 조작과 35초 브런치 도전입니다.', [250, 650, 1000], pancake),
  entry('gate', '회전문 타이밍', 'WAIT FOR THE GAP', '돌아가는 커다란 문틈이 위쪽에 올 때를 예상해 돌진하세요.', 'A 또는 화면 탭으로 위로 돌진', '움직이는 문 10개 통과. 벽에 세 번 닿으면 종료.', '미니게임천국의 원터치 타이밍 놀이에서 영감을 받은 창작 회전문 게임', APP, '회전문 위치·속도·돌진 시간은 자체 설계한 브라우저 규칙입니다.', [300, 600, 900], gate),
  entry('stack', '플라밍고 호텔', 'STACK IT NEATLY', '좌우로 오가는 층을 정확히 내려놓아 높고 반듯한 호텔을 지으세요.', 'A 또는 화면 탭으로 층 내려놓기', '12층 완공. 아래층과 겹치지 않는 부분은 잘려 나가요.', 'Ketchapp / KCHLAB Stack의 블록 정렬 장르를 2D로 패러디', 'https://www.kchlab.com/', '12층 도전, 정렬 허용치와 점수, 플라밍고 호텔 미술은 독자 제작입니다.', [400, 1000, 1600], stack),
  entry('bridge', '쭉쭉 갈대 다리', 'GROW A LITTLE MORE', '갈대를 적당한 길이로 늘려 다음 연못 섬까지 다리를 놓으세요.', 'A 또는 화면 꾹 눌러 늘리기 → 손을 떼어 내려놓기', '8개 다리 도전. 끝이 다음 섬 안에 닿아야 건널 수 있어요.', 'Ketchapp Stick Hero의 길이를 재어 다리를 놓는 장르를 패러디', 'https://play.google.com/store/apps/details?id=com.ketchapp.stickhero', '8개 자체 섬 배치, 3회 실수와 중앙 착지 점수로 재구성했습니다.', [300, 700, 1050], bridge),
  entry('signal', '새우만 콕!', 'TAP OR WAIT', '덮개 아래 숨은 새우는 재빨리 먹고 선인장은 그냥 두세요.', '새우가 나오면 A / 화면 탭 · 선인장은 기다리기', '30초 동안 정확하게 반응하세요. 성급하게 누르거나 놓치면 기회 차감.', '미니게임천국의 한 손가락 반응 장르에서 영감 받은 창작 구분 게임', APP, '새우와 선인장 구분, 반응 시간 점수와 5회 실수 규칙을 직접 설계했습니다.', [400, 1000, 1600], signal),
  entry('orbit', '별빛 궤도 스위치', 'ONE TAP, TWO ORBITS', '안쪽과 바깥쪽 궤도를 오가며 별을 모으고 운석을 피해요.', 'A 또는 화면 탭으로 안쪽 / 바깥쪽 전환', '40초 동안 별빛 수집. 운석에 세 번 닿으면 종료.', '미니게임천국의 원터치 방향 전환 놀이를 우주 궤도로 재구성', GUIDE, '두 원형 궤도, 별과 운석의 짝 배치, 시간과 점수는 자체 제작입니다.', [700, 1700, 2800], orbit),
  entry('elevator', '높이 딱! 승강기', 'HOLD TO LIFT', '승강기를 올린 뒤 승강장 높이에 맞춰 멈추고 친구를 태우세요.', 'A 또는 화면 꾹 눌러 상승 → 손을 떼어 문 열기', '친구 8명 태우기. 승강장과 어긋나면 안전 기회 차감.', '미니게임천국의 간단한 한 손 조작에서 영감을 받은 창작 정렬 게임', APP, '수직 승강기와 움직이는 승강장, 8명 배달 규칙은 직접 만든 콘텐츠입니다.', [300, 700, 1050], elevator),
  entry('catch', '우왕좌왕 새우 바구니', 'TURN TO CATCH', '계속 걷는 플라밍고의 방향을 바꿔 새우를 받고 돌은 피하세요.', 'A 또는 화면 탭으로 걷는 방향 반전', '40초 동안 새우를 모으세요. 돌에 네 번 닿으면 종료.', '미니게임천국의 원터치 방향 전환 장르를 낙하물 받기로 재구성', GUIDE, '낙하하는 새우·돌과 자동 이동 바구니를 결합한 자체 규칙입니다.', [500, 1300, 2300], catchFood),
  entry('brake', '갈대 언덕 브레이크', 'SLOW DOWN TO SPEED UP', '직선에서는 가속하고 커브 직전에는 브레이크를 밟아 언덕을 내려가요.', 'A 또는 화면 꾹 눌러 감속 · 손을 떼면 가속', '5,500m 코스 완주. 분홍 커브는 속도 178 이하로 통과하세요.', '모바일 원버튼 아케이드 장르를 재구성한 창작 속도 조절 게임', APP, '자체 코스의 감속 거리와 관성, 커브 속도 제한을 사용하는 45초 도전입니다.', [700, 1400, 2000], brake),
  entry('tilt', '기울기 미로', 'LEFT, RIGHT, ROLL', '갈대 바닥을 좌우로 기울여 작은 플라밍고 공을 노란 틈으로 내려보내세요.', 'A 또는 화면 탭으로 기울기 반전', '7개 층을 내려가 둥지에 도착하세요. 양옆 가시 벽을 조심하세요.', '미니게임천국 Slip Flip의 기울기 전환 원리를 독자적인 2D 미로로 재구성', GUIDE, '7개 층의 틈 배치와 공의 관성, 가시 벽은 직접 설계한 코스입니다.', [450, 900, 1250], tilt)
];
