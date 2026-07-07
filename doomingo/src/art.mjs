// src/art.mjs — ALL procedural pixel art, drawn once at load
// Exports (contract): buildAssets() -> {
//   textures: {id: canvas64}, sprites: {id: frames[]}, hud: {mugshot: [7 states][frames]},
//   logo: canvas, weapons: {id: {idle, fire[]}}
// }
// Stage 2 = REAL procedural pixel art. Shape/API matches stage 1 exactly.
//
// WING-TINT APPROACH (documented per DESIGN.md requirement):
// We export `tintWing(canvas, pinkLevel)` which takes a canvas whose wing
// pixels were drawn using a reserved "tint key" color (see TINT_KEY below)
// and remaps that key color to a lerp between hot pink (pinkLevel=1) and
// pale gray (pinkLevel=0), operating on raw pixel data (getImageData once).
// This lets main.mjs / game.mjs re-tint a weapon viewmodel canvas live as
// PINK drops, without re-drawing vector shapes every frame. Any canvas
// produced by drawWing() below is tint-ready.

const PALETTE = {
  hotPink: '#ff5e9c',
  salmon: '#ff8e72',
  paleGrayPink: '#cdb9b4',
  causticRed: '#a32c1e',
  algaeBright: '#e04524',
  saltWhite: '#e8e2d2',
  brineDeep: '#5a1420',
  nightPurple: '#241631',
  horizonEmber: '#c96a3a',
  plasticPink: '#ff9ec4',
  bone: '#d9cfb8',
  gatorGreen: '#4a5d3a',
};

// Reserved marker color painted onto "wing" regions of weapon viewmodels so
// tintWing() can find-and-replace them cheaply (never used for anything else).
const TINT_KEY = { r: 255, g: 0, b: 254 };

function hexToRgb(hex) {
  const v = parseInt(hex.slice(1), 16);
  return { r: (v >> 16) & 0xff, g: (v >> 8) & 0xff, b: v & 0xff };
}

function lerp(a, b, t) { return a + (b - a) * t; }

// Returns {r,g,b} numeric channels lerped between two hex colors.
function lerpRgb(hexA, hexB, t) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  return {
    r: Math.round(lerp(a.r, b.r, t)),
    g: Math.round(lerp(a.g, b.g, t)),
    b: Math.round(lerp(a.b, b.b, t)),
  };
}

function lerpHex(hexA, hexB, t) {
  const { r, g, b } = lerpRgb(hexA, hexB, t);
  return `rgb(${r},${g},${b})`;
}

// Exported per DESIGN.md contract note: bake/apply pink-level tint to a wing.
// pinkLevel: 1 = hot pink (full health), 0 = pale gray (near death).
export function tintWing(canvas, pinkLevel) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const target = lerpRgb(PALETTE.paleGrayPink, PALETTE.hotPink, pinkLevel);
  for (let i = 0; i < d.length; i += 4) {
    if (d[i] === TINT_KEY.r && d[i + 1] === TINT_KEY.g && d[i + 2] === TINT_KEY.b) {
      d[i] = target.r; d[i + 1] = target.g; d[i + 2] = target.b;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

// ---------------------------------------------------------------------------
// 5x7 bitmap font (A-Z 0-9 % / . : ! -)
// ---------------------------------------------------------------------------
const FONT_5x7 = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
  D: ['11100', '10010', '10001', '10001', '10001', '10010', '11100'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01111', '10000', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
  J: ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10101', '10011', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '10101', '01010'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  '0': ['01110', '10011', '10101', '10101', '10101', '11001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  '%': ['11001', '11010', '00100', '01000', '10011', '00011', '00011'],
  '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  ':': ['00000', '01100', '01100', '00000', '01100', '01100', '00000'],
  '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
};

// Exported bitmap-font renderer: drawText(fb-or-ctx, text, x, y, color, scale)
// Accepts either a CanvasRenderingContext2D, or a framebuffer-like object
// exposing setPixel(x,y,packedColor) + a hexColor helper is not assumed here,
// so when given an fb we fall back to fillStyle-less direct pixel writes via
// a supplied ctx (most callers pass a 2d ctx). To stay engine-agnostic we
// detect duck-typed shape: has getContext => canvas; has setPixel => fb-like.
export function drawText(target, text, x, y, color, scale = 1) {
  const isFb = typeof target.setPixel === 'function';
  let ctx = null;
  if (!isFb) {
    ctx = target.getContext ? target.getContext('2d') : target; // already a ctx
    ctx.fillStyle = color;
  }
  let cx = x;
  for (const ch of String(text).toUpperCase()) {
    const glyph = FONT_5x7[ch] || FONT_5x7[' '];
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 5; col++) {
        if (glyph[row][col] === '1') {
          const px = cx + col * scale;
          const py = y + row * scale;
          if (isFb) {
            for (let sy = 0; sy < scale; sy++) {
              for (let sx = 0; sx < scale; sx++) {
                target.setPixel(px + sx, py + sy, color);
              }
            }
          } else {
            ctx.fillRect(px, py, scale, scale);
          }
        }
      }
    }
    cx += (5 * scale) + scale;
  }
  return cx;
}

// ---------------------------------------------------------------------------
// Canvas / sampling helpers
// ---------------------------------------------------------------------------
function snapshot(canvas) {
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  const imgData = ctx.getImageData(0, 0, size, canvas.height);
  const data = new Uint32Array(imgData.data.buffer.slice(0));
  return { data, size, canvas, width: canvas.width, height: canvas.height };
}

function makeCanvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

// deterministic pseudo-random (mulberry32) so textures are stable across loads
function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function px(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x | 0, y | 0, w, h);
}

function outlineRect(ctx, x, y, w, h, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

// dithering helper: 2x2 ordered dither between two colors over a region
function ditherRect(ctx, x0, y0, w, h, colorA, colorB, density) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const bayer = ((x & 1) ^ (y & 1)) ? 0.75 : 0.25;
      ctx.fillStyle = bayer < density ? colorB : colorA;
      ctx.fillRect(x0 + x, y0 + y, 1, 1);
    }
  }
}

// ---------------------------------------------------------------------------
// Wall texture builders (64x64), ids 1-8 + door(9)
// ---------------------------------------------------------------------------

function texSaltCrust() {
  const c = makeCanvas(64);
  const ctx = c.getContext('2d');
  const rng = makeRng(101);
  px(ctx, 0, 0, 64, 64, PALETTE.bone);
  // mottled base dithering
  for (let y = 0; y < 64; y += 2) {
    for (let x = 0; x < 64; x += 2) {
      if (rng() < 0.18) px(ctx, x, y, 2, 2, PALETTE.saltWhite);
    }
  }
  // crack network: jagged dark lines with 1px highlight edge
  ctx.strokeStyle = PALETTE.brineDeep;
  ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    let cx = rng() * 64, cy = 0;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    while (cy < 64) {
      cx += (rng() - 0.5) * 14;
      cy += rng() * 12 + 4;
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }
  outlineRect(ctx, 0, 0, 64, 64, PALETTE.brineDeep);
  return c;
}

