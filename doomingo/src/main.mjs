// src/main.mjs — boot, loop, input, HUD draw, menus, touch. Wires everything.

import { buildAssets } from './art.mjs';
import { MAP } from './map.mjs';
import { Framebuffer, render, FB_W, FB_H, hexColor } from './engine.mjs';
import { createGame, update } from './game.mjs';
import { drawText, tintWing } from './art.mjs';

// ---------------------------------------------------------------------------
// Weapon wing tint (PINK tiers): the viewmodel canvases baked in art.mjs
// contain TINT_KEY placeholder pixels on wing regions. tintWing() does a
// getImageData/putImageData pass, which is too slow to run per frame, so we
// only re-tint when the mugshot tier actually changes (7 tiers total), and we
// cache one tinted CLONE per (weapon, frame-slot, tier) — never mutate the
// pristine original snapshot's canvas, or its TINT_KEY pixels would be gone
// after the first tint and every subsequent tier would reuse stale color.
// ---------------------------------------------------------------------------
function cloneCanvas(srcCanvas) {
  const c = document.createElement('canvas');
  c.width = srcCanvas.width;
  c.height = srcCanvas.height;
  c.getContext('2d').drawImage(srcCanvas, 0, 0);
  return c;
}

function snapshotCanvas(canvas) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = new Uint32Array(imgData.data.buffer.slice(0));
  return { data, size: w, width: w, height: h };
}

// pristineSnap: the original {data, size, canvas, width, height} wrapper from
// buildAssets() (its .canvas still has TINT_KEY pixels — never mutated).
// Returns a snapshot wrapper tinted for the given tier, cached per tier.
const _tintTierCache = new WeakMap(); // pristineSnap -> Map(tierIdx -> snap)
function tintedTierSnap(pristineSnap, tierIdx, pinkLevel) {
  if (!pristineSnap || !pristineSnap.canvas) return pristineSnap;
  let byTier = _tintTierCache.get(pristineSnap);
  if (!byTier) {
    byTier = new Map();
    _tintTierCache.set(pristineSnap, byTier);
  }
  let cached = byTier.get(tierIdx);
  if (!cached) {
    const clone = cloneCanvas(pristineSnap.canvas);
    tintWing(clone, pinkLevel);
    cached = snapshotCanvas(clone);
    byTier.set(tierIdx, cached);
  }
  return cached;
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
const canvas = document.getElementById('fb');
const fb = new Framebuffer(canvas);
const assets = buildAssets();
const game = createGame(assets);

let audioMod = null;
try {
  audioMod = await import('./audio.mjs');
} catch (e) {
  audioMod = null;
}
if (audioMod) {
  game.sfx = (name) => { try { audioMod.sfx(name); } catch (e) {} };
}

const ENEMY_STATE_ORDER = ['idle', 'walk', 'attack', 'pain', 'die', 'corpse'];
const ENEMY_FRAME_COUNTS = { idle: 2, walk: 4, attack: 2, pain: 1, die: 4, corpse: 1 };
// PLASTINGO die anim has 4 frames like lawnFlamingo; matches art.mjs builders.

function enemyFrameSlice(type, stateName) {
  const set = assets.sprites._states[type];
  return set ? set[stateName] : null;
}

// ---------------------------------------------------------------------------
// Camera state fed to engine.render — camera = player
// ---------------------------------------------------------------------------
const state = {
  x: game.player.x,
  y: game.player.y,
  angle: game.player.angle,
  map: game.map,
  sprites: [],
};

// ---------------------------------------------------------------------------
// Canvas CSS integer scaling
// ---------------------------------------------------------------------------
function resizeCanvasDisplay() {
  const scaleX = Math.floor(window.innerWidth / FB_W) || 1;
  const scaleY = Math.floor(window.innerHeight / FB_H) || 1;
  const scale = Math.max(1, Math.min(scaleX, scaleY));
  canvas.style.width = (FB_W * scale) + 'px';
  canvas.style.height = (FB_H * scale) + 'px';
}
window.addEventListener('resize', resizeCanvasDisplay);
resizeCanvasDisplay();

// ---------------------------------------------------------------------------
// Input: pointer-lock mouse look + WASD + weapon keys + E use + Q cycle
// ---------------------------------------------------------------------------
const keys = new Set();
let mouseDX = 0;
let showFPS = false;
let useEdge = false;
let cycleEdge = false;
let weaponKeyPressed = null;
let restartRequested = false;

window.addEventListener('keydown', (e) => {
  if (!gameStarted && currentMenu === 'title') {
    startGame();
    return;
  }
  if (!keys.has(e.code)) {
    if (e.code === 'KeyE') useEdge = true;
    if (e.code === 'KeyQ') cycleEdge = true;
    if (e.code === 'Digit1') weaponKeyPressed = 1;
    if (e.code === 'Digit2') weaponKeyPressed = 2;
    if (e.code === 'Digit3') weaponKeyPressed = 3;
    if (e.code === 'Digit4') weaponKeyPressed = 4;
    if (e.code === 'KeyR' && (game.player.state === 'DEAD' || game.player.state === 'WIN')) restartRequested = true;
  }
  keys.add(e.code);
  if (e.code === 'KeyF') showFPS = !showFPS;
  if (e.code === 'KeyM') toggleMusic();
  if (e.code === 'Escape' && gameStarted && game.player.state === 'ALIVE') togglePause();
});
window.addEventListener('keyup', (e) => keys.delete(e.code));

canvas.addEventListener('click', () => {
  if (document.pointerLockElement !== canvas) {
    canvas.requestPointerLock();
  }
  if (audioMod && audioMod.initAudio) {
    try { audioMod.initAudio(); } catch (e) {}
  }
});

document.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement === canvas) {
    mouseDX += e.movementX;
  }
});

