// src/game.mjs — entities, AI, combat, weapons, pickups, doors, player physics
// Exports (contract): createGame(assets), update(game, input, dt)
// entity states: idle/roam/chase/attack/pain/dead

import { MAP } from './map.mjs';
import { castRay } from './engine.mjs';

// ---------------------------------------------------------------------------
// Tuning tables (per DESIGN.md)
// ---------------------------------------------------------------------------
const ENEMY_STATS = {
  lawnFlamingo: { hp: 20, speed: 0.9, attackRange: 6.5, attackDmg: 8, attackCooldown: 1.6, meleeRange: 0, painChance: 0.35, radius: 0.35 },
  crabDemon: { hp: 35, speed: 1.5, attackRange: 5.5, attackDmg: 12, meleeDmg: 10, attackCooldown: 1.3, meleeRange: 0.9, painChance: 0.35, radius: 0.35 },
  brineGator: { hp: 90, speed: 1.2, chargeSpeed: 3.4, attackRange: 1.0, attackDmg: 20, attackCooldown: 1.0, meleeRange: 1.0, painChance: 0.35, radius: 0.4 },
  ashVulture: { hp: 25, speed: 1.6, swoopSpeed: 4.2, attackRange: 1.0, attackDmg: 10, attackCooldown: 1.4, meleeRange: 1.0, painChance: 0.35, radius: 0.3 },
  plastingo: { hp: 400, speed: 0.7, attackRange: 9, attackDmg: 10, attackCooldown: 2.0, meleeRange: 0, painChance: 0.2, radius: 0.6 },
};

const WEAPON_ORDER = ['peck', 'squawkCannon', 'featherStorm', 'eggLobber'];

const WEAPON_STATS = {
  peck: { ammoType: null, damage: 10, range: 1.1, arc: Math.PI / 3, cooldown: 0.28 },
  squawkCannon: { ammoType: 'breath', pellets: 5, pelletDamage: 6, cone: 0.5, range: 7, cooldown: 0.7, knockback: 0.35 },
  featherStorm: { ammoType: 'feathers', damage: 5, spread: 0.06, range: 9, rate: 8, cooldown: 1 / 8 },
  eggLobber: { ammoType: 'eggs', damage: 40, splashRadius: 3, cooldown: 0.9, gravity: 9.8, speed: 5.5, selfDamage: 15 },
};

const PICKUP_STATS = {
  shrimp: { heal: 15 },
  goldenShrimp: { heal: 50 },
  featherBundle: { ammoType: 'feathers', amount: 40 },
  eggCarton: { ammoType: 'eggs', amount: 3 },
  preenOil: { buff: 'preenOil' },
};

const AMMO_CAPS = { breath: 50, feathers: 200, eggs: 10 };

const GRID_SIZE = MAP.gridSize;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function isSolidCell(grid, cx, cy) {
  if (cx < 0 || cx >= GRID_SIZE || cy < 0 || cy >= GRID_SIZE) return true;
  const cell = grid[cy][cx];
  return !(cell === 0 || cell === 20);
}

function circleCollides(grid, x, y, radius, ignoreDoors) {
  const minX = Math.floor(x - radius), maxX = Math.floor(x + radius);
  const minY = Math.floor(y - radius), maxY = Math.floor(y + radius);
  for (let cy = minY; cy <= maxY; cy++) {
    for (let cx = minX; cx <= maxX; cx++) {
      if (cx < 0 || cx >= GRID_SIZE || cy < 0 || cy >= GRID_SIZE) return true;
      const cell = grid[cy][cx];
      let solid = !(cell === 0 || cell === 20);
      if (ignoreDoors && cell === 9) solid = false;
      if (solid) {
        const closestX = Math.max(cx, Math.min(x, cx + 1));
        const closestY = Math.max(cy, Math.min(y, cy + 1));
        const dx = x - closestX, dy = y - closestY;
        if (dx * dx + dy * dy < radius * radius) return true;
      }
    }
  }
  return false;
}

function hasLOS(game, x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.001) return true;
  const angle = Math.atan2(dy, dx);
  const hit = castRay(x0, y0, angle, game.grid, GRID_SIZE);
  if (!hit) return true; // ray never hit a wall within depth -> clear
  return hit.dist >= dist - 0.15;
}

function dist2(ax, ay, bx, by) { return (ax - bx) ** 2 + (ay - by) ** 2; }

