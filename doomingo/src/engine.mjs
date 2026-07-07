// src/engine.mjs — raycaster render + framebuffer + camera math
// Exports (contract): render(state, assets, fb), castRay(...), Framebuffer

export const FB_W = 320;
export const FB_H = 200;

const FOV = Math.PI / 3; // 60deg
const MAX_DEPTH = 24;

// ---------------------------------------------------------------------------
// Framebuffer: 320x200 backed by a Uint32 typed array view over ImageData.
// putImageData is called ONCE per frame from the caller (main.mjs).
// ---------------------------------------------------------------------------
export class Framebuffer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.ctx.imageSmoothingEnabled = false;
    this.width = FB_W;
    this.height = FB_H;
    this.imageData = this.ctx.createImageData(FB_W, FB_H);
    // Uint32 view: one write per pixel instead of 4 byte writes.
    this.buf32 = new Uint32Array(this.imageData.data.buffer);
    // per-column depth buffer exposed for sprite pass
    this.zBuffer = new Float64Array(FB_W);
  }

  clear(color) {
    this.buf32.fill(color);
  }

  setPixel(x, y, color) {
    if (x < 0 || x >= FB_W || y < 0 || y >= FB_H) return;
    this.buf32[y * FB_W + x] = color;
  }

  present() {
    this.ctx.putImageData(this.imageData, 0, 0);
  }
}

// Pack RGBA (0-255 each) into a Uint32 in the order the platform's
// Uint8ClampedArray/Uint32Array aliasing expects (little-endian: ABGR word).
export function rgba(r, g, b, a = 255) {
  return (a << 24) | (b << 16) | (g << 8) | r;
}

// Parse a "#rrggbb" hex string into a packed Uint32 color (opaque).
export function hexColor(hex) {
  const v = parseInt(hex.slice(1), 16);
  const r = (v >> 16) & 0xff;
  const g = (v >> 8) & 0xff;
  const b = v & 0xff;
  return rgba(r, g, b, 255);
}

// Darken a packed color by a factor in [0,1] (1 = full brightness).
function shade(color, factor) {
  if (factor >= 0.999) return color;
  const r = color & 0xff;
  const g = (color >> 8) & 0xff;
  const b = (color >> 16) & 0xff;
  const a = (color >> 24) & 0xff;
  const rr = (r * factor) | 0;
  const gg = (g * factor) | 0;
  const bb = (b * factor) | 0;
  return (a << 24) | (bb << 16) | (gg << 8) | rr;
}

function distanceShadeFactor(dist) {
  // Linear falloff, clamp to a dim floor so nothing goes fully black.
  const f = 1.0 - dist / MAX_DEPTH;
  return Math.max(0.15, Math.min(1, f));
}

// ---------------------------------------------------------------------------
// DDA raycasting
// ---------------------------------------------------------------------------

// Cast a single ray from (px,py) at angle `angle` through the grid.
// Returns { dist, wallType, side, wallX, mapX, mapY } or null if MAX_DEPTH exceeded.
export function castRay(px, py, angle, grid, gridSize) {
  const rayDirX = Math.cos(angle);
  const rayDirY = Math.sin(angle);

  let mapX = Math.floor(px);
  let mapY = Math.floor(py);

  const deltaDistX = rayDirX === 0 ? 1e30 : Math.abs(1 / rayDirX);
  const deltaDistY = rayDirY === 0 ? 1e30 : Math.abs(1 / rayDirY);

  let stepX, sideDistX;
  if (rayDirX < 0) {
    stepX = -1;
    sideDistX = (px - mapX) * deltaDistX;
  } else {
    stepX = 1;
    sideDistX = (mapX + 1 - px) * deltaDistX;
  }

  let stepY, sideDistY;
  if (rayDirY < 0) {
    stepY = -1;
    sideDistY = (py - mapY) * deltaDistY;
  } else {
    stepY = 1;
    sideDistY = (mapY + 1 - py) * deltaDistY;
  }

  let side = 0;
  let hitType = 0;
  let dist = 0;

  for (let i = 0; i < 256; i++) {
    if (sideDistX < sideDistY) {
      sideDistX += deltaDistX;
      mapX += stepX;
      side = 0;
    } else {
      sideDistY += deltaDistY;
      mapY += stepY;
      side = 1;
    }

    if (mapX < 0 || mapX >= gridSize || mapY < 0 || mapY >= gridSize) {
      return null;
    }

    const cell = grid[mapY][mapX];
    // wall types 1-8 and door(9)/exit(10) all render as solid walls for now
    if (cell >= 1 && cell !== 20) {
      hitType = cell;
      dist = side === 0 ? (sideDistX - deltaDistX) : (sideDistY - deltaDistY);
      break;
    }
  }

  if (hitType === 0) return null;

  // exact wall hit coordinate, for texture X sampling
  let wallX;
  if (side === 0) {
    wallX = py + dist * rayDirY;
  } else {
    wallX = px + dist * rayDirX;
  }
  wallX -= Math.floor(wallX);

  if (dist <= 0.0001) dist = 0.0001;

  return { dist, wallType: hitType, side, wallX, mapX, mapY };
}