function texSaltBrick() {
  const c = makeCanvas(64);
  const ctx = c.getContext('2d');
  px(ctx, 0, 0, 64, 64, PALETTE.saltWhite);
  const rng = makeRng(102);
  const rowH = 16;
  for (let ry = 0, y = 0; y < 64; y += rowH, ry++) {
    const offset = ry % 2 === 0 ? 0 : 8;
    for (let x = -8; x < 64; x += 16) {
      const bx = x + offset;
      const shadeHex = rng() < 0.5 ? PALETTE.saltWhite : PALETTE.bone;
      px(ctx, bx + 1, y + 1, 14, rowH - 2, shadeHex);
    }
  }
  // mortar grid lines
  ctx.strokeStyle = PALETTE.paleGrayPink;
  ctx.lineWidth = 2;
  for (let y = 0; y <= 64; y += rowH) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(64, y); ctx.stroke();
  }
  for (let ry = 0, y = 0; y < 64; y += rowH, ry++) {
    const offset = ry % 2 === 0 ? 0 : 8;
    for (let x = offset; x <= 64; x += 16) {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + rowH); ctx.stroke();
    }
  }
  outlineRect(ctx, 0, 0, 64, 64, PALETTE.brineDeep);
  return c;
}

function texRedAlgaeRock() {
  const c = makeCanvas(64);
  const ctx = c.getContext('2d');
  const rng = makeRng(103);
  px(ctx, 0, 0, 64, 64, PALETTE.causticRed);
  ditherRect(ctx, 0, 0, 64, 64, PALETTE.causticRed, PALETTE.brineDeep, 0.15);
  for (let i = 0; i < 70; i++) {
    const x = (rng() * 64) | 0, y = (rng() * 64) | 0;
    const s = rng() < 0.5 ? 2 : 3;
    px(ctx, x, y, s, s, rng() < 0.5 ? PALETTE.algaeBright : PALETTE.horizonEmber);
  }
  outlineRect(ctx, 0, 0, 64, 64, PALETTE.brineDeep);
  return c;
}

function texPlasticPinkRuin() {
  const c = makeCanvas(64);
  const ctx = c.getContext('2d');
  px(ctx, 0, 0, 64, 64, PALETTE.plasticPink);
  const rng = makeRng(104);
  for (let y = 0; y < 64; y += 16) {
    outlineRect(ctx, 0, y, 64, 16, PALETTE.hotPink);
  }
  // chipped-paint flecks
  for (let i = 0; i < 20; i++) {
    const x = (rng() * 60) | 0, y = (rng() * 60) | 0;
    px(ctx, x, y, 3, 2, PALETTE.saltWhite);
  }
  outlineRect(ctx, 0, 0, 64, 64, PALETTE.nightPurple);
  return c;
}

function texRustedSheetMetal() {
  const c = makeCanvas(64);
  const ctx = c.getContext('2d');
  const base = '#6b6a55';
  px(ctx, 0, 0, 64, 64, base);
  const rng = makeRng(105);
  for (let x = 0; x < 64; x += 8) {
    ctx.strokeStyle = '#4c4b3d';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 64); ctx.stroke();
    ctx.strokeStyle = '#86846a';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x + 2, 0); ctx.lineTo(x + 2, 64); ctx.stroke();
  }
  // rust bleed
  for (let i = 0; i < 30; i++) {
    const x = (rng() * 60) | 0, y = (rng() * 60) | 0;
    px(ctx, x, y, 3, rng() * 8 + 3 | 0, PALETTE.causticRed);
  }
  outlineRect(ctx, 0, 0, 64, 64, '#2c2b22');
  return c;
}

function texBonePile() {
  const c = makeCanvas(64);
  const ctx = c.getContext('2d');
  px(ctx, 0, 0, 64, 64, PALETTE.bone);
  const rng = makeRng(106);
  ctx.fillStyle = PALETTE.saltWhite;
  for (let i = 0; i < 16; i++) {
    const x = rng() * 56, y = rng() * 56;
    ctx.save();
    ctx.translate(x + 4, y + 2);
    ctx.rotate((rng() - 0.5) * 1.2);
    ctx.fillRect(-6, -1.5, 12, 3);
    ctx.fillRect(-6, -3, 3, 6);
    ctx.fillRect(3, -3, 3, 6);
    ctx.restore();
  }
  ditherRect(ctx, 0, 0, 64, 64, PALETTE.bone, PALETTE.paleGrayPink, 0.06);
  outlineRect(ctx, 0, 0, 64, 64, '#8f8570');
  return c;
}

function texBrineWaterfallFrame(frameIdx) {
  const c = makeCanvas(64);
  const ctx = c.getContext('2d');
  px(ctx, 0, 0, 64, 64, PALETTE.brineDeep);
  const rng = makeRng(107);
  // vertical streaks, emissive-looking (bright algae/ember on dark)
  for (let col = 0; col < 64; col += 4) {
    const phase = (col + frameIdx * 8) % 16;
    for (let y = 0; y < 64; y += 8) {
      const yy = (y + phase) % 64;
      const c1 = rng() < 0.5 ? PALETTE.algaeBright : PALETTE.horizonEmber;
      px(ctx, col, yy, 3, 5, c1);
      px(ctx, col + 1, yy + 1, 1, 3, PALETTE.saltWhite);
    }
  }
  ditherRect(ctx, 0, 0, 64, 64, PALETTE.brineDeep, '#3a0d18', 0.2);
  // redraw streaks on top so dither doesn't erase the emissive look
  for (let col = 0; col < 64; col += 4) {
    const phase = (col + frameIdx * 8) % 16;
    for (let y = 0; y < 64; y += 8) {
      const yy = (y + phase) % 64;
      px(ctx, col, yy, 3, 5, rng() < 0.5 ? PALETTE.algaeBright : PALETTE.horizonEmber);
    }
  }
  outlineRect(ctx, 0, 0, 64, 64, PALETTE.brineDeep);
  return c;
}

function texExitSwitch() {
  const c = makeCanvas(64);
  const ctx = c.getContext('2d');
  px(ctx, 0, 0, 64, 64, PALETTE.saltWhite);
  ditherRect(ctx, 0, 0, 64, 64, PALETTE.saltWhite, PALETTE.bone, 0.1);
  // frame
  outlineRect(ctx, 4, 4, 56, 56, PALETTE.brineDeep);
  px(ctx, 8, 8, 48, 48, PALETTE.nightPurple);
  // lever housing
  px(ctx, 26, 12, 12, 40, '#181025');
  outlineRect(ctx, 26, 12, 12, 40, PALETTE.saltWhite);
  // big lever (diagonal, hot pink handle)
  ctx.strokeStyle = PALETTE.hotPink;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(32, 46);
  ctx.lineTo(40, 20);
  ctx.stroke();
  px(ctx, 36, 16, 8, 8, PALETTE.hotPink);
  outlineRect(ctx, 36, 16, 8, 8, PALETTE.saltWhite);
  // EXIT text
  drawText(ctx, 'EXIT', 14, 52, PALETTE.hotPink, 1);
  outlineRect(ctx, 0, 0, 64, 64, PALETTE.brineDeep);
  return c;
}