let mouseFireHeld = false;
window.addEventListener('mousedown', (e) => {
  if (e.button === 0) mouseFireHeld = true;
});
window.addEventListener('mouseup', (e) => {
  if (e.button === 0) mouseFireHeld = false;
});

// ---------------------------------------------------------------------------
// Touch controls (mobile): left stick move, right-half drag to turn,
// FIRE + weapon-cycle buttons.
// ---------------------------------------------------------------------------
const touchState = { moveX: 0, moveY: 0, turn: 0, fire: false };
(function setupTouch() {
  const isTouch = 'ontouchstart' in window;
  const touchControls = document.getElementById('touch-controls');
  if (!isTouch || !touchControls) return;
  touchControls.style.display = 'block';

  const stick = document.getElementById('touch-stick');
  const fireBtn = document.getElementById('touch-fire');
  const cycleBtn = document.getElementById('touch-weapon-cycle');

  let stickTouchId = null;
  let stickOrigin = { x: 0, y: 0 };

  stick.addEventListener('touchstart', (e) => {
    const t = e.changedTouches[0];
    stickTouchId = t.identifier;
    const r = stick.getBoundingClientRect();
    stickOrigin = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  window.addEventListener('touchmove', (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === stickTouchId) {
        const dx = t.clientX - stickOrigin.x;
        const dy = t.clientY - stickOrigin.y;
        const len = Math.hypot(dx, dy) || 1;
        const clamped = Math.min(1, len / 50);
        touchState.moveX = (dx / len) * clamped;
        touchState.moveY = (dy / len) * clamped;
      } else if (t.clientX > window.innerWidth / 2) {
        // right-half drag to turn: use movement delta since last frame
        const last = turnTouches.get(t.identifier);
        if (last != null) touchState.turn += (t.clientX - last) * 0.005;
        turnTouches.set(t.identifier, t.clientX);
      }
    }
  }, { passive: true });
  const turnTouches = new Map();
  window.addEventListener('touchend', (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === stickTouchId) {
        stickTouchId = null;
        touchState.moveX = 0;
        touchState.moveY = 0;
      }
      turnTouches.delete(t.identifier);
    }
  });
  fireBtn.addEventListener('touchstart', (e) => { e.preventDefault(); touchState.fire = true; });
  fireBtn.addEventListener('touchend', (e) => { e.preventDefault(); touchState.fire = false; });
  cycleBtn.addEventListener('touchstart', (e) => { e.preventDefault(); cycleEdge = true; });
})();

