// SUPER MINGO — game.mjs
// Player physics, entities, collisions, blocks, powerups, boss, win/lose.
// Exports: createGame(levelIdx), update(g, input)

import { TILE_SIZE, LEVELS, TILE_LEGEND } from './levels.mjs';

// ---------------------------------------------------------------------------
// Movement constants — EXACT numbers from DESIGN.md
// ---------------------------------------------------------------------------

export const WALK_MAX = 1.3;
export const RUN_MAX = 2.2;
export const ACCEL = 0.08;
export const SKID_DECEL = 0.18;
export const JUMP_VELOCITY = -4.6;
export const JUMP_SUSTAIN_FRAMES = 18;
export const GRAVITY = 0.28;
export const TERMINAL_VELOCITY = 4.5;
export const FLUTTER_VELOCITY = -2.2;
export const COYOTE_FRAMES = 5;
export const JUMP_BUFFER_FRAMES = 5;
export const STOMP_BOUNCE = -3.2;
export const STOMP_BOUNCE_HELD = -4.6;

export const HITBOX_GRAY = { w: 14, h: 15 };
export const HITBOX_PINK = { w: 14, h: 27 };
export const HITBOX_FLARE = { w: 14, h: 27 };

const HURT_BLINK_SECONDS = 1.5;
const GROW_FREEZE_SECONDS = 0.4;
const PREEN_OIL_SECONDS = 8;
const PEARLS_PER_LIFE = 100;
const MAX_FLARE_PELLETS = 2;
const FLARE_BOUNCES_MAX = 3;
const CLACKER_KICK_SPEED = 3; // px/frame slide
const SNAPPER_SUPPRESS_DIST = 24;
const STOMP_KILL_BOUNCE = STOMP_BOUNCE;

// ---------------------------------------------------------------------------
// Level/tile helpers
// ---------------------------------------------------------------------------

function tileAt(grid, tx, ty) {
  if (ty < 0 || ty >= grid.length) return '.';
  const row = grid[ty];
  if (tx < 0 || tx >= row.length) return '#';
  return row[tx];
}

function isSolidChar(ch) {
  const def = TILE_LEGEND[ch];
  if (!def) return false;
  return def.solid === true;
}

function isOneWayChar(ch) {
  const def = TILE_LEGEND[ch];
  return !!def && def.solid === 'oneway';
}

function isHazardChar(ch) {
  const def = TILE_LEGEND[ch];
  return !!def && def.hazard === true;
}

function isDeathPlaneChar(ch) {
  const def = TILE_LEGEND[ch];
  return !!def && def.deathPlane === true;
}

function isBumpChar(ch) {
  const def = TILE_LEGEND[ch];
  return !!def && !!def.bump;
}

function isBreakableChar(ch) {
  const def = TILE_LEGEND[ch];
  return !!def && def.breakable === true;
}

function isWarpChar(ch) {
  const def = TILE_LEGEND[ch];
  return !!def && def.warp === true;
}

function isLevelEndChar(ch) {
  const def = TILE_LEGEND[ch];
  return !!def && def.levelEnd === true;
}

function aabbOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// ---------------------------------------------------------------------------
// Game state factory
// ---------------------------------------------------------------------------

export function createGame(levelIdx) {
  const level = LEVELS[levelIdx];
  const spawn = level.spawn || { x: 0, y: 0 };

  const player = {
    x: spawn.x, y: spawn.y,
    vx: 0, vy: 0,
    facing: 1,
    power: 'gray',
    onGround: false,
    running: false,
    skidding: false,
    jumpHeldFrames: 0,
    isJumping: false,
    coyoteFrames: 0,
    jumpBufferFrames: 0,
    hasFluttered: false,
    isFluttering: false,
    hurtTimer: 0,
    invincTimer: 0,      // preen oil invincibility
    growFreezeTimer: 0,  // freeze-frame on power up
    dead: false,
    pose: 'idle',
    animTimer: 0,
    animFrame: 0,
    finished: false,      // reached perch pole
    poleTimer: 0,
    poleGrabHeight: 0,
    winTimer: 0,
    spitCooldown: 0,
  };

  return {
    levelIdx,
    level,
    inBonus: false,
    bonusGrid: null,
    mainState: null, // saved player/camera state while in bonus pocket
    player,
    lives: 3,
    pearls: 0,
    pearlsTotal: 0,
    time: level.timeLimit || 300,
    timeUp: false,
    deaths: 0,
    gameOver: false,
    won: false,
    bumpedBlocks: new Set(),
    poppedBlocks: new Map(), // key -> {timer, type}
    brokenBlocks: new Set(),
    debris: [], // {x,y,vx,vy,life}
    enemies: (level.entities || []).map(spawnEnemy),
    flarePellets: [],
    fishProjectiles: [],
    items: [], // walking shrimp/eggs from popped blocks
    events: [],
    musicFast: false,
    checkpointReachedIdx: -1,
    lastCheckpoint: null,
    boss: null,
    cageOpen: false,       // arena cage-cart bursts open on boss defeat
    shrimpRain: [],        // {x,y,vx,vy,life} freed-shrimp particles arcing out of the burst cage
  };
}