function texDoor() {
  const c = makeCanvas(64);
  const ctx = c.getContext('2d');
  const base = '#6b6a55';
  px(ctx, 0, 0, 64, 64, base);
  // corrugation
  for (let y = 0; y < 64; y += 6) {
    ctx.strokeStyle = '#828069';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(64, y); ctx.stroke();
    ctx.strokeStyle = '#4c4b3d';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, y + 3); ctx.lineTo(64, y + 3); ctx.stroke();
  }
  // pink hazard chevrons band across middle
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 26, 64, 12);
  ctx.clip();
  px(ctx, 0, 26, 64, 12, PALETTE.nightPurple);
  for (let x = -12; x < 64; x += 12) {
    ctx.fillStyle = PALETTE.hotPink;
    ctx.beginPath();
    ctx.moveTo(x, 26);
    ctx.lineTo(x + 6, 26);
    ctx.lineTo(x + 12, 38);
    ctx.lineTo(x + 6, 38);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  outlineRect(ctx, 0, 0, 64, 64, '#2c2b22');
  return c;
}

// ---------------------------------------------------------------------------
// Shared sprite-drawing primitives
// ---------------------------------------------------------------------------

function newSpriteCanvas(size) {
  const c = makeCanvas(size);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  return { c, ctx };
}

function ovalPx(ctx, cx, cy, rx, ry, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function strokeShape(ctx, color, width = 1) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// Lawn Flamingo (zombieman analog) — 64x64. Frames: idle2, walk4, attack2,
// pain1, die4, corpse1
// ---------------------------------------------------------------------------
function drawLawnFlamingoBase(ctx, opts = {}) {
  const { legOffset = 0, wobble = 0, pinkTint = PALETTE.plasticPink, deadEyes = true,
    beakOpen = false, chipped = false, collapse = 0 } = opts;
  const cx = 32, bodyY = 26 + collapse * 14;
  ctx.save();
  ctx.translate(0, collapse * 14);
  ctx.rotate(collapse * 0.35);
  // metal spike leg
  ctx.strokeStyle = '#8f8f90';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx + legOffset, bodyY + 14);
  ctx.lineTo(cx + legOffset * 1.6, 60);
  ctx.stroke();
  px(ctx, cx + legOffset * 1.6 - 3, 58, 6, 3, '#5a5a5b'); // spike foot
  // body oval
  ovalPx(ctx, cx + wobble, bodyY, 12, 16, pinkTint);
  strokeShape(ctx, PALETTE.nightPurple, 1.2);
  // chipped paint marks
  if (chipped) {
    ctx.fillStyle = PALETTE.saltWhite;
    px(ctx, cx - 6, bodyY - 4, 3, 3, PALETTE.saltWhite);
    px(ctx, cx + 4, bodyY + 6, 4, 2, PALETTE.saltWhite);
  }
  // neck + head
  const neckX = cx + wobble + 6, neckTopY = bodyY - 18;
  ctx.strokeStyle = pinkTint;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(cx + wobble + 2, bodyY - 10);
  ctx.quadraticCurveTo(neckX + 4, bodyY - 22, neckX, neckTopY);
  ctx.stroke();
  ovalPx(ctx, neckX, neckTopY - 4, 6, 6, pinkTint);
  strokeShape(ctx, PALETTE.nightPurple, 1);
  // beak
  ctx.fillStyle = beakOpen ? PALETTE.horizonEmber : '#2b2b2b';
  ctx.beginPath();
  ctx.moveTo(neckX + 5, neckTopY - 6);
  ctx.lineTo(neckX + (beakOpen ? 16 : 14), neckTopY - (beakOpen ? 2 : 4));
  ctx.lineTo(neckX + 5, neckTopY - 2);
  ctx.closePath();
  ctx.fill();
  // dead eye
  px(ctx, neckX + 2, neckTopY - 6, deadEyes ? 2 : 2, 2, deadEyes ? '#000000' : PALETTE.nightPurple);
  ctx.restore();
}

function buildLawnFlamingoFrames() {
  const frames = { idle: [], walk: [], attack: [], pain: [], die: [], corpse: [] };
  for (let i = 0; i < 2; i++) {
    const { c, ctx } = newSpriteCanvas(64);
    drawLawnFlamingoBase(ctx, { wobble: i === 0 ? -1 : 1 });
    frames.idle.push(c);
  }
  for (let i = 0; i < 4; i++) {
    const { c, ctx } = newSpriteCanvas(64);
    drawLawnFlamingoBase(ctx, { legOffset: (i % 2 === 0 ? -3 : 3), wobble: (i % 2 === 0 ? -2 : 2) });
    frames.walk.push(c);
  }
  for (let i = 0; i < 2; i++) {
    const { c, ctx } = newSpriteCanvas(64);
    drawLawnFlamingoBase(ctx, { beakOpen: true, wobble: i === 0 ? 2 : -1 });
    frames.attack.push(c);
  }
  {
    const { c, ctx } = newSpriteCanvas(64);
    drawLawnFlamingoBase(ctx, { chipped: true, wobble: -3 });
    frames.pain.push(c);
  }
  for (let i = 0; i < 4; i++) {
    const { c, ctx } = newSpriteCanvas(64);
    drawLawnFlamingoBase(ctx, { chipped: true, collapse: i / 3 });
    frames.die.push(c);
  }
  {
    const { c, ctx } = newSpriteCanvas(64);
    drawLawnFlamingoBase(ctx, { chipped: true, collapse: 1 });
    frames.corpse.push(c);
  }
  return frames;
}