const MOUSE_SENS = 0.0022;
const TURN_SPEED = 2.4; // rad/sec keyboard fallback

function gatherInput(dt) {
  let turn = 0;
  if (mouseDX !== 0) {
    turn += mouseDX * MOUSE_SENS;
    mouseDX = 0;
  }
  if (keys.has('ArrowLeft')) turn -= TURN_SPEED * dt;
  if (keys.has('ArrowRight')) turn += TURN_SPEED * dt;
  turn += touchState.turn;
  touchState.turn = 0;

  let forward = 0, strafe = 0;
  if (keys.has('KeyW')) forward += 1;
  if (keys.has('KeyS')) forward -= 1;
  if (keys.has('KeyD')) strafe += 1;
  if (keys.has('KeyA')) strafe -= 1;
  forward += -touchState.moveY;
  strafe += touchState.moveX;
  forward = Math.max(-1, Math.min(1, forward));
  strafe = Math.max(-1, Math.min(1, strafe));

  const fire = keys.has('Space') || mouseFireHeld || touchState.fire;

  const input = {
    forward, strafe, turn,
    fire,
    use: useEdge,
    weaponSwitch: weaponKeyPressed,
    cycleWeapon: cycleEdge,
  };
  useEdge = false;
  cycleEdge = false;
  weaponKeyPressed = null;
  return input;
}

// ---------------------------------------------------------------------------
// Build sprite draw list each frame: entities/pickups/projectiles/corpses
// ---------------------------------------------------------------------------
function buildSpriteList() {
  const list = [];

  // Enemies (idle/roam/chase/attack/pain/dead all draw; dormant hidden)
  for (const e of game.enemies) {
    if (e.state === 'dormant') continue;
    const stats = e.maxHp; // unused, keep lint quiet
    let stateName = 'idle';
    if (e.state === 'dead') {
      stateName = e.corpse ? 'corpse' : 'die';
    } else if (e.state === 'roam') {
      stateName = 'walk';
    } else if (e.state === 'chase') {
      stateName = 'walk';
    } else if (e.state === 'attack') {
      stateName = 'attack';
    } else if (e.state === 'pain') {
      stateName = 'pain';
    } else {
      stateName = 'idle';
    }
    const frames = enemyFrameSlice(e.type, stateName);
    if (!frames || !frames.length) continue;

    let frame;
    if (stateName === 'die') {
      frame = Math.min(frames.length - 1, Math.floor(e.dieAnimT * frames.length));
    } else {
      frame = Math.floor(e.animTimer * 4) % frames.length;
    }

    list.push({
      x: e.x, y: e.y,
      textureFrames: frames.map((canvasObj) => snapshotCache(canvasObj)),
      frame,
      scale: e.type === 'plastingo' ? 1.5 : 1,
      fullBright: false,
    });
  }

  // Pickups (gentle 1px bob)
  for (const p of game.pickups) {
    if (!p.alive) continue;
    const frames = assets.sprites[p.type];
    if (!frames) continue;
    list.push({
      x: p.x, y: p.y,
      textureFrames: frames,
      frame: Math.floor(performance.now() / 400) % frames.length,
      scale: 0.7,
      fullBright: true,
    });
  }

  // Projectiles (eggs)
  for (const proj of game.projectiles) {
    if (proj.type !== 'egg') continue;
    const frames = assets.sprites.eggLobber;
    if (!frames) continue;
    list.push({
      x: proj.x, y: proj.y,
      textureFrames: frames,
      frame: 0,
      scale: 0.4 + Math.max(0, proj.z) * 0.05,
      fullBright: true,
    });
  }

  return list;
}