function skyColorAt(v) {
  // v in [0,1] from top(0) to horizon(1). night purple -> horizon ember
  const top = [0x24, 0x16, 0x31];
  const bot = [0xc9, 0x6a, 0x3a];
  const r = (top[0] + (bot[0] - top[0]) * v) | 0;
  const g = (top[1] + (bot[1] - top[1]) * v) | 0;
  const b = (top[2] + (bot[2] - top[2]) * v) | 0;
  return rgba(r, g, b, 255);
}

const FLOOR_BASE = hexColor('#5a1420');
const DAMAGE_FLOOR_BASE = hexColor('#e04524');

// ---------------------------------------------------------------------------
// Main render entry point.
// state: { x, y, angle, pitch? } player camera state (grid coords, radians)
// assets: from art.mjs buildAssets()
// fb: Framebuffer instance
// ---------------------------------------------------------------------------
export function render(state, assets, fb) {
  const { grid, gridSize } = state.map;
  const w = FB_W, h = FB_H;
  const horizon = h / 2;

  // --- sky + floor background fill ---
  for (let y = 0; y < h; y++) {
    let color;
    if (y < horizon) {
      const v = y / horizon; // 0 top -> 1 horizon
      color = skyColorAt(v);
    } else {
      const rowDist = (y - horizon) / (h - horizon); // 0 horizon -> 1 near
      const factor = Math.max(0.25, 1 - rowDist * 0.6);
      color = shade(FLOOR_BASE, factor);
    }
    const rowOffset = y * w;
    for (let x = 0; x < w; x++) {
      fb.buf32[rowOffset + x] = color;
    }
  }

  // --- floor damage tiles (screen-space simple pass: recompute per-column floor casting) ---
  renderFloor(state, fb);

  // --- walls ---
  const planeLen = Math.tan(FOV / 2);
  for (let col = 0; col < w; col++) {
    const cameraX = (2 * col / w) - 1; // -1..1
    const rayAngle = state.angle + Math.atan(cameraX * planeLen);
    const hit = castRay(state.x, state.y, rayAngle, grid, gridSize);

    if (!hit) {
      fb.zBuffer[col] = MAX_DEPTH;
      continue;
    }

    // correct fisheye
    const correctedDist = hit.dist * Math.cos(rayAngle - state.angle);
    fb.zBuffer[col] = correctedDist;

    const lineHeight = Math.min(h * 4, Math.floor(h / correctedDist));
    let drawStart = -(lineHeight / 2) + horizon;
    let drawEnd = (lineHeight / 2) + horizon;
    const texStartY = drawStart < 0 ? -drawStart : 0;
    if (drawStart < 0) drawStart = 0;
    if (drawEnd >= h) drawEnd = h - 1;

    const texObj = assets.textures[hit.wallType];
    if (!texObj) continue;
    const texData = texObj.data; // Uint32Array 64x64 (or animated frame chosen below)
    const texSize = texObj.size || 64;

    let texX = Math.floor(hit.wallX * texSize);
    if (hit.side === 0 && Math.cos(rayAngle) > 0) texX = texSize - texX - 1;
    if (hit.side === 1 && Math.sin(rayAngle) < 0) texX = texSize - texX - 1;
    if (texX < 0) texX = 0;
    if (texX >= texSize) texX = texSize - 1;

    const shadeFactor = distanceShadeFactor(correctedDist) * (hit.side === 1 ? 0.75 : 1.0);

    const step = texSize / lineHeight;
    let texPos = texStartY * step;

    const colBase = col;
    for (let y = drawStart; y <= drawEnd; y++) {
      const texY = Math.min(texSize - 1, texPos | 0);
      texPos += step;
      const srcColor = texData[texY * texSize + texX];
      fb.buf32[y * w + colBase] = shade(srcColor, shadeFactor);
    }
  }

  // --- sprites ---
  if (state.sprites) {
    renderSprites(state, assets, fb);
  }
}