function moveWithSlide(game, ent, nx, ny) {
  const r = ent.radius;
  if (!circleCollides(game.grid, nx, ent.y, r)) ent.x = nx;
  if (!circleCollides(game.grid, ent.x, ny, r)) ent.y = ny;
}

function rngRange(a, b) { return a + Math.random() * (b - a); }

// ---------------------------------------------------------------------------
// createGame(assets)
// ---------------------------------------------------------------------------
export function createGame(assets) {
  const grid = MAP.grid.map((row) => row.slice()); // mutable copy (pushwalls/doors)

  const player = {
    x: MAP.playerStart.x,
    y: MAP.playerStart.y,
    angle: MAP.playerStart.angle || 0,
    radius: 0.25,
    pink: 100,
    maxPink: 100,
    state: 'ALIVE', // ALIVE | DEAD | WIN
    weapon: 'peck',
    weaponIndex: 0,
    ammo: { breath: 50, feathers: 0, eggs: 0 },
    fireTimer: 0,
    fireHeld: false,
    switching: false,
    switchTimer: 0,
    switchFrom: null,
    buffs: { preenOil: 0 }, // seconds remaining
    damageFlash: 0,
    pickupFlash: 0,
    screenShake: 0,
    kills: 0,
    killsTotal: 0,
    itemsPicked: 0,
    itemsTotal: 0,
    timeSec: 0,
    viewmodelBob: 0,
    mugTimer: 0,
    mugState: 'idle',
    lastHitTimer: 0,
  };

  const enemies = [];
  const pickups = [];
  const doors = []; // {x,y,state:'closed'|'opening'|'open'|'closing', timer}
  const projectiles = []; // {type:'egg', x,y,z,vx,vy,vz,age}
  const tracers = []; // {x0,y0,x1,y1,life}
  const decor = []; // corpses persist here as non-blocking sprites (also kept as enemy state='dead')

  for (const t of MAP.things) {
    if (ENEMY_STATS[t.type]) {
      const ent = createEnemy(t);
      // Gator pens: gators stay dormant (invisible/inert) until the walk-over
      // trigger fires (see gatorTrigger below), per DESIGN.md zone 4.
      if (t.type === 'brineGator') {
        ent.state = 'dormant';
      }
      enemies.push(ent);
    } else if (PICKUP_STATS[t.type]) {
      pickups.push({ type: t.type, x: t.x, y: t.y, alive: true, bob: Math.random() * Math.PI * 2 });
      player.itemsTotal++;
    }
  }
  player.killsTotal = enemies.length;

  // scan grid for door cells (type 9) to track door animation state
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (grid[y][x] === 9) {
        doors.push({ x, y, state: 'closed', timer: 0 });
      }
    }
  }

  const secret = { triggered: false, x: 20, y: 8 }; // pushwall tile grid[8][20]
  // walk-over trigger releases the gators: any tile in the pens' entry aisle
  const gatorTrigger = { triggered: false, x0: 20, y0: 17, x1: 21, y1: 17 };

  const game = {
    assets,
    grid,
    map: { grid, gridSize: GRID_SIZE },
    player,
    enemies,
    pickups,
    doors,
    projectiles,
    tracers,
    decor,
    secret,
    gatorTrigger,
    stats: null,
    levelName: MAP.name,
    levelNameTimer: 3,
    sfx: null, // optional hook set by main.mjs: (name) => {}
  };

  return game;
}

function createEnemy(t) {
  const stats = ENEMY_STATS[t.type];
  return {
    type: t.type,
    x: t.x, y: t.y,
    angle: t.angle || 0,
    radius: stats.radius,
    hp: stats.hp,
    maxHp: stats.hp,
    state: 'idle', // idle/roam/chase/attack/pain/dead
    stateTimer: rngRange(0, 1),
    attackCooldown: 0,
    painFlinch: 0,
    animTimer: 0,
    animFrame: 0,
    wobble: 0,
    wanderAngle: Math.random() * Math.PI * 2,
    diving: false,
    swoopTarget: null,
    summonedFlamingos: false, // plastingo
    dead: false,
    dieAnimT: 0,
    corpse: false,
  };
}

