import { clamp, dist, toward } from '../core.js';

const KEYS = ['a', 'b', 'c', 'd'];
const LETTERS = ['A', 'B', 'C', 'D'];
const SYMBOLS = ['●', '▲', '◆', '★', '■', '♥', '✚', '○', '△', '◇', '☆', '□', '♠', '♣', '♢', '♧'];
const PALETTE = ['#f394ae', '#63bde1', '#efc451', '#68c29c', '#a991d8', '#f49b63'];
const choice = input => KEYS.findIndex(k => input[k + 'p']);
const press = n => ({ [KEYS[n]]: true });
const txt = (c, id, text, x = 0, z = 0, y = 1, size = 2.5, color = '#213d47') => c.draw(id, 'text', { text, x, y, z, sx: size, sy: size / 4, color });
const box = (c, id, x, z, sx, sz, color, y = 0, sy = .18, more = {}) => c.draw(id, 'box', { x, y, z, sx, sy, sz, color, ...more });
const sphere = (c, id, x, z, color, y = .4, s = .65) => c.draw(id, 'sphere', { x, y, z, sx: s, sy: s, sz: s, color });
const layouts = [{ x: -5.5, z: -4.5 }, { x: 5.5, z: -4.5 }, { x: -5.5, z: 4.5 }, { x: 5.5, z: 4.5 }];
function boards(c) {
  c.view = { size: 24, eye: [0, 25, 19], target: [0, 0, 0] };
  c.players.forEach((p, i) => { p.x = layouts[i].x; p.z = layouts[i].z + 3.6; p.scale = .48; p.cursor = 0; p.nextCursor = 0; });
}
function board(c, p, title) {
  const a = layouts[p.i]; box(c, `board-${p.i}`, a.x, a.z, 9.7, 8.1, '#edf4de', -.2, .3);
  txt(c, `title-${p.i}`, title, a.x, a.z - 3.6, .5, 5, p.color);
}
function gridMove(c, p, input, w, h, delay = .16) {
  if (Math.abs(input.x) + Math.abs(input.z) < .3) { p.nextCursor = 0; return false; }
  if (c.time < p.nextCursor) return false;
  const x = p.cursor % w, z = Math.floor(p.cursor / w);
  const nx = clamp(x + (Math.abs(input.x) > .3 ? Math.sign(input.x) : 0), 0, w - 1);
  const nz = clamp(z + (Math.abs(input.x) <= .3 && Math.abs(input.z) > .3 ? Math.sign(input.z) : 0), 0, h - 1);
  p.cursor = nz * w + nx; p.nextCursor = c.time + delay; return p.cursor !== z * w + x;
}
function cursorBot(p, target, w, fire = true) {
  const dx = target % w - p.cursor % w, dz = Math.floor(target / w) - Math.floor(p.cursor / w);
  return dx ? { x: Math.sign(dx) } : dz ? { z: Math.sign(dz) } : { a: fire };
}
function separate(players, radius = .6) {
  for (let i = 0; i < players.length; i++) for (let j = i + 1; j < players.length; j++) {
    const a = players[i], b = players[j]; if (!a.alive || !b.alive) continue;
    const d = dist(a, b); if (d >= radius || d < .0001) continue;
    const x = (a.x - b.x) / d * (radius - d) / 2, z = (a.z - b.z) / d * (radius - d) / 2;
    a.x += x; a.z += z; b.x -= x; b.z -= z;
  }
}
function rank(c, responses, points) { responses.forEach((p, i) => c.points(p, points[Math.min(i, points.length - 1)])); }
function legend(c, line) { txt(c, 'rule-line', line, 0, -8.6, 1.5, 13); }

function studyFall(c) {
  c.limit = 8; c.view = { size: 24, eye: [0, 12, 26], target: [0, 8, 0] };
  const state = c.players.map((p, i) => { p.x = (i - 1.5) * 4; p.z = .45; p.y = 17; return { stop: false, threshold: c.rand(.65, 2.1) }; });
  return {
    update(dt) {
      c.hint('낙하 중 A로 자석 고정. 빨간 선에 가까울수록 좋지만 지우개에 닿으면 탈락!');
      c.players.forEach((p, i) => {
        const s = state[i], input = c.input(p, () => ({ a: p.y < s.threshold }));
        if (s.stop || c.time < 1) return;
        p.y -= (3.5 + (c.time - 1) * .75) * dt;
        if (input.ap) { s.stop = true; if (p.y > .55) { p.score = Math.max(0, 2000 - Math.round((p.y - .55) * 100)); p.pose = 'idle'; } else { p.score = -1; c.eliminate(p); } }
        if (p.y <= .55 && !s.stop) { s.stop = true; p.y = 0; p.score = -1; c.eliminate(p); }
      });
      if (state.every(s => s.stop)) { const live = c.players.filter(p => p.alive); if (live.length) c.highest('빨간 선에 가장 가깝게 멈춤'); else c.complete([], '모두 지우개에 부딪혔습니다'); }
    },
    render() {
      box(c, 'chalkboard', 0, -.2, 18, .5, '#32685e', 9, 19);
      box(c, 'redline', 0, .11, 18, .12, '#ee736c', .55, .07);
      c.players.forEach((p, i) => { box(c, `eraser-${i}`, p.x, .2, 2.5, 1, '#d8bc8a', -.1, .8); if (state[i].stop) txt(c, `distance-${i}`, p.alive ? `${Math.max(0, p.y - .55).toFixed(2)}m` : '실패', p.x, 1, p.y + 2, 3); });
    }
  };
}

function dominoEffect(c) {
  c.limit = 28; c.bounds = { x: 10, z: 13 }; c.view = { size: 30, eye: [0, 27, 22], target: [0, 0, 0] };
  const sequence = Array.from({ length: 28 }, () => c.int(0, 3));
  const states = c.players.map((p, i) => { p.x = (i - 1.5) * 4; p.z = 11; return { step: 0, lock: 0, next: c.rand(.3, .7) }; });
  return {
    update(dt) {
      c.hint('다음 판자에 표시된 A/B/C/D를 순서대로 누르세요. 틀리면 멈추고, 뒤에서는 판자가 무너집니다.');
      c.players.forEach((p, i) => {
        const s = states[i], input = c.input(p, () => c.time > s.next ? press(sequence[s.step]) : {});
        if (!p.alive) return;
        const k = choice(input);
        if (k >= 0 && c.time > s.lock) {
          s.next = c.time + c.rand(.4, .8);
          if (k === sequence[s.step]) { s.step++; p.z = 11 - s.step * .8; p.score = s.step; p.y = .8; }
          else s.lock = c.time + .6;
        }
        p.y = Math.max(0, p.y - dt * 4);
        if (s.step >= sequence.length) c.complete([i], '무너지는 판자 길을 먼저 완주');
        else if (c.time > 3 && s.step < (c.time - 3) * 1.35) c.eliminate(p);
      }); c.lastStanding();
    },
    render() {
      c.players.forEach((p, i) => { for (let n = 0; n < sequence.length; n++) {
        const collapsed = c.time > 3 && n < (c.time - 3) * 1.35;
        if (!collapsed) { box(c, `plank-${i}-${n}`, p.x, 11 - n * .8, 3, .68, n < states[i].step ? '#a4c4ab' : '#c8a66f', -.2); if (n >= states[i].step && n < states[i].step + 4) txt(c, `key-${i}-${n}`, LETTERS[sequence[n]], p.x, 11 - n * .8, .1, 1.2); }
      } });
    }, timeout() { c.highest('가장 멀리 진행'); }
  };
}