function spawnEnemy(e) {
  const base = {
    type: e.type,
    x: e.x, y: e.y,
    startX: e.x, startY: e.y,
    vx: 0, vy: 0,
    alive: true,
    facing: -1,
    animTimer: 0,
    state: 'normal',
    stateTimer: 0,
  };
  if (e.type === 'crabby') {
    base.w = 14; base.h = 12; base.vx = -0.5;
  } else if (e.type === 'clacker') {
    base.w = 16; base.h = 14; base.vx = -0.4;
    base.shellState = 'open'; // open | shut | sliding
  } else if (e.type === 'snapper') {
    base.w = 14; base.h = 18; base.stumpX = e.stumpX;
    base.state = 'sink'; base.stateTimer = 1 + Math.random() * 1.5;
    base.riseY = e.y; base.sinkY = e.y + 16;
    base.y = base.sinkY;
  } else if (e.type === 'skeeter') {
    base.w = 12; base.h = 10; base.path = e.path || 'hover_h';
    base.phase = Math.random() * Math.PI * 2;
  } else if (e.type === 'pelican_guard') {
    base.w = 16; base.h = 20; base.range = e.range || [e.x / TILE_SIZE - 4, e.x / TILE_SIZE + 4];
    base.vx = 0.4; base.throwTimer = 2.5;
  } else if (e.type === 'king_pelicano') {
    base.w = 48; base.h = 48; base.boss = true;
    base.hp = 3; base.phase = 'strut'; base.phaseTimer = 2;
    base.speed = 0.5; base.arenaCenter = e.x;
  }
  return base;
}

function hitboxFor(power) {
  if (power === 'gray') return HITBOX_GRAY;
  if (power === 'pink') return HITBOX_PINK;
  return HITBOX_FLARE;
}

// ---------------------------------------------------------------------------
// Swept AABB collision vs tile grid
// ---------------------------------------------------------------------------

function moveAABB(grid, box, dx, dy, allowOneWay) {
  let { x, y, w, h } = box;
  let onGround = false;
  let hitCeiling = false;
  let hitCeilTx = null, hitCeilTy = null;

  if (dx !== 0) {
    let newX = x + dx;
    const dir = dx > 0 ? 1 : -1;
    const edgeX = dir > 0 ? newX + w : newX;
    const checkCol = dir > 0 ? Math.floor((edgeX - 1) / TILE_SIZE) : Math.floor(edgeX / TILE_SIZE);
    const topRow = Math.floor(y / TILE_SIZE);
    const botRow = Math.floor((y + h - 1) / TILE_SIZE);
    for (let ty = topRow; ty <= botRow; ty++) {
      const ch = tileAt(grid, checkCol, ty);
      if (isSolidChar(ch)) {
        if (dir > 0) newX = checkCol * TILE_SIZE - w;
        else newX = (checkCol + 1) * TILE_SIZE;
        dx = 0;
        break;
      }
    }
    x = newX;
  }

  if (dy !== 0) {
    let newY = y + dy;
    const dir = dy > 0 ? 1 : -1;
    const edgeY = dir > 0 ? newY + h : newY;
    const checkRow = dir > 0 ? Math.floor((edgeY - 1) / TILE_SIZE) : Math.floor(edgeY / TILE_SIZE);
    const leftCol = Math.floor(x / TILE_SIZE);
    const rightCol = Math.floor((x + w - 1) / TILE_SIZE);
    for (let tx = leftCol; tx <= rightCol; tx++) {
      const ch = tileAt(grid, tx, checkRow);
      const solid = isSolidChar(ch);
      const oneway = isOneWayChar(ch);
      if (solid || (allowOneWay && oneway && dir > 0)) {
        if (oneway && dir > 0) {
          const prevBottom = y + h;
          const platformTop = checkRow * TILE_SIZE;
          if (prevBottom > platformTop + 1) continue;
        }
        if (dir > 0) { newY = checkRow * TILE_SIZE - h; onGround = true; }
        else { newY = (checkRow + 1) * TILE_SIZE; hitCeiling = true; hitCeilTx = tx; hitCeilTy = checkRow; }
        dy = 0;
        break;
      }
    }
    y = newY;
  }

  return { x, y, onGround, hitCeiling, hitCeilTx, hitCeilTy };
}

// ---------------------------------------------------------------------------
// Blocks: '?' variants + salt bricks
// ---------------------------------------------------------------------------

function tryBumpBlock(g, tx, ty) {
  const grid = g.level.grid;
  const ch = tileAt(grid, tx, ty);
  const key = `${tx},${ty}`;

  if (isBreakableChar(ch)) {
    if (g.brokenBlocks.has(key)) return;
    if (g.player.power !== 'gray') {
      // break with debris
      g.brokenBlocks.add(key);
      for (let i = 0; i < 4; i++) {
        g.debris.push({
          x: tx * TILE_SIZE + 8, y: ty * TILE_SIZE + 8,
          vx: (i < 2 ? -1 : 1) * (0.8 + Math.random() * 0.6),
          vy: -2 - Math.random(), life: 0.6,
        });
      }
      g.events.push({ type: 'sfx', name: 'brick-break' });
      // kill enemy standing directly above the broken block
      killEnemiesAboveTile(g, tx, ty);
    } else {
      // head-bump shake when gray, no break
      g.poppedBlocks.set(key, { timer: 0.15, type: 'shake' });
      g.events.push({ type: 'sfx', name: 'bump' });
    }
    return;
  }

  if (!isBumpChar(ch)) return;
  if (g.bumpedBlocks.has(key)) return;
  g.bumpedBlocks.add(key);
  g.poppedBlocks.set(key, { timer: 0.2, type: 'pop' });
  const def = TILE_LEGEND[ch];
  const bump = def.bump;
  g.events.push({ type: 'bump', bump, tx, ty });

  const spawnX = tx * TILE_SIZE;
  const spawnY = (ty - 1) * TILE_SIZE;

  if (bump === 'pearl') {
    g.pearls += 1; g.pearlsTotal += 1;
    maybeAwardLife(g);
    g.events.push({ type: 'sfx', name: 'pearl' });
  } else if (bump === 'shrimp') {
    g.items.push({ type: 'shrimp', x: spawnX, y: spawnY, vx: 0.6, vy: 0, riseTimer: 0.3 });
  } else if (bump === 'golden_shrimp') {
    g.items.push({ type: 'golden_shrimp', x: spawnX, y: spawnY, vx: 0, vy: 0, riseTimer: 0.3 });
  } else if (bump === 'egg') {
    g.items.push({ type: 'egg', x: spawnX, y: spawnY, vx: 1.2, vy: 0, running: true, riseTimer: 0.3 });
  } else if (bump === 'preen_oil') {
    g.items.push({ type: 'preen_oil', x: spawnX, y: spawnY, vx: 0.5, vy: 0, riseTimer: 0.3 });
  }
  killEnemiesAboveTile(g, tx, ty);
}

