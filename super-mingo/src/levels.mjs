// SUPER MINGO — levels.mjs
// Tile legend, level data (ASCII grids), entity spawn lists, theme ids.

export const TILE_SIZE = 16;

// '.' air, '#' ground saltstone, '=' platform top (one-way), 'B' salt brick (breakable pink),
// '?' oyster block (default pearl), 'S' shrimp block, 'G' golden-shrimp block, 'E' egg block,
// 'O' preen-oil block, '|' mangrove stump (warp pair), '^' spikes (urchin bed),
// '~' brine surface (deadly pit water), 'P' perch pole (level end),
// '-' barrel float platform (moves on path), 'C' checkpoint shell.
export const TILE_LEGEND = {
  '.': { name: 'air', solid: false },
  '#': { name: 'ground_saltstone', solid: true },
  '=': { name: 'platform_top', solid: 'oneway' },
  'B': { name: 'salt_brick', solid: true, breakable: true },
  '?': { name: 'oyster_block', solid: true, bump: 'pearl' },
  'S': { name: 'oyster_block', solid: true, bump: 'shrimp' },
  'G': { name: 'oyster_block', solid: true, bump: 'golden_shrimp' },
  'E': { name: 'oyster_block', solid: true, bump: 'egg' },
  'O': { name: 'oyster_block', solid: true, bump: 'preen_oil' },
  '|': { name: 'mangrove_stump', solid: true, warp: true },
  '^': { name: 'spikes', solid: false, hazard: true },
  '~': { name: 'brine_surface', solid: false, hazard: true, deathPlane: true },
  'P': { name: 'perch_pole', solid: false, levelEnd: true },
  '-': { name: 'barrel_float', solid: 'moving' },
  'C': { name: 'checkpoint_shell', solid: false, checkpoint: true },
};

function blankGrid(w, h) {
  const g = [];
  for (let r = 0; r < h; r++) g.push('.'.repeat(w));
  return g;
}

function setCh(gridArr, r, c, ch) {
  if (r < 0 || r >= gridArr.length) return;
  const row = gridArr[r];
  if (c < 0 || c >= row.length) return;
  gridArr[r] = row.substring(0, c) + ch + row.substring(c + 1);
}

function fillRange(gridArr, r, c0, c1, ch) {
  for (let c = c0; c <= c1; c++) setCh(gridArr, r, c, ch);
}

// -----------------------------------------------------------------------
// LEVEL 1-1: SALT FLATS SPRINT (day, ~210 tiles wide)
// -----------------------------------------------------------------------

const W1 = 210;
const H1 = 14;

function buildLevel1_1() {
  const g = blankGrid(W1, H1);
  const GROUND = H1 - 2; // row 12
  const GROUND2 = H1 - 1; // row 13

  fillRange(g, GROUND, 0, W1 - 1, '#');
  fillRange(g, GROUND2, 0, W1 - 1, '#');

  // --- oyster row: pearl, pearl, SHRIMP tutorial (cols 25-34) ---
  fillRange(g, GROUND - 4, 26, 26, '?');
  fillRange(g, GROUND - 4, 28, 28, '?');
  fillRange(g, GROUND - 4, 30, 30, 'S');

  // --- salt-brick staircase w/ hidden EGG block above (cols 35-46) ---
  setCh(g, GROUND - 1, 36, 'B');
  setCh(g, GROUND - 1, 37, 'B');
  setCh(g, GROUND - 2, 38, 'B');
  setCh(g, GROUND - 2, 39, 'B');
  setCh(g, GROUND - 3, 40, 'B');
  setCh(g, GROUND - 3, 41, 'B');
  setCh(g, GROUND - 4, 42, 'B');
  setCh(g, GROUND - 4, 43, 'B');
  setCh(g, GROUND - 7, 42, 'E'); // hidden EGG, flutter to reach

  setCh(g, GROUND - 3, 44, 'B');
  setCh(g, GROUND - 2, 45, 'B');
  setCh(g, GROUND - 1, 46, 'B');

  // --- stump warp down to bonus pearl pocket (cols 48-49) ---
  setCh(g, GROUND - 1, 48, '|'); // entrance stump (surface)
  setCh(g, GROUND - 1, 49, '|'); // paired exit marker (re-entry, same band)

  // --- Clacker intro on wide ledge / kick corridor (cols 51-64) ---
  fillRange(g, GROUND - 3, 53, 62, '=');

  // --- double gap: walkable then runnable (cols 65-80) ---
  fillRange(g, GROUND, 68, 70, '~');   // 3-tile gap, walkable
  fillRange(g, GROUND2, 68, 70, '~');
  fillRange(g, GROUND, 74, 79, '~');   // 6-tile gap, run+flutter
  fillRange(g, GROUND2, 74, 79, '~');

  // --- checkpoint ---
  setCh(g, GROUND - 1, 82, 'C');

  // --- skeeter over urchin bed (cols 86-94) ---
  fillRange(g, GROUND, 86, 94, '^');

  // --- descending steps (cols 98-103) ---
  setCh(g, GROUND - 3, 98, '#');
  setCh(g, GROUND - 3, 99, '#');
  setCh(g, GROUND - 2, 100, '#');
  setCh(g, GROUND - 2, 101, '#');
  setCh(g, GROUND - 1, 102, '#');
  setCh(g, GROUND - 1, 103, '#');

  fillRange(g, GROUND, 104, W1 - 1, '#');
  fillRange(g, GROUND2, 104, W1 - 1, '#');

  // --- perch pole (level end) ---
  setCh(g, GROUND - 4, 195, 'P');
  setCh(g, GROUND - 3, 195, 'P');
  setCh(g, GROUND - 2, 195, 'P');
  setCh(g, GROUND - 1, 195, 'P');

  return g;
}

