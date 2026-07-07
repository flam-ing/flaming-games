// SUPER MINGO — engine.mjs
// Fixed-timestep loop helper, camera, tile renderer, parallax renderer, sprite draw helper.

export const STEP_MS = 1000 / 60;
const PANIC_MS = 5 * STEP_MS * 10; // if a frame takes absurdly long, drop time instead of spiraling

/**
 * Creates a fixed-timestep loop driver.
 * @param {(dt:number)=>void} update - called with fixed dt in seconds (1/60)
 * @param {(alpha:number)=>void} render - called once per animation frame with interpolation alpha [0,1]
 * @returns {{start:()=>void, stop:()=>void}}
 */
export function createLoop(update, render) {
  let raf = 0;
  let last = 0;
  let acc = 0;
  const stepSec = STEP_MS / 1000;

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (last === 0) { last = now; }
    let delta = now - last;
    last = now;
    if (delta > PANIC_MS) delta = STEP_MS; // panic cap: avoid spiral of death
    acc += delta;
    let steps = 0;
    while (acc >= STEP_MS) {
      update(stepSec);
      acc -= STEP_MS;
      steps++;
      if (steps > 8) { acc = 0; break; } // hard cap per frame
    }
    render(acc / STEP_MS);
  }

  return {
    start() { last = 0; acc = 0; raf = requestAnimationFrame(frame); },
    stop() { cancelAnimationFrame(raf); }
  };
}

// ---------------------------------------------------------------------------
// Camera
// ---------------------------------------------------------------------------

export const VIEW_W = 384;
export const VIEW_H = 216;
const LOOKAHEAD_MAX = 40;
const LOOKAHEAD_EASE = 0.06;
const VERT_EASE = 0.12;

export function createCamera() {
  return {
    x: 0, y: 0,
    lookX: 0, // current eased look-ahead offset
    targetY: 0,
  };
}

/**
 * Updates camera to follow target (player) with horizontal look-ahead and vertical easing,
 * clamped to level bounds.
 * @param {object} cam
 * @param {{x:number,y:number,facing:1|-1}} target
 * @param {number} levelPxW
 * @param {number} levelPxH
 */
export function updateCamera(cam, target, levelPxW, levelPxH) {
  const desiredLook = target.facing >= 0 ? LOOKAHEAD_MAX : -LOOKAHEAD_MAX;
  cam.lookX += (desiredLook - cam.lookX) * LOOKAHEAD_EASE;

  const desiredX = target.x - VIEW_W / 2 + cam.lookX;
  cam.x = clamp(desiredX, 0, Math.max(0, levelPxW - VIEW_W));

  cam.targetY += (target.y - VIEW_H / 2 - cam.targetY) * VERT_EASE;
  cam.y = clamp(cam.targetY, 0, Math.max(0, levelPxH - VIEW_H));
}

function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

// ---------------------------------------------------------------------------
// Tile renderer
// ---------------------------------------------------------------------------

/**
 * Draws the visible window of tiles from a level grid using tileset canvases.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string[]} grid - rows of characters
 * @param {object} tileCanvases - map char -> HTMLCanvasElement (16x16)
 * @param {number} tileSize
 * @param {object} cam - {x,y}
 */
export function drawTiles(ctx, grid, tileCanvases, tileSize, cam) {
  const rows = grid.length;
  const cols = rows > 0 ? grid[0].length : 0;
  const camX = Math.floor(cam.x);
  const camY = Math.floor(cam.y);

  const firstCol = Math.max(0, Math.floor(camX / tileSize));
  const lastCol = Math.min(cols - 1, Math.ceil((camX + VIEW_W) / tileSize));
  const firstRow = Math.max(0, Math.floor(camY / tileSize));
  const lastRow = Math.min(rows - 1, Math.ceil((camY + VIEW_H) / tileSize));

  for (let r = firstRow; r <= lastRow; r++) {
    const row = grid[r];
    for (let c = firstCol; c <= lastCol; c++) {
      const ch = row[c];
      if (!ch || ch === '.') continue;
      const tc = tileCanvases[ch];
      if (!tc) continue;
      const dx = Math.round(c * tileSize - camX);
      const dy = Math.round(r * tileSize - camY);
      ctx.drawImage(tc, dx, dy);
    }
  }
}

// ---------------------------------------------------------------------------
// Parallax background renderer
// ---------------------------------------------------------------------------

/**
 * Draws parallax layers behind the level. Each layer: {canvas, factor, y}
 * factor 0 = fixed to screen, 1 = moves with camera 1:1.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array<{canvas:HTMLCanvasElement, factor:number, y?:number}>} layers
 * @param {object} cam
 */
export function drawParallax(ctx, layers, cam) {
  for (const layer of layers) {
    const w = layer.canvas.width;
    const offset = Math.floor((cam.x * layer.factor) % w);
    const y = layer.y || 0;
    let startX = -offset;
    while (startX < VIEW_W) {
      ctx.drawImage(layer.canvas, startX, y);
      startX += w;
    }
  }
}

// ---------------------------------------------------------------------------
// Sprite draw helper
// ---------------------------------------------------------------------------

/**
 * Draws a sprite canvas at world position relative to camera, with optional horizontal flip.
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLCanvasElement} spriteCanvas
 * @param {number} worldX
 * @param {number} worldY
 * @param {object} cam
 * @param {boolean} flipX
 */
export function drawSprite(ctx, spriteCanvas, worldX, worldY, cam, flipX = false) {
  const dx = Math.round(worldX - cam.x);
  const dy = Math.round(worldY - cam.y);
  if (!flipX) {
    ctx.drawImage(spriteCanvas, dx, dy);
    return;
  }
  ctx.save();
  ctx.translate(dx + spriteCanvas.width, dy);
  ctx.scale(-1, 1);
  ctx.drawImage(spriteCanvas, 0, 0);
  ctx.restore();
}
