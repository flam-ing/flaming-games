// SUPER MINGO — main.mjs
// Boot, keyboard/touch input, HUD, title/level-card/death/win screens, level flow.

import { createLoop, createCamera, updateCamera, drawTiles, drawParallax, drawSprite, VIEW_W, VIEW_H } from './engine.mjs';
import { buildAssets } from './art.mjs';
import { TILE_SIZE, LEVELS } from './levels.mjs';
import { createGame, update, respawnPlayer } from './game.mjs';
import { initAudio, sfx, music, toggleMute } from './audio.mjs';

const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const assets = buildAssets();
const camera = createCamera();

// ---------------------------------------------------------------------------
// Flow state machine
// ---------------------------------------------------------------------------

const SCREEN = { TITLE: 'title', PLAY: 'play', CARD: 'card', DEATH: 'death', GAMEOVER: 'gameover', WIN: 'win' };
let screen = SCREEN.TITLE;
let screenTimer = 0;
let levelIdx = 0;
let game = null;
let carryLives = 3;
let carryPearlsBank = 0; // running pearl overflow bank across levels (design: pearls reset per-life-award only)
let lastStats = null;

function startLevel(idx) {
  levelIdx = idx;
  game = createGame(idx);
  game.lives = carryLives;
  game.pearls = carryPearlsBank;
  screen = SCREEN.PLAY;
}

startLevel(0);
// begin at title screen regardless
screen = SCREEN.TITLE;

// ---------------------------------------------------------------------------
// Integer scaling
// ---------------------------------------------------------------------------

function resize() {
  const scale = Math.max(1, Math.floor(Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H)));
  canvas.style.width = (VIEW_W * scale) + 'px';
  canvas.style.height = (VIEW_H * scale) + 'px';
}
window.addEventListener('resize', resize);
resize();

// ---------------------------------------------------------------------------
// Input state
// ---------------------------------------------------------------------------

const keyState = {};
const input = {
  left: false, right: false, up: false, down: false,
  jump: false, jumpPressed: false, run: false, spit: false, spitPressed: false,
};
let prevJumpHeld = false;
let prevRunHeld = false;
let startPressed = false;

const KEY_MAP = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  KeyZ: 'jump', Space: 'jump',
  KeyX: 'run', ShiftLeft: 'run', ShiftRight: 'run',
};

function firstGesture() {
  initAudio();
  window.removeEventListener('keydown', firstGesture);
  window.removeEventListener('touchstart', firstGesture);
  window.removeEventListener('pointerdown', firstGesture);
}
window.addEventListener('keydown', firstGesture, { once: true });
window.addEventListener('touchstart', firstGesture, { once: true });
window.addEventListener('pointerdown', firstGesture, { once: true });

window.addEventListener('keydown', (e) => {
  const action = KEY_MAP[e.code];
  if (action) { keyState[action] = true; e.preventDefault(); }
  if (e.code === 'F3') { debugOverlay = !debugOverlay; e.preventDefault(); }
  if (e.code === 'Enter') { startPressed = true; e.preventDefault(); }
  if (e.code === 'KeyM') { toggleMute(); e.preventDefault(); }
});
window.addEventListener('keyup', (e) => {
  const action = KEY_MAP[e.code];
  if (action) { keyState[action] = false; e.preventDefault(); }
});

// --- Touch controls ---
let touchDetected = false;
const touchControls = document.getElementById('touch-controls');

function markTouch() {
  if (touchDetected) return;
  touchDetected = true;
  touchControls.classList.add('active');
}
window.addEventListener('touchstart', () => { markTouch(); startPressed = true; }, { passive: true, once: false });