// ---------------------------------------------------------------------------
// update(game, input, dt)
// input: { forward, strafe, turn (rad delta), fire, use, weaponSwitch (1-4|null),
//          cycleWeapon (bool edge) }
// ---------------------------------------------------------------------------
export function update(game, input, dt) {
  const { player } = game;

  if (player.state === 'DEAD' || player.state === 'WIN') {
    // still tick some cosmetics (mugshot blink not needed once dead)
    return;
  }

  player.timeSec += dt;

  updatePlayerPhysics(game, input, dt);
  updateWeapons(game, input, dt);
  updateBuffs(game, dt);
  updateDamageFloors(game, dt);
  updateDoors(game, dt);
  handleUse(game, input);
  updateGatorTrigger(game);
  updateEnemies(game, dt);
  updateProjectiles(game, dt);
  updatePickupCollisions(game);
  updateSecret(game, input);
  updateExitSwitch(game, input);
  updateMugshot(game, dt);
  decayFlashes(game, dt);

  if (player.pink <= 0 && player.state === 'ALIVE') {
    player.state = 'DEAD';
    if (game.sfx) game.sfx('die');
  }
}

// ---------------------------------------------------------------------------
// Player physics
// ---------------------------------------------------------------------------
function updatePlayerPhysics(game, input, dt) {
  const { player, grid } = game;
  player.angle += (input.turn || 0);

  const forward = { x: Math.cos(player.angle), y: Math.sin(player.angle) };
  const strafeDir = { x: -Math.sin(player.angle), y: Math.cos(player.angle) };

  let mx = 0, my = 0;
  const f = input.forward || 0; // -1..1
  const s = input.strafe || 0; // -1..1
  mx += forward.x * f + strafeDir.x * s;
  my += forward.y * f + strafeDir.y * s;

  const len = Math.hypot(mx, my);
  const speedMul = player.buffs.preenOil > 0 ? 1 : 1; // preen oil affects damage, not speed
  const MOVE_SPEED = 3.2 * speedMul;
  let moving = false;
  if (len > 0.001) {
    mx = (mx / len) * MOVE_SPEED * dt;
    my = (my / len) * MOVE_SPEED * dt;
    moveWithSlideDoorAware(game, player, player.x + mx, player.y + my);
    moving = true;
  }

  player.viewmodelBob = moving ? player.viewmodelBob + dt * 10 : player.viewmodelBob * 0.9;
}

function moveWithSlideDoorAware(game, ent, nx, ny) {
  const r = ent.radius;
  const grid = game.grid;
  const solidAt = (x, y) => {
    const minX = Math.floor(x - r), maxX = Math.floor(x + r);
    const minY = Math.floor(y - r), maxY = Math.floor(y + r);
    for (let cy = minY; cy <= maxY; cy++) {
      for (let cx = minX; cx <= maxX; cx++) {
        if (cx < 0 || cx >= GRID_SIZE || cy < 0 || cy >= GRID_SIZE) return true;
        const cell = grid[cy][cx];
        let solid = !(cell === 0 || cell === 20);
        if (cell === 9) {
          const door = game.doors.find((d) => d.x === cx && d.y === cy);
          if (door && door.state === 'open') solid = false;
        }
        if (solid) {
          const closestX = Math.max(cx, Math.min(x, cx + 1));
          const closestY = Math.max(cy, Math.min(y, cy + 1));
          const dx = x - closestX, dy = y - closestY;
          if (dx * dx + dy * dy < r * r) return true;
        }
      }
    }
    return false;
  };
  if (!solidAt(nx, ent.y)) ent.x = nx;
  if (!solidAt(ent.x, ny)) ent.y = ny;
}

// ---------------------------------------------------------------------------
// Weapons
// ---------------------------------------------------------------------------
function updateWeapons(game, input, dt) {
  const { player } = game;

  if (player.fireTimer > 0) player.fireTimer -= dt;

  // weapon switching
  if (input.weaponSwitch && WEAPON_ORDER[input.weaponSwitch - 1] && WEAPON_ORDER[input.weaponSwitch - 1] !== player.weapon && !player.switching) {
    beginWeaponSwitch(player, WEAPON_ORDER[input.weaponSwitch - 1]);
  }
  if (input.cycleWeapon && !player.switching) {
    const idx = (WEAPON_ORDER.indexOf(player.weapon) + 1) % WEAPON_ORDER.length;
    beginWeaponSwitch(player, WEAPON_ORDER[idx]);
  }

  if (player.switching) {
    player.switchTimer -= dt;
    if (player.switchTimer <= 0) {
      player.switching = false;
    }
  }

  // BREATH regen (squawk cannon ammo)
  player.breathRegenTimer = (player.breathRegenTimer || 0) - dt;
  if (player.breathRegenTimer <= 0) {
    player.breathRegenTimer = 1.5;
    player.ammo.breath = Math.min(AMMO_CAPS.breath, player.ammo.breath + 1);
  }

  const stats = WEAPON_STATS[player.weapon];

  if (input.fire && !player.switching && player.fireTimer <= 0) {
    tryFireWeapon(game, stats);
  }
}