function killEnemiesAboveTile(g, tx, ty) {
  const tileTop = ty * TILE_SIZE;
  for (const en of g.enemies) {
    if (!en.alive) continue;
    const enTx0 = Math.floor(en.x / TILE_SIZE);
    const enTx1 = Math.floor((en.x + en.w - 1) / TILE_SIZE);
    if (tx < enTx0 || tx > enTx1) continue;
    const enBottom = en.y + en.h;
    if (enBottom > tileTop - 4 && enBottom <= tileTop + 4) {
      killEnemy(g, en);
    }
  }
}

function killEnemy(g, en) {
  en.alive = false;
  g.events.push({ type: 'sfx', name: 'stomp' });
}

// ---------------------------------------------------------------------------
// Power state transitions
// ---------------------------------------------------------------------------

function grantShrimp(g) {
  const p = g.player;
  if (p.power === 'gray') {
    p.power = 'pink';
    p.growFreezeTimer = GROW_FREEZE_SECONDS;
    g.events.push({ type: 'sfx', name: 'shrimp-powerup' });
  } else {
    grantPearlsScore(g, 0); // no-op if already pink+, still counts as pearl-ish bonus? keep simple: nothing extra
  }
}

function grantGoldenShrimp(g) {
  const p = g.player;
  if (p.power !== 'gray') {
    p.power = 'flare';
    p.growFreezeTimer = GROW_FREEZE_SECONDS;
    g.events.push({ type: 'sfx', name: 'shrimp-powerup' });
  } else {
    // spawns only when already pink per design; if somehow gray, treat as shrimp
    grantShrimp(g);
  }
}

function grantPreenOil(g) {
  const p = g.player;
  p.invincTimer = PREEN_OIL_SECONDS;
  g.musicFast = true;
  g.events.push({ type: 'sfx', name: 'preen-oil' });
}

function grantEgg(g) {
  g.lives += 1;
  g.events.push({ type: 'sfx', name: '1up' });
}

function grantPearlsScore(g, n) {
  g.pearls += n; g.pearlsTotal += n;
  maybeAwardLife(g);
}