function bindTouchButton(id, action) {
  const el = document.getElementById(id);
  const setDown = (down) => {
    keyState[action] = down;
    el.classList.toggle('pressed', down);
  };
  el.addEventListener('touchstart', (e) => { e.preventDefault(); markTouch(); setDown(true); }, { passive: false });
  el.addEventListener('touchend', (e) => { e.preventDefault(); setDown(false); }, { passive: false });
  el.addEventListener('touchcancel', (e) => { e.preventDefault(); setDown(false); }, { passive: false });
}
bindTouchButton('tc-left', 'left');
bindTouchButton('tc-right', 'right');
bindTouchButton('tc-a', 'jump');
bindTouchButton('tc-b', 'run'); // B doubles as run/flare-spit

function collectInput() {
  input.left = !!keyState.left;
  input.right = !!keyState.right;
  input.up = !!keyState.up;
  input.down = !!keyState.down;
  input.jump = !!keyState.jump;
  input.run = !!keyState.run;
  input.jumpPressed = input.jump && !prevJumpHeld;
  input.spitPressed = input.run && !prevRunHeld;
  input.spit = input.spitPressed;
  prevJumpHeld = input.jump;
  prevRunHeld = input.run;
}

// ---------------------------------------------------------------------------
// Debug overlay (F3)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Juice: pooled particles + screen shake
// ---------------------------------------------------------------------------

const MAX_PARTICLES = 64;
const particles = new Array(MAX_PARTICLES).fill(null).map(() => ({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0, color: '#fff', size: 1 }));

function spawnParticle(x, y, vx, vy, life, color, size = 2) {
  for (let i = 0; i < MAX_PARTICLES; i++) {
    const p = particles[i];
    if (!p.active) {
      p.active = true; p.x = x; p.y = y; p.vx = vx; p.vy = vy;
      p.life = life; p.maxLife = life; p.color = color; p.size = size;
      return;
    }
  }
}

function updateParticles(dt) {
  for (let i = 0; i < MAX_PARTICLES; i++) {
    const p = particles[i];
    if (!p.active) continue;
    p.x += p.vx; p.y += p.vy; p.vy += 0.05;
    p.life -= dt;
    if (p.life <= 0) p.active = false;
  }
}

function drawParticles() {
  for (let i = 0; i < MAX_PARTICLES; i++) {
    const p = particles[i];
    if (!p.active) continue;
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    const dx = Math.round(p.x - camera.x), dy = Math.round(p.y - camera.y);
    ctx.fillRect(dx, dy, p.size, p.size);
    ctx.globalAlpha = 1;
  }
}

let shakeTimer = 0;
let shakeMag = 0;
function triggerShake(mag, dur) { shakeTimer = dur; shakeMag = mag; }

let prevOnGround = false;
let prevSkidding = false;
let dustSpawnCooldown = 0;
let prevPower = 'gray';
let prevInvinc = 0;
let prevBossPhase = null;
let prevTime = 0;

function updateJuice(dtSec) {
  if (!game || screen !== SCREEN.PLAY) return;
  const p = game.player;

  // run dust puffs while grounded and moving
  dustSpawnCooldown -= dtSec;
  const moving = p.onGround && Math.abs(p.vx) > 0.6;
  if (moving && dustSpawnCooldown <= 0) {
    dustSpawnCooldown = 0.09;
    spawnParticle(p.x + (p.facing > 0 ? 0 : 10), p.y + 26, -p.facing * 0.3, -0.3, 0.3, '#e3d9c4', 2);
  }

  // skid dust burst
  if (p.skidding && !prevSkidding) {
    for (let i = 0; i < 5; i++) {
      spawnParticle(p.x + 6, p.y + 26, (Math.random() - 0.5) * 1.2, -Math.random() * 0.8, 0.35, '#b8ab8e', 2);
    }
  }
  prevSkidding = p.skidding;

  // landing poof
  if (p.onGround && !prevOnGround) {
    for (let i = 0; i < 6; i++) {
      spawnParticle(p.x + 7, p.y + 27, (Math.random() - 0.5) * 1.4, -Math.random() * 0.6, 0.3, '#e3d9c4', 2);
    }
  }
  prevOnGround = p.onGround;

  // powerup sparkle burst (freeze-frame moment)
  if (p.power !== prevPower) {
    for (let i = 0; i < 10; i++) {
      const ang = (i / 10) * Math.PI * 2;
      spawnParticle(p.x + 7, p.y + 13, Math.cos(ang) * 1.2, Math.sin(ang) * 1.2, 0.5, '#ffc857', 2);
    }
    prevPower = p.power;
  }

  // invincibility sparkle trail
  if (p.invincTimer > 0) {
    if (Math.random() < 0.5) {
      spawnParticle(p.x + Math.random() * 14, p.y + Math.random() * 27, (Math.random() - 0.5) * 0.3, -0.4, 0.4, '#ffc857', 1);
    }
  }
  prevInvinc = p.invincTimer;

  // boss land shake
  if (game.boss && game.boss.phase !== prevBossPhase) {
    if (game.boss.phase === 'land' || game.boss.phase === 'crouch') triggerShake(2, 0.15);
    prevBossPhase = game.boss.phase;
  }

  if (shakeTimer > 0) shakeTimer -= dtSec;

  updateParticles(dtSec);
}