function beginWeaponSwitch(player, toWeapon) {
  player.switching = true;
  player.switchTimer = 0.3; // lower/raise animation
  player.switchFrom = player.weapon;
  player.weapon = toWeapon;
  player.weaponIndex = WEAPON_ORDER.indexOf(toWeapon);
}

function tryFireWeapon(game, stats) {
  const { player } = game;
  if (stats.ammoType && player.ammo[stats.ammoType] <= 0) return;

  player.fireTimer = stats.cooldown;
  player.mugState = 'angry';
  player.mugTimer = 0.3;

  if (player.weapon === 'peck') {
    firePeck(game);
  } else if (player.weapon === 'squawkCannon') {
    fireSquawk(game);
    player.ammo.breath -= 10;
  } else if (player.weapon === 'featherStorm') {
    fireFeatherStorm(game);
    player.ammo.feathers -= 1;
  } else if (player.weapon === 'eggLobber') {
    fireEggLobber(game);
    player.ammo.eggs -= 1;
  }
  if (game.sfx) {
    const sfxName = { peck: 'peck', squawkCannon: 'squawk', featherStorm: 'squawk', eggLobber: 'lob' }[player.weapon];
    game.sfx(sfxName);
  }
}

function firePeck(game) {
  const { player } = game;
  const stats = WEAPON_STATS.peck;
  for (const e of game.enemies) {
    if (e.state === 'dead') continue;
    const dx = e.x - player.x, dy = e.y - player.y;
    const d = Math.hypot(dx, dy);
    if (d > stats.range) continue;
    const angTo = Math.atan2(dy, dx);
    let diff = angTo - player.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    if (Math.abs(diff) <= stats.arc / 2) {
      damageEnemy(game, e, stats.damage);
    }
  }
}

function fireSquawk(game) {
  const { player } = game;
  const stats = WEAPON_STATS.squawkCannon;
  player.screenShake = 1.0;
  for (let i = 0; i < stats.pellets; i++) {
    const spreadAngle = player.angle + (Math.random() - 0.5) * stats.cone;
    hitscanPellet(game, spreadAngle, stats.range, stats.pelletDamage, stats.knockback);
  }
}

function fireFeatherStorm(game) {
  const { player } = game;
  const stats = WEAPON_STATS.featherStorm;
  const angle = player.angle + (Math.random() - 0.5) * stats.spread;
  hitscanPellet(game, angle, stats.range, stats.damage, 0, true);
}

function hitscanPellet(game, angle, range, damage, knockback, tracer) {
  const { player } = game;
  const hit = castRay(player.x, player.y, angle, game.grid, GRID_SIZE);
  const maxDist = hit ? Math.min(hit.dist, range) : range;
  let closest = null, closestDist = Infinity;
  for (const e of game.enemies) {
    if (e.state === 'dead') continue;
    // project enemy onto ray
    const dx = e.x - player.x, dy = e.y - player.y;
    const along = dx * Math.cos(angle) + dy * Math.sin(angle);
    if (along < 0 || along > maxDist) continue;
    const perpX = player.x + Math.cos(angle) * along;
    const perpY = player.y + Math.sin(angle) * along;
    const perpDist = Math.hypot(e.x - perpX, e.y - perpY);
    if (perpDist <= e.radius + 0.25 && along < closestDist) {
      closest = e; closestDist = along;
    }
  }
  const endDist = tracer ? maxDist : (closest ? closestDist : maxDist);
  if (tracer) {
    game.tracers.push({
      x0: player.x, y0: player.y,
      x1: player.x + Math.cos(angle) * endDist,
      y1: player.y + Math.sin(angle) * endDist,
      life: 0.05,
    });
  }
  if (closest) {
    damageEnemy(game, closest, damage);
    if (knockback) {
      const dx = closest.x - player.x, dy = closest.y - player.y;
      const d = Math.hypot(dx, dy) || 1;
      closest.x += (dx / d) * knockback;
      closest.y += (dy / d) * knockback;
    }
  }
}