function boogieBeam(c) {
  c.limit = 30; let round = 0, start = 0, lit, answered;
  const reset = () => { lit = c.players.map(() => round === 9 || c.rng() < .5); answered = [false, false, false, false]; }; reset();
  c.players.forEach((p, i) => { p.x = (i - 1.5) * 4; p.z = 0; });
  const delays = c.players.map(() => c.rand(.6, 1.4));
  return { update() {
    const t = c.time - start; c.hint(`조명 포즈 ${round + 1}/10 · 밝으면 A, 어두우면 B · 불빛은 잠시 뒤 켜집니다.`);
    c.players.forEach((p, i) => { const k = choice(c.input(p, () => !answered[i] && t > delays[i] ? press(lit[i] ? 0 : 1) : {})); if (k >= 0 && !answered[i]) { answered[i] = true; if (t >= .5 && k === (lit[i] ? 0 : 1)) { c.points(p); p.pose = 'jump'; } } });
    if (t >= 3) { round++; if (round === 10) { if (c.players.every(p => p.score === c.players[0].score)) c.complete([], '모두 같은 포즈 점수로 무승부'); else c.highest('정확한 조명 포즈'); } else { start = round * 3; reset(); } }
  }, render() {
    c.arena({ color: '#263a53', width: 18, depth: 8 });
    c.players.forEach((p, i) => { const on = c.time - start >= .5 && lit[i]; c.draw(`spot-${i}`, 'cylinder', { x: p.x, y: -.05, z: 0, sx: 3.3, sy: .1, sz: 3.3, color: on ? '#ffe3a0' : '#465069', glow: on }); txt(c, `pose-${i}`, answered[i] ? '✓' : '?', p.x, 0, 3, 2, p.color); });
  } };
}

function parachutinGallery(c) {
  c.limit = 25; c.bounds = { x: 8, z: 5 }; let round = 0, start = 0, layout, target;
  const cells = Array.from({ length: 6 }, (_, i) => ({ x: (i % 3 - 1) * 5, z: (Math.floor(i / 3) - .5) * 5 }));
  const reset = () => { layout = c.shuffle([0, 1, 2, 3, 4, 5]); target = c.int(0, 5); c.players.forEach((p, i) => { p.x = (i % 2 ? 1 : -1) * 3; p.z = (i < 2 ? -1 : 1) * 3; p.y = 7; }); }; reset();
  return { update(dt) {
    const t = c.time - start, goal = cells[layout.indexOf(target)]; c.hint(`낙하 ${round + 1}/5 · ${SYMBOLS[target]} 타일로 방향을 잡으세요!`);
    c.players.forEach(p => { const input = c.input(p, () => toward(p, goal.x, goal.z)); c.move(p, input, 5); p.y = Math.max(.1, 7 - t * 2.1); }); separate(c.players, .85);
    if (t >= 3.5) { c.players.forEach(p => { const cell = cells.reduce((a, b) => dist(p, a) < dist(p, b) ? a : b); if (layout[cells.indexOf(cell)] === target) c.points(p); }); round++; if (round === 5) c.highest('정답 패널 통과 횟수'); else { start = c.time; reset(); } }
  }, render() { cells.forEach((a, i) => { box(c, `panel-${i}`, a.x, a.z, 4.8, 4.8, PALETTE[layout[i]]); txt(c, `symbol-${i}`, SYMBOLS[layout[i]], a.x, a.z, .4, 3); }); txt(c, 'target', `목표 ${SYMBOLS[target]}`, 0, -7, 3, 5, PALETTE[target]); } };
}

function soapSurfers(c) {
  c.limit = 30; c.view.size = 20;
  c.players.forEach((p, i) => { const a = i * Math.PI / 2; p.x = Math.cos(a) * 4; p.z = Math.sin(a) * 4; p.y = .4; });
  return { update(dt) {
    c.hint('방향키로 비누를 가속하세요. 관성으로 상대를 밀어내되 싱크대 밖으로 미끄러지지 마세요!');
    c.players.forEach(p => { const input = c.input(p, () => { if (Math.hypot(p.x, p.z) > 5.1) return toward(p, 0, 0); const q = c.players.filter(q => q !== p && q.alive).sort((a, b) => dist(p, a) - dist(p, b))[0]; return q ? toward(p, q.x, q.z) : {}; }); if (!p.alive) return; p.vx = (p.vx + input.x * dt * 8) * Math.pow(.975, dt * 60); p.vz = (p.vz + input.z * dt * 8) * Math.pow(.975, dt * 60); p.x += p.vx * dt; p.z += p.vz * dt; p.rotation = Math.atan2(-p.vz, p.vx); if (Math.hypot(p.x, p.z) > 7.25) { c.eliminate(p); p.y = -1; } });
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) { const a = c.players[i], b = c.players[j], d = dist(a, b); if (a.alive && b.alive && d > .001 && d < 1.6) { const nx = (a.x - b.x) / d, nz = (a.z - b.z) / d, impact = Math.max(0, (b.vx - a.vx) * nx + (b.vz - a.vz) * nz) + 1.1; a.vx += nx * impact; a.vz += nz * impact; b.vx -= nx * impact; b.vz -= nz * impact; const push = (1.6 - d) / 2; a.x += nx * push; a.z += nz * push; b.x -= nx * push; b.z -= nz * push; } }
    c.lastStanding();
  }, render() { c.arena({ width: 14.5, depth: 14.5, shape: 'cylinder', color: '#f2e9d6' }); c.draw('sink-drain', 'cylinder', { x: 0, y: .01, z: 0, sx: 1.5, sy: .05, sz: 1.5, color: '#9aaeb3' }); c.players.forEach(p => { if (p.alive) box(c, `soap-${p.i}`, p.x, p.z, 1.7, 1.1, p.color, .18, .35, { ry: p.rotation }); }); }, timeout() { if (c.players.every(p => p.alive)) c.complete([], '아무도 떨어지지 않아 무승부'); else c.survivors('비누 위 생존'); } };
}