const HURT_FLASH_REF = 1.5; // matches design's 1.5s blink invincibility window

let debugOverlay = false;
let fps = 60;
let lastFpsTime = performance.now();
let frameCount = 0;

// ---------------------------------------------------------------------------
// Fixed update
// ---------------------------------------------------------------------------

function fixedUpdate(dtSec) {
  collectInput();

  if (screen === SCREEN.TITLE) {
    music('overworld');
    if (startPressed) {
      startPressed = false;
      carryLives = 3; carryPearlsBank = 0;
      startLevel(0);
    }
    return;
  }

  if (screen === SCREEN.CARD) {
    screenTimer -= dtSec;
    if (screenTimer <= 0 || startPressed) {
      startPressed = false;
      if (pendingNextLevel !== null) {
        startLevel(pendingNextLevel);
        pendingNextLevel = null;
      } else {
        screen = SCREEN.PLAY;
      }
    }
    return;
  }

  if (screen === SCREEN.DEATH) {
    screenTimer -= dtSec;
    if (screenTimer <= 0) {
      if (game.gameOver) {
        screen = SCREEN.GAMEOVER;
        screenTimer = 3;
      } else {
        respawnPlayer(game);
        screen = SCREEN.PLAY;
      }
    }
    return;
  }

  if (screen === SCREEN.GAMEOVER) {
    screenTimer -= dtSec;
    if (screenTimer <= 0 || startPressed) {
      startPressed = false;
      carryLives = 3; carryPearlsBank = 0;
      screen = SCREEN.TITLE;
    }
    return;
  }

  if (screen === SCREEN.WIN) {
    if (startPressed) {
      startPressed = false;
      carryLives = 3; carryPearlsBank = 0;
      screen = SCREEN.TITLE;
    }
    return;
  }

  // --- PLAY ---
  update(game, input);

  for (const ev of game.events) {
    if (ev.type === 'sfx') {
      sfx(ev.name);
    } else if (ev.type === 'death') {
      screen = SCREEN.DEATH;
      screenTimer = 2;
      music('off');
    } else if (ev.type === 'level-complete' || ev.type === 'boss-defeated') {
      lastStats = ev;
      carryLives = game.lives;
      carryPearlsBank = game.pearls;
      sfx('win-fanfare');
      music('off');
      if (levelIdx + 1 < LEVELS.length) {
        pendingNextLevel = levelIdx + 1;
        screen = SCREEN.CARD;
        screenTimer = 2.2;
      } else {
        screen = SCREEN.WIN;
      }
    }
  }
  game.events.length = 0;

  updateMusicForPlay();
  updateJuice(dtSec);
}

function trackForLevel() {
  if (!game) return 'overworld';
  if (game.inBonus) return 'underroots';
  const theme = game.level.theme;
  if (theme === 'underroots') return 'underroots';
  if (theme === 'pier' && game.boss) return 'boss';
  return 'overworld';
}