// The enemy sprite canvases from art.mjs `_states` are raw <canvas> objects
// (not snapshot()'d Uint32 wrappers) so we snapshot lazily and cache.
const _snapshotCache = new WeakMap();
function snapshotCache(canvasObj) {
  if (_snapshotCache.has(canvasObj)) return _snapshotCache.get(canvasObj);
  const ctx = canvasObj.getContext('2d');
  const size = canvasObj.width;
  const imgData = ctx.getImageData(0, 0, size, canvasObj.height);
  const data = new Uint32Array(imgData.data.buffer.slice(0));
  const snap = { data, size, width: canvasObj.width, height: canvasObj.height };
  _snapshotCache.set(canvasObj, snap);
  return snap;
}

// ---------------------------------------------------------------------------
// HUD drawing (framebuffer-space, DOOM-style status bar ~40px)
// ---------------------------------------------------------------------------
const HUD_H = 40;
const COLOR_HOTPINK = hexColor('#ff5e9c');
const COLOR_SALTWHITE = hexColor('#e8e2d2');
const COLOR_NIGHTPURPLE = hexColor('#241631');
const COLOR_CAUSTIC = hexColor('#a32c1e');

const WEAPON_NAMES = {
  peck: 'PECK',
  squawkCannon: 'SQUAWK CANNON',
  featherStorm: 'FEATHER STORM',
  eggLobber: 'EGG LOBBER',
};
const WEAPON_AMMO_KEY = {
  peck: null,
  squawkCannon: 'breath',
  featherStorm: 'feathers',
  eggLobber: 'eggs',
};

function fillRectFb(x0, y0, w, h, color) {
  for (let y = y0; y < y0 + h; y++) {
    if (y < 0 || y >= fb.height) continue;
    const rowOff = y * fb.width;
    for (let x = x0; x < x0 + w; x++) {
      if (x < 0 || x >= fb.width) continue;
      fb.buf32[rowOff + x] = color;
    }
  }
}

function drawSprite32(snap, dx, dy) {
  const size = snap.size || snap.width;
  for (let y = 0; y < size; y++) {
    const py = dy + y;
    if (py < 0 || py >= fb.height) continue;
    for (let x = 0; x < size; x++) {
      const px_ = dx + x;
      if (px_ < 0 || px_ >= fb.width) continue;
      const c = snap.data[y * size + x];
      const a = (c >>> 24) & 0xff;
      if (a === 0) continue;
      fb.buf32[py * fb.width + px_] = c;
    }
  }
}

function pinkLevelOf(player) {
  return Math.max(0, Math.min(1, player.pink / player.maxPink));
}

function mugshotTierIndex(pinkLevel) {
  // 7 tiers, index 0 = full pink(1.0) .. index 6 = gray(0.0)
  const t = Math.round((1 - pinkLevel) * 6);
  return Math.max(0, Math.min(6, t));
}

function pickMugshotFrame(player) {
  const tierIdx = mugshotTierIndex(pinkLevelOf(player));
  const tierFrames = assets.hud.mugshot[tierIdx]; // [idle, blink, lookLeft, lookRight, angry, ouch]
  if (player.mugState === 'ouch' && player.mugTimer > 0) return tierFrames[5];
  if (player.mugState === 'angry' && player.mugTimer > 0) return tierFrames[4];
  if (player.mugBlink) return tierFrames[1];
  if (player.mugLook === -1) return tierFrames[2];
  if (player.mugLook === 1) return tierFrames[3];
  return tierFrames[0];
}