// Bonus pearl cave — separate small grid, warped into via stump DOWN.
const BONUS_W = 24;
const BONUS_H = 10;
function buildBonusCave1_1() {
  const g = blankGrid(BONUS_W, BONUS_H);
  const FLOOR = BONUS_H - 2;
  fillRange(g, FLOOR, 0, BONUS_W - 1, '#');
  fillRange(g, FLOOR + 1, 0, BONUS_W - 1, '#');
  // arc of 8 pearls
  const arcCols = [3, 5, 7, 9, 11, 13, 15, 17];
  const arcRows = [FLOOR - 2, FLOOR - 4, FLOOR - 5, FLOOR - 6, FLOOR - 6, FLOOR - 5, FLOOR - 4, FLOOR - 2];
  for (let i = 0; i < arcCols.length; i++) setCh(g, arcRows[i], arcCols[i], '?');
  setCh(g, FLOOR - 1, 1, '|');  // entry warp point back up
  setCh(g, FLOOR - 1, BONUS_W - 2, '|'); // exit stump back to main level
  return g;
}

const LEVEL_1_1 = {
  id: '1-1',
  name: 'SALT FLATS SPRINT',
  theme: 'saltflats',
  widthTiles: W1,
  heightTiles: H1,
  grid: buildLevel1_1(),
  spawn: { x: 2 * TILE_SIZE, y: (H1 - 3) * TILE_SIZE },
  checkpoints: [{ x: 82 * TILE_SIZE, y: (H1 - 3) * TILE_SIZE }],
  timeLimit: 300,
  bonus: {
    grid: buildBonusCave1_1(),
    widthTiles: BONUS_W,
    heightTiles: BONUS_H,
    spawn: { x: 2 * TILE_SIZE, y: (BONUS_H - 4) * TILE_SIZE },
    returnTo: { x: 50 * TILE_SIZE, y: (H1 - 3) * TILE_SIZE },
    triggerCols: [48, 49],
  },
  entities: [
    { type: 'crabby', x: 17 * TILE_SIZE, y: (H1 - 3) * TILE_SIZE },
    { type: 'crabby', x: 21 * TILE_SIZE, y: (H1 - 3) * TILE_SIZE },
    { type: 'clacker', x: 56 * TILE_SIZE, y: (H1 - 5) * TILE_SIZE },
    { type: 'clacker', x: 60 * TILE_SIZE, y: (H1 - 5) * TILE_SIZE },
    { type: 'skeeter', x: 88 * TILE_SIZE, y: (H1 - 6) * TILE_SIZE, path: 'hover_h' },
    { type: 'skeeter', x: 92 * TILE_SIZE, y: (H1 - 7) * TILE_SIZE, path: 'hover_v' },
    { type: 'crabby', x: 52 * TILE_SIZE, y: (H1 - 3) * TILE_SIZE },
    { type: 'crabby', x: 96 * TILE_SIZE, y: (H1 - 3) * TILE_SIZE },
    { type: 'crabby', x: 106 * TILE_SIZE, y: (H1 - 3) * TILE_SIZE },
    { type: 'crabby', x: 120 * TILE_SIZE, y: (H1 - 3) * TILE_SIZE },
    { type: 'crabby', x: 130 * TILE_SIZE, y: (H1 - 3) * TILE_SIZE },
    { type: 'crabby', x: 140 * TILE_SIZE, y: (H1 - 3) * TILE_SIZE },
    { type: 'crabby', x: 155 * TILE_SIZE, y: (H1 - 3) * TILE_SIZE },
    { type: 'crabby', x: 170 * TILE_SIZE, y: (H1 - 3) * TILE_SIZE },
  ],
};