function fireEggLobber(game) {
  const { player } = game;
  const stats = WEAPON_STATS.eggLobber;
  const dirX = Math.cos(player.angle), dirY = Math.sin(player.angle);
  game.projectiles.push({
    type: 'egg',
    x: player.x + dirX * 0.4, y: player.y + dirY * 0.4, z: 0.4,
    vx: dirX * stats.speed, vy: dirY * stats.speed, vz: 2.2,
    age: 0,
  });
}

function updateProjectiles(game, dt) {
  const stats = WEAPON_STATS.eggLobber;
  for (let i = game.projectiles.length - 1; i >= 0; i--) {
    const p = game.projectiles[i];
    p.age += dt;
    p.vz -= stats.gravity * dt;
    const nx = p.x + p.vx * dt;
    const ny = p.y + p.vy * dt;
    p.z += p.vz * dt;

    let exploded = false;
    if (p.z <= 0) exploded = true;
    if (!exploded && circleCollides(game.grid, nx, ny, 0.1)) exploded = true;

    // hit enemy directly
    if (!exploded) {
      for (const e of game.enemies) {
        if (e.state === 'dead') continue;
        if (dist2(nx, ny, e.x, e.y) < (e.radius + 0.2) ** 2) { exploded = true; break; }
      }
    }

    if (exploded) {
      eggsplode(game, nx, ny);
      game.projectiles.splice(i, 1);
      continue;
    }
    p.x = nx; p.y = ny;
    if (p.age > 5) game.projectiles.splice(i, 1);
  }

  for (let i = game.tracers.length - 1; i >= 0; i--) {
    game.tracers[i].life -= dt;
    if (game.tracers[i].life <= 0) game.tracers.splice(i, 1);
  }
}

function eggsplode(game, x, y) {
  const stats = WEAPON_STATS.eggLobber;
  if (game.sfx) game.sfx('eggsplode');
  for (const e of game.enemies) {
    if (e.state === 'dead') continue;
    const d = Math.hypot(e.x - x, e.y - y);
    if (d <= stats.splashRadius) {
      const falloff = 1 - d / stats.splashRadius;
      damageEnemy(game, e, stats.damage * Math.max(0.25, falloff));
    }
  }
  const { player } = game;
  const pd = Math.hypot(player.x - x, player.y - y);
  if (pd <= stats.splashRadius) {
    const falloff = 1 - pd / stats.splashRadius;
    damagePlayer(game, stats.selfDamage * Math.max(0.25, falloff));
  }
}

// ---------------------------------------------------------------------------
// Damage helpers
// ---------------------------------------------------------------------------
function damageEnemy(game, e, amount) {
  if (e.state === 'dead') return;
  e.hp -= amount;
  if (game.sfx) game.sfx('enemyPain');
  if (e.hp <= 0) {
    killEnemy(game, e);
    return;
  }
  if (Math.random() < (ENEMY_STATS[e.type].painChance)) {
    e.state = 'pain';
    e.stateTimer = 0.3;
  }
  // PLASTINGO summon check
  if (e.type === 'plastingo' && !e.summonedFlamingos && e.hp <= e.maxHp * 0.5) {
    e.summonedFlamingos = true;
    summonLawnFlamingos(game, e);
  }
}

function summonLawnFlamingos(game, boss) {
  for (let i = 0; i < 2; i++) {
    const ang = Math.random() * Math.PI * 2;
    const nf = createEnemy({ type: 'lawnFlamingo', x: boss.x + Math.cos(ang) * 1.5, y: boss.y + Math.sin(ang) * 1.5 });
    game.enemies.push(nf);
    game.player.killsTotal++;
  }
}

function killEnemy(game, e) {
  e.state = 'dead';
  e.dieAnimT = 0;
  e.corpse = false;
  game.player.kills++;
  if (game.sfx) game.sfx('enemyDie');
}