function drawHud() {
  const y0 = fb.height - HUD_H;
  fillRectFb(0, y0, fb.width, HUD_H, COLOR_NIGHTPURPLE);
  fillRectFb(0, y0, fb.width, 2, COLOR_HOTPINK);

  const { player } = game;

  // PINK % — left, big
  const pinkPct = Math.round(player.pink);
  drawText(fb, `PINK ${pinkPct}%`, 4, y0 + 6, '#ff5e9c', 2);

  // weapon name + ammo — below pink on the left
  const ammoKey = WEAPON_AMMO_KEY[player.weapon];
  const ammoStr = ammoKey ? `${player.ammo[ammoKey]}` : 'INF';
  drawText(fb, WEAPON_NAMES[player.weapon], 4, y0 + 24, '#e8e2d2', 1);
  drawText(fb, `AMMO ${ammoStr}`, 4, y0 + 32, '#e8e2d2', 1);

  // center mugshot
  const mug = pickMugshotFrame(player);
  drawSprite32(mug, fb.width / 2 - 24, y0 + 4);

  // right: BREATH bar + kills counter
  drawText(fb, `BREATH`, fb.width - 90, y0 + 4, '#cdb9b4', 1);
  const breathPct = player.ammo.breath / 50;
  fillRectFb(fb.width - 90, y0 + 12, 80, 6, COLOR_NIGHTPURPLE);
  fillRectFb(fb.width - 90, y0 + 12, Math.round(80 * breathPct), 6, COLOR_HOTPINK);
  drawText(fb, `KILLS ${player.kills}/${player.killsTotal}`, fb.width - 90, y0 + 24, '#e8e2d2', 1);

  // level name top-left, 3s fade — gated to actual gameplay so it doesn't
  // render (faintly, through the semi-transparent title overlay) before the
  // player has even started, since levelNameTimer starts at 3 the instant
  // createGame() runs at boot, well before startGame() is ever called.
  if (gameStarted && game.levelNameTimer > 0) {
    const alpha = Math.min(1, game.levelNameTimer);
    if (alpha > 0.05) {
      drawText(fb, game.levelName, 6, 6, '#ff5e9c', 1);
    }
  }
}

function drawCrosshair() {
  const cx = (fb.width / 2) | 0, cy = ((fb.height - HUD_H) / 2) | 0;
  fb.setPixel(cx, cy, COLOR_SALTWHITE);
  fb.setPixel(cx - 1, cy, COLOR_SALTWHITE);
  fb.setPixel(cx + 1, cy, COLOR_SALTWHITE);
  fb.setPixel(cx, cy - 1, COLOR_SALTWHITE);
  fb.setPixel(cx, cy + 1, COLOR_SALTWHITE);
}

function drawScreenFlash() {
  const { player } = game;
  if (player.damageFlash > 0) {
    overlayTint(0xff0000, player.damageFlash * 0.35);
  }
  if (player.pickupFlash > 0) {
    overlayTint(0xff5e9c, player.pickupFlash * 0.3);
  }
}

function overlayTint(rgb, alpha) {
  const r = (rgb >> 16) & 0xff, g = (rgb >> 8) & 0xff, b = rgb & 0xff;
  const h = fb.height - HUD_H;
  for (let y = 0; y < h; y++) {
    const rowOff = y * fb.width;
    for (let x = 0; x < fb.width; x++) {
      const idx = rowOff + x;
      const c = fb.buf32[idx];
      const cr = c & 0xff, cg = (c >> 8) & 0xff, cb = (c >> 16) & 0xff;
      const nr = (cr * (1 - alpha) + r * alpha) | 0;
      const ng = (cg * (1 - alpha) + g * alpha) | 0;
      const nb = (cb * (1 - alpha) + b * alpha) | 0;
      fb.buf32[idx] = (255 << 24) | (nb << 16) | (ng << 8) | nr;
    }
  }
}