// -----------------------------------------------------------------------
// LEVEL 1-2: MANGROVE UNDERROOTS (underground, ~200 wide)
// -----------------------------------------------------------------------

const W2 = 200;
const H2 = 14;

function buildLevel1_2() {
  const g = blankGrid(W2, H2);
  const GROUND = H2 - 2;
  const GROUND2 = H2 - 1;

  fillRange(g, GROUND, 0, W2 - 1, '#');
  fillRange(g, GROUND2, 0, W2 - 1, '#');
  // low ceiling ROOT overhang at entrance (crawl feel via B ceiling row)
  fillRange(g, 3, 2, 20, 'B');

  // --- entrance stump pair (design: "1-2 entered by stump") — pure decoration,
  // Mingo spawns standing between them, no warp logic at the entrance. ---
  setCh(g, GROUND - 1, 1, '|');
  setCh(g, GROUND - 1, 3, '|');

  // --- brine gutters under low ceiling (cols 6-30) ---
  fillRange(g, GROUND, 8, 10, '~');
  fillRange(g, GROUND2, 8, 10, '~');
  fillRange(g, GROUND, 14, 16, '~');
  fillRange(g, GROUND2, 14, 16, '~');

  // --- Snapper stump alley (cols 32-46), stumps as hollow visuals ---
  setCh(g, GROUND - 1, 34, '|');
  setCh(g, GROUND - 1, 38, '|');
  setCh(g, GROUND - 1, 42, '|');

  // --- one-way root platforms ascending (cols 48-66) with skeeter crossfire ---
  fillRange(g, GROUND - 2, 48, 52, '=');
  fillRange(g, GROUND - 4, 54, 58, '=');
  fillRange(g, GROUND - 6, 60, 64, '=');

  // --- salt-brick maze pocket with G golden-shrimp block (cols 68-84) ---
  setCh(g, GROUND - 1, 68, 'S'); // shrimp block right before, per design note
  fillRange(g, GROUND - 1, 70, 71, 'B');
  fillRange(g, GROUND - 3, 70, 71, 'B');
  setCh(g, GROUND - 2, 74, 'G');
  fillRange(g, GROUND - 1, 76, 78, 'B');

  // --- barrel floats over long brine pool (cols 86-104) ---
  fillRange(g, GROUND, 86, 104, '~');
  fillRange(g, GROUND2, 86, 104, '~');
  setCh(g, GROUND - 2, 88, '-');
  setCh(g, GROUND - 2, 94, '-');
  setCh(g, GROUND - 2, 100, '-');

  // --- checkpoint (col 106) ---
  setCh(g, GROUND - 1, 106, 'C');

  // --- Clacker gauntlet on slope (cols 110-130), rising steps ---
  setCh(g, GROUND - 1, 112, '#'); setCh(g, GROUND2, 112, '#');
  setCh(g, GROUND - 2, 116, '#'); setCh(g, GROUND - 1, 116, '#');
  setCh(g, GROUND - 3, 120, '#'); setCh(g, GROUND - 2, 120, '#'); setCh(g, GROUND - 1, 120, '#');

  // --- shell-kick brick wall (cols 132-134) blocking corridor, breakable ---
  fillRange(g, GROUND - 1, 132, 132, 'B');
  fillRange(g, GROUND - 2, 132, 132, 'B');
  fillRange(g, GROUND - 3, 132, 132, 'B');

  // --- exit stump rises to sunset surface (cols 150-152) ---
  setCh(g, GROUND - 1, 150, '|');
  setCh(g, GROUND - 1, 151, '|');

  fillRange(g, GROUND, 152, W2 - 1, '#');
  fillRange(g, GROUND2, 152, W2 - 1, '#');

  // --- short victory run to perch pole ---
  setCh(g, GROUND - 4, 190, 'P');
  setCh(g, GROUND - 3, 190, 'P');
  setCh(g, GROUND - 2, 190, 'P');
  setCh(g, GROUND - 1, 190, 'P');

  return g;
}