function updateMusicForPlay() {
  if (screen !== SCREEN.PLAY) return;
  const fast = !!(game.player && game.player.invincTimer > 0) || !!game.musicFast || (game.time < 60);
  music(trackForLevel(), fast);
}

let pendingNextLevel = null;

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

function drawCenteredText(text, y, color, scale = 1) {
  const w = assets.font.measure(text, scale);
  assets.font.drawText(ctx, text, Math.round((VIEW_W - w) / 2), y, color, scale);
}

function renderTitle() {
  ctx.fillStyle = '#8fd3e8';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  drawParallax(ctx, assets.bg.saltflats, { x: (performance.now() / 40) % 10000 });
  ctx.drawImage(assets.logo, Math.round((VIEW_W - assets.logo.width) / 2), 40);
  drawCenteredText('PRESS START', 140, '#ffffff', 2);
  drawCenteredText('ARROWS/WASD MOVE   Z/SPACE JUMP   X/SHIFT RUN+FLARE', 170, '#241414', 1);
  drawCenteredText('HOLD DOWN ON STUMP TO WARP', 182, '#241414', 1);
}

function renderCard() {
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const idx = pendingNextLevel !== null ? pendingNextLevel : levelIdx;
  const level = LEVELS[idx];
  drawCenteredText(`WORLD ${level.id}`, 90, '#ffc857', 2);
  drawCenteredText(level.name, 116, '#ffffff', 1);
  drawCenteredText(`MINGO x${Math.max(0, carryLives + 1)}`, 140, '#ff5e9c', 1);
}

function renderDeath() {
  renderPlay(true);
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  drawCenteredText('MINGO DOWN!', 100, '#ff5e9c', 2);
}

function renderGameOver() {
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  drawCenteredText('THE COLONY GOES HUNGRY.', 100, '#ff5e9c', 1);
  drawCenteredText('GAME OVER', 120, '#ffffff', 2);
}

function renderWin() {
  ctx.fillStyle = '#8fd3e8';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // shrimp rain
  const t = performance.now() / 300;
  for (let i = 0; i < 24; i++) {
    const x = (i * 53 + (t * 30) % 400) % VIEW_W;
    const y = (i * 37 + t * 60) % VIEW_H;
    ctx.drawImage(assets.items.shrimp.curl, x, y);
  }
  drawCenteredText('THE COLONY FEASTS TONIGHT.', 60, '#ffc857', 1);
  drawCenteredText('YOU WIN!', 80, '#ff5e9c', 2);
  if (lastStats) {
    drawCenteredText(`PEARLS: ${lastStats.pearls}`, 120, '#ffffff', 1);
    drawCenteredText(`TIME LEFT: ${Math.ceil(lastStats.time)}`, 134, '#ffffff', 1);
    drawCenteredText(`DEATHS: ${lastStats.deaths}`, 148, '#ffffff', 1);
  }
  drawCenteredText('PRESS START', 180, '#ffffff', 1);
}