// ---------------------------------------------------------------------------
// Crab Demon (imp analog) — caustic red, bubbling mouth, scuttles sideways
// ---------------------------------------------------------------------------
function drawCrabDemonBase(ctx, opts = {}) {
  const { legPhase = 0, pinch = false, bubble = 0, pain = false, collapse = 0 } = opts;
  ctx.save();
  ctx.translate(32, 32 + collapse * 10);
  ctx.scale(1, 1 - collapse * 0.4);
  const bodyColor = pain ? PALETTE.horizonEmber : PALETTE.causticRed;
  ovalPx(ctx, 0, 0, 16, 11, bodyColor);
  strokeShape(ctx, '#3a0d08', 1.2);
  ditherLocal(ctx, -16, -11, 32, 22, bodyColor, PALETTE.algaeBright, 0.12);
  // eyes on stalks
  for (const side of [-1, 1]) {
    ctx.strokeStyle = bodyColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(side * 6, -8);
    ctx.lineTo(side * 9, -16);
    ctx.stroke();
    ovalPx(ctx, side * 9, -17, 3, 3, '#f4e94a');
  }
  // bubbling mouth
  ctx.fillStyle = PALETTE.algaeBright;
  ovalPx(ctx, 0, 4, 6, 4, PALETTE.algaeBright);
  for (let i = 0; i < 3; i++) {
    const bp = (bubble + i * 0.33) % 1;
    ovalPx(ctx, -4 + i * 4, 4 - bp * 6, 1.5, 1.5, PALETTE.saltWhite);
  }
  // legs, alternating scuttle phase
  ctx.strokeStyle = bodyColor;
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    const legY = -4 + i * 5;
    const phase = ((i + legPhase) % 2 === 0) ? 4 : -2;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * 14, legY);
      ctx.lineTo(side * (20 + phase), legY + 6);
      ctx.stroke();
    }
  }
  // pincers
  ctx.fillStyle = bodyColor;
  const pinchOpen = pinch ? 6 : 2;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * 16, 2);
    ctx.lineTo(side * (22), -pinchOpen);
    ctx.lineTo(side * (22), pinchOpen);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function ditherLocal(ctx, x0, y0, w, h, colorA, colorB, density) {
  for (let y = 0; y < h; y += 2) {
    for (let x = 0; x < w; x += 2) {
      if (((x + y) & 3) === 0 && Math.random() < density * 2) {
        ctx.fillStyle = colorB;
        ctx.fillRect(x0 + x, y0 + y, 2, 2);
      }
    }
  }
}

function buildCrabDemonFrames() {
  const frames = { idle: [], walk: [], attack: [], pain: [], die: [], corpse: [] };
  for (let i = 0; i < 2; i++) {
    const { c, ctx } = newSpriteCanvas(64);
    drawCrabDemonBase(ctx, { bubble: i * 0.5, legPhase: i });
    frames.idle.push(c);
  }
  for (let i = 0; i < 4; i++) {
    const { c, ctx } = newSpriteCanvas(64);
    drawCrabDemonBase(ctx, { legPhase: i, bubble: i * 0.25 });
    frames.walk.push(c);
  }
  for (let i = 0; i < 2; i++) {
    const { c, ctx } = newSpriteCanvas(64);
    drawCrabDemonBase(ctx, { pinch: true, legPhase: i });
    frames.attack.push(c);
  }
  {
    const { c, ctx } = newSpriteCanvas(64);
    drawCrabDemonBase(ctx, { pain: true });
    frames.pain.push(c);
  }
  for (let i = 0; i < 3; i++) {
    const { c, ctx } = newSpriteCanvas(64);
    drawCrabDemonBase(ctx, { collapse: i / 2, pain: true });
    frames.die.push(c);
  }
  {
    const { c, ctx } = newSpriteCanvas(64);
    drawCrabDemonBase(ctx, { collapse: 1 });
    frames.corpse.push(c);
  }
  return frames;
}

// ---------------------------------------------------------------------------
// Brine Gator (pinky analog) — gator green, salt-crusted back ridge
// ---------------------------------------------------------------------------
function drawBrineGatorBase(ctx, opts = {}) {
  const { walkPhase = 0, biteOpen = false, pain = false, collapse = 0 } = opts;
  ctx.save();
  ctx.translate(32, 34 + collapse * 8);
  ctx.rotate(collapse * 0.3);
  const bodyColor = pain ? '#7a8a5f' : PALETTE.gatorGreen;
  // long body
  ovalPx(ctx, 0, 0, 22, 10, bodyColor);
  strokeShape(ctx, '#28331f', 1.2);
  // salt-crusted back ridge
  ctx.fillStyle = PALETTE.bone;
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 5, -8);
    ctx.lineTo(i * 5 + 2, -13);
    ctx.lineTo(i * 5 + 4, -8);
    ctx.closePath();
    ctx.fill();
  }
  // snout + jaw
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.moveTo(18, -3);
  ctx.lineTo(30, biteOpen ? -8 : -2);
  ctx.lineTo(30, biteOpen ? 4 : 0);
  ctx.lineTo(18, 4);
  ctx.closePath();
  ctx.fill();
  strokeShape(ctx, '#28331f', 1);
  if (biteOpen) {
    ctx.strokeStyle = '#f4ece0';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(20 + i * 3, -6);
      ctx.lineTo(20 + i * 3, -3);
      ctx.stroke();
    }
  }
  ovalPx(ctx, 12, -5, 2, 2, '#f4e94a');
  // legs
  ctx.strokeStyle = bodyColor;
  ctx.lineWidth = 3;
  for (const side of [-1, 1]) {
    const phase = (side === 1 ? walkPhase : 1 - walkPhase);
    ctx.beginPath();
    ctx.moveTo(-8, 8);
    ctx.lineTo(-8 + phase * 6 - 3, 16);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(8, 8);
    ctx.lineTo(8 - phase * 6 + 3, 16);
    ctx.stroke();
  }
  ctx.restore();
}

function buildBrineGatorFrames() {
  const frames = { idle: [], walk: [], attack: [], pain: [], die: [], corpse: [] };
  for (let i = 0; i < 2; i++) {
    const { c, ctx } = newSpriteCanvas(64);
    drawBrineGatorBase(ctx, { walkPhase: i });
    frames.idle.push(c);
  }
  for (let i = 0; i < 4; i++) {
    const { c, ctx } = newSpriteCanvas(64);
    drawBrineGatorBase(ctx, { walkPhase: (i % 2) });
    frames.walk.push(c);
  }
  for (let i = 0; i < 2; i++) {
    const { c, ctx } = newSpriteCanvas(64);
    drawBrineGatorBase(ctx, { biteOpen: true, walkPhase: i });
    frames.attack.push(c);
  }
  {
    const { c, ctx } = newSpriteCanvas(64);
    drawBrineGatorBase(ctx, { pain: true });
    frames.pain.push(c);
  }
  for (let i = 0; i < 4; i++) {
    const { c, ctx } = newSpriteCanvas(64);
    drawBrineGatorBase(ctx, { collapse: i / 3, pain: true });
    frames.die.push(c);
  }
  {
    const { c, ctx } = newSpriteCanvas(64);
    drawBrineGatorBase(ctx, { collapse: 1 });
    frames.corpse.push(c);
  }
  return frames;
}