function damagePlayer(game, amount) {
  const { player } = game;
  if (player.state !== 'ALIVE') return;
  const mult = player.buffs.preenOil > 0 ? 0.5 : 1;
  player.pink = Math.max(0, player.pink - amount * mult);
  player.damageFlash = 1;
  player.mugState = 'ouch';
  player.mugTimer = 0.35;
  player.lastHitTimer = 0.35;
  if (game.sfx) game.sfx('hurt');
}

// ---------------------------------------------------------------------------
// Buffs / floors / flashes
// ---------------------------------------------------------------------------
function updateBuffs(game, dt) {
  const { player } = game;
  if (player.buffs.preenOil > 0) {
    player.buffs.preenOil = Math.max(0, player.buffs.preenOil - dt);
  }
}

function updateDamageFloors(game, dt) {
  const { player, grid } = game;
  const cx = Math.floor(player.x), cy = Math.floor(player.y);
  if (cx >= 0 && cx < GRID_SIZE && cy >= 0 && cy < GRID_SIZE && grid[cy][cx] === 20) {
    damagePlayer(game, 5 * dt);
  }
}

function decayFlashes(game, dt) {
  const { player } = game;
  player.damageFlash = Math.max(0, player.damageFlash - dt * 3);
  player.pickupFlash = Math.max(0, player.pickupFlash - dt * 3);
  player.screenShake = Math.max(0, player.screenShake - dt * 4);
  player.lastHitTimer = Math.max(0, player.lastHitTimer - dt);
  if (game.levelNameTimer > 0) game.levelNameTimer -= dt;
}

// ---------------------------------------------------------------------------
// Doors
// ---------------------------------------------------------------------------
function updateDoors(game, dt) {
  for (const door of game.doors) {
    if (door.state === 'opening') {
      door.timer -= dt;
      if (door.timer <= 0) { door.state = 'open'; door.timer = 4; }
    } else if (door.state === 'open') {
      door.timer -= dt;
      if (door.timer <= 0) door.state = 'closing';
    } else if (door.state === 'closing') {
      door.timer -= dt;
      if (door.timer <= 0) door.state = 'closed';
    }
  }
}