function maybeAwardLife(g) {
  if (g.pearls >= PEARLS_PER_LIFE) {
    g.pearls -= PEARLS_PER_LIFE;
    g.lives += 1;
    g.events.push({ type: 'sfx', name: '1up' });
  }
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export function update(g, input) {
  const p = g.player;

  if (g.won || g.gameOver) return;

  if (p.finished) {
    updatePoleSequence(g, input);
    return;
  }

  if (p.dead) return;

  // time countdown
  if (!g.timeUp) {
    g.time -= 1 / 60;
    if (g.time <= 0) { g.time = 0; g.timeUp = true; killPlayer(g); return; }
  }

  const grid = (g.inBonus ? g.bonusGrid : g.level.grid);
  const box = hitboxFor(p.power);

  if (p.growFreezeTimer > 0) {
    p.growFreezeTimer -= 1 / 60;
    updateAnim(p);
    return; // freeze-frame: skip physics this tick
  }

  // --- Horizontal input / accel / skid ---
  p.running = !!input.run;
  const maxSpeed = p.running ? RUN_MAX : WALK_MAX;
  const dir = (input.left ? -1 : 0) + (input.right ? 1 : 0);

  if (dir !== 0) {
    p.facing = dir;
    if (Math.sign(p.vx) !== 0 && Math.sign(p.vx) !== dir) {
      p.skidding = true;
      p.vx += SKID_DECEL * dir;
    } else {
      p.skidding = false;
      p.vx += ACCEL * dir;
      if (p.vx > maxSpeed) p.vx = maxSpeed;
      if (p.vx < -maxSpeed) p.vx = -maxSpeed;
    }
  } else {
    p.skidding = false;
    if (p.vx > 0) p.vx = Math.max(0, p.vx - SKID_DECEL);
    else if (p.vx < 0) p.vx = Math.min(0, p.vx + SKID_DECEL);
  }
  if (p.vx > maxSpeed) p.vx = Math.max(maxSpeed, p.vx - SKID_DECEL);
  if (p.vx < -maxSpeed) p.vx = Math.min(-maxSpeed, p.vx + SKID_DECEL);

  // --- Coyote & jump buffer ---
  if (p.onGround) p.coyoteFrames = COYOTE_FRAMES;
  else if (p.coyoteFrames > 0) p.coyoteFrames -= 1;

  if (input.jumpPressed) p.jumpBufferFrames = JUMP_BUFFER_FRAMES;
  else if (p.jumpBufferFrames > 0) p.jumpBufferFrames -= 1;

  const canStartJump = (p.onGround || p.coyoteFrames > 0) && !p.isJumping;
  if (p.jumpBufferFrames > 0 && canStartJump) {
    p.vy = JUMP_VELOCITY;
    p.isJumping = true;
    p.jumpHeldFrames = 0;
    p.onGround = false;
    p.coyoteFrames = 0;
    p.jumpBufferFrames = 0;
    p.hasFluttered = false;
    g.events.push({ type: 'sfx', name: 'flap-jump' });
  } else if (p.isJumping && input.jump && p.jumpHeldFrames < JUMP_SUSTAIN_FRAMES && p.vy < 0) {
    p.jumpHeldFrames += 1;
  } else if (!input.jump) {
    p.jumpHeldFrames = JUMP_SUSTAIN_FRAMES;
  }

  // --- FLUTTER ---
  if (!p.onGround && input.jumpPressed && p.isJumping && !p.hasFluttered && p.vy > FLUTTER_VELOCITY) {
    p.vy = FLUTTER_VELOCITY;
    p.hasFluttered = true;
    p.isFluttering = true;
    g.events.push({ type: 'sfx', name: 'flutter' });
  } else {
    p.isFluttering = false;
  }

  // --- Gravity ---
  if (p.jumpHeldFrames < JUMP_SUSTAIN_FRAMES && p.isJumping && input.jump && p.vy < 0) {
    p.vy += GRAVITY * 0.35;
  } else {
    p.vy += GRAVITY;
  }
  if (p.vy > TERMINAL_VELOCITY) p.vy = TERMINAL_VELOCITY;

  // --- Flare spit (X / run button while flare) ---
  if (p.spitCooldown > 0) p.spitCooldown -= 1 / 60;
  if (p.power === 'flare' && input.spit && p.spitCooldown <= 0) {
    const alive = g.flarePellets.filter(fp => fp.alive).length;
    if (alive < MAX_FLARE_PELLETS) {
      g.flarePellets.push({
        x: p.x + (p.facing > 0 ? box.w : -6), y: p.y + box.h / 2,
        vx: p.facing * 2.4, vy: -1.6, bounces: 0, alive: true,
      });
      p.spitCooldown = 0.35;
      g.events.push({ type: 'sfx', name: 'flare-spit' });
    }
  }

  // --- Move + collide vs tiles ---
  const box2 = { x: p.x, y: p.y, w: box.w, h: box.h };
  const resX = moveAABB(grid, box2, p.vx, 0, true);
  box2.x = resX.x;
  const resY = moveAABB(grid, box2, 0, p.vy, true);
  box2.y = resY.y;

  if (resY.hitCeiling && p.vy < 0) {
    tryBumpBlock(g, resY.hitCeilTx, resY.hitCeilTy);
    p.vy = 0;
    p.jumpHeldFrames = JUMP_SUSTAIN_FRAMES;
  }

  const wasOnGround = p.onGround;
  p.onGround = resY.onGround;
  if (p.onGround) {
    p.vy = 0; p.isJumping = false; p.hasFluttered = false; p.jumpHeldFrames = 0;
  }
  if (!wasOnGround && p.onGround) p.isFluttering = false;

  p.x = box2.x;
  p.y = box2.y;

  // --- barrel float platform ride (moving one-way, treat as oneway solid handled by tile) ---

  // --- Stump warp (DOWN pressed on top of marked '|' pair) ---
  handleStumpWarp(g, input, box);

  // --- Hazard / death plane checks ---
  const tx0 = Math.floor(p.x / TILE_SIZE);
  const tx1 = Math.floor((p.x + box.w - 1) / TILE_SIZE);
  const ty0 = Math.floor(p.y / TILE_SIZE);
  const ty1 = Math.floor((p.y + box.h - 1) / TILE_SIZE);
  let touchedHazard = false;
  let touchedDeathPlane = false;
  for (let ty = ty0; ty <= ty1 && !touchedDeathPlane; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      const ch = tileAt(grid, tx, ty);
      if (isDeathPlaneChar(ch)) { touchedDeathPlane = true; break; }
      if (isHazardChar(ch)) touchedHazard = true;
    }
  }

  const fellOffBottom = p.y > grid.length * TILE_SIZE + 64;

  if (touchedDeathPlane || fellOffBottom) {
    if (p.invincTimer <= 0) { killPlayer(g); return; }
  }
  if (touchedHazard && p.hurtTimer <= 0 && p.invincTimer <= 0) {
    hurtPlayer(g);
  }

  // --- Level end: perch pole ---
  if (!g.inBonus) {
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        const ch = tileAt(grid, tx, ty);
        if (isLevelEndChar(ch)) {
          startPoleSequence(g, tx, ty);
          break;
        }
      }
    }
  }

  // --- checkpoint pickup ---
  updateCheckpoints(g, box);

  // --- timers ---
  if (p.hurtTimer > 0) { p.hurtTimer -= 1 / 60; if (p.hurtTimer < 0) p.hurtTimer = 0; }
  if (p.invincTimer > 0) {
    p.invincTimer -= 1 / 60;
    if (p.invincTimer <= 0) { p.invincTimer = 0; g.musicFast = false; }
  }

  // --- popped block shake/pop timers ---
  for (const [key, entry] of g.poppedBlocks) {
    entry.timer -= 1 / 60;
    if (entry.timer <= 0) g.poppedBlocks.delete(key);
  }

  // --- debris physics ---
  for (const d of g.debris) {
    d.vy += GRAVITY; d.x += d.vx; d.y += d.vy; d.life -= 1 / 60;
  }
  g.debris = g.debris.filter(d => d.life > 0);

  // --- items (walking shrimp / running egg / golden shrimp / preen oil) ---
  updateItems(g, box);

  // --- enemies ---
  updateEnemies(g, box);

  // --- flare pellets ---
  updateFlarePellets(g);

  // --- fish projectiles (pelican guard + boss) ---
  updateFishProjectiles(g, box);

  // --- boss ---
  if (g.level.bossArena) updateBoss(g, box);

  // --- freed shrimp rain (arena cage burst on boss defeat) ---
  updateShrimpRain(g, grid);

  updateAnim(p);
}

// ---------------------------------------------------------------------------
// Stump warp
// ---------------------------------------------------------------------------