// ---------------------------------------------------------------------------
// Ash Vulture (lost soul analog) — gray-black, ember eyes, hovering wings
// ---------------------------------------------------------------------------
function drawAshVultureBase(ctx, opts = {}) {
  const { wingPhase = 0, diving = false, pain = false, collapse = 0 } = opts;
  ctx.save();
  ctx.translate(32, 30 + collapse * 16);
  ctx.rotate(diving ? 0.4 : collapse * 0.5);
  const bodyColor = pain ? '#5a5a5a' : '#2c2c2c';
  ovalPx(ctx, 0, 0, 9, 12, bodyColor);
  strokeShape(ctx, '#101010', 1);
  // head + beak
  ovalPx(ctx, 0, -12, 5, 5, bodyColor);
  ctx.fillStyle = PALETTE.horizonEmber;
  ctx.beginPath();
  ctx.moveTo(3, -13);
  ctx.lineTo(10, -12);
  ctx.lineTo(3, -10);
  ctx.closePath();
  ctx.fill();
  // ember eyes
  ovalPx(ctx, 1, -13, 1.5, 1.5, '#ff6a2c');
  // wings, phase controls spread
  const spread = 14 + wingPhase * 10;
  for (const side of [-1, 1]) {
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.moveTo(side * 4, -2);
    ctx.lineTo(side * spread, -6 - wingPhase * 6);
    ctx.lineTo(side * (spread - 4), 6);
    ctx.closePath();
    ctx.fill();
    strokeShape(ctx, '#101010', 1);
    // feather notches
    ctx.strokeStyle = '#101010';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(side * (10 + i * 4), -2 + i * 2);
      ctx.lineTo(side * (spread - 2), -2 + i * 3);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function buildAshVultureFrames() {
  const frames = { idle: [], walk: [], attack: [], pain: [], die: [], corpse: [] };
  for (let i = 0; i < 2; i++) {
    const { c, ctx } = newSpriteCanvas(64);
    drawAshVultureBase(ctx, { wingPhase: i });
    frames.idle.push(c);
  }
  for (let i = 0; i < 4; i++) {
    const { c, ctx } = newSpriteCanvas(64);
    drawAshVultureBase(ctx, { wingPhase: i % 2 });
    frames.walk.push(c);
  }
  for (let i = 0; i < 2; i++) {
    const { c, ctx } = newSpriteCanvas(64);
    drawAshVultureBase(ctx, { diving: true, wingPhase: i });
    frames.attack.push(c);
  }
  {
    const { c, ctx } = newSpriteCanvas(64);
    drawAshVultureBase(ctx, { pain: true });
    frames.pain.push(c);
  }
  for (let i = 0; i < 3; i++) {
    const { c, ctx } = newSpriteCanvas(64);
    drawAshVultureBase(ctx, { collapse: i / 2, pain: true });
    frames.die.push(c);
  }
  {
    const { c, ctx } = newSpriteCanvas(64);
    drawAshVultureBase(ctx, { collapse: 1 });
    frames.corpse.push(c);
  }
  return frames;
}

// ---------------------------------------------------------------------------
// PLASTINGO (mini-boss) — 2.5x lawn flamingo, 96x96, cracked shell, one eye glows
// ---------------------------------------------------------------------------
function drawPlastingoBase(ctx, opts = {}) {
  const { legOffset = 0, wobble = 0, beakOpen = false, pain = false, collapse = 0 } = opts;
  const scale = 2.5;
  ctx.save();
  ctx.translate(48, 48 - 32 * scale + 32 * scale); // keep origin consistent
  ctx.translate(0, collapse * 20);
  ctx.scale(scale, scale);
  ctx.rotate(collapse * 0.3);
  const cx = 0, bodyY = 0;
  // spike leg
  ctx.strokeStyle = '#8f8f90';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx + legOffset, bodyY + 12);
  ctx.lineTo(cx + legOffset * 1.5, 30);
  ctx.stroke();
  px(ctx, cx + legOffset * 1.5 - 3, 28, 6, 3, '#5a5a5b');
  // body — cracked shell look
  const bodyColor = pain ? PALETTE.horizonEmber : PALETTE.plasticPink;
  ovalPx(ctx, cx + wobble, bodyY, 13, 17, bodyColor);
  strokeShape(ctx, PALETTE.nightPurple, 1.4);
  ctx.strokeStyle = '#7a1030';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(cx - 6, bodyY - 8); ctx.lineTo(cx + 2, bodyY); ctx.lineTo(cx - 2, bodyY + 10);
  ctx.moveTo(cx + 4, bodyY - 6); ctx.lineTo(cx + 8, bodyY + 4);
  ctx.stroke();
  // neck + head
  const neckX = cx + wobble + 6, neckTopY = bodyY - 19;
  ctx.strokeStyle = bodyColor;
  ctx.lineWidth = 5.5;
  ctx.beginPath();
  ctx.moveTo(cx + wobble + 2, bodyY - 11);
  ctx.quadraticCurveTo(neckX + 5, bodyY - 23, neckX, neckTopY);
  ctx.stroke();
  ovalPx(ctx, neckX, neckTopY - 4, 7, 7, bodyColor);
  strokeShape(ctx, PALETTE.nightPurple, 1);
  // beak
  ctx.fillStyle = beakOpen ? PALETTE.horizonEmber : '#2b2b2b';
  ctx.beginPath();
  ctx.moveTo(neckX + 6, neckTopY - 6);
  ctx.lineTo(neckX + (beakOpen ? 18 : 15), neckTopY - (beakOpen ? 2 : 4));
  ctx.lineTo(neckX + 6, neckTopY - 2);
  ctx.closePath();
  ctx.fill();
  // one glowing eye, one dead eye
  px(ctx, neckX + 2, neckTopY - 6, 2, 2, '#000000');
  ctx.save();
  ctx.shadowColor = '#7cffea';
  ctx.shadowBlur = 4;
  px(ctx, neckX - 2, neckTopY - 7, 2, 2, '#7cffea');
  ctx.restore();
  ctx.restore();
}

function buildPlastingoFrames() {
  const size = 96;
  const frames = { idle: [], walk: [], attack: [], pain: [], die: [], corpse: [] };
  const mk = () => newSpriteCanvas(size);
  for (let i = 0; i < 2; i++) {
    const { c, ctx } = mk();
    drawPlastingoBase(ctx, { wobble: i === 0 ? -1 : 1 });
    frames.idle.push(c);
  }
  for (let i = 0; i < 4; i++) {
    const { c, ctx } = mk();
    drawPlastingoBase(ctx, { legOffset: (i % 2 === 0 ? -3 : 3), wobble: (i % 2 === 0 ? -2 : 2) });
    frames.walk.push(c);
  }
  for (let i = 0; i < 2; i++) {
    const { c, ctx } = mk();
    drawPlastingoBase(ctx, { beakOpen: true, wobble: i === 0 ? 2 : -1 });
    frames.attack.push(c);
  }
  {
    const { c, ctx } = mk();
    drawPlastingoBase(ctx, { pain: true, wobble: -3 });
    frames.pain.push(c);
  }
  for (let i = 0; i < 4; i++) {
    const { c, ctx } = mk();
    drawPlastingoBase(ctx, { pain: true, collapse: i / 3 });
    frames.die.push(c);
  }
  {
    const { c, ctx } = mk();
    drawPlastingoBase(ctx, { collapse: 1 });
    frames.corpse.push(c);
  }
  return frames;
}

// ---------------------------------------------------------------------------
// Pickups (32x32), gentle bob handled by renderer, not here
// ---------------------------------------------------------------------------
function drawShrimpBase(ctx, opts = {}) {
  const { golden = false, sparkle = 0 } = opts;
  ctx.save();
  ctx.translate(16, 16);
  ctx.rotate(-0.3);
  const color = golden ? '#e8c84a' : PALETTE.salmon;
  // curled body: series of overlapping ovals along an arc
  for (let i = 0; i < 5; i++) {
    const t = i / 4;
    const ang = t * 2.2 - 1.1;
    const r = 9;
    const x = Math.sin(ang) * r, y = -Math.cos(ang) * r + r;
    ovalPx(ctx, x, y, 3.4 - t, 2.4 - t * 0.5, color);
  }
  strokeShape(ctx, '#8a3d2c', 0.8);
  // tail fan
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-6, 6);
  ctx.lineTo(-10, 3);
  ctx.lineTo(-10, 9);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  if (golden && sparkle) {
    ctx.fillStyle = '#fff6c8';
    const positions = [[6, 4], [22, 10], [14, 22]];
    const [sx, sy] = positions[sparkle % positions.length];
    ctx.beginPath();
    ctx.moveTo(sx, sy - 3); ctx.lineTo(sx + 1, sy); ctx.lineTo(sx + 3, sy + 1);
    ctx.lineTo(sx + 1, sy + 1); ctx.lineTo(sx, sy + 4); ctx.lineTo(sx - 1, sy + 1);
    ctx.lineTo(sx - 3, sy + 1); ctx.lineTo(sx - 1, sy);
    ctx.closePath();
    ctx.fill();
  }
}