const LEVEL_1_2 = {
  id: '1-2',
  name: 'MANGROVE UNDERROOTS',
  theme: 'underroots',
  widthTiles: W2,
  heightTiles: H2,
  grid: buildLevel1_2(),
  spawn: { x: 2 * TILE_SIZE, y: (H2 - 3) * TILE_SIZE },
  checkpoints: [{ x: 106 * TILE_SIZE, y: (H2 - 3) * TILE_SIZE }],
  timeLimit: 300,
  entities: [
    { type: 'crabby', x: 22 * TILE_SIZE, y: (H2 - 3) * TILE_SIZE },
    { type: 'crabby', x: 26 * TILE_SIZE, y: (H2 - 3) * TILE_SIZE },
    { type: 'snapper', x: 34 * TILE_SIZE, y: (H2 - 1) * TILE_SIZE, stumpX: 34 * TILE_SIZE },
    { type: 'snapper', x: 38 * TILE_SIZE, y: (H2 - 1) * TILE_SIZE, stumpX: 38 * TILE_SIZE },
    { type: 'snapper', x: 42 * TILE_SIZE, y: (H2 - 1) * TILE_SIZE, stumpX: 42 * TILE_SIZE },
    { type: 'skeeter', x: 50 * TILE_SIZE, y: (H2 - 8) * TILE_SIZE, path: 'hover_h' },
    { type: 'skeeter', x: 56 * TILE_SIZE, y: (H2 - 9) * TILE_SIZE, path: 'hover_v' },
    { type: 'skeeter', x: 62 * TILE_SIZE, y: (H2 - 10) * TILE_SIZE, path: 'hover_h' },
    { type: 'crabby', x: 72 * TILE_SIZE, y: (H2 - 3) * TILE_SIZE },
    { type: 'crabby', x: 80 * TILE_SIZE, y: (H2 - 3) * TILE_SIZE },
    { type: 'clacker', x: 112 * TILE_SIZE, y: (H2 - 5) * TILE_SIZE },
    { type: 'clacker', x: 118 * TILE_SIZE, y: (H2 - 5) * TILE_SIZE },
    { type: 'clacker', x: 124 * TILE_SIZE, y: (H2 - 5) * TILE_SIZE },
    { type: 'crabby', x: 140 * TILE_SIZE, y: (H2 - 3) * TILE_SIZE },
    { type: 'crabby', x: 160 * TILE_SIZE, y: (H2 - 3) * TILE_SIZE },
    { type: 'crabby', x: 170 * TILE_SIZE, y: (H2 - 3) * TILE_SIZE },
    { type: 'skeeter', x: 178 * TILE_SIZE, y: (H2 - 6) * TILE_SIZE, path: 'hover_h' },
    { type: 'crabby', x: 184 * TILE_SIZE, y: (H2 - 3) * TILE_SIZE },
  ],
};

// -----------------------------------------------------------------------
// LEVEL 1-3: PIER OF KING PELICANO (sunset, ~200 wide + boss arena)
// -----------------------------------------------------------------------

const W3 = 200;
const H3 = 14;

function buildLevel1_3() {
  const g = blankGrid(W3, H3);
  const GROUND = H3 - 2;
  const GROUND2 = H3 - 1;

  // pier planks with gaps (brine below between planks) — flutter tester
  fillRange(g, GROUND, 0, 14, '#');
  fillRange(g, GROUND2, 0, W3 - 1, '~'); // brine below throughout pier

  fillRange(g, GROUND, 16, 19, '#');   // plank
  fillRange(g, GROUND, 20, 22, '~');   // 3-tile gap walkable
  fillRange(g, GROUND, 23, 28, '#');
  fillRange(g, GROUND, 29, 33, '~');   // 5-tile gap walkable
  fillRange(g, GROUND, 34, 44, '#');

  // Pelican Guard intro on crates (cols 46-52)
  fillRange(g, GROUND, 46, 60, '#');
  fillRange(g, GROUND - 3, 50, 52, '=');

  // barrel float chain over open brine (cols 62-82)
  fillRange(g, GROUND, 62, 82, '~');
  setCh(g, GROUND - 2, 64, '-');
  setCh(g, GROUND - 2, 70, '-');
  setCh(g, GROUND - 2, 76, '-');

  fillRange(g, GROUND, 84, 100, '#');

  // skeeter swarm weave (cols 86-98) handled via entities

  // checkpoint at cage-cart (col 102)
  setCh(g, GROUND - 1, 102, 'C');
  fillRange(g, GROUND, 101, 110, '#');

  // guard duo + urchin planks (cols 112-130)
  fillRange(g, GROUND, 112, 130, '#');
  fillRange(g, GROUND, 118, 120, '^');
  fillRange(g, GROUND, 124, 126, '^');

  // arena gate drops (col 132) then boss arena (cols 134-170) flat pier
  fillRange(g, GROUND, 132, 170, '#');
  fillRange(g, GROUND2, 132, 170, '~');

  return g;
}