function memoryMash(c) {
  c.limit = 300; c.bounds = { x: 9, z: 5 }; const cards = c.shuffle(Array.from({ length: 18 }, (_, i) => Math.floor(i / 2))).map((value, i) => ({ value, x: (i % 6 - 2.5) * 2.6, z: (Math.floor(i / 6) - 1) * 3, face: false, removed: false }));
  const teams = [{ held: [], score: 0, hide: 0 }, { held: [], score: 0, hide: 0 }], memory = new Map();
  const botTarget = p => {
    const t = teams[Math.floor(p.i / 2)], open = t.held[0];
    const available = cards.map((q, i) => i).filter(i => !cards[i].removed && !cards[i].face);
    if (open !== undefined) {
      const match = available.find(i => memory.get(i) === cards[open].value);
      if (match !== undefined) return match;
    } else {
      const pair = available.find(i => memory.has(i) && available.some(j => j !== i && memory.get(j) === memory.get(i)));
      if (pair !== undefined) return pair;
    }
    const unseen = available.filter(i => !memory.has(i));
    const options = unseen.length ? unseen : available;
    return options.sort((a, b) => dist(p, cards[a]) - dist(p, cards[b]))[0] ?? -1;
  };
  return { update() {
    c.hint(`기억 카드 · 분홍+파랑 ${teams[0].score} : 노랑+초록 ${teams[1].score} · 이동 후 A로 카드 뒤집기, 4쌍 먼저!`);
    teams.forEach(t => { if (t.hide && c.time >= t.hide) { t.held.forEach(i => { cards[i].face = false; }); t.held = []; t.hide = 0; } });
    c.players.forEach(p => {
      const target = botTarget(p), q = cards[target], input = c.input(p, () => q ? { ...toward(p, q.x, q.z), a: dist(p, q) < .7 && Math.sin(c.time * 8 + p.i) > .2 } : {}); c.move(p, input, 5.5); const t = teams[Math.floor(p.i / 2)]; if (!input.ap || t.hide) return;
      const n = cards.findIndex(q => !q.removed && !q.face && dist(p, q) < 1); if (n < 0) return;
      cards[n].face = true; memory.set(n, cards[n].value); t.held.push(n); p.pose = 'jump';
      if (t.held.length === 2) { const [a, b] = t.held; if (cards[a].value === cards[b].value) { cards[a].removed = cards[b].removed = true; t.held = []; t.score++; c.players.filter(q => Math.floor(q.i / 2) === Math.floor(p.i / 2)).forEach(q => { q.score = t.score; }); if (t.score >= 4) c.teamWin(c.players.filter(q => Math.floor(q.i / 2) === Math.floor(p.i / 2)).map(q => q.i), '기억 카드 4쌍'); } else t.hide = c.time + 1.2; }
    });
  }, render() { c.arena({ width: 19, depth: 12, color: '#b3a789' }); cards.forEach((q, i) => { box(c, `card-${i}`, q.x, q.z, 2.3, 2.5, q.removed ? '#92b494' : q.face ? '#fff3cf' : '#627791', 0, .16); txt(c, `face-${i}`, q.removed ? '✓' : q.face ? SYMBOLS[q.value] : '?', q.x, q.z, .3, 1.8); }); }, timeout() { c.complete([], '5분 안에 네 쌍을 모으지 못해 무승부'); } };
}

function gridIsGood(c) {
  boards(c); c.limit = 39; let round = 0, start = 0, values, revealed = false;
  const shapes = [[[0, 0], [1, 0], [0, 1]], [[0, 0], [1, 0], [1, 1]], [[1, 0], [0, 1], [1, 1]], [[0, 0], [0, 1], [1, 1]]];
  const states = c.players.map(() => ({ rotation: 0, locked: false, cells: [], goal: 0, delay: 0 }));
  const occupied = (cursor, rot) => shapes[rot].map(([x, z]) => (Math.floor(cursor / 3) + z) * 4 + cursor % 3 + x);
  const reset = () => { values = Array.from({ length: 16 }, () => c.int(1, 9)); revealed = false; c.players.forEach((p, i) => { p.cursor = 0; Object.assign(states[i], { rotation: c.int(0, 3), locked: false, cells: [], goal: c.int(0, 8), delay: c.rand(2, 6) }); }); }; reset();
  return { update() {
    const elapsed = c.time - start; c.hint(`겹치면 0점 ${round + 1}/3 · 방향으로 L조각 위치, B 회전, A 확정 · ${Math.max(0, Math.ceil(10 - elapsed))}초`);
    c.players.forEach((p, i) => { const s = states[i], input = c.input(p, () => elapsed > s.delay ? cursorBot(p, s.goal, 3, true) : {}); if (s.locked || revealed) return; gridMove(c, p, input, 3, 3); if (input.bp) s.rotation = (s.rotation + 1) % 4; if (input.ap) { s.cells = occupied(p.cursor, s.rotation); s.locked = true; } });
    if (elapsed >= 10 && !revealed) { revealed = true; states.forEach(s => { if (!s.locked) s.cells = []; }); const counts = Array(16).fill(0); states.forEach(s => s.cells.forEach(n => counts[n]++)); states.forEach((s, i) => c.points(c.players[i], s.cells.filter(n => counts[n] === 1).reduce((sum, n) => sum + values[n], 0))); }
    if (elapsed >= 12) { round++; if (round === 3) c.highest('겹치지 않은 칸의 합계'); else { start = c.time; reset(); } }
  }, render() { c.players.forEach((p, i) => { board(c, p, `${round + 1}/3  ${p.score}점`); const a = layouts[i], s = states[i], selected = s.locked ? s.cells : occupied(p.cursor, s.rotation); for (let n = 0; n < 16; n++) { const owners = states.filter(t => t.cells.includes(n)); const color = revealed ? owners.length > 1 ? '#655f70' : owners.length === 1 ? c.players[states.indexOf(owners[0])].color : '#ded7bb' : selected.includes(n) ? p.color : '#ded7bb'; const x = a.x + (n % 4 - 1.5) * 1.55, z = a.z + (Math.floor(n / 4) - 1.5) * 1.5; box(c, `grid-${i}-${n}`, x, z, 1.4, 1.35, color); txt(c, `value-${i}-${n}`, values[n], x, z, .25, 1.1); } }); } };
}

function tapDash(c) {
  boards(c); c.limit = 21; let round = 0, start = 0, target, tiles, answers;
  const reset = () => { tiles = c.shuffle(Array.from({ length: 16 }, (_, n) => n)); target = c.int(0, 15); answers = []; c.players.forEach(p => { p.cursor = 0; p.answered = false; p.react = c.rand(.4, 1.3); }); }; reset();
  return { update() {
    const elapsed = c.time - start; c.hint(`같은 그림 ${round + 1}/3 · ${SYMBOLS[target]}를 찾아 방향키로 고르고 A · ${Math.max(0, Math.ceil(5 - elapsed))}초`);
    c.players.forEach(p => { const input = c.input(p, () => elapsed > p.react ? cursorBot(p, tiles.indexOf(target), 4) : {}); if (p.answered || elapsed >= 5) return; gridMove(c, p, input, 4, 4, .1); if (input.ap) { p.answered = true; if (tiles[p.cursor] === target) { answers.push(p); c.points(p, [9, 6, 3, 1][answers.length - 1]); } } });
    if (elapsed > 6) { round++; if (round === 3) c.highest('같은 그림 찾기'); else { start = c.time; reset(); } }
  }, render() { c.players.forEach(p => { board(c, p, `목표 ${SYMBOLS[target]}   ${p.score}점`); const a = layouts[p.i]; tiles.forEach((v, n) => { const x = a.x + (n % 4 - 1.5) * 1.55, z = a.z + (Math.floor(n / 4) - 1.5) * 1.45; box(c, `tap-${p.i}-${n}`, x, z, 1.4, 1.3, n === p.cursor ? p.color : '#d7e7d9'); txt(c, `tap-symbol-${p.i}-${n}`, SYMBOLS[v], x, z, .28, 1.2); }); }); } };
}