function drawWeaponViewmodel() {
  const { player } = game;
  const weapon = assets.weapons[player.weapon];
  if (!weapon) return;
  let canvasSnap = weapon.idle;
  if (player.fireTimer > 0 && weapon.fire && weapon.fire.length) {
    const t = 1 - (player.fireTimer / (player.fireTimer + 0.001));
    canvasSnap = weapon.fire[0];
  }
  const pinkLevel = pinkLevelOf(player);
  const tierIdx = mugshotTierIndex(pinkLevel);
  canvasSnap = tintedTierSnap(canvasSnap, tierIdx, pinkLevel);
  const bobY = Math.sin(player.viewmodelBob) * 3;
  const switchOffset = player.switching ? Math.sin(Math.min(1, 1 - Math.abs(player.switchTimer / 0.3 - 0.5) * 2) * Math.PI) * 60 : 0;
  const dx = (fb.width - canvasSnap.size ? fb.width / 2 - (canvasSnap.width || 160) / 2 : 0);
  const w = canvasSnap.width || 160, hgt = canvasSnap.height || 100;
  const drawX = (fb.width / 2 - w / 2) | 0;
  const drawY = (fb.height - HUD_H - hgt + bobY + switchOffset) | 0;
  drawSpriteRect(canvasSnap, drawX, drawY, w, hgt);
}

function drawSpriteRect(snap, dx, dy, w, h) {
  for (let y = 0; y < h; y++) {
    const py = dy + y;
    if (py < 0 || py >= fb.height) continue;
    for (let x = 0; x < w; x++) {
      const px_ = dx + x;
      if (px_ < 0 || px_ >= fb.width) continue;
      const c = snap.data[y * w + x];
      const a = (c >>> 24) & 0xff;
      if (a === 0) continue;
      fb.buf32[py * fb.width + px_] = c;
    }
  }
}