const LEVEL_1_3 = {
  id: '1-3',
  name: 'PIER OF KING PELICANO',
  theme: 'pier',
  widthTiles: W3,
  heightTiles: H3,
  grid: buildLevel1_3(),
  spawn: { x: 2 * TILE_SIZE, y: (H3 - 3) * TILE_SIZE },
  checkpoints: [{ x: 102 * TILE_SIZE, y: (H3 - 3) * TILE_SIZE }],
  timeLimit: 300,
  bossArena: { x0: 132 * TILE_SIZE, x1: 170 * TILE_SIZE, groundY: (H3 - 2) * TILE_SIZE },
  // cage-cart decorations (design: "checkpoint at cage-cart, caged shrimp visible, they cheer";
  // arena cage bursts open + shrimp rain on boss defeat). Purely visual, no collision.
  decorations: [
    { type: 'cage_cart', x: 104 * TILE_SIZE, y: (H3 - 2) * TILE_SIZE - 24, id: 'checkpoint_cage' },
    { type: 'cage_cart', x: 160 * TILE_SIZE, y: (H3 - 2) * TILE_SIZE - 24, id: 'arena_cage', arenaCage: true },
  ],
  entities: [
    { type: 'crabby', x: 6 * TILE_SIZE, y: (H3 - 3) * TILE_SIZE },
    { type: 'crabby', x: 25 * TILE_SIZE, y: (H3 - 3) * TILE_SIZE },
    { type: 'pelican_guard', x: 48 * TILE_SIZE, y: (H3 - 4) * TILE_SIZE, range: [46, 60] },
    { type: 'skeeter', x: 66 * TILE_SIZE, y: (H3 - 7) * TILE_SIZE, path: 'hover_v' },
    { type: 'skeeter', x: 72 * TILE_SIZE, y: (H3 - 7) * TILE_SIZE, path: 'hover_h' },
    { type: 'skeeter', x: 78 * TILE_SIZE, y: (H3 - 8) * TILE_SIZE, path: 'hover_v' },
    { type: 'crabby', x: 86 * TILE_SIZE, y: (H3 - 3) * TILE_SIZE },
    { type: 'skeeter', x: 90 * TILE_SIZE, y: (H3 - 6) * TILE_SIZE, path: 'hover_h' },
    { type: 'skeeter', x: 94 * TILE_SIZE, y: (H3 - 7) * TILE_SIZE, path: 'hover_v' },
    { type: 'crabby', x: 98 * TILE_SIZE, y: (H3 - 3) * TILE_SIZE },
    { type: 'pelican_guard', x: 114 * TILE_SIZE, y: (H3 - 4) * TILE_SIZE, range: [112, 130] },
    { type: 'pelican_guard', x: 122 * TILE_SIZE, y: (H3 - 4) * TILE_SIZE, range: [112, 130] },
    { type: 'crabby', x: 128 * TILE_SIZE, y: (H3 - 3) * TILE_SIZE },
    { type: 'crabby', x: 84 * TILE_SIZE, y: (H3 - 3) * TILE_SIZE },
    { type: 'crabby', x: 40 * TILE_SIZE, y: (H3 - 3) * TILE_SIZE },
    { type: 'king_pelicano', x: 150 * TILE_SIZE, y: (H3 - 5) * TILE_SIZE, boss: true },
  ],
};

export const LEVELS = [LEVEL_1_1, LEVEL_1_2, LEVEL_1_3];