function mildGunman(c) {
  c.limit = 28; let round = 0, start = 0, cueAt, target, answers, hit;
  const reset = () => { cueAt = c.rand(1.3, 3); target = c.int(0, 3); answers = []; hit = [false, false, false, false]; c.players.forEach(p => { p.react = c.rand(.25, .8); p.x = (p.i - 1.5) * 4; p.z = 5; }); }; reset();
  return { update() {
    const t = c.time - start; c.hint(`페인트 속사 ${round + 1}/3 · 표적이 열릴 때 보이는 A/B/C/D를 누르세요. 먼저 누르면 실격!`);
    c.players.forEach(p => { const k = choice(c.input(p, () => !hit[p.i] && t > cueAt + p.react ? press(target) : {})); if (k < 0 || hit[p.i]) return; hit[p.i] = true; if (t >= cueAt && k === target) { answers.push(p); c.points(p, [9, 6, 3, 1][answers.length - 1]); } });
    if (t >= cueAt + 4) { round++; if (round === 3) c.highest('정확하고 빠른 속사'); else { start = c.time; reset(); } }
  }, render() { c.arena({ color: '#c7a47e', width: 19, depth: 14 }); const open = c.time - start >= cueAt; box(c, 'target-sign', 0, -3, 8, .5, open ? '#f7e9c6' : '#6d7e83', 4, 5); txt(c, 'target-key', open ? LETTERS[target] : '준비', 0, -2.65, 4, 4); c.players.forEach(p => { if (hit[p.i]) sphere(c, `paint-${p.i}`, (p.i - 1.5) * 1.4, -2.4, p.color, 3.5, .9); }); } };
}

function tileSavvy(c) {
  boards(c); c.limit = 100;
  function scramble(steps) { let tiles = Array.from({ length: 9 }, (_, i) => i), empty = 8, path = [], previous = -1; for (let n = 0; n < steps; n++) { const options = [empty % 3 > 0 ? empty - 1 : -1, empty % 3 < 2 ? empty + 1 : -1, empty > 2 ? empty - 3 : -1, empty < 6 ? empty + 3 : -1].filter(v => v >= 0 && v !== previous), next = c.pick(options); [tiles[empty], tiles[next]] = [tiles[next], tiles[empty]]; path.unshift(empty); previous = empty; empty = next; } return { tiles, empty, path }; }
  const puzzles = [scramble(12), scramble(18), scramble(24)];
  const states = c.players.map(() => ({ level: 0, ...structuredClone(puzzles[0]), next: .6 }));
  const solved = s => s.tiles.every((n, i) => n === i);
  return { update() {
    c.hint('빈칸을 방향키로 움직여 1~8 그림 타일을 정렬하세요. 세 퍼즐을 먼저 완성하면 승리!');
    c.players.forEach((p, i) => { const s = states[i], target = s.path[0]; const input = c.input(p, () => c.time > s.next && target !== undefined ? { x: target % 3 - s.empty % 3, z: Math.floor(target / 3) - Math.floor(s.empty / 3) } : {}); if (c.time < s.next) return;
      let next = s.empty; if (Math.abs(input.x) > .3) next += input.x > 0 ? (s.empty % 3 < 2 ? 1 : 0) : (s.empty % 3 > 0 ? -1 : 0); else if (Math.abs(input.z) > .3) next += input.z > 0 ? (s.empty < 6 ? 3 : 0) : (s.empty > 2 ? -3 : 0);
      if (next === s.empty) return; [s.tiles[next], s.tiles[s.empty]] = [s.tiles[s.empty], s.tiles[next]]; s.empty = next; s.next = c.time + (p.i < c.humans ? .14 : c.rand(.4, .75)); if (s.path[0] === next) s.path.shift();
      if (solved(s)) { s.level++; p.score = s.level; if (s.level === 3) c.complete([i], '세 그림 퍼즐 완성'); else Object.assign(s, structuredClone(puzzles[s.level])); }
    });
  }, render() { c.players.forEach((p, i) => { const a = layouts[i], s = states[i]; board(c, p, `그림 ${Math.min(3, s.level + 1)}/3`); s.tiles.forEach((v, n) => { const x = a.x + (n % 3 - 1) * 2, z = a.z + (Math.floor(n / 3) - 1) * 2; box(c, `slide-${i}-${n}`, x, z, 1.86, 1.86, v === 8 ? '#8ba69b' : PALETTE[Math.floor(v / 3)], 0, .22); if (v !== 8) txt(c, `slide-number-${i}-${n}`, v + 1, x, z, .3, 1.8); }); }); } };
}

function topThis(c) {
  c.limit = 36; let round = 0, start = 0, slots = Array(16).fill(-1), finished = null;
  c.players.forEach((p, i) => { p.angle = i * Math.PI / 2; p.x = Math.cos(p.angle) * 7; p.z = Math.sin(p.angle) * 7; p.nextDrop = 0; });
  const rotation = () => (c.time - start) * .55;
  return { update() {
    const t = c.time - start; c.hint(`케이크 ${round + 1}/3 · 좌우로 조준 위치를 움직이고 A로 빈 칸에 토핑을 놓으세요!`);
    c.players.forEach(p => { const input = c.input(p, () => { const open = slots.map((v, i) => v < 0 ? i : -1).filter(i => i >= 0); const target = open.reduce((a, b) => Math.abs(Math.atan2(Math.sin(a * Math.PI / 8 + rotation() - p.angle), Math.cos(a * Math.PI / 8 + rotation() - p.angle))) < Math.abs(Math.atan2(Math.sin(b * Math.PI / 8 + rotation() - p.angle), Math.cos(b * Math.PI / 8 + rotation() - p.angle))) ? a : b, open[0] ?? 0); const delta = Math.atan2(Math.sin(target * Math.PI / 8 + rotation() - p.angle), Math.cos(target * Math.PI / 8 + rotation() - p.angle)); return { x: Math.abs(delta) > .12 ? Math.sign(delta) : 0, a: Math.abs(delta) < .15 && Math.sin(c.time * 12 + p.i) > .2 }; }); if (finished !== null) return; p.angle += input.x * c.dt * 2.8; if (!input.ap || c.time < p.nextDrop) return; p.nextDrop = c.time + .25; const n = ((Math.round((p.angle - rotation()) / (Math.PI / 8)) % 16) + 16) % 16; if (slots[n] < 0) { slots[n] = p.i; c.points(p); } });
    if (finished === null && (t >= 10 || slots.every(n => n >= 0))) finished = c.time;
    if (finished !== null && c.time - finished > 1) { round++; if (round === 3) c.highest('가장 많은 과일 토핑'); else { start = c.time; slots = Array(16).fill(-1); finished = null; } }
  }, render() { c.arena({ shape: 'cylinder', width: 11, depth: 11, color: '#f5d9a9', height: .8 }); c.draw('icing', 'cylinder', { x: 0, y: .05, z: 0, sx: 10.5, sy: .25, sz: 10.5, color: '#fff1df' }); slots.forEach((v, n) => { const a = n * Math.PI / 8 + rotation(), x = Math.cos(a) * 4.1, z = Math.sin(a) * 4.1; sphere(c, `fruit-${n}`, x, z, v < 0 ? '#d7bba8' : c.players[v].color, .35, v < 0 ? .35 : .85); }); c.players.forEach(p => { const x = Math.cos(p.angle) * 4.8, z = Math.sin(p.angle) * 4.8; txt(c, `aim-${p.i}`, '▼', x, z, 1.3, 1.7, p.color); }); } };
}