// Simple floor-tile damage-color pass using a coarse per-pixel unprojection.
// Not per-frame getImageData; pure typed-array writes.
function renderFloor(state, fb) {
  const w = FB_W, h = FB_H;
  const horizon = h / 2;
  const { grid, gridSize } = state.map;
  const dirX = Math.cos(state.angle);
  const dirY = Math.sin(state.angle);
  const planeLen = Math.tan(FOV / 2);
  const planeX = -dirY * planeLen;
  const planeY = dirX * planeLen;

  for (let y = (horizon | 0) + 1; y < h; y++) {
    const p = y - horizon;
    if (p <= 0) continue;
    const rowDist = (0.5 * h) / p;
    const stepXWorld = rowDist * (2 * planeX) / w;
    const stepYWorld = rowDist * (2 * planeY) / w;
    let floorX = state.x + rowDist * (dirX - planeX);
    let floorY = state.y + rowDist * (dirY - planeY);

    const rowOffset = y * w;
    // sample every 2 columns for perf, fill pairs (still typed-array only)
    for (let x = 0; x < w; x += 2) {
      const cellX = floorX | 0;
      const cellY = floorY | 0;
      if (cellX >= 0 && cellX < gridSize && cellY >= 0 && cellY < gridSize) {
        const cell = grid[cellY][cellX];
        if (cell === 20) {
          const rowDistNorm = p / (h - horizon);
          const factor = Math.max(0.35, 1 - rowDistNorm * 0.5);
          const c = shade(DAMAGE_FLOOR_BASE, factor);
          fb.buf32[rowOffset + x] = c;
          if (x + 1 < w) fb.buf32[rowOffset + x + 1] = c;
        }
      }
      floorX += stepXWorld * 2;
      floorY += stepYWorld * 2;
    }
  }
}

// Billboarded sprite renderer: scale by distance, clip against zBuffer,
// supports animation frames + full-bright option.
// Expects state.sprites: [{ x, y, textureFrames: [canvasFrameObj...], frame, fullBright }]
function renderSprites(state, assets, fb) {
  const w = FB_W, h = FB_H;
  const horizon = h / 2;
  const dirX = Math.cos(state.angle);
  const dirY = Math.sin(state.angle);
  const planeLen = Math.tan(FOV / 2);
  const planeX = -dirY * planeLen;
  const planeY = dirX * planeLen;

  const invDet = 1.0 / (planeX * dirY - dirX * planeY);

  const sprites = state.sprites.slice().sort((a, b) => {
    const da = (a.x - state.x) ** 2 + (a.y - state.y) ** 2;
    const db = (b.x - state.x) ** 2 + (b.y - state.y) ** 2;
    return db - da; // far to near
  });

  for (const spr of sprites) {
    const sx = spr.x - state.x;
    const sy = spr.y - state.y;

    const transformX = invDet * (dirY * sx - dirX * sy);
    const transformY = invDet * (-planeY * sx + planeX * sy); // depth

    if (transformY <= 0.05) continue;

    const screenX = Math.floor((w / 2) * (1 + transformX / transformY));

    const frames = spr.textureFrames;
    if (!frames || !frames.length) continue;
    const frame = frames[spr.frame % frames.length] || frames[0];
    const texSize = frame.size || 64;

    const spriteScale = spr.scale || 1;
    const spriteHeight = Math.abs(Math.floor((h / transformY) * spriteScale));
    const spriteWidth = spriteHeight; // square sprites

    let drawStartY = Math.floor(-spriteHeight / 2 + horizon);
    let drawEndY = Math.floor(spriteHeight / 2 + horizon);
    let drawStartX = Math.floor(-spriteWidth / 2 + screenX);
    let drawEndX = Math.floor(spriteWidth / 2 + screenX);

    const clipStartX = Math.max(0, drawStartX);
    const clipEndX = Math.min(w - 1, drawEndX);
    if (clipStartX > clipEndX) continue;

    const factor = spr.fullBright ? 1.0 : distanceShadeFactor(transformY);

    const texData = frame.data;

    for (let stripe = clipStartX; stripe <= clipEndX; stripe++) {
      if (transformY >= fb.zBuffer[stripe]) continue; // occluded by wall
      const texX = Math.floor((stripe - drawStartX) * texSize / spriteWidth);
      const clampedTexX = Math.max(0, Math.min(texSize - 1, texX));

      const clipStartY = Math.max(0, drawStartY);
      const clipEndY = Math.min(h - 1, drawEndY);

      for (let y = clipStartY; y <= clipEndY; y++) {
        const texY = Math.floor((y - drawStartY) * texSize / spriteHeight);
        const clampedTexY = Math.max(0, Math.min(texSize - 1, texY));
        const srcColor = texData[clampedTexY * texSize + clampedTexX];
        // alpha channel = transparency marker; treat 0 alpha as skip
        const a = (srcColor >>> 24) & 0xff;
        if (a === 0) continue;
        fb.buf32[y * w + stripe] = factor >= 0.999 ? srcColor : shade(srcColor, factor);
      }
    }
  }
}