function handleStumpWarp(g, input, box) {
  if (!input.down) return;
  const level = g.level;
  const p = g.player;

  if (!g.inBonus) {
    const bonus = level.bonus;
    if (!bonus) return;
    const tx = Math.floor((p.x + box.w / 2) / TILE_SIZE);
    if (bonus.triggerCols && bonus.triggerCols.includes(tx) && p.onGround) {
      g.mainState = { x: p.x, y: p.y };
      g.inBonus = true;
      g.bonusGrid = bonus.grid;
      p.x = bonus.spawn.x; p.y = bonus.spawn.y;
      p.vx = 0; p.vy = 0;
      g.events.push({ type: 'sfx', name: 'warp' });
    }
  } else {
    const bonus = level.bonus;
    if (!bonus) return;
    const grid = g.bonusGrid;
    const tx = Math.floor((p.x + box.w / 2) / TILE_SIZE);
    const ty = Math.floor((p.y + box.h - 1) / TILE_SIZE);
    const ch = tileAt(grid, tx, ty + 1);
    if (isWarpChar(ch) && p.onGround) {
      g.inBonus = false;
      p.x = bonus.returnTo.x; p.y = bonus.returnTo.y;
      p.vx = 0; p.vy = 0;
      g.events.push({ type: 'sfx', name: 'warp' });
    }
  }
}

// ---------------------------------------------------------------------------
// Checkpoints
// ---------------------------------------------------------------------------

function updateCheckpoints(g, box) {
  const p = g.player;
  const level = g.level;
  if (!level.checkpoints) return;
  for (let i = 0; i < level.checkpoints.length; i++) {
    if (i <= g.checkpointReachedIdx) continue;
    const cp = level.checkpoints[i];
    if (Math.abs((p.x + box.w / 2) - cp.x) < TILE_SIZE && p.onGround) {
      g.checkpointReachedIdx = i;
      g.lastCheckpoint = cp;
      g.events.push({ type: 'sfx', name: 'checkpoint' });
    }
  }
}

// ---------------------------------------------------------------------------
// Hurt / death / respawn
// ---------------------------------------------------------------------------

function hurtPlayer(g) {
  const p = g.player;
  if (p.power === 'gray') { killPlayer(g); return; }
  p.power = 'gray';
  p.hurtTimer = HURT_BLINK_SECONDS;
  g.events.push({ type: 'sfx', name: 'hurt' });
}

function killPlayer(g) {
  const p = g.player;
  if (p.dead) return;
  p.dead = true;
  g.lives -= 1;
  g.deaths += 1;
  g.events.push({ type: 'death' });
  if (g.lives < 0) {
    g.gameOver = true;
  }
}

export function respawnPlayer(g) {
  const p = g.player;
  const spawn = g.lastCheckpoint || g.level.spawn;
  g.inBonus = false;
  p.x = spawn.x; p.y = spawn.y;
  p.vx = 0; p.vy = 0;
  p.onGround = false;
  p.dead = false;
  p.power = 'gray';
  p.hurtTimer = 0;
  p.invincTimer = 0;
  p.isJumping = false;
  p.hasFluttered = false;
  g.time = g.level.timeLimit || 300;
  g.timeUp = false;
}

// ---------------------------------------------------------------------------
// Perch pole finish sequence
// ---------------------------------------------------------------------------

function startPoleSequence(g, poleTx, poleTy) {
  const p = g.player;
  if (p.finished) return;
  p.finished = true;
  p.poleTimer = 0;
  p.vx = 0; p.vy = 0;
  // score by grab height: higher grab (lower row index within pole column) = more points
  const level = g.level;
  const grid = level.grid;
  let topRow = poleTy;
  for (let r = poleTy; r >= 0; r--) {
    if (isLevelEndChar(tileAt(grid, poleTx, r))) topRow = r; else break;
  }
  const grabRow = Math.floor(p.y / TILE_SIZE);
  p.poleGrabHeight = Math.max(0, grabRow - topRow);
  p.x = poleTx * TILE_SIZE - hitboxFor(p.power).w + 4;
  g.events.push({ type: 'sfx', name: 'pole-jingle' });
}