function greatBarsOfFire(c) {
  c.limit = 60; const states = c.players.map((p, i) => { const a = i * Math.PI / 2; p.x = Math.cos(a) * 5; p.z = Math.sin(a) * 5; p.score = 3; return { a, hurt: 0 }; });
  let angle = 0;
  const diff = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
  return { update(dt) {
    angle += dt * (1 + Math.floor(c.time / 8) * .16); c.hint('낮은 주황 막대는 A 점프, 높은 노랑 막대는 B를 눌러 숙이세요. 하트 3개!');
    c.players.forEach((p, i) => { const s = states[i], low = diff(s.a, angle), high = diff(s.a, angle + Math.PI); const input = c.input(p, () => ({ a: low < .45 && p.y === 0, b: high < .5 })); if (!p.alive) return; c.jump(p, input, 7.5); p.scale = input.b && p.y === 0 ? .43 : .8;
      if (c.time > s.hurt && ((low < .1 && p.y < .9) || (high < .1 && (!input.b || p.y > .2)))) { p.score--; s.hurt = c.time + .7; if (p.score === 0) c.eliminate(p); }
    }); c.lastStanding();
  }, render() { c.arena({ width: 15, depth: 15, shape: 'cylinder', color: '#827778' }); c.draw('fire-center', 'cylinder', { y: .6, sx: 1.5, sy: 1.3, sz: 1.5, color: '#624f5d' }); [0, 1].forEach(i => { const a = angle + i * Math.PI; box(c, `bar-${i}`, Math.cos(a) * 3.1, Math.sin(a) * 3.1, 6.2, .36, i ? '#ffe08a' : '#f57940', i ? 2.1 : .5, .36, { ry: -a, glow: true }); }); c.players.forEach(p => txt(c, `hearts-${p.i}`, '♥'.repeat(p.score), p.x, p.z, 3.4, 2.6, p.color)); }, timeout() { c.survivors('불막대를 피해 생존'); } };
}

function stretchRun(c) {
  c.limit = 17; c.view = { size: 27, eye: [0, 24, 22], target: [0, 0, 0] }; let round = 0, start = 0, scored = false;
  const states = c.players.map((p, i) => { p.x = (i - 1.5) * 4; p.z = 9; return { power: .45, target: c.rand(.73, .99) }; });
  return { update() {
    const t = c.time - start; c.hint(`고무줄 수레 ${round + 1}/2 · ↑/↓로 당기는 힘 조절. 5초 후 발사! 다리 끝을 넘으면 0점.`);
    c.players.forEach((p, i) => { const s = states[i], input = c.input(p, () => ({ z: Math.abs(s.target - s.power) > .015 ? -Math.sign(s.target - s.power) : 0 })); if (t < 5) s.power = clamp(s.power - input.z * c.dt * .27, 0, 1.2); else { const u = Math.min(1, (t - 5) / 1.4); p.z = 9 - s.power * 19 * (1 - (1 - u) ** 2); if (s.power > 1 && u === 1) p.y = -.8; } });
    if (t >= 6.5 && !scored) { scored = true; states.forEach((s, i) => { const zone = s.power < .68 || s.power > 1 ? -1 : Math.min(3, Math.floor((s.power - .68) / .08)); if (zone >= 0) c.points(c.players[i], (round ? [1, 3, 6, 9] : [1, 2, 4, 6])[zone]); }); }
    if (t >= 8) { round++; if (round === 2) c.highest('두 번의 발사 점수'); else { start = c.time; scored = false; c.players.forEach((p, i) => { p.z = 9; p.y = 0; states[i].power = .45; states[i].target = c.rand(.76, .995); }); } }
  }, render() { c.players.forEach((p, i) => { box(c, `bridge-${i}`, p.x, -.5, 3.1, 19, '#ba9b69', -.25, .45); for (let n = 0; n < 4; n++) { const z = 9 - (.72 + n * .08) * 19; box(c, `zone-${i}-${n}`, p.x, z, 3.05, 1.4, PALETTE[n]); txt(c, `zone-text-${i}-${n}`, (round ? [1, 3, 6, 9] : [1, 2, 4, 6])[n], p.x, z, .3, 1.5); } box(c, `cart-${i}`, p.x, p.z, 1.5, 1.3, p.color, .15, .4); txt(c, `power-${i}`, `${Math.round(states[i].power * 100)}%`, p.x, 11, 1, 2.3); }); } };
}

function colorCorrection(c) {
  c.limit = 7; c.bounds = { x: 7.7, z: 6 }; const tiles = [];
  for (let z = -3; z <= 3; z++) for (let x = -4; x <= 4; x++) if (Math.hypot(x, z) < 4.5) tiles.push({ x: x * 1.55 + (Math.abs(z) % 2) * .3, z: z * 1.55, owner: -1 });
  c.players.forEach((p, i) => { p.x = i % 2 ? 5 : -5; p.z = i < 2 ? -4 : 4; p.goal = null; });
  return { update(dt) {
    c.hint('7초 색칠 땅따먹기 · 방향키로 지나간 원을 내 색으로 바꾸세요!');
    c.players.forEach(p => { const input = c.input(p, () => { if (!p.goal || p.goal.owner === p.i || dist(p, p.goal) < .4) p.goal = tiles.filter(t => t.owner !== p.i).sort((a, b) => dist(p, a) - dist(p, b))[0]; return p.goal ? toward(p, p.goal.x, p.goal.z) : {}; }); c.move(p, input, 6); tiles.forEach(t => { if (dist(p, t) < .75) t.owner = p.i; }); }); separate(c.players, .7); c.players.forEach(p => { p.score = tiles.filter(t => t.owner === p.i).length; }); if (c.time >= 7) c.highest('7초 동안 가장 넓은 색깔 영역');
  }, render() { tiles.forEach((t, i) => c.draw(`territory-${i}`, 'cylinder', { x: t.x, y: -.1, z: t.z, sx: 1.4, sy: .2, sz: 1.4, color: t.owner < 0 ? '#e6dfc4' : c.players[t.owner].color })); } };
}

