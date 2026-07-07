// src/map.mjs — level grid + things + metadata
// Exports (contract): MAP { grid: number[32][32], things: [{type,x,y,angle?}], playerStart, exit: {x,y}, name }
// cell ids: 0 empty, 1-8 wall types, 9 door, 10 exit-switch wall, 20 brine damage floor (walkable)

const SIZE = 32;

// Start fully solid (walls type 1 = salt crust), then carve zones out.
function makeGrid() {
  const g = [];
  for (let y = 0; y < SIZE; y++) {
    g.push(new Array(SIZE).fill(1));
  }
  return g;
}

function fillRect(g, x0, y0, x1, y1, val) {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (y >= 0 && y < SIZE && x >= 0 && x < SIZE) g[y][x] = val;
    }
  }
}

function border(g, x0, y0, x1, y1, val) {
  for (let x = x0; x <= x1; x++) {
    g[y0][x] = val;
    g[y1][x] = val;
  }
  for (let y = y0; y <= y1; y++) {
    g[y][x0] = val;
    g[y][x1] = val;
  }
}

const grid = makeGrid();

// ---------------------------------------------------------------------------
// Zone 1: Shore spawn — open salt flat, rows 1-6, cols 1-8
// ---------------------------------------------------------------------------
fillRect(grid, 1, 1, 8, 6, 0);
border(grid, 1, 1, 8, 6, 2); // salt brick border
// opening east toward canyon at row 3-4
fillRect(grid, 8, 3, 9, 4, 0);

// ---------------------------------------------------------------------------
// Zone 2: Salt canyon — winding corridor, cols 9-15, rows 1-8
// ---------------------------------------------------------------------------
fillRect(grid, 9, 3, 15, 4, 0);      // straight run east
border(grid, 9, 2, 15, 5, 1);        // salt crust walls
fillRect(grid, 9, 3, 15, 4, 0);
// turn south
fillRect(grid, 14, 4, 15, 10, 0);
border(grid, 13, 4, 16, 10, 1);
fillRect(grid, 14, 4, 15, 10, 0);
// brine pool crossing with stepping stones (row 8, cols 14-15 = damage floor,
// col 14 row 9 kept safe as stepping stone)
fillRect(grid, 14, 8, 15, 9, 20);
grid[9][14] = 0; // safe stepping stone
// turn east into shrine
fillRect(grid, 14, 10, 20, 11, 0);
border(grid, 13, 9, 21, 12, 1);
fillRect(grid, 14, 10, 20, 11, 0);

// ---------------------------------------------------------------------------
// Zone 3: The Shrine — plastic-pink ruin room, cols 17-24, rows 8-16
// ---------------------------------------------------------------------------
fillRect(grid, 17, 8, 24, 16, 0);
border(grid, 17, 8, 24, 16, 4); // plastic-pink ruin brick
// secret pushwall (still wall type 4, "slightly different tint" handled in art)
grid[8][20] = 4;
// opening south to gator pens
fillRect(grid, 20, 16, 21, 17, 0);

// ---------------------------------------------------------------------------
// Zone 4: Gator pens — metal walls, cols 16-25, rows 17-22
// ---------------------------------------------------------------------------
fillRect(grid, 16, 17, 25, 22, 0);
border(grid, 16, 17, 25, 22, 5); // rusted sheet metal
fillRect(grid, 20, 22, 21, 23, 0);

// ---------------------------------------------------------------------------
// Zone 5: Vulture roost — bone walls, open ceiling, cols 16-25, rows 23-28
// ---------------------------------------------------------------------------
fillRect(grid, 16, 23, 25, 28, 0);
border(grid, 16, 23, 25, 28, 6); // bone pile
fillRect(grid, 20, 28, 21, 29, 0);

// ---------------------------------------------------------------------------
// Zone 6: Boss hall — long approach with brine gutters, cols 14-27, rows 29-30
// ---------------------------------------------------------------------------
fillRect(grid, 14, 29, 27, 30, 0);
border(grid, 13, 28, 28, 31, 1);
fillRect(grid, 14, 29, 27, 30, 0);
// brine gutters along the approach
grid[29][16] = 20;
grid[29][18] = 20;
grid[30][20] = 20;
grid[29][22] = 20;
grid[30][24] = 20;
// boss room proper
fillRect(grid, 22, 26, 27, 30, 0);
border(grid, 22, 25, 28, 31, 3); // red algae rock walls of the arena
// exit switch wall behind boss (east wall of boss hall)
grid[27][27] = 10;

// waterfall accent walls (type 7) near canyon brine crossing
grid[9][13] = 7;

// door cells (type 9) — gate the pens entrance and shrine->pens transition
grid[16][20] = 9;
grid[17][21] = 0; // keep companion tile open

// re-carve doorway explicitly as passable-but-door (engine renders door as wall for now)
grid[16][20] = 9;

const MAP = {
  grid,
  gridSize: SIZE,
  name: 'E1M1 KNEE-DEEP IN THE BRINE',
  playerStart: { x: 4.5, y: 3.5, angle: 0 },
  exit: { x: 27, y: 27 },
  things: [
    // --- Zone 1: Shore spawn ---
    { type: 'lawnFlamingo', x: 3.5, y: 2.5 },
    { type: 'lawnFlamingo', x: 6.5, y: 2.5 },
    { type: 'lawnFlamingo', x: 5.0, y: 5.0 },
    { type: 'shrimp', x: 2.5, y: 4.5 },

    // --- Zone 2: Salt canyon ---
    { type: 'crabDemon', x: 11.5, y: 3.5 },
    { type: 'crabDemon', x: 14.5, y: 6.5 },
    { type: 'shrimp', x: 15.5, y: 10.5 },

    // --- Zone 3: The Shrine ---
    { type: 'lawnFlamingo', x: 18.5, y: 9.5 },
    { type: 'lawnFlamingo', x: 23.5, y: 9.5 },
    { type: 'lawnFlamingo', x: 18.5, y: 15.5 },
    { type: 'lawnFlamingo', x: 23.5, y: 15.5 },
    { type: 'crabDemon', x: 20.5, y: 12.5 },
    { type: 'crabDemon', x: 21.5, y: 13.5 },
    { type: 'featherBundle', x: 20.5, y: 10.5 }, // FEATHER STORM pickup on pedestal
    // secret behind pushwall grid[8][20]
    { type: 'preenOil', x: 20.5, y: 6.5 },
    { type: 'goldenShrimp', x: 21.5, y: 6.5 },

    // --- Zone 4: Gator pens ---
    { type: 'brineGator', x: 18.5, y: 19.5 },
    { type: 'brineGator', x: 21.5, y: 19.5 },
    { type: 'brineGator', x: 23.5, y: 21.5 },
    { type: 'eggCarton', x: 20.5, y: 20.5 },

    // --- Zone 5: Vulture roost ---
    { type: 'ashVulture', x: 18.5, y: 25.5 },
    { type: 'ashVulture', x: 22.5, y: 25.5 },
    { type: 'ashVulture', x: 20.5, y: 27.5 },
    { type: 'crabDemon', x: 17.5, y: 27.5 },
    { type: 'crabDemon', x: 23.5, y: 27.5 },
    { type: 'eggLobber', x: 20.5, y: 24.5 }, // on bone altar

    // --- Zone 6: Boss hall ---
    { type: 'crabDemon', x: 16.5, y: 29.5 },
    { type: 'crabDemon', x: 24.5, y: 29.5 },
    { type: 'plastingo', x: 25.5, y: 28.5 },
  ],
};

export { MAP };