function drawTracers() {
  // pink tracer lines drawn for one frame (FEATHER STORM), projected into
  // screen space via a cheap approximation using the same camera transform.
  const { player } = game;
  const dirX = Math.cos(player.angle), dirY = Math.sin(player.angle);
  const planeLen = Math.tan((Math.PI / 3) / 2);
  const planeX = -dirY * planeLen, planeY = dirX * planeLen;
  const invDet = 1.0 / (planeX * dirY - dirX * planeY);
  const w = fb.width, horizon = (fb.height - HUD_H) / 2;

  function project(x, y) {
    const sx = x - player.x, sy = y - player.y;
    const transformX = invDet * (dirY * sx - dirX * sy);
    const transformY = invDet * (-planeY * sx + planeX * sy);
    if (transformY <= 0.05) return null;
    const screenX = (w / 2) * (1 + transformX / transformY);
    return { x: screenX, y: horizon, depth: transformY };
  }

  for (const t of game.tracers) {
    const p0 = project(t.x0, t.y0);
    const p1 = project(t.x1, t.y1);
    if (!p0 || !p1) continue;
    const steps = 20;
    for (let i = 0; i <= steps; i++) {
      const px_ = Math.round(p0.x + (p1.x - p0.x) * (i / steps));
      const py_ = Math.round(horizon);
      if (px_ >= 0 && px_ < fb.width && py_ >= 0 && py_ < fb.height - HUD_H) {
        fb.setPixel(px_, py_, COLOR_HOTPINK);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Menu overlay (title / pause / how-to-play / death / win)
// ---------------------------------------------------------------------------
const menuOverlay = document.getElementById('menu-overlay');
const menuContent = document.getElementById('menu-content');
let gameStarted = false;
let paused = false;
let musicOn = true;
let currentMenu = 'title'; // title | howto | pause | dead | win

function toggleMusic() {
  musicOn = !musicOn;
  if (audioMod && audioMod.music) { try { audioMod.music(musicOn); } catch (e) {} }
  // re-render whichever menu is showing so the ON/OFF label updates
  if (menuOverlay.style.display === 'flex') renderCurrentMenu();
}

function logoDataUrl() {
  // assets.logo is a snapshot wrapper ({canvas, data, ...}) built by art.mjs;
  // pull the underlying canvas out and convert to a data URL so we can drop
  // it into the DOM overlay without re-implementing canvas layout in CSS.
  try {
    const c = assets.logo.canvas || assets.logo;
    return c.toDataURL();
  } catch (e) { return ''; }
}

function menuButton(label) {
  return `<div class="menu-btn" style="margin:6px 0; padding:6px 14px; border:2px solid #ff5e9c; display:inline-block; cursor:pointer;">${label}</div>`;
}

function showTitleMenu() {
  currentMenu = 'title';
  menuOverlay.style.display = 'flex';
  const logo = logoDataUrl();
  menuContent.innerHTML = `
    <div style="text-align:center;">
      ${logo ? `<img src="${logo}" style="image-rendering:pixelated; width:280px; margin-bottom:12px;">` : `<div style="font-size:28px; font-weight:bold; margin-bottom:16px;">DOOMINGO</div>`}
      <div style="font-size:10px; letter-spacing:2px; margin-bottom:18px;">"THEY DRAINED THE LAGOON. WRONG BIRD."</div>
      <div id="btn-start">${menuButton('START')}</div>
      <div id="btn-howto">${menuButton('HOW TO PLAY')}</div>
      <div id="btn-music">${menuButton('MUSIC: ' + (musicOn ? 'ON' : 'OFF'))}</div>
      <div style="font-size:10px; opacity:0.7; margin-top:14px;">PRESS ANY KEY TO START</div>
    </div>`;
  document.getElementById('btn-start').onclick = () => startGame();
  document.getElementById('btn-howto').onclick = (e) => { e.stopPropagation(); showHowToPlay(); };
  document.getElementById('btn-music').onclick = (e) => { e.stopPropagation(); toggleMusic(); };
}

function showHowToPlay() {
  currentMenu = 'howto';
  menuOverlay.style.display = 'flex';
  menuContent.innerHTML = `
    <div style="text-align:center; max-width:480px; font-size:11px; line-height:1.7;">
      <div style="font-size:18px; margin-bottom:12px;">HOW TO PLAY</div>
      WASD move &middot; MOUSE look &middot; SPACE / CLICK fire<br/>
      1-4 or Q weapon &middot; E use &middot; M music &middot; ESC pause<br/><br/>
      PECK (melee) &middot; SQUAWK CANNON (breath) &middot; FEATHER STORM (feathers) &middot; EGG LOBBER (eggs)<br/><br/>
      PINK is your health &mdash; shrimp restore it. Don't go gray.<br/><br/>
      ${menuButton('BACK')}
    </div>`;
  menuContent.querySelector('.menu-btn').onclick = () => showTitleMenu();
}

function hideMenu() {
  menuOverlay.style.display = 'none';
}

function startGame() {
  gameStarted = true;
  hideMenu();
  if (audioMod && audioMod.initAudio) { try { audioMod.initAudio(); } catch (e) {} }
  if (audioMod && audioMod.music) { try { audioMod.music(musicOn); } catch (e) {} }
  if (canvas.requestPointerLock) canvas.requestPointerLock();
}

function showPauseMenu() {
  currentMenu = 'pause';
  paused = true;
  menuOverlay.style.display = 'flex';
  menuContent.innerHTML = `
    <div style="text-align:center;">
      <div style="font-size:20px; margin-bottom:16px;">PAUSED</div>
      <div id="btn-resume">${menuButton('RESUME')}</div>
      <div id="btn-restart">${menuButton('RESTART')}</div>
      <div id="btn-music">${menuButton('MUSIC: ' + (musicOn ? 'ON' : 'OFF'))}</div>
    </div>`;
  document.getElementById('btn-resume').onclick = () => resumeGame();
  document.getElementById('btn-restart').onclick = () => { restartRequested = true; resumeGame(); };
  document.getElementById('btn-music').onclick = (e) => { e.stopPropagation(); toggleMusic(); };
}

function resumeGame() {
  paused = false;
  hideMenu();
  if (canvas.requestPointerLock) canvas.requestPointerLock();
}

function togglePause() {
  if (paused) resumeGame(); else showPauseMenu();
}

function renderCurrentMenu() {
  if (currentMenu === 'title') showTitleMenu();
  else if (currentMenu === 'howto') showHowToPlay();
  else if (currentMenu === 'pause') showPauseMenu();
  else if (currentMenu === 'dead') showDeathScreen();
  else if (currentMenu === 'win') showWinScreen(game.stats);
}

// Auto-pause when pointer unlocks mid-game (Esc or focus loss), per DESIGN.md.
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement !== canvas && gameStarted && game.player.state === 'ALIVE' && !paused) {
    showPauseMenu();
  }
});

function showDeathScreen() {
  currentMenu = 'dead';
  menuOverlay.style.display = 'flex';
  menuContent.innerHTML = `
    <div style="text-align:center;">
      <div style="font-size:22px; color:#a32c1e; margin-bottom:12px;">YOU'VE GONE GRAY.</div>
      <div style="font-size:12px;">PRESS R TO RESTART</div>
    </div>`;
}

function showWinScreen(stats) {
  currentMenu = 'win';
  menuOverlay.style.display = 'flex';
  const mins = Math.floor(stats.timeSec / 60);
  const secs = Math.floor(stats.timeSec % 60);
  menuContent.innerHTML = `
    <div style="text-align:center;">
      <div style="font-size:20px; margin-bottom:12px;">THE LAGOON REMEMBERS.</div>
      <div style="font-size:12px; line-height:1.8;">
        KILLS: ${stats.killPct}%<br/>
        ITEMS: ${stats.itemPct}%<br/>
        TIME: ${mins}:${secs.toString().padStart(2, '0')}
      </div>
      <div style="font-size:12px; margin-top:16px;">PRESS R TO RESTART</div>
    </div>`;
}

showTitleMenu();

// ---------------------------------------------------------------------------
// Fixed-timestep update / rAF render loop
// ---------------------------------------------------------------------------
const FIXED_DT = 1 / 60;
let lastTime = performance.now();
let accumulator = 0;

let frameCount = 0;
let fpsAccum = 0;
let fpsDisplay = 0;

function drawDebugText(text, x, y) {
  const ctx = fb.ctx;
  ctx.font = '8px monospace';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#000000';
  ctx.fillText(text, x + 1, y + 1);
  ctx.fillStyle = '#ff5e9c';
  ctx.fillText(text, x, y);
}

function restartGame() {
  const fresh = createGame(assets);
  fresh.sfx = game.sfx;
  Object.assign(game, fresh);
  hideMenu();
}

function frame(now) {
  const delta = Math.min(0.25, (now - lastTime) / 1000);
  lastTime = now;
  accumulator += delta;

  if (restartRequested) {
    restartRequested = false;
    restartGame();
  }

  if (gameStarted && game.player.state === 'ALIVE') {
    while (accumulator >= FIXED_DT) {
      const input = gatherInput(FIXED_DT);
      update(game, input, FIXED_DT);
      accumulator -= FIXED_DT;
    }
  } else {
    accumulator = 0;
    // still drain edge-triggers so they don't pile up
    useEdge = false; cycleEdge = false; weaponKeyPressed = null;
  }

  if (game.player.state === 'DEAD' && menuOverlay.style.display !== 'flex') {
    showDeathScreen();
  } else if (game.player.state === 'WIN' && menuOverlay.style.display !== 'flex') {
    showWinScreen(game.stats);
  }

  state.x = game.player.x;
  state.y = game.player.y;
  state.angle = game.player.angle;
  state.sprites = buildSpriteList();

  render(state, assets, fb);
  drawWeaponViewmodel();
  drawTracers();
  drawScreenFlash();
  drawCrosshair();
  drawHud();
  fb.present();

  fpsAccum += delta;
  frameCount++;
  if (fpsAccum >= 0.5) {
    fpsDisplay = Math.round(frameCount / fpsAccum);
    frameCount = 0;
    fpsAccum = 0;
  }

  if (showFPS) {
    drawDebugText(`FPS ${fpsDisplay}`, 4, 4);
    drawDebugText(`X ${state.x.toFixed(2)} Y ${state.y.toFixed(2)}`, 4, 14);
  }

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