function greedyEats(c) {
  c.limit = 66; let round = 0, start = 0, food, selected, resolved;
  const reset = () => { food = [c.int(7, 18), c.int(7, 18)]; selected = [-1, -1, -1, -1]; resolved = false; c.players.forEach(p => { p.x = (p.i - 1.5) * 3; p.z = 5; p.react = c.rand(1, 7); p.plate = c.rng() < food[0] / (food[0] + food[1]) ? 0 : 1; }); }; reset();
  return { update() {
    const t = c.time - start; c.hint(`쿠키 나눠먹기 ${round + 1}/5 · A 왼쪽 ${food[0]}개 / B 오른쪽 ${food[1]}개 · 같은 접시를 고르면 나눠 갖습니다.`);
    c.players.forEach(p => { const k = choice(c.input(p, () => t > p.react && selected[p.i] < 0 ? press(p.plate) : {})); if (k >= 0 && k < 2 && !resolved && selected[p.i] < 0) selected[p.i] = k; });
    if (t >= 10 && !resolved) { resolved = true; selected.forEach((v, i) => { if (v >= 0) c.points(c.players[i], Math.floor(food[v] / selected.filter(n => n === v).length)); }); }
    if (t >= 12) { round++; if (round === 5) c.highest('나눠 먹은 쿠키 총합'); else { start = c.time; reset(); } }
  }, render() { c.arena({ width: 19, depth: 13, color: '#ab9b86' }); food.forEach((n, i) => { c.draw(`plate-${i}`, 'cylinder', { x: i ? 4.5 : -4.5, y: .2, z: -1.5, sx: 7, sy: .3, sz: 7, color: '#faf0dd' }); for (let j = 0; j < n; j++) { const angle = j * 2.4, r = Math.sqrt(j) * .62; c.draw(`cookie-${i}-${j}`, 'cylinder', { x: (i ? 4.5 : -4.5) + Math.cos(angle) * r, y: .5, z: -1.5 + Math.sin(angle) * r, sx: .85, sy: .22, sz: .85, color: '#ba7c43' }); } txt(c, `plate-label-${i}`, `${i ? 'B' : 'A'} · ${n}개`, i ? 4.5 : -4.5, -6, 1, 4); }); c.players.forEach(p => txt(c, `plate-choice-${p.i}`, selected[p.i] < 0 ? '고르는 중' : resolved ? LETTERS[selected[p.i]] : '선택 완료', p.x, p.z, 3, 3, p.color)); } };
}

function rollsForMoles(c) {
  c.limit = 67; c.view = { size: 27, eye: [0, 25, 21], target: [0, 0, 0] }; let round = 0, start = 0, wave, finished = null;
  const states = c.players.map((p, i) => { p.x = (i - 1.5) * 4.5; p.z = 10; return { ball: null, nextMole: 0, done: false, earliest: c.rand(1, 4) }; });
  const reset = () => { wave = Array.from({ length: 7 }, () => ({ phase: c.rand(0, Math.PI * 2), speed: c.rand(1.5, 3) })); states.forEach(s => { s.ball = null; s.nextMole = 0; s.done = false; s.earliest = c.rand(1, 4); }); finished = null; }; reset();
  const height = n => Math.max(0, Math.sin((c.time - start) * wave[n].speed + wave[n].phase));
  return { update(dt) {
    const t = c.time - start; c.hint(`일렬 두더지 ${round + 1}/3 · A로 공 한 번! 앞으로 굴러가며 올라온 두더지를 맞힙니다.`);
    c.players.forEach((p, i) => { const s = states[i], input = c.input(p, () => ({ a: !s.ball && !s.done && t > s.earliest && (wave.filter((_, n) => height(n) > .45).length >= 4 || t > 15) })); if (input.ap && !s.done && s.ball === null) s.ball = 9; if (s.ball !== null && !s.done) { s.ball -= dt * 10; while (s.nextMole < 7 && s.ball <= 7 - s.nextMole * 2.3) { if (height(s.nextMole) > .3) c.points(p); s.nextMole++; } if (s.ball < -9) s.done = true; } });
    if (finished === null && (t >= 20 || states.every(s => s.done))) finished = c.time;
    if (finished !== null && c.time - finished > 1.3) { round++; if (round === 3) c.highest('세 번의 볼링 적중 수'); else { start = c.time; reset(); } }
  }, render() { c.players.forEach((p, i) => { box(c, `mole-lane-${i}`, p.x, 0, 3.6, 20, '#bca583', -.2, .4); for (let n = 0; n < 7; n++) { const z = 7 - n * 2.3; c.draw(`mole-hole-${i}-${n}`, 'cylinder', { x: p.x, y: .02, z, sx: 1.4, sy: .08, sz: 1.4, color: '#594b3c' }); if (height(n) > .1) { sphere(c, `mole-${i}-${n}`, p.x, z, '#ac7651', height(n) * .85, 1); sphere(c, `nose-${i}-${n}`, p.x, z + .38, '#e5b49c', height(n) * .85, .3); } } const s = states[i]; if (s.ball !== null && !s.done) sphere(c, `ball-${i}`, p.x, s.ball, p.color, .5, .9); }); } };
}

function topItOff(c) {
  c.limit = 50; let round = 0, start = 0, target, options, locked, winner = null;
  const reset = () => { target = Array.from({ length: 4 }, () => c.int(0, 3)); options = Array.from({ length: 4 }, () => [...target]); const correct = c.int(0, 3); options.forEach((v, i) => { if (i !== correct) { const n = c.int(0, 3); v[n] = (v[n] + c.int(1, 3)) % 4; } }); locked = [false, false, false, false]; winner = null; c.players.forEach(p => { p.x = (p.i - 1.5) * 4; p.z = 6; p.react = c.rand(.8, 2.1); p.answer = c.rng() < .88 ? correct : c.int(0, 3); }); }; reset();
  return { update() {
    const t = c.time - start; c.hint(`꼭 맞는 조각 ${round + 1}/8 · 가운데 표본과 정확히 같은 조각을 A/B/C/D로 선택. 오답 -1점!`);
    c.players.forEach(p => { const k = choice(c.input(p, () => t > p.react && !locked[p.i] && winner === null ? press(p.answer) : {})); if (k < 0 || locked[p.i] || winner !== null) return; locked[p.i] = true; if (options[k].every((n, i) => n === target[i])) { c.points(p); winner = { player: p.i, at: c.time }; } else c.points(p, -1); });
    if ((winner && c.time - winner.at > 1) || t > 5) { round++; if (round === 8) c.highest('맞는 조각 먼저 고르기'); else { start = c.time; reset(); } }
  }, render() { c.arena({ width: 22, depth: 15, color: '#d1dbc9' }); const pattern = (id, v, x, z) => { box(c, id, x, z, 3.2, 3.2, '#f8f0d9', -.1, .3); v.forEach((n, j) => { const xx = x + (j % 2 - .5) * 1.35, zz = z + (Math.floor(j / 2) - .5) * 1.35; box(c, `${id}-${j}`, xx, zz, 1.2, 1.2, PALETTE[n], .2, .4); }); }; pattern('sample', target, 0, -5); txt(c, 'sample-label', '표본', 0, -7.5, 1, 3); options.forEach((v, i) => { pattern(`option-${i}`, v, (i - 1.5) * 4.7, .5); txt(c, `option-key-${i}`, LETTERS[i], (i - 1.5) * 4.7, 3, 1, 2); }); } };
}