function updatePoleSequence(g, input) {
  const p = g.player;
  p.poleTimer += 1 / 60;
  // 0.0-0.5 slide down, 0.5-1.7 one-leg pose hold
  const grid = g.level.grid;
  const slideDuration = 0.5;
  if (p.poleTimer < slideDuration) {
    p.y += 2;
    p.pose = 'pole';
  } else {
    p.pose = 'pole';
    if (p.poleTimer >= slideDuration + 1.2) {
      if (!g.won) {
        g.events.push({ type: 'level-complete', grabHeight: p.poleGrabHeight, pearls: g.pearlsTotal, time: g.time, deaths: g.deaths });
        g.won = true; // flag consumed by main.mjs to advance; main.mjs resets per-level state on transition
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Items (popped-block pickups: walking shrimp, running egg, golden shrimp, preen oil)
// ---------------------------------------------------------------------------

function updateItems(g, box) {
  const p = g.player;
  const grid = g.inBonus ? g.bonusGrid : g.level.grid;
  const pBox = { x: p.x, y: p.y, w: box.w, h: box.h };

  for (const it of g.items) {
    if (it.riseTimer > 0) {
      it.riseTimer -= 1 / 60;
      it.y -= 16 * (1 / 60) / 0.3; // rise out of block over 0.3s
      continue;
    }
    // simple gravity + horizontal walk/run, collide with solids
    it.vy = (it.vy || 0) + GRAVITY;
    if (it.vy > TERMINAL_VELOCITY) it.vy = TERMINAL_VELOCITY;
    const iw = it.type === 'egg' ? 10 : 10;
    const ih = it.type === 'egg' ? 12 : 10;
    const ibox = { x: it.x, y: it.y, w: iw, h: ih };
    const resX = moveAABB(grid, ibox, it.vx, 0, true);
    if (resX.x === ibox.x && it.vx !== 0) { it.vx = -it.vx; } // bounced off wall -> reverse
    ibox.x = resX.x;
    const resY = moveAABB(grid, ibox, 0, it.vy, true);
    ibox.y = resY.y;
    if (resY.onGround) it.vy = 0;
    it.x = ibox.x; it.y = ibox.y;

    // collect on touch
    const itBox = { x: it.x, y: it.y, w: iw, h: ih };
    if (aabbOverlap(pBox, itBox)) {
      it.collected = true;
      if (it.type === 'shrimp') grantShrimp(g);
      else if (it.type === 'golden_shrimp') grantGoldenShrimp(g);
      else if (it.type === 'egg') grantEgg(g);
      else if (it.type === 'preen_oil') grantPreenOil(g);
    }
  }
  g.items = g.items.filter(it => !it.collected);
}

// ---------------------------------------------------------------------------
// Enemies
// ---------------------------------------------------------------------------

function stompCheck(p, box, en) {
  if (!en.alive) return false;
  if (p.vy <= 0) return false; // must be falling
  const pBottom = p.y + box.h;
  const enMidline = en.y + en.h / 2;
  const pBox = { x: p.x, y: p.y, w: box.w, h: box.h };
  const enBox = { x: en.x, y: en.y, w: en.w, h: en.h };
  if (!aabbOverlap(pBox, enBox)) return false;
  return pBottom <= enMidline + 4; // feet above enemy midline
}

function updateEnemies(g, box) {
  const p = g.player;
  const grid = g.inBonus ? g.bonusGrid : g.level.grid;
  const pBox = { x: p.x, y: p.y, w: box.w, h: box.h };

  for (const en of g.enemies) {
    if (!en.alive) continue;

    if (en.type === 'crabby') updateCrabby(en, grid);
    else if (en.type === 'clacker') updateClacker(g, en, grid, pBox);
    else if (en.type === 'snapper') updateSnapper(en, p);
    else if (en.type === 'skeeter') updateSkeeter(en);
    else if (en.type === 'pelican_guard') updatePelicanGuard(g, en);
    else if (en.type === 'king_pelicano') continue; // handled in updateBoss

    // player collision (skip clacker sliding — handled separately with kill logic)
    if (en.type !== 'clacker') {
      const enBox = { x: en.x, y: en.y, w: en.w, h: en.h };
      if (aabbOverlap(pBox, enBox)) {
        handlePlayerEnemyContact(g, en, box);
      }
    }
  }

  g.enemies = g.enemies.filter(en => en.alive);
}

function handlePlayerEnemyContact(g, en, box) {
  const p = g.player;
  if (en.type === 'snapper') {
    // Snapper: never stompable, always hurts
    if (p.invincTimer > 0) { killEnemy(g, en); return; }
    if (p.hurtTimer <= 0) hurtPlayer(g);
    return;
  }
  if (p.invincTimer > 0) { killEnemy(g, en); bounceOffKill(g); return; }

  const canStomp = stompCheck(p, box, en);
  if (canStomp) {
    killEnemy(g, en);
    p.vy = (p.isJumping && p.jumpHeldFrames < JUMP_SUSTAIN_FRAMES) ? STOMP_BOUNCE_HELD : STOMP_BOUNCE;
    p.isJumping = true;
    p.onGround = false;
    p.hasFluttered = false;
    g.events.push({ type: 'sfx', name: 'stomp-bounce' });
  } else if (p.hurtTimer <= 0) {
    hurtPlayer(g);
  }
}

function bounceOffKill(g) {
  const p = g.player;
  p.vy = STOMP_BOUNCE;
}

function updateCrabby(en, grid) {
  en.x += en.vx;
  const tx0 = Math.floor(en.x / TILE_SIZE);
  const tx1 = Math.floor((en.x + en.w - 1) / TILE_SIZE);
  const footRow = Math.floor((en.y + en.h + 1) / TILE_SIZE);
  const frontCol = en.vx < 0 ? tx0 : tx1;
  const wallCh = tileAt(grid, frontCol, Math.floor((en.y + en.h / 2) / TILE_SIZE));
  const groundCh = tileAt(grid, frontCol, footRow);
  if (isSolidChar(wallCh) || !(isSolidChar(groundCh) || isOneWayChar(groundCh))) {
    en.vx = -en.vx;
    en.x += en.vx; // nudge back off edge/wall
  }
  en.facing = en.vx < 0 ? -1 : 1;
}

function updateClacker(g, en, grid, pBox) {
  const enBox = { x: en.x, y: en.y, w: en.w, h: en.h };
  const p = g.player;

  if (en.shellState === 'open') {
    en.x += en.vx;
    const tx0 = Math.floor(en.x / TILE_SIZE);
    const tx1 = Math.floor((en.x + en.w - 1) / TILE_SIZE);
    const footRow = Math.floor((en.y + en.h + 1) / TILE_SIZE);
    const frontCol = en.vx < 0 ? tx0 : tx1;
    const wallCh = tileAt(grid, frontCol, Math.floor((en.y + en.h / 2) / TILE_SIZE));
    const groundCh = tileAt(grid, frontCol, footRow);
    if (isSolidChar(wallCh) || !(isSolidChar(groundCh) || isOneWayChar(groundCh))) en.vx = -en.vx;
    en.facing = en.vx < 0 ? -1 : 1;

    if (aabbOverlap(pBox, enBox)) {
      if (p.invincTimer > 0) { killEnemy(g, en); return; }
      if (stompCheck(p, hitboxFor(p.power), en)) {
        en.shellState = 'shut';
        en.vx = 0;
        p.vy = STOMP_BOUNCE;
        p.isJumping = true; p.onGround = false; p.hasFluttered = false;
        g.events.push({ type: 'sfx', name: 'shell-close' });
      } else if (p.hurtTimer <= 0) {
        hurtPlayer(g);
      }
    }
  } else if (en.shellState === 'shut') {
    if (aabbOverlap(pBox, enBox)) {
      if (stompCheck(p, hitboxFor(p.power), en) || Math.abs(p.vx) > 0.1) {
        // kick: slides in facing direction of player relative to shell
        en.shellState = 'sliding';
        en.vx = (p.x < en.x ? 1 : -1) * CLACKER_KICK_SPEED;
        en.bounces = 0;
        p.vy = STOMP_BOUNCE * 0.6;
        g.events.push({ type: 'sfx', name: 'shell-kick' });
      }
    }
  } else if (en.shellState === 'sliding') {
    en.x += en.vx;
    const tx0 = Math.floor(en.x / TILE_SIZE);
    const tx1 = Math.floor((en.x + en.w - 1) / TILE_SIZE);
    const checkCol = en.vx < 0 ? tx0 : tx1;
    const wallCh = tileAt(grid, checkCol, Math.floor((en.y + en.h / 2) / TILE_SIZE));
    if (isSolidChar(wallCh)) { en.vx = -en.vx; en.bounceWalls = (en.bounceWalls || 0) + 1; }

    // hits other enemies
    for (const other of g.enemies) {
      if (other === en || !other.alive) continue;
      if (other.type === 'king_pelicano') continue;
      const otherBox = { x: other.x, y: other.y, w: other.w, h: other.h };
      if (aabbOverlap({ x: en.x, y: en.y, w: en.w, h: en.h }, otherBox)) {
        killEnemy(g, other);
      }
    }

    // hurts player on return unless re-stomped
    if (aabbOverlap(pBox, { x: en.x, y: en.y, w: en.w, h: en.h })) {
      if (p.invincTimer > 0) { killEnemy(g, en); return; }
      if (stompCheck(p, hitboxFor(p.power), en)) {
        en.shellState = 'shut';
        en.vx = 0;
        p.vy = STOMP_BOUNCE;
        p.isJumping = true; p.onGround = false;
      } else if (p.hurtTimer <= 0) {
        hurtPlayer(g);
      }
    }
  }
}

function updateSnapper(en, p) {
  en.stateTimer -= 1 / 60;
  const dist = Math.abs((p.x) - en.stumpX);
  if (en.state === 'sink') {
    en.y = Math.min(en.sinkY, en.y + 0.6);
    if (en.stateTimer <= 0) {
      if (dist > SNAPPER_SUPPRESS_DIST) {
        en.state = 'rise'; en.stateTimer = 0.6;
      } else {
        en.stateTimer = 0.3; // keep waiting while player close
      }
    }
  } else if (en.state === 'rise') {
    en.y = Math.max(en.riseY, en.y - 0.6);
    if (en.y <= en.riseY) { en.state = 'up'; en.stateTimer = 1.2; }
  } else if (en.state === 'up') {
    if (en.stateTimer <= 0) { en.state = 'sink'; en.stateTimer = 1.0; }
  }
}

function updateSkeeter(en) {
  en.phase += 1 / 60 * Math.PI;
  if (en.path === 'hover_h') {
    en.x = en.startX + Math.sin(en.phase * 0.6) * 24;
  } else {
    en.y = en.startY + Math.sin(en.phase * 0.6) * 16;
  }
}

function updatePelicanGuard(g, en) {
  en.x += en.vx;
  const [rMin, rMax] = en.range;
  const minX = rMin * TILE_SIZE, maxX = rMax * TILE_SIZE;
  if (en.x < minX) { en.x = minX; en.vx = Math.abs(en.vx); }
  if (en.x > maxX) { en.x = maxX; en.vx = -Math.abs(en.vx); }
  en.facing = en.vx < 0 ? -1 : 1;

  en.throwTimer -= 1 / 60;
  if (en.throwTimer <= 0) {
    en.throwTimer = 2.5;
    g.fishProjectiles.push({
      x: en.x + en.w / 2, y: en.y,
      vx: en.facing * 1.2, vy: -3.2, arcing: true,
    });
    g.events.push({ type: 'sfx', name: 'fish-lob' });
  }
}

// ---------------------------------------------------------------------------
// Flare pellets
// ---------------------------------------------------------------------------

function updateFlarePellets(g) {
  const grid = g.inBonus ? g.bonusGrid : g.level.grid;
  for (const fp of g.flarePellets) {
    if (!fp.alive) continue;
    fp.vy += GRAVITY * 0.6;
    const box = { x: fp.x, y: fp.y, w: 8, h: 8 };
    const resX = moveAABB(grid, box, fp.vx, 0, false);
    if (resX.x === box.x && fp.vx !== 0) { fp.vx = -fp.vx; fp.bounces = (fp.bounces || 0) + 1; }
    box.x = resX.x;
    const resY = moveAABB(grid, box, 0, fp.vy, false);
    if (resY.onGround) { fp.vy = -2.2; fp.bounces = (fp.bounces || 0) + 1; }
    box.y = resY.y;
    fp.x = box.x; fp.y = box.y;

    if ((fp.bounces || 0) >= FLARE_BOUNCES_MAX) fp.alive = false;

    for (const en of g.enemies) {
      if (!en.alive) continue;
      const enBox = { x: en.x, y: en.y, w: en.w, h: en.h };
      if (aabbOverlap(box, enBox)) {
        if (en.type === 'king_pelicano') { damageBoss(g, en); }
        else killEnemy(g, en);
        fp.alive = false;
      }
    }
  }
  g.flarePellets = g.flarePellets.filter(fp => fp.alive);
}

// ---------------------------------------------------------------------------
// Fish projectiles (pelican guard + boss)
// ---------------------------------------------------------------------------

function updateFishProjectiles(g, box) {
  const p = g.player;
  const pBox = { x: p.x, y: p.y, w: box.w, h: box.h };
  for (const fish of g.fishProjectiles) {
    fish.vy += GRAVITY * 0.5;
    fish.x += fish.vx;
    fish.y += fish.vy;
    if (aabbOverlap(pBox, { x: fish.x - 5, y: fish.y - 3, w: 10, h: 6 })) {
      if (p.invincTimer <= 0 && p.hurtTimer <= 0) hurtPlayer(g);
      fish.dead = true;
    }
    if (fish.y > (g.level.heightTiles * TILE_SIZE)) fish.dead = true;
  }
  g.fishProjectiles = g.fishProjectiles.filter(f => !f.dead);
}

// ---------------------------------------------------------------------------
// KING PELICANO boss
// ---------------------------------------------------------------------------

const SHRIMP_RAIN_COUNT = 20;

function spawnShrimpRain(g) {
  const decorations = g.level.decorations || [];
  const arenaCage = decorations.find(d => d.arenaCage);
  const cx = arenaCage ? arenaCage.x + 16 : (g.level.bossArena ? (g.level.bossArena.x0 + g.level.bossArena.x1) / 2 : 0);
  const cy = arenaCage ? arenaCage.y + 8 : 0;
  for (let i = 0; i < SHRIMP_RAIN_COUNT; i++) {
    const ang = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.8; // arc up+out
    const speed = 1.6 + Math.random() * 1.6;
    g.shrimpRain.push({
      x: cx, y: cy,
      vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed,
      life: 3, grounded: false,
    });
  }
}

function damageBoss(g, boss) {
  if (boss.phase === 'hurt' || boss.defeated) return;
  boss.hp -= 1;
  boss.speed += 0.25;
  if (boss.hp <= 0) {
    boss.defeated = true;
    boss.phase = 'defeat';
    boss.phaseTimer = 3;
    g.cageOpen = true;
    spawnShrimpRain(g);
    g.events.push({ type: 'sfx', name: 'boss-defeat' });
  } else {
    boss.phase = 'hurt';
    boss.phaseTimer = 0.6;
    g.events.push({ type: 'sfx', name: 'boss-squawk' });
  }
}

function updateShrimpRain(g, grid) {
  if (g.shrimpRain.length === 0) return;
  const groundY = g.level.bossArena ? g.level.bossArena.groundY : (g.level.heightTiles * TILE_SIZE);
  for (const s of g.shrimpRain) {
    if (s.grounded) { s.life -= 1 / 60; continue; }
    s.vy += GRAVITY * 0.5;
    s.x += s.vx; s.y += s.vy;
    if (s.y >= groundY - 10) { s.y = groundY - 10; s.grounded = true; }
    s.life -= 1 / 60;
  }
  g.shrimpRain = g.shrimpRain.filter(s => s.life > 0);
}

function updateBoss(g, box) {
  const boss = g.enemies.find(e => e.type === 'king_pelicano' && e.alive);
  if (!boss) return;
  const p = g.player;
  const pBox = { x: p.x, y: p.y, w: box.w, h: box.h };
  const arena = g.level.bossArena;

  boss.phaseTimer -= 1 / 60;

  if (boss.defeated) {
    if (boss.phaseTimer <= 0 && !g.won) {
      g.events.push({ type: 'boss-defeated', pearls: g.pearlsTotal, time: g.time, deaths: g.deaths });
      g.won = true;
    }
    return;
  }

  switch (boss.phase) {
    case 'strut': {
      boss.x += (p.x < boss.x ? -1 : 1) * boss.speed;
      boss.x = Math.max(arena.x0 + 20, Math.min(arena.x1 - 20 - boss.w, boss.x));
      if (boss.phaseTimer <= 0) { boss.phase = 'crouch'; boss.phaseTimer = 0.6; }
      break;
    }
    case 'crouch': {
      if (boss.phaseTimer <= 0) { boss.phase = 'swoop'; boss.phaseTimer = 0.9; boss.swoopDir = p.x < boss.x ? -1 : 1; }
      break;
    }
    case 'swoop': {
      boss.x += boss.swoopDir * (boss.speed + 2);
      boss.x = Math.max(arena.x0, Math.min(arena.x1 - boss.w, boss.x));
      if (boss.phaseTimer <= 0) { boss.phase = 'spit'; boss.phaseTimer = 0.2; boss.spitCount = 0; }
      break;
    }
    case 'spit': {
      if (boss.phaseTimer <= 0 && boss.spitCount < 3) {
        g.fishProjectiles.push({
          x: boss.x + boss.w / 2, y: boss.y + boss.h / 2,
          vx: (p.x < boss.x ? -1 : 1) * 1.4, vy: -3,
        });
        boss.spitCount += 1;
        boss.phaseTimer = 0.35;
      }
      if (boss.spitCount >= 3) { boss.phase = 'strut'; boss.phaseTimer = 2; }
      break;
    }
    case 'hurt': {
      if (boss.phaseTimer <= 0) { boss.phase = 'strut'; boss.phaseTimer = 1.5; }
      break;
    }
  }

  // stomp/contact detection
  const bossBox = { x: boss.x, y: boss.y, w: boss.w, h: boss.h };
  if (aabbOverlap(pBox, bossBox)) {
    if (stompCheck(p, box, boss)) {
      damageBoss(g, boss);
      p.vy = STOMP_BOUNCE_HELD;
      p.isJumping = true; p.onGround = false; p.hasFluttered = false;
    } else if (p.invincTimer <= 0 && p.hurtTimer <= 0 && boss.phase !== 'hurt') {
      hurtPlayer(g);
    }
  }
}

// ---------------------------------------------------------------------------
// Animation pose selection
// ---------------------------------------------------------------------------

function updateAnim(p) {
  p.animTimer += 1;
  const cycle = Math.floor(p.animTimer / 8) % 2;

  if (p.finished) { p.pose = 'pole'; return; }
  if (p.growFreezeTimer > 0) { p.pose = 'idle'; return; }
  if (p.hurtTimer > 0) { p.pose = 'hurt'; return; }
  if (!p.onGround) {
    p.pose = p.isFluttering ? (cycle === 0 ? 'flutter2f_a' : 'flutter2f_b') : 'jump';
    return;
  }
  if (p.skidding) { p.pose = 'skid'; return; }
  if (Math.abs(p.vx) > 0.05) {
    p.pose = p.running ? (cycle === 0 ? 'run2f_a' : 'run2f_b') : (cycle === 0 ? 'walk2f_a' : 'walk2f_b');
    return;
  }
  p.pose = 'idle';
}