function buildShrimpFrames(golden) {
  if (!golden) {
    const { c, ctx } = newSpriteCanvas(32);
    drawShrimpBase(ctx, {});
    return [c];
  }
  const out = [];
  for (let i = 0; i < 2; i++) {
    const { c, ctx } = newSpriteCanvas(32);
    drawShrimpBase(ctx, { golden: true, sparkle: i + 1 });
    out.push(c);
  }
  return out;
}

function drawFeatherBundleBase(ctx) {
  ctx.save();
  ctx.translate(16, 16);
  for (let i = -1; i <= 1; i++) {
    ctx.save();
    ctx.rotate(i * 0.4);
    ctx.fillStyle = i === 0 ? PALETTE.hotPink : PALETTE.plasticPink;
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.quadraticCurveTo(-4, 0, 0, -12);
    ctx.quadraticCurveTo(4, 0, 0, 10);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = PALETTE.nightPurple;
    ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.moveTo(0, 8); ctx.lineTo(0, -10); ctx.stroke();
    ctx.restore();
  }
  // binding
  px(ctx, -6, 6, 12, 3, PALETTE.saltWhite);
  ctx.restore();
}

function drawEggCartonBase(ctx) {
  ctx.save();
  ctx.translate(3, 8);
  px(ctx, 0, 0, 26, 16, PALETTE.saltWhite);
  ctx.strokeStyle = PALETTE.paleGrayPink;
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, 25, 15);
  for (let i = 0; i < 3; i++) {
    ovalPx(ctx, 5 + i * 8, 8, 3.4, 4, PALETTE.bone);
    ctx.strokeStyle = PALETTE.paleGrayPink;
    ctx.beginPath();
    ctx.ellipse(5 + i * 8, 8, 3.4, 4, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPreenOilBase(ctx) {
  ctx.save();
  ctx.translate(16, 16);
  // bottle
  px(ctx, -5, -4, 10, 16, '#7fd8c9');
  strokeShape(ctx, '#3a8a7a', 1);
  px(ctx, -2, -10, 4, 6, '#c9c9c9');
  strokeShape(ctx, '#8a8a8a', 0.8);
  // label
  px(ctx, -4, 0, 8, 5, PALETTE.saltWhite);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Weapon viewmodels (~160x100, bottom-center). Wing regions painted with
// TINT_KEY so tintWing() can re-tint them per current PINK level.
// ---------------------------------------------------------------------------
function wingShape(ctx, cx, cy, mirror = 1, spread = 0) {
  ctx.fillStyle = `rgb(${TINT_KEY.r},${TINT_KEY.g},${TINT_KEY.b})`;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + mirror * (60 + spread * 20), cy - 30 - spread * 10);
  ctx.lineTo(cx + mirror * (70 + spread * 20), cy + 10);
  ctx.lineTo(cx + mirror * 20, cy + 30);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = PALETTE.nightPurple;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // feather lines
  ctx.strokeStyle = PALETTE.nightPurple;
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(cx + mirror * (10 + i * 12), cy);
    ctx.lineTo(cx + mirror * (55 + i * 5 + spread * 15), cy - 10 - i * 5 - spread * 8);
    ctx.stroke();
  }
}

function buildPeckFrames() {
  const W = 160, H = 100;
  function frame(jab) {
    const c = makeCanvas(W, H);
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    // beak rising from bottom center
    const tipY = H - 70 - jab * 30;
    ctx.fillStyle = '#2b2b2b';
    ctx.beginPath();
    ctx.moveTo(W / 2 - 14, H);
    ctx.lineTo(W / 2 + 14, H);
    ctx.lineTo(W / 2 + 6, tipY + 20);
    ctx.lineTo(W / 2, tipY);
    ctx.lineTo(W / 2 - 6, tipY + 20);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = PALETTE.nightPurple;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // upper mandible highlight
    ctx.fillStyle = jab ? PALETTE.horizonEmber : '#3a3a3a';
    ctx.beginPath();
    ctx.moveTo(W / 2, tipY);
    ctx.lineTo(W / 2 + 4, tipY + 14);
    ctx.lineTo(W / 2 - 4, tipY + 14);
    ctx.closePath();
    ctx.fill();
    return c;
  }
  return { idle: frame(0), fire: [frame(1), frame(0.5)] };
}

function buildSquawkCannonFrames() {
  const W = 160, H = 100;
  function frame(ringPhase) {
    const c = makeCanvas(W, H);
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    wingShape(ctx, 20, H - 8, 1, 0.2);
    wingShape(ctx, W - 20, H - 8, -1, 0.2);
    // open beak, center
    const cx = W / 2, cy = H - 55;
    ctx.fillStyle = ringPhase > 0 ? PALETTE.horizonEmber : '#2b2b2b';
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy + 30);
    ctx.lineTo(cx + 10, cy + 30);
    ctx.lineTo(cx + 4, cy - (ringPhase > 0 ? 10 : 2));
    ctx.lineTo(cx - 4, cy - (ringPhase > 0 ? 10 : 2));
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = PALETTE.nightPurple;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // soundwave rings when firing
    if (ringPhase > 0) {
      ctx.strokeStyle = PALETTE.hotPink;
      for (let i = 0; i < 3; i++) {
        ctx.globalAlpha = 1 - i * 0.3;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy - 12, 10 + i * 8 * ringPhase, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    return c;
  }
  return { idle: frame(0), fire: [frame(1), frame(0.6)] };
}

function buildFeatherStormFrames() {
  const W = 160, H = 100;
  function frame(fanSpread, flash) {
    const c = makeCanvas(W, H);
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    wingShape(ctx, W / 2, H - 4, 1, fanSpread);
    // loose feathers flying off
    if (fanSpread > 0.3) {
      ctx.fillStyle = PALETTE.plasticPink;
      for (let i = 0; i < 3; i++) {
        const fx = W / 2 + 50 + i * 14, fy = H - 40 - i * 10;
        ctx.beginPath();
        ctx.ellipse(fx, fy, 5, 2, -0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (flash) {
      ctx.fillStyle = 'rgba(255,94,156,0.85)';
      ctx.beginPath();
      ctx.arc(W / 2 + 60, H - 50, 14, 0, Math.PI * 2);
      ctx.fill();
    }
    return c;
  }
  return { idle: frame(0, false), fire: [frame(0.7, true), frame(0.4, false)] };
}

function buildEggLobberFrames() {
  const W = 160, H = 100;
  function frame(lobT) {
    const c = makeCanvas(W, H);
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    wingShape(ctx, W / 2 + 20, H - 4, 1, 0.1);
    // egg held, arcing up as lobT increases
    const ex = W / 2 + 10 - lobT * 20, ey = H - 40 - lobT * 30;
    ovalPx(ctx, ex, ey, 8, 10, PALETTE.saltWhite);
    ctx.strokeStyle = PALETTE.paleGrayPink;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(ex, ey, 8, 10, 0, 0, Math.PI * 2);
    ctx.stroke();
    px(ctx, ex - 2, ey - 3, 2, 1, PALETTE.bone);
    return c;
  }
  return { idle: frame(0), fire: [frame(0.5), frame(1)] };
}

// ---------------------------------------------------------------------------
// HUD mugshot — 7 damage tiers hot-pink -> pale gray. Frames per tier:
// idle, blink, look-left, look-right, angry-squint, ouch.
// This is the soul of the HUD: long beak, one raised brow feather.
// ---------------------------------------------------------------------------
function drawMugshotBase(ctx, opts = {}) {
  const { pinkLevel = 1, eyeState = 'open', lookDir = 0, angry = false, ouch = false, ruffle = 0 } = opts;
  const skinColor = lerpHex(PALETTE.paleGrayPink, PALETTE.hotPink, pinkLevel);
  const size = 48;
  ctx.save();
  ctx.translate(size / 2, size / 2 + 2);
  // head
  ovalPx(ctx, 0, 0, 15, 14, skinColor);
  strokeShape(ctx, PALETTE.nightPurple, 1.2);
  // ruffled/bruised feathers around edge as damage rises
  if (ruffle > 0) {
    ctx.strokeStyle = PALETTE.nightPurple;
    ctx.lineWidth = 1;
    const rng = makeRng(200 + Math.round(ruffle * 10));
    for (let i = 0; i < ruffle * 8; i++) {
      const ang = rng() * Math.PI * 2;
      const r1 = 13, r2 = 17 + rng() * 3;
      ctx.beginPath();
      ctx.moveTo(Math.cos(ang) * r1, Math.sin(ang) * r1);
      ctx.lineTo(Math.cos(ang) * r2, Math.sin(ang) * r2);
      ctx.stroke();
    }
    if (ruffle > 0.5) {
      ctx.fillStyle = '#6a4a48';
      ovalPx(ctx, -6, 5, 2.4, 1.6, '#6a4a48');
      ovalPx(ctx, 7, -2, 2, 1.4, '#6a4a48');
    }
  }
  // raised brow feather (one, characterful)
  ctx.strokeStyle = PALETTE.nightPurple;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  const browLift = angry ? -4 : 0;
  ctx.moveTo(-2, -10 + browLift);
  ctx.lineTo(2, -15 + browLift);
  ctx.stroke();
  // eyes
  const eyeDX = lookDir * 2;
  const eyeY = -2;
  if (eyeState === 'blink' || ouch) {
    ctx.strokeStyle = PALETTE.nightPurple;
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-8 + eyeDX, eyeY); ctx.lineTo(-4 + eyeDX, eyeY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(4 + eyeDX, eyeY); ctx.lineTo(8 + eyeDX, eyeY); ctx.stroke();
  } else if (angry) {
    // squint: angled lines
    ctx.strokeStyle = PALETTE.nightPurple;
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-9, eyeY + 1); ctx.lineTo(-3, eyeY - 1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(3, eyeY - 1); ctx.lineTo(9, eyeY + 1); ctx.stroke();
  } else {
    ovalPx(ctx, -6 + eyeDX, eyeY, 2, 2.4, PALETTE.nightPurple);
    ovalPx(ctx, 6 + eyeDX, eyeY, 2, 2.4, PALETTE.nightPurple);
  }
  if (ouch) {
    // furrowed brow + tears/wince marks
    ctx.strokeStyle = PALETTE.causticRed;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-9, -8); ctx.lineTo(-3, -6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(9, -8); ctx.lineTo(3, -6); ctx.stroke();
  }
  // long beak, slight downward curve, offset by lookDir
  ctx.fillStyle = angry ? PALETTE.horizonEmber : '#2b2b2b';
  ctx.beginPath();
  ctx.moveTo(6 + eyeDX, 4);
  ctx.quadraticCurveTo(20 + eyeDX * 1.5, 6, 24 + eyeDX * 1.5, 10);
  ctx.lineTo(18 + eyeDX * 1.5, 12);
  ctx.quadraticCurveTo(14 + eyeDX, 9, 6 + eyeDX, 8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = PALETTE.nightPurple;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

function buildMugshotTier(pinkLevel) {
  const ruffle = 1 - pinkLevel;
  const mk = (opts) => {
    const { c, ctx } = newSpriteCanvas(48);
    drawMugshotBase(ctx, { pinkLevel, ruffle, ...opts });
    return c;
  };
  return {
    idle: mk({ eyeState: 'open' }),
    blink: mk({ eyeState: 'blink' }),
    lookLeft: mk({ lookDir: -1 }),
    lookRight: mk({ lookDir: 1 }),
    angry: mk({ angry: true }),
    ouch: mk({ ouch: true }),
  };
}

// ---------------------------------------------------------------------------
// Logo — chunky extruded pixel letters "DOOMINGO" hot pink on transparent,
// flamingo silhouette standing one-legged on the second O.
// ---------------------------------------------------------------------------
function buildLogo() {
  const W = 320, H = 90;
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, W, H);
  const text = 'DOOMINGO';
  const scale = 5;
  const glyphW = 5 * scale, glyphSpace = scale;
  const totalW = text.length * (glyphW + glyphSpace) - glyphSpace;
  const startX = (W - totalW) / 2;
  const startY = 16;
  const extrude = 5;

  // extrusion shadow (night purple), drawn offset first
  for (let d = extrude; d >= 1; d--) {
    drawText(ctx, text, startX + d, startY + d, PALETTE.nightPurple, scale);
  }
  // face
  drawText(ctx, text, startX, startY, PALETTE.hotPink, scale);
  // top highlight sliver
  ctx.globalAlpha = 0.35;
  drawText(ctx, text, startX, startY - 1, '#ffffff', scale);
  ctx.globalAlpha = 1;
  drawText(ctx, text, startX, startY, PALETTE.hotPink, scale);

  // find x-position of second 'O' (D-O-O-M-I-N-G-O -> indices 1 and 2 are O's,
  // "second O" = index 2)
  const secondOIndex = 2;
  const oX = startX + secondOIndex * (glyphW + glyphSpace) + glyphW / 2;
  const oY = startY + 7 * scale; // bottom of glyph row

  // flamingo silhouette, one-legged, standing on second O
  ctx.fillStyle = PALETTE.nightPurple;
  ctx.save();
  ctx.translate(oX, oY);
  // leg
  ctx.fillRect(-1, -14, 2, 14);
  // body
  ctx.beginPath();
  ctx.ellipse(0, -20, 6, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  // neck + head (S curve)
  ctx.strokeStyle = PALETTE.nightPurple;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(2, -26);
  ctx.quadraticCurveTo(8, -34, 4, -40);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(4, -41, 3, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  // beak
  ctx.beginPath();
  ctx.moveTo(6, -42);
  ctx.lineTo(13, -40);
  ctx.lineTo(6, -39);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  return c;
}

// ---------------------------------------------------------------------------
// buildAssets() — CONTRACT SHAPE
// ---------------------------------------------------------------------------
export function buildAssets() {
  const textureCanvases = {
    1: texSaltCrust(),
    2: texSaltBrick(),
    3: texRedAlgaeRock(),
    4: texPlasticPinkRuin(),
    5: texRustedSheetMetal(),
    6: texBonePile(),
    7: texBrineWaterfallFrame(0),
    8: texExitSwitch(),
    9: texDoor(),
  };
  const waterfallFrame2 = texBrineWaterfallFrame(1);

  const textures = {};
  for (const id of Object.keys(textureCanvases)) {
    textures[id] = snapshot(textureCanvases[id]);
  }
  textures['7b'] = snapshot(waterfallFrame2);

  // Enemy sprite sets: flatten each enemy's {idle,walk,attack,pain,die,corpse}
  // canvases into a single ordered frames[] array per DESIGN.md sprite shape
  // (sprites: {id: frames[]}); order preserved so game.mjs can slice by state.
  function flattenEnemy(setObj) {
    return [
      ...setObj.idle, ...setObj.walk, ...setObj.attack,
      ...setObj.pain, ...setObj.die, ...setObj.corpse,
    ].map(snapshot);
  }

  const lawnFlamingoSet = buildLawnFlamingoFrames();
  const crabDemonSet = buildCrabDemonFrames();
  const brineGatorSet = buildBrineGatorFrames();
  const ashVultureSet = buildAshVultureFrames();
  const plastingoSet = buildPlastingoFrames();

  const goldenShrimpFrames = buildShrimpFrames(true);
  const shrimpFrames = buildShrimpFrames(false);

  const featherBundleCanvas = (() => { const { c, ctx } = newSpriteCanvas(32); drawFeatherBundleBase(ctx); return c; })();
  const eggCartonCanvas = (() => { const { c, ctx } = newSpriteCanvas(32); drawEggCartonBase(ctx); return c; })();
  const preenOilCanvas = (() => { const { c, ctx } = newSpriteCanvas(32); drawPreenOilBase(ctx); return c; })();
  const eggLobberPickupCanvas = (() => {
    const { c, ctx } = newSpriteCanvas(32);
    ctx.translate(16, 16);
    ovalPx(ctx, 0, 0, 8, 10, PALETTE.saltWhite);
    ctx.strokeStyle = PALETTE.paleGrayPink;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(0, 0, 8, 10, 0, 0, Math.PI * 2); ctx.stroke();
    return c;
  })();

  const sprites = {
    lawnFlamingo: flattenEnemy(lawnFlamingoSet),
    crabDemon: flattenEnemy(crabDemonSet),
    brineGator: flattenEnemy(brineGatorSet),
    ashVulture: flattenEnemy(ashVultureSet),
    plastingo: flattenEnemy(plastingoSet),
    shrimp: shrimpFrames.map(snapshot),
    goldenShrimp: goldenShrimpFrames.map(snapshot),
    featherBundle: [snapshot(featherBundleCanvas)],
    eggCarton: [snapshot(eggCartonCanvas)],
    eggLobber: [snapshot(eggLobberPickupCanvas)],
    preenOil: [snapshot(preenOilCanvas)],
  };

  // Also expose per-state frame slices for consumers that want them (non-
  // breaking addition — does not change the top-level contract shape).
  sprites._states = {
    lawnFlamingo: lawnFlamingoSet,
    crabDemon: crabDemonSet,
    brineGator: brineGatorSet,
    ashVulture: ashVultureSet,
    plastingo: plastingoSet,
  };

  const hud = {
    mugshot: [1, 0.85, 0.7, 0.55, 0.4, 0.2, 0].map((pinkLevel) => {
      const tier = buildMugshotTier(pinkLevel);
      return [tier.idle, tier.blink, tier.lookLeft, tier.lookRight, tier.angry, tier.ouch].map(snapshot);
    }),
  };

  const logo = snapshot(buildLogo());

  const peck = buildPeckFrames();
  const squawkCannon = buildSquawkCannonFrames();
  const featherStorm = buildFeatherStormFrames();
  const eggLobber = buildEggLobberFrames();

  const weapons = {
    peck: { idle: snapshot(peck.idle), fire: peck.fire.map(snapshot) },
    squawkCannon: { idle: snapshot(squawkCannon.idle), fire: squawkCannon.fire.map(snapshot) },
    featherStorm: { idle: snapshot(featherStorm.idle), fire: featherStorm.fire.map(snapshot) },
    eggLobber: { idle: snapshot(eggLobber.idle), fire: eggLobber.fire.map(snapshot) },
  };

  return { textures, sprites, hud, logo, weapons };
}
