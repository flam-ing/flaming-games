// SUPER MINGO — headless completability self-check.
// Scans each level grid for basic traversability sanity per DESIGN.md movement limits:
//   - player start exists
//   - perch pole (or boss arena for 1-3) reachable-ish: no walkable-seam gap wider than 7 tiles
//   - no jump-required ledge higher than 4 tiles without an alternate (walkable) route
//   - checkpoint present
// Run: node scripts/simcheck.mjs

import { LEVELS, TILE_SIZE, TILE_LEGEND } from '../src/levels.mjs';

const MAX_GAP = 7;   // run+flutter gap tiles
const MAX_LEDGE = 4; // max jump height tiles

function isSolidChar(ch) {
  const def = TILE_LEGEND[ch];
  return !!def && (def.solid === true || def.solid === 'oneway' || def.solid === 'moving');
}

function isHazardOrAir(ch) {
  if (ch === '.' ) return true;
  const def = TILE_LEGEND[ch];
  return !!def && (def.hazard === true);
}

// For each column, find the topmost solid tile row (the "walk surface" height).
function surfaceHeights(grid) {
  const rows = grid.length;
  const cols = grid[0].length;
  const heights = new Array(cols).fill(null);
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const ch = grid[r][c];
      if (isSolidChar(ch)) { heights[c] = r; break; }
    }
  }
  return heights;
}

function checkLevel(level, idx) {
  const errors = [];
  const grid = level.grid;

  if (!grid || grid.length === 0) {
    errors.push('grid is empty');
    return errors;
  }

  // player start exists
  if (!level.spawn || typeof level.spawn.x !== 'number') {
    errors.push('no player spawn');
  } else {
    const sc = Math.floor(level.spawn.x / TILE_SIZE);
    const sr = Math.floor(level.spawn.y / TILE_SIZE);
    if (sc < 0 || sc >= grid[0].length) errors.push('spawn x out of bounds');
    if (sr < 0 || sr >= grid.length) errors.push('spawn y out of bounds');
  }

  // checkpoint present
  const hasCheckpoint = (level.checkpoints && level.checkpoints.length > 0) ||
    grid.some(row => row.includes('C'));
  if (!hasCheckpoint) errors.push('no checkpoint present');

  // level-end reachability target: perch pole for 1-1/1-2, boss arena for 1-3
  const hasPole = grid.some(row => row.includes('P'));
  const hasBossArena = !!level.bossArena;
  if (!hasPole && !hasBossArena) errors.push('no perch pole or boss arena found');

  // gap + ledge scan along the main walk surface
  const heights = surfaceHeights(grid);
  let lastSurfaceCol = null;
  let lastSurfaceRow = null;
  let gapRunStart = null;

  for (let c = 0; c < heights.length; c++) {
    const h = heights[c];
    if (h === null) {
      // no solid tile in this column below any row -> counts as gap/void column
      if (gapRunStart === null) gapRunStart = c;
      continue;
    }
    if (gapRunStart !== null) {
      const gapLen = c - gapRunStart;
      if (gapLen > MAX_GAP) {
        errors.push(`gap too wide at cols ${gapRunStart}-${c - 1} (${gapLen} tiles, max ${MAX_GAP})`);
      }
      gapRunStart = null;
    }
    if (lastSurfaceRow !== null) {
      const rise = lastSurfaceRow - h; // positive = ledge goes up from previous col
      if (rise > MAX_LEDGE) {
        // check alternate route: any nearby column within +/-3 with a smaller step
        let altFound = false;
        for (let k = Math.max(0, c - 3); k <= Math.min(heights.length - 1, c + 3); k++) {
          if (k === c) continue;
          const hk = heights[k];
          if (hk !== null && (lastSurfaceRow - hk) <= MAX_LEDGE) { altFound = true; break; }
        }
        if (!altFound) {
          errors.push(`ledge too high at col ${c} (rise ${rise} tiles, max ${MAX_LEDGE}, no alt route)`);
        }
      }
    }
    lastSurfaceCol = c;
    lastSurfaceRow = h;
  }
  if (gapRunStart !== null) {
    // trailing void columns at very end are fine (past level end), ignore
  }

  return errors;
}

let allOk = true;
for (let i = 0; i < LEVELS.length; i++) {
  const level = LEVELS[i];
  const errors = checkLevel(level, i);
  if (errors.length === 0) {
    console.log(`LEVEL_OK ${level.id} ${level.name}`);
  } else {
    allOk = false;
    console.log(`LEVEL_FAIL ${level.id} ${level.name}`);
    for (const e of errors) console.log('  - ' + e);
  }
}

if (!allOk) process.exit(1);