function bridgesawPuzzle(c) {
  boards(c); c.limit = 66; let round = 0, start = 0, pieces, completed;
  const states = c.players.map(() => ({ selected: 0, placed: 0, next: 0, react: 0 }));
  const reset = () => { const n = round + 3; pieces = c.shuffle(Array.from({ length: n }, (_, i) => i)); completed = []; c.players.forEach((p, i) => { p.cursor = 0; Object.assign(states[i], { selected: 0, placed: 0, next: 0, react: c.rand(.4, .8) }); }); }; reset();
  return { update() {
    const t = c.time - start; c.hint(`다리 조각 ${round + 1}/3 · 빈 칸의 모양과 맞는 조각을 좌우로 골라 A로 놓기. 먼저 완성할수록 고득점!`);
    c.players.forEach((p, i) => { const s = states[i], target = pieces.indexOf(s.placed), input = c.input(p, () => c.time > s.next && t > s.react ? cursorBot(p, target, pieces.length) : {}); if (s.placed === pieces.length) return; gridMove(c, p, input, pieces.length, 1); if (input.ap && c.time > s.next) { s.next = c.time + .35; if (pieces[p.cursor] === s.placed) { s.placed++; if (s.placed === pieces.length) { completed.push(p); c.points(p, [5, 3, 2, 1][completed.length - 1]); } } } });
    if (t > 20 || completed.length === 4) { round++; if (round === 3) c.highest('다리 퍼즐 완료 순위 점수'); else { start = c.time; reset(); } }
  }, render() { c.players.forEach((p, i) => { const a = layouts[i], s = states[i]; board(c, p, `${round + 1}/3 · ${s.placed}/${pieces.length}`); box(c, `river-${i}`, a.x, a.z - .7, 8, 2.5, '#69b7c9'); const width = 7.6 / pieces.length; for (let n = 0; n < pieces.length; n++) { const x = a.x - 3.8 + width * (n + .5), color = n < s.placed ? p.color : '#e9e4d2'; box(c, `bridge-piece-${i}-${n}`, x, a.z - .7, width - .12, 1.3 + n * .16, color, n < s.placed ? .23 : -.02, .22); txt(c, `bridge-shape-${i}-${n}`, SYMBOLS[n], x, a.z - .7, .45, 1); const v = pieces[n]; box(c, `loose-piece-${i}-${n}`, x, a.z + 1.7, width - .12, 1.3 + v * .16, p.cursor === n ? p.color : '#c8a36f', .15, .25); txt(c, `loose-shape-${i}-${n}`, v < s.placed ? '✓' : SYMBOLS[v], x, a.z + 1.7, .44, 1); } }); } };
}

function conkdorDeForce(c) {
  c.limit = 40; let round = 0, start = 0, birds, picked, resolved;
  const reset = () => { birds = c.shuffle([0, 1, 1, 2]); picked = [0, 0, 0, 0]; resolved = false; c.players.forEach(p => { p.react = c.rand(2, 8); p.done = false; }); };
  c.players.forEach((p, i) => { const a = i * Math.PI / 2; p.x = Math.cos(a) * 6; p.z = Math.sin(a) * 6; p.score = 3; }); reset();
  return { update() {
    const t = c.time - start; c.hint(`회전 부리 ${round + 1}/3 · A 빨강(유지), B 파랑(내 앞 새를 다음 자리로 회전). 최종 화살표에 맞으면 하트 감소!`);
    c.players.forEach(p => { const input = c.input(p, () => !p.done && t > p.react ? press(birds[p.i] === p.i ? 1 : c.rng() < .35 ? 1 : 0) : {}); if (resolved || !p.alive) return; const k = choice(input); if (k === 0 || k === 1) { picked[p.i] = k; p.done = true; } });
    if (t >= 10 && !resolved) { resolved = true; birds = birds.map((n, i) => (n + picked[i]) % 4); c.players.forEach(p => { if (birds.includes(p.i)) { p.score = Math.max(0, p.score - 1); if (p.score === 0) c.eliminate(p); } }); }
    if (t >= 12) { round++; if (round === 3) c.highest('부리 공격 후 남은 하트'); else { start = c.time; reset(); } }
  }, render() { c.arena({ width: 18, depth: 18, shape: 'cylinder', color: '#d9c7a3' }); birds.forEach((target, i) => { const a = i * Math.PI / 2 + .45, x = Math.cos(a) * 2.7, z = Math.sin(a) * 2.7, p = c.players[target]; sphere(c, `bird-head-${i}`, x, z, '#dfba68', 2, 1.3); const dir = Math.atan2(p.z - z, p.x - x); box(c, `beak-${i}`, x + Math.cos(dir), z + Math.sin(dir), 2, .3, '#f18a62', 1.9, .35, { ry: -dir }); txt(c, `beak-target-${i}`, `→ ${target + 1}P`, x, z, 3.3, 2.3); }); c.players.forEach(p => { box(c, `switch-${p.i}`, p.x, p.z + 1.2, 1.2, 1.2, picked[p.i] ? '#69afdf' : '#e97b87'); txt(c, `life-${p.i}`, `${p.i + 1}P ${'♥'.repeat(p.score)}`, p.x, p.z, 3.1, 3, p.color); }); } };
}

function goombaGuess(c) {
  boards(c); c.limit = 22; const values = c.shuffle(Array.from({ length: 21 }, (_, i) => i < 12));
  const pair = [c.int(0, 9), c.int(11, 20)], initial = [...values]; [values[pair[0]], values[pair[1]]] = [values[pair[1]], values[pair[0]]];
  const guesses = c.players.map(() => new Set()), memories = c.players.map(() => values.map(v => c.rng() < .86 ? v : !v));
  return { update() {
    const guessing = c.time >= 5; c.hint(guessing ? `그림자 찾기 · 처음 금색이었던 12마리를 기억! 방향 선택 + A, 오답 -1 · ${Math.max(0, Math.ceil(20 - c.time))}초` : c.time < 3 ? '금색 친구 12마리의 위치를 기억하세요. 보라색은 고르면 안 됩니다!' : '불이 꺼진 뒤 두 자리가 바뀝니다. 움직임을 따라가세요!');
    c.players.forEach((p, i) => { let target = memories[i].findIndex((v, n) => v && !guesses[i].has(n)); const input = c.input(p, () => guessing && target >= 0 ? cursorBot(p, target, 7, Math.sin(c.time * 8 + i) > .1) : {}); if (!guessing) return; gridMove(c, p, input, 7, 3, .13); if (input.ap && !guesses[i].has(p.cursor)) { guesses[i].add(p.cursor); c.points(p, values[p.cursor] ? 1 : -1); } }); if (c.time >= 20) c.highest('기억한 그림자 정답 수');
  }, render() { c.players.forEach((p, i) => { const a = layouts[i]; board(c, p, c.time < 5 ? '금색 친구를 기억' : `${p.score}점 · ${Math.max(0, Math.ceil(20 - c.time))}초`); for (let n = 0; n < 21; n++) { let slot = n; if (c.time >= 3 && c.time < 5 && pair.includes(n)) { const other = pair[0] === n ? pair[1] : pair[0]; const t = (c.time - 3) / 2; const xx = n % 7 + (other % 7 - n % 7) * t, zz = Math.floor(n / 7) + (Math.floor(other / 7) - Math.floor(n / 7)) * t; slot = { x: xx, z: zz }; } const x = a.x + ((typeof slot === 'number' ? slot % 7 : slot.x) - 3) * 1.05, z = a.z + ((typeof slot === 'number' ? Math.floor(slot / 7) : slot.z) - 1) * 1.6; const known = c.time < 3, guessed = guesses[i].has(n); box(c, `guess-tile-${i}-${n}`, a.x + (n % 7 - 3) * 1.05, a.z + (Math.floor(n / 7) - 1) * 1.6, .94, 1.4, p.cursor === n && c.time >= 5 ? p.color : '#e1ddc7', -.05); const v = c.time < 5 ? initial[n] : values[n]; sphere(c, `guess-creature-${i}-${n}`, x, z, known ? v ? '#e6b54d' : '#a88cc7' : guessed ? values[n] ? '#66c89c' : '#e38886' : '#4d5262', .5, .75); if (guessed) txt(c, `guess-mark-${i}-${n}`, values[n] ? '✓' : '×', x, z, 1.05, .9); } }); } };
}