function renderPlay(freeze) {
  const level = game.level;
  const grid = game.inBonus ? game.bonusGrid : level.grid;
  const wTiles = game.inBonus ? level.bonus.widthTiles : level.widthTiles;
  const hTiles = game.inBonus ? level.bonus.heightTiles : level.heightTiles;
  const levelPxW = wTiles * TILE_SIZE;
  const levelPxH = hTiles * TILE_SIZE;
  if (!freeze) updateCamera(camera, game.player, levelPxW, levelPxH);

  ctx.clearRect(0, 0, VIEW_W, VIEW_H);

  ctx.save();
  if (shakeTimer > 0) {
    ctx.translate((Math.random() - 0.5) * shakeMag, (Math.random() - 0.5) * shakeMag);
  }

  const bgLayers = game.inBonus ? assets.bg.underroots : (assets.bg[level.theme] || []);
  drawParallax(ctx, bgLayers, camera);

  drawTilesWithBlockState(grid, level, game);

  // decorations (cage-cart etc.)
  if (!game.inBonus) drawDecorations(level, game);

  // debris
  for (const d of game.debris) {
    ctx.fillStyle = '#b8ab8e';
    ctx.fillRect(Math.round(d.x - camera.x), Math.round(d.y - camera.y), 3, 3);
  }

  // items
  for (const it of game.items) {
    const sprite = itemSprite(it);
    if (sprite) ctx.drawImage(sprite, Math.round(it.x - camera.x), Math.round(it.y - camera.y));
  }

  // enemies
  for (const en of game.enemies) {
    if (!en.alive) continue;
    const sprite = enemySprite(en);
    if (sprite) {
      const flip = en.facing < 0;
      drawSprite(ctx, sprite, en.x, en.y, camera, flip);
    }
  }

  // flare pellets
  for (const fp of game.flarePellets) {
    if (!fp.alive) continue;
    const key = Math.floor(performance.now() / 100) % 2 === 0 ? 'a' : 'b';
    ctx.drawImage(assets.items.flare_pellet[key], Math.round(fp.x - camera.x), Math.round(fp.y - camera.y));
  }

  // fish projectiles
  for (const fish of game.fishProjectiles) {
    ctx.drawImage(assets.items.fish_projectile, Math.round(fish.x - 5 - camera.x), Math.round(fish.y - 3 - camera.y));
  }

  // freed shrimp rain (arena cage burst on boss defeat)
  for (const s of game.shrimpRain) {
    ctx.drawImage(assets.items.shrimp.curl, Math.round(s.x - 5 - camera.x), Math.round(s.y - 5 - camera.y));
  }

  drawParticles();

  // player
  const p = game.player;
  const sprite = assets.mingo[p.power][p.pose] || assets.mingo[p.power].idle;
  const blinking = (p.hurtTimer > 0 || p.invincTimer > 0) && Math.floor(p.hurtTimer * 20 + p.invincTimer * 20) % 2 === 0;
  if (!blinking) drawSprite(ctx, sprite, p.x, p.y, camera, p.facing < 0);

  ctx.restore();

  // hurt flash overlay (screen-space, unaffected by shake)
  if (p.hurtTimer > 0) {
    ctx.fillStyle = `rgba(255,0,0,${0.12 * Math.min(1, p.hurtTimer / HURT_FLASH_REF)})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  drawHUD();

  if (debugOverlay) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(2, 2, 150, 46);
    assets.font.drawText(ctx, `X:${Math.round(p.x)} Y:${Math.round(p.y)}`, 6, 6, '#ffffff', 1);
    assets.font.drawText(ctx, `VX:${p.vx.toFixed(2)} VY:${p.vy.toFixed(2)}`, 6, 16, '#ffffff', 1);
    assets.font.drawText(ctx, `FPS:${fps} GRND:${p.onGround ? 1 : 0}`, 6, 26, '#ffffff', 1);
    assets.font.drawText(ctx, `POW:${p.power.toUpperCase()}`, 6, 36, '#ffffff', 1);
  }
}

function drawDecorations(level, g) {
  const decorations = level.decorations;
  if (!decorations) return;
  const cycle = Math.floor(performance.now() / 400) % 2 === 0 ? 'a' : 'b';
  for (const dec of decorations) {
    if (dec.type !== 'cage_cart') continue;
    const isArenaOpen = dec.arenaCage && g.cageOpen;
    const frame = isArenaOpen ? `open_${cycle}` : `caged_${cycle}`;
    const sprite = assets.decorations.cage_cart[frame];
    if (sprite) drawSprite(ctx, sprite, dec.x, dec.y, camera, false);
  }
}

function itemSprite(it) {
  const items = assets.items;
  if (it.type === 'shrimp') return items.shrimp.salmon;
  if (it.type === 'golden_shrimp') return items.golden_shrimp.sparkle_a;
  if (it.type === 'egg') return items.egg;
  if (it.type === 'preen_oil') return items.preen_oil;
  return null;
}

function enemySprite(en) {
  const bank = assets.enemies[en.type];
  if (!bank) return null;
  const cycle = Math.floor(en.animTimer / 15) % 2;
  en.animTimer += 1;
  if (en.type === 'crabby') return bank[cycle === 0 ? 'a' : 'b'];
  if (en.type === 'clacker') {
    if (en.shellState === 'open') return bank[cycle === 0 ? 'open_a' : 'open_b'];
    if (en.shellState === 'shut') return bank.shut;
    return bank[cycle === 0 ? 'slide' : 'slide_b'];
  }
  if (en.type === 'snapper') {
    if (en.state === 'sink') return bank.sink;
    if (en.state === 'rise') return bank.rise;
    return bank.up;
  }
  if (en.type === 'skeeter') return bank[cycle === 0 ? 'a' : 'b'];
  if (en.type === 'pelican_guard') return bank[cycle === 0 ? 'a' : 'b'];
  if (en.type === 'king_pelicano') {
    const frameMap = { strut: cycle === 0 ? 'strut_a' : 'strut_b', crouch: 'crouch', swoop: 'swoop', spit: 'spit', hurt: 'hurt' };
    if (en.defeated) return bank.defeat;
    return bank[frameMap[en.phase]] || bank.strut_a;
  }
  return null;
}

function drawTilesWithBlockState(grid, level, g) {
  // Base tile draw
  drawTiles(ctx, grid, assets.tiles, TILE_SIZE, camera);
  // Overlay spent/broken block visuals
  const camX = Math.floor(camera.x), camY = Math.floor(camera.y);
  for (const key of g.bumpedBlocks) {
    const [tx, ty] = key.split(',').map(Number);
    const dx = tx * TILE_SIZE - camX, dy = ty * TILE_SIZE - camY;
    if (dx > -TILE_SIZE && dx < VIEW_W && dy > -TILE_SIZE && dy < VIEW_H) {
      ctx.drawImage(assets.tiles['?_spent'], dx, dy);
    }
  }
  for (const key of g.brokenBlocks) {
    const [tx, ty] = key.split(',').map(Number);
    const dx = tx * TILE_SIZE - camX, dy = ty * TILE_SIZE - camY;
    if (dx > -TILE_SIZE && dx < VIEW_W && dy > -TILE_SIZE && dy < VIEW_H) {
      ctx.clearRect(dx, dy, TILE_SIZE, TILE_SIZE);
    }
  }
}

function drawHUD() {
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(0, 0, VIEW_W, 14);
  const p = game.player;
  const lives = Math.max(0, game.lives + 1);
  const timeStr = Math.ceil(game.time).toString().padStart(3, '0');
  const lowTime = game.time < 60;
  const timeColor = lowTime && Math.floor(performance.now() / 250) % 2 === 0 ? '#ff5e9c' : '#ffffff';
  const text = `MINGO x${lives}  o${game.pearls}  WORLD ${game.level.id}  TIME `;
  assets.font.drawText(ctx, text, 4, 4, '#ffffff', 1);
  const textW = assets.font.measure(text, 1);
  assets.font.drawText(ctx, timeStr, 4 + textW, 4, timeColor, 1);
  assets.font.drawText(ctx, p.power.toUpperCase(), VIEW_W - 60, 4, '#ffc857', 1);
}

function render() {
  frameCount++;
  const now = performance.now();
  if (now - lastFpsTime >= 500) {
    fps = Math.round((frameCount * 1000) / (now - lastFpsTime));
    frameCount = 0;
    lastFpsTime = now;
  }

  if (screen === SCREEN.TITLE) renderTitle();
  else if (screen === SCREEN.CARD) renderCard();
  else if (screen === SCREEN.DEATH) renderDeath();
  else if (screen === SCREEN.GAMEOVER) renderGameOver();
  else if (screen === SCREEN.WIN) renderWin();
  else renderPlay(false);
}

const loop = createLoop(fixedUpdate, render);
loop.start();