function tryUseDoor(game) {
  const { player } = game;
  const lookX = player.x + Math.cos(player.angle) * 1.0;
  const lookY = player.y + Math.sin(player.angle) * 1.0;
  const cx = Math.floor(lookX), cy = Math.floor(lookY);
  const door = game.doors.find((d) => d.x === cx && d.y === cy);
  if (door && door.state === 'closed') {
    door.state = 'opening';
    door.timer = 0.4;
    if (game.sfx) game.sfx('doorOpen');
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Secret pushwall + exit switch
// ---------------------------------------------------------------------------
function updateSecret(game, input) {
  if (!input.use || game.secret.triggered) return;
  const { player } = game;
  const lookX = player.x + Math.cos(player.angle) * 1.0;
  const lookY = player.y + Math.sin(player.angle) * 1.0;
  const cx = Math.floor(lookX), cy = Math.floor(lookY);
  if (cx === game.secret.x && cy === game.secret.y) {
    game.secret.triggered = true;
    game.grid[game.secret.y][game.secret.x] = 0; // pushwall opens
  }
}

function updateGatorTrigger(game) {
  if (game.gatorTrigger.triggered) return;
  const { player } = game;
  const t = game.gatorTrigger;
  if (player.x >= t.x0 && player.x <= t.x1 + 1 && player.y >= t.y0 && player.y <= t.y1 + 1) {
    game.gatorTrigger.triggered = true;
    for (const e of game.enemies) {
      if (e.type === 'brineGator' && e.state === 'dormant') {
        e.state = 'idle';
        e.stateTimer = 0.2;
      }
    }
    if (game.sfx) game.sfx('enemyAttack');
  }
}

function updateExitSwitch(game, input) {
  if (!input.use) return;
  const { player } = game;
  const lookX = player.x + Math.cos(player.angle) * 1.0;
  const lookY = player.y + Math.sin(player.angle) * 1.0;
  const cx = Math.floor(lookX), cy = Math.floor(lookY);
  if (cx >= 0 && cx < GRID_SIZE && cy >= 0 && cy < GRID_SIZE && game.grid[cy][cx] === 10) {
    winGame(game);
  }
}

function winGame(game) {
  const { player } = game;
  if (player.state !== 'ALIVE') return;
  player.state = 'WIN';
  const killPct = player.killsTotal > 0 ? Math.round((player.kills / player.killsTotal) * 100) : 100;
  const itemPct = player.itemsTotal > 0 ? Math.round((player.itemsPicked / player.itemsTotal) * 100) : 100;
  game.stats = { killPct, itemPct, timeSec: player.timeSec };
  if (game.sfx) game.sfx('win');
}

// ---------------------------------------------------------------------------
// Input "use" (E key) — doors, dispatched from main.mjs via input.use
// edge-trigger. Secret pushwall + exit switch are checked separately above
// (updateSecret / updateExitSwitch), also gated on input.use.
// ---------------------------------------------------------------------------
function handleUse(game, input) {
  if (!input.use) return;
  tryUseDoor(game);
}

// ---------------------------------------------------------------------------
// Pickups
// ---------------------------------------------------------------------------
function updatePickupCollisions(game) {
  const { player } = game;
  for (const p of game.pickups) {
    if (!p.alive) continue;
    const d = Math.hypot(p.x - player.x, p.y - player.y);
    if (d < player.radius + 0.3) {
      applyPickup(game, p);
    }
  }
}

function applyPickup(game, p) {
  const stats = PICKUP_STATS[p.type];
  const { player } = game;
  if (stats.heal) {
    if (player.pink >= player.maxPink) return; // don't consume if full, allow later pickup
    player.pink = Math.min(player.maxPink, player.pink + stats.heal);
  } else if (stats.ammoType) {
    const cap = AMMO_CAPS[stats.ammoType];
    player.ammo[stats.ammoType] = Math.min(cap, (player.ammo[stats.ammoType] || 0) + stats.amount);
  } else if (stats.buff === 'preenOil') {
    player.buffs.preenOil = 30;
  }
  p.alive = false;
  player.pickupFlash = 1;
  player.itemsPicked++;
  if (game.sfx) game.sfx('pickup');
}

// ---------------------------------------------------------------------------
// Enemy AI
// ---------------------------------------------------------------------------
function updateEnemies(game, dt) {
  const { player } = game;
  for (const e of game.enemies) {
    e.animTimer += dt;
    if (e.state === 'dead') {
      if (e.dieAnimT < 1) {
        e.dieAnimT = Math.min(1, e.dieAnimT + dt * 2.5);
        if (e.dieAnimT >= 1) e.corpse = true;
      }
      continue;
    }

    const stats = ENEMY_STATS[e.type];
    const toPlayer = Math.hypot(player.x - e.x, player.y - e.y);
    const canSee = toPlayer < 14 && hasLOS(game, e.x, e.y, player.x, player.y);

    e.attackCooldown = Math.max(0, e.attackCooldown - dt);

    switch (e.state) {
      case 'dormant': {
        // inert until gatorTrigger flips its state to 'idle'
        break;
      }
      case 'idle': {
        e.stateTimer -= dt;
        if (canSee) {
          e.state = 'chase';
        } else if (e.stateTimer <= 0) {
          e.state = 'roam';
          e.stateTimer = rngRange(1, 2.5);
          e.wanderAngle = Math.random() * Math.PI * 2;
        }
        break;
      }
      case 'roam': {
        e.stateTimer -= dt;
        const wx = e.x + Math.cos(e.wanderAngle) * stats.speed * 0.4 * dt;
        const wy = e.y + Math.sin(e.wanderAngle) * stats.speed * 0.4 * dt;
        moveWithSlide(game, e, wx, wy);
        if (canSee) {
          e.state = 'chase';
        } else if (e.stateTimer <= 0) {
          e.state = 'idle';
          e.stateTimer = rngRange(1, 3);
        }
        break;
      }
      case 'chase': {
        if (!canSee && toPlayer > 16) {
          e.state = 'idle';
          e.stateTimer = 1;
          break;
        }
        stepChase(game, e, stats, toPlayer, dt);
        if (toPlayer <= (stats.meleeRange || stats.attackRange) && e.attackCooldown <= 0) {
          e.state = 'attack';
          e.attackAnimT = 0;
        }
        break;
      }
      case 'attack': {
        e.attackAnimT = (e.attackAnimT || 0) + dt;
        if (e.attackAnimT >= 0.4) {
          performAttack(game, e, stats, toPlayer);
          e.attackCooldown = stats.attackCooldown;
          e.state = 'chase';
        }
        break;
      }
      case 'pain': {
        e.stateTimer -= dt;
        if (e.stateTimer <= 0) e.state = canSee ? 'chase' : 'idle';
        break;
      }
    }
  }
}

function stepChase(game, e, stats, toPlayer, dt) {
  const { player } = game;
  const dx = player.x - e.x, dy = player.y - e.y;
  const baseAngle = Math.atan2(dy, dx);
  e.angle = baseAngle;

  let speed = stats.speed;
  let moveAngle = baseAngle;

  if (e.type === 'brineGator') {
    // fast charge when LOS
    speed = stats.chargeSpeed;
  } else if (e.type === 'crabDemon') {
    // strafes sideways while approaching
    e.strafePhase = (e.strafePhase || 0) + dt;
    const strafe = Math.sin(e.strafePhase * 2) * 0.9;
    moveAngle = baseAngle + strafe;
  } else if (e.type === 'ashVulture') {
    // hovers + swoop-charges
    if (!e.diving && toPlayer < 5 && Math.random() < 0.02) {
      e.diving = true;
      e.diveTimer = 0.8;
    }
    if (e.diving) {
      speed = stats.swoopSpeed;
      e.diveTimer -= dt;
      if (e.diveTimer <= 0) e.diving = false;
    } else {
      speed = stats.speed * 0.6;
      e.hoverPhase = (e.hoverPhase || 0) + dt;
      moveAngle = baseAngle + Math.sin(e.hoverPhase) * 0.3;
    }
  } else if (e.type === 'lawnFlamingo') {
    // waddle-wobble
    e.wobble = Math.sin(e.animTimer * 6) * 0.3;
    moveAngle = baseAngle + e.wobble * 0.5;
    speed = stats.speed * (0.85 + Math.abs(Math.sin(e.animTimer * 6)) * 0.3);
  } else if (e.type === 'plastingo') {
    speed = stats.speed;
  }

  const nx = e.x + Math.cos(moveAngle) * speed * dt;
  const ny = e.y + Math.sin(moveAngle) * speed * dt;
  moveWithSlide(game, e, nx, ny);
}

function performAttack(game, e, stats, toPlayer) {
  const { player } = game;
  if (game.sfx) game.sfx('enemyAttack');

  if (e.type === 'lawnFlamingo') {
    // slow pellet ranged
    if (toPlayer <= stats.attackRange) damagePlayer(game, stats.attackDmg);
  } else if (e.type === 'crabDemon') {
    if (toPlayer <= stats.meleeRange) {
      damagePlayer(game, stats.meleeDmg);
    } else if (toPlayer <= stats.attackRange) {
      damagePlayer(game, stats.attackDmg); // thrown pincer projectile treated as instant-resolve
    }
  } else if (e.type === 'brineGator') {
    if (toPlayer <= stats.meleeRange + 0.3) damagePlayer(game, stats.attackDmg);
  } else if (e.type === 'ashVulture') {
    if (toPlayer <= stats.meleeRange + 0.3) damagePlayer(game, stats.attackDmg);
  } else if (e.type === 'plastingo') {
    // triple spread pellets
    if (toPlayer <= stats.attackRange) {
      damagePlayer(game, stats.attackDmg);
      damagePlayer(game, stats.attackDmg * 0.5);
    }
  }
}

// ---------------------------------------------------------------------------
// Mugshot state machine (idle blink / look / angry / ouch)
// ---------------------------------------------------------------------------
function updateMugshot(game, dt) {
  const { player } = game;
  player.mugTimer -= dt;
  if (player.mugTimer <= 0) {
    if (player.mugState !== 'idle') {
      player.mugState = 'idle';
    }
    player.mugTimer = rngRange(1.5, 4);
    if (Math.random() < 0.5) {
      player.mugBlink = true;
      player.mugBlinkTimer = 0.12;
    } else if (Math.random() < 0.5) {
      player.mugLook = Math.random() < 0.5 ? -1 : 1;
      player.mugLookTimer = 0.6;
    }
  }
  if (player.mugBlinkTimer > 0) {
    player.mugBlinkTimer -= dt;
    if (player.mugBlinkTimer <= 0) player.mugBlink = false;
  }
  if (player.mugLookTimer > 0) {
    player.mugLookTimer -= dt;
    if (player.mugLookTimer <= 0) player.mugLook = 0;
  }
}