export const games = {
  'Study Fall': studyFall,
  'Domino Effect': dominoEffect,
  'Boogie Beam': boogieBeam,
  "Parachutin' Gallery": parachutinGallery,
  'Soap Surfers': soapSurfers,
  'Memory Mash': memoryMash,
  'Grid is Good': gridIsGood,
  'Tap Dash': tapDash,
  'Mild Gunman': mildGunman,
  'Tile Savvy': tileSavvy,
  'Top This': topThis,
  'Great Bars of Fire': greatBarsOfFire,
  'Stretch Run': stretchRun,
  'Color Correction': colorCorrection,
  'Greedy Eats': greedyEats,
  'Rolls for Moles': rollsForMoles,
  'Top It Off': topItOff,
  'Bridgesaw Puzzle': bridgesawPuzzle,
  'Conkdor de Force': conkdorDeForce,
  'Goomba Guess': goombaGuess,
};

export const notes = {
  'Study Fall': 'A: 자석 고정. 낙하 후 빨간 선 바로 위에 멈춥니다. 입력하지 않으면 지우개에 충돌합니다.',
  'Domino Effect': '판자 위 A/B/C/D를 차례로 입력합니다. 방향키는 사용하지 않습니다. 28개 판자로 코스를 구성했습니다.',
  'Boogie Beam': '불빛이 켜지면 A, 어두우면 B. 각 포즈마다 한 번만 답할 수 있습니다. 30초 동안 10포즈이며, 모두 같은 점수면 무승부입니다.',
  "Parachutin' Gallery": '방향키로 낙하 위치를 조정합니다. 제시된 도형 패널 위로 착지하면 1점, 총 5회입니다.',
  'Soap Surfers': '방향키로 미끄러지는 비누를 가속·감속합니다. 충돌에는 양쪽의 속도와 관성을 적용합니다.',
  'Memory Mash': '방향키 이동, 가까운 카드에서 A로 찍기. 원작의 점프→엉덩이 찍기를 한 버튼으로 압축했습니다. 1·2P와 3·4P가 한 팀이며 먼저 네 쌍을 모으면 승리. 5분 제한입니다.',
  'Grid is Good': '방향키: L조각 위치, B: 회전, A: 확정. 원작의 터치 드래그를 격자 입력으로 변환했고 조각은 L형 4방향을 사용합니다. 각 라운드 10초, 총 3회.',
  'Tap Dash': '방향키: 4×4 그림 선택, A: 확정. 원작 터치 선택을 키보드로 변환했습니다. 각 라운드 5초, 총 3회.',
  'Mild Gunman': '표적의 A/B/C/D에 반응합니다. 준비 중 입력하면 그 라운드는 0점. 총 3회입니다.',
  'Tile Savvy': '방향키로 빈칸을 이동합니다. 터치 슬라이드를 키보드로 변환한 3×3 퍼즐 3개이며 모두 풀 수 있도록 생성합니다.',
  'Top This': '좌우: 토핑 조준 방향, A: 현재 방향의 빈 칸에 놓기. 터치 입력을 각도 조준으로 변환했습니다. 16칸 케이크 3개입니다.',
  'Great Bars of Fire': 'A: 점프, B 누르기: 숙이기. 낮은 주황 막대는 점프, 높은 노랑 막대는 숙여서 피합니다.',
  'Stretch Run': '↑/↓: 고무줄 당김 조절. 5초 뒤 자동 발사되고 관성으로 정지합니다. 원작처럼 2라운드, 끝을 넘으면 0점입니다.',
  'Color Correction': '방향키로 원형 타일 위를 지나가 색칠합니다. 정확히 7초 동안 진행합니다.',
  'Greedy Eats': 'A: 왼쪽 접시, B: 오른쪽 접시. 한 번 선택하면 확정됩니다. 동일 접시 선택자끼리 정수 개수로 나눕니다. 쿠키 수는 시드별로 생성합니다.',
  'Rolls for Moles': 'A: 볼링공 한 번 굴리기. 공이 각 구멍에 도착할 때 올라와 있는 두더지가 점수를 줍니다. 총 3회입니다.',
  'Top It Off': '표본의 네 칸 색 배치와 같은 조각을 A/B/C/D로 고릅니다. 첫 정답 +1, 오답 -1. 캐릭터 그림을 기하학 조각으로 패러디했습니다.',
  'Bridgesaw Puzzle': '좌우: 조각 선택, A: 빈 자리로 옮기기. 터치 드래그를 순서 있는 슬롯 배치로 변환했습니다. 3·4·5조각 퍼즐을 푸는 3라운드입니다.',
  'Conkdor de Force': 'A: 빨강 유지, B: 파랑 회전. 각 플레이어 앞 부리의 목표가 한 자리 이동합니다. 연결된 회전 구조는 네 개의 방향 표시로 단순화했습니다.',
  'Goomba Guess': '금색 친구를 기억하고 마지막 자리바꿈을 보세요. 방향키: 선택, A: 답. 터치 입력을 7×3 격자 선택으로 바꿨습니다. 답변 시간 15초입니다.',
};

export const supportedTitles = {
  "Study Fall": ["ds"],
  "Domino Effect": ["ds"],
  "Boogie Beam": ["ds"],
  "Parachutin' Gallery": ["ds"],
  "Soap Surfers": ["ds"],
  "Memory Mash": ["ds"],
  "Stretch Run": ["island-tour"],
  "Grid is Good": ["island-tour"],
  "Tap Dash": ["island-tour"],
  "Mild Gunman": ["island-tour"],
  "Tile Savvy": ["island-tour"],
  "Color Correction": ["island-tour"],
  "Top This": ["island-tour"],
  "Great Bars of Fire": ["island-tour"],
  "Greedy Eats": ["star-rush"],
  "Rolls for Moles": ["star-rush"],
  "Top It Off": ["star-rush"],
  "Conkdor de Force": ["star-rush"],
  "Bridgesaw Puzzle": ["star-rush"],
  "Goomba Guess": ["star-rush"],
};
