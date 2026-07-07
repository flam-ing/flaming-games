// SUPER MINGO — art.mjs
// Full procedural pixel art + 5x7 bitmap font. All original designs (see DESIGN.md).
// buildAssets() -> { tiles, mingo, enemies, items, bg, font, logo }

const PALETTE = {
  flamingoPink: '#ff5e9c',
  flamingoPinkShade: '#d43f7c',
  flareGold: '#ffc857',
  flareGoldShade: '#d69a2e',
  grayMingo: '#b9a8a6',
  grayMingoShade: '#8f7f7d',
  lagoonSkyTop: '#8fd3e8',
  lagoonSkyBottom: '#f7c8d8',
  underrootTeal: '#0f2f33',
  underrootTeal2: '#0a1f22',
  bioglow: '#3ee6c4',
  sunsetEmber: '#ff8a5c',
  sunsetEmber2: '#c9366b',
  saltstone: '#e3d9c4',
  saltstoneShade: '#b8ab8e',
  saltGrass: '#c9e895',
  saltGrassShade: '#9bc46a',
  mangroveBark: '#6b4a3a',
  mangroveBarkShade: '#4a3226',
  brine: '#1e5f5a',
  brineDeep: '#123e3a',
  brineFoam: '#d8f0e8',
  pearl: '#f2ecdf',
  pearlShade: '#c9bfa8',
  shrimpSalmon: '#ff8e72',
  ink: '#241414',
  urchinPurple: '#5a3d6b',
  crabRed: '#c9553f',
  crabRedShade: '#8f3a2a',
  clamShell: '#d8b878',
  clamShellShade: '#8a6a3a',
  eelGreen: '#2f8f6a',
  eelGreenShade: '#1f5f47',
  skeeterBlue: '#7fc7e8',
  pelicanCream: '#f0dfc0',
  pelicanBeak: '#ff9a3c',
};

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function ctx2d(c) {
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return ctx;
}

// px(ctx, x, y, color) — 1x1 pixel plot, the basic unit of every sprite below.
function px(ctx, x, y, c) { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); }
function rect(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }

// Draws a run-length-encoded pixel-art row string onto ctx at (ox,oy).
// Each char maps through `map` to a color; '.' is transparent/skip.
function blit(ctx, rows, ox, oy, map) {
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      if (ch === '.' || ch === ' ') continue;
      const col = map[ch];
      if (!col) continue;
      px(ctx, ox + c, oy + r, col);
    }
  }
}

// ---------------------------------------------------------------------------
// 5x7 bitmap font
// ---------------------------------------------------------------------------

const GLYPHS = {
  'A': ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  'B': ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  'C': ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
  'D': ['11100', '10010', '10001', '10001', '10001', '10010', '11100'],
  'E': ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  'F': ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  'G': ['01111', '10000', '10000', '10111', '10001', '10001', '01111'],
  'H': ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  'I': ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  'J': ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
  'K': ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  'L': ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  'M': ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  'N': ['10001', '11001', '10101', '10101', '10011', '10001', '10001'],
  'O': ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  'P': ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  'Q': ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  'R': ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  'S': ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  'T': ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  'U': ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  'V': ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  'W': ['10001', '10001', '10001', '10101', '10101', '10101', '01010'],
  'X': ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  'Y': ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  'Z': ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  '0': ['01110', '10011', '10101', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '3': ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  ',': ['00000', '00000', '00000', '00000', '00000', '01100', '01000'],
  '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
  '?': ['01110', '10001', '00001', '00110', '00100', '00000', '00100'],
  ':': ['00000', '01100', '01100', '00000', '01100', '01100', '00000'],
  '\'': ['01100', '01100', '00100', '00000', '00000', '00000', '00000'],
  '×': ['10001', '01010', '00100', '01010', '10001', '00000', '00000'],
  '⬤': ['00000', '01110', '11111', '11111', '11111', '01110', '00000'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
};

function drawGlyphOnCtx(ctx, ch, x, y, color, scale) {
  const g = GLYPHS[ch.toUpperCase()] || GLYPHS[' '];
  ctx.fillStyle = color;
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 5; col++) {
      if (g[row][col] === '1') {
        ctx.fillRect(x + col * scale, y + row * scale, scale, scale);
      }
    }
  }
}

function buildFont() {
  return {
    glyphW: 5,
    glyphH: 7,
    drawText(ctx, text, x, y, color = '#ffffff', scale = 1) {
      let cx = x;
      for (const ch of text) {
        drawGlyphOnCtx(ctx, ch, cx, y, color, scale);
        cx += (5 + 1) * scale;
      }
    },
    measure(text, scale = 1) {
      return text.length * (5 + 1) * scale - scale;
    },
  };
}

// ---------------------------------------------------------------------------
// Tiles — 16x16, per DESIGN.md legend.
// ---------------------------------------------------------------------------

function tileCanvas(draw) {
  const c = makeCanvas(16, 16);
  draw(ctx2d(c));
  return c;
}

function groundTile() {
  return tileCanvas((ctx) => {
    rect(ctx, 0, 0, 16, 16, PALETTE.saltstone);
    // grass-of-salt lip on top
    rect(ctx, 0, 0, 16, 3, PALETTE.saltGrass);
    for (let x = 0; x < 16; x += 3) px(ctx, x, 2, PALETTE.saltGrassShade);
    rect(ctx, 0, 2, 16, 1, PALETTE.saltGrassShade);
    // body shading + speckle
    rect(ctx, 0, 3, 16, 1, PALETTE.saltstoneShade);
    const speck = [[2,6],[9,5],[13,8],[5,11],[11,12],[3,13],[8,9]];
    for (const [x,y] of speck) px(ctx, x, y, PALETTE.saltstoneShade);
    rect(ctx, 0, 15, 16, 1, PALETTE.saltstoneShade);
    ctx.strokeStyle = PALETTE.saltstoneShade; ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, 15, 15);
  });
}

function platformTile() {
  return tileCanvas((ctx) => {
    rect(ctx, 0, 5, 16, 11, 'rgba(0,0,0,0)');
    rect(ctx, 0, 5, 16, 5, PALETTE.saltGrass);
    rect(ctx, 0, 9, 16, 1, PALETTE.saltGrassShade);
    rect(ctx, 0, 10, 16, 2, PALETTE.saltstoneShade);
    for (let x = 1; x < 16; x += 4) px(ctx, x, 6, PALETTE.saltGrassShade);
    ctx.strokeStyle = PALETTE.saltGrassShade; ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 5.5, 15, 6);
  });
}

function brickTile() {
  return tileCanvas((ctx) => {
    rect(ctx, 0, 0, 16, 16, PALETTE.saltstoneShade);
    ctx.strokeStyle = '#8a7d63'; ctx.lineWidth = 1;
    // chippable brick courses
    for (let y = 0; y < 16; y += 8) {
      ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(16, y + 0.5); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(8.5, 0); ctx.lineTo(8.5, 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(4.5, 8); ctx.lineTo(4.5, 16); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(12.5, 8); ctx.lineTo(12.5, 16); ctx.stroke();
    // chip damage corners
    px(ctx, 1, 1, PALETTE.saltstone); px(ctx, 14, 9, PALETTE.saltstone);
    px(ctx, 6, 12, PALETTE.saltstone);
    ctx.strokeStyle = '#6a5d47'; ctx.strokeRect(0.5, 0.5, 15, 15);
  });
}

function oysterTile(open) {
  return tileCanvas((ctx) => {
    if (!open) {
      // spent gray closed shell
      rect(ctx, 0, 0, 16, 16, '#6a6260');
      rect(ctx, 1, 1, 14, 6, '#7a7270');
      ctx.strokeStyle = '#4a4442'; ctx.strokeRect(0.5, 0.5, 15, 15);
      rect(ctx, 2, 8, 12, 1, '#4a4442');
      return;
    }
    rect(ctx, 0, 0, 16, 16, PALETTE.pearl);
    rect(ctx, 1, 1, 14, 6, '#ffffff');
    rect(ctx, 0, 9, 16, 7, PALETTE.pearlShade);
    ctx.strokeStyle = '#8a7d63'; ctx.strokeRect(0.5, 0.5, 15, 15);
    // pulsing question-mark-ish rivet dots (crustacean joint look)
    px(ctx, 7, 5, '#8a7d63'); px(ctx, 8, 5, '#8a7d63');
    px(ctx, 7, 6, '#8a7d63');
    rect(ctx, 3, 10, 10, 2, '#e3d6b8');
  });
}

function stumpTile(isTop) {
  return tileCanvas((ctx) => {
    rect(ctx, 0, 0, 16, 16, PALETTE.mangroveBark);
    if (isTop) {
      rect(ctx, 0, 0, 16, 4, '#5a3d2e');
      rect(ctx, 0, 3, 16, 1, PALETTE.mangroveBarkShade);
    }
    for (let y = isTop ? 4 : 0; y < 16; y += 4) {
      ctx.strokeStyle = PALETTE.mangroveBarkShade;
      ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(16, y + 0.5); ctx.stroke();
    }
    px(ctx, 3, 6, PALETTE.mangroveBarkShade); px(ctx, 11, 10, PALETTE.mangroveBarkShade);
    px(ctx, 6, 13, PALETTE.mangroveBarkShade);
    ctx.strokeStyle = '#3a281f'; ctx.strokeRect(0.5, 0.5, 15, 15);
  });
}

function spikesTile() {
  return tileCanvas((ctx) => {
    rect(ctx, 0, 10, 16, 6, PALETTE.saltstoneShade);
    for (let x = 0; x < 16; x += 4) {
      ctx.fillStyle = PALETTE.urchinPurple;
      ctx.beginPath();
      ctx.moveTo(x, 11); ctx.lineTo(x + 2, 0); ctx.lineTo(x + 4, 11);
      ctx.closePath(); ctx.fill();
      px(ctx, x + 2, 3, '#3a2648');
    }
    ctx.strokeStyle = '#8a7d63'; ctx.strokeRect(0.5, 10.5, 15, 5);
  });
}

function brineTile(frame) {
  return tileCanvas((ctx) => {
    rect(ctx, 0, 0, 16, 16, PALETTE.brineDeep);
    rect(ctx, 0, 0, 16, 3, PALETTE.brine);
    const wobble = frame === 1 ? 1 : 0;
    for (let x = 0; x < 16; x += 4) {
      rect(ctx, x + wobble, 0, 2, 2, PALETTE.brineFoam);
    }
    rect(ctx, 0, 2, 16, 1, PALETTE.brine);
    for (let y = 5; y < 16; y += 5) {
      for (let x = (y % 10 === 0 ? 0 : 2); x < 16; x += 6) {
        px(ctx, x, y, PALETTE.brine);
      }
    }
  });
}

function barrelTile() {
  return tileCanvas((ctx) => {
    rect(ctx, 0, 0, 16, 16, '#8a5a3a');
    rect(ctx, 0, 0, 16, 2, '#a87249');
    rect(ctx, 0, 14, 16, 2, '#5c3c26');
    for (let x = 0; x < 16; x += 5) rect(ctx, x, 0, 1, 16, '#5c3c26');
    ctx.strokeStyle = '#3f2a1a'; ctx.strokeRect(0.5, 0.5, 15, 15);
  });
}

function checkpointTile(open) {
  return tileCanvas((ctx) => {
    rect(ctx, 0, 4, 16, 12, PALETTE.pearl);
    ctx.strokeStyle = PALETTE.flamingoPinkShade; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(8, 16, 8, Math.PI, 0); ctx.stroke();
    rect(ctx, 1, 6, 14, 2, PALETTE.pearlShade);
    if (open) {
      rect(ctx, 5, 3, 6, 5, PALETTE.flamingoPink);
      px(ctx, 7, 4, '#ffffff');
    } else {
      rect(ctx, 6, 8, 4, 3, PALETTE.flamingoPinkShade);
    }
  });
}

function poleTile(isTop) {
  return tileCanvas((ctx) => {
    if (isTop) {
      rect(ctx, 6, 4, 4, 12, '#c9bfa8');
      rect(ctx, 2, 2, 12, 4, PALETTE.flamingoPink);
      rect(ctx, 3, 3, 10, 1, '#ffffff');
      ctx.strokeStyle = PALETTE.flamingoPinkShade; ctx.strokeRect(2.5, 2.5, 11, 3);
    } else {
      rect(ctx, 6, 0, 4, 16, '#c9bfa8');
      rect(ctx, 6, 0, 1, 16, '#e3dcc8');
      rect(ctx, 9, 0, 1, 16, '#a89a80');
    }
  });
}

function buildTiles() {
  const t = {};
  t['#'] = groundTile();
  t['='] = platformTile();
  t['B'] = brickTile();
  t['?'] = oysterTile(true);
  t['?_spent'] = oysterTile(false);
  t['S'] = oysterTile(true);
  t['G'] = oysterTile(true);
  t['E'] = oysterTile(true);
  t['O'] = oysterTile(true);
  t['|'] = stumpTile(false);
  t['|_top'] = stumpTile(true);
  t['^'] = spikesTile();
  t['~'] = brineTile(0);
  t['~_b'] = brineTile(1);
  t['~_body'] = tileCanvas((ctx) => { rect(ctx, 0, 0, 16, 16, PALETTE.brineDeep); for (let y=0;y<16;y+=5) for (let x=(y%10===0?0:2);x<16;x+=6) px(ctx,x,y,PALETTE.brine); });
  t['-'] = barrelTile();
  t['C'] = checkpointTile(false);
  t['C_open'] = checkpointTile(true);
  t['P'] = poleTile(false);
  t['P_top'] = poleTile(true);
  return t;
}

// ---------------------------------------------------------------------------
// Mingo (player) — long S-neck, one raised brow, stick legs. gray 16x16(box)/
// pink+flare 16x28(box), drawn inset to match small/tall hitboxes.
// ---------------------------------------------------------------------------

const POSES = ['idle', 'walk2f_a', 'walk2f_b', 'run2f_a', 'run2f_b', 'skid', 'jump', 'flutter2f_a', 'flutter2f_b', 'stomp', 'hurt', 'pole'];

// Body plan drawn in a normalized 16-wide coordinate space; h varies gray(16) vs tall(28).
function drawMingo(ctx, w, h, power, pose) {
  ctx.clearRect(0, 0, w, h);
  const isGray = power === 'gray';
  const body = power === 'gray' ? PALETTE.grayMingo : (power === 'flare' ? PALETTE.flareGold : PALETTE.flamingoPink);
  const shade = power === 'gray' ? PALETTE.grayMingoShade : (power === 'flare' ? PALETTE.flareGoldShade : PALETTE.flamingoPinkShade);
  const legColor = '#e0954f';
  const beak = '#ff7a3c';
  const eye = PALETTE.ink;

  // vertical layout: legs at bottom, body oval mid, S-neck rising, head at top.
  const baseY = h - 1; // ground line
  const legH = isGray ? 4 : 6;
  const legTopY = baseY - legH;
  const bodyH = isGray ? 8 : 14;
  const bodyTopY = legTopY - bodyH + 2;
  const neckH = isGray ? 3 : 8;
  const headY = bodyTopY - neckH;

  // -- pose-specific pre-computation --
  let legOffset = 0; // scissor
  let neckLean = 0;  // forward lean of neck/head (run)
  let wingsOut = false;
  let crouch = 0;
  let oneLegged = false;
  let skid = false;
  let hurtFlash = false;
  let stompSquat = false;

  switch (pose) {
    case 'walk2f_a': legOffset = -2; break;
    case 'walk2f_b': legOffset = 2; break;
    case 'run2f_a': legOffset = -3; neckLean = 2; break;
    case 'run2f_b': legOffset = 3; neckLean = 2; break;
    case 'skid': skid = true; neckLean = -2; break;
    case 'jump': crouch = 0; break;
    case 'flutter2f_a': wingsOut = true; break;
    case 'flutter2f_b': wingsOut = true; break;
    case 'stomp': stompSquat = true; break;
    case 'hurt': hurtFlash = true; break;
    case 'pole': oneLegged = true; break;
    default: break;
  }

  const cx = Math.floor(w / 2);

  // --- legs (stick legs) ---
  if (oneLegged) {
    // signature: standing leg straight+centered, other tucked up under body
    rect(ctx, cx - 1, legTopY, 2, legH, legColor);
    px(ctx, cx - 2, baseY, legColor); px(ctx, cx + 1, baseY, legColor); // little foot splay
    rect(ctx, cx + 2, legTopY + 1, 2, 2, legColor); // tucked leg nub
  } else if (stompSquat) {
    rect(ctx, cx - 3, legTopY + 2, 2, legH - 2, legColor);
    rect(ctx, cx + 1, legTopY + 2, 2, legH - 2, legColor);
  } else if (skid) {
    rect(ctx, cx - 4, legTopY, 2, legH, legColor);
    rect(ctx, cx + 2, legTopY - 1, 2, legH + 1, legColor);
  } else if (pose === 'jump' || wingsOut) {
    // legs tucked/trailing under body
    rect(ctx, cx - 2, legTopY, 2, legH - 1, legColor);
    rect(ctx, cx + 1, legTopY + 1, 2, legH - 2, legColor);
  } else {
    // idle/walk/run scissor
    const lx = cx - 2 + (legOffset < 0 ? -1 : legOffset > 0 ? 1 : 0);
    const rx = cx + 1 + (legOffset > 0 ? 1 : legOffset < 0 ? -1 : 0);
    const lh = legOffset <= 0 ? legH : legH - 1;
    const rh = legOffset >= 0 ? legH : legH - 1;
    rect(ctx, lx, baseY - lh, 2, lh, legColor);
    rect(ctx, rx, baseY - rh, 2, rh, legColor);
    px(ctx, lx - 1, baseY - 1, legColor); px(ctx, rx + 2, baseY - 1, legColor);
  }

  // --- body (oval torso) ---
  let bx = cx - 4;
  if (skid) bx -= 1;
  if (stompSquat) { rect(ctx, bx, bodyTopY + 3, 9, bodyH - 2, body); }
  else { rect(ctx, bx, bodyTopY, 9, bodyH, body); }
  rect(ctx, bx + 1, bodyTopY - 1, 7, 1, body); // top round
  rect(ctx, bx + 1, bodyTopY + bodyH, 7, 1, shade); // belly shade line
  // wing marking (folded) — small chevron shade on flank
  rect(ctx, bx + 5, bodyTopY + 2, 3, isGray ? 3 : 6, shade);

  // --- wings ---
  if (wingsOut) {
    // wings OUT flapping — must read clearly: big triangular spread each side
    const flapUp = pose === 'flutter2f_a';
    const wingColor = power === 'flare' ? PALETTE.flareGoldShade : (isGray ? PALETTE.grayMingoShade : '#ffffff');
    const wy = bodyTopY + (flapUp ? -2 : 1);
    // left wing
    ctx.fillStyle = wingColor;
    ctx.beginPath();
    ctx.moveTo(bx, bodyTopY + 3);
    ctx.lineTo(bx - 6, wy);
    ctx.lineTo(bx - 5, wy + 5);
    ctx.closePath(); ctx.fill();
    // right wing
    ctx.beginPath();
    ctx.moveTo(bx + 9, bodyTopY + 3);
    ctx.lineTo(bx + 15, wy);
    ctx.lineTo(bx + 14, wy + 5);
    ctx.closePath(); ctx.fill();
    if (power === 'flare') {
      px(ctx, bx - 6, wy, PALETTE.flareGold); px(ctx, bx + 15, wy, PALETTE.flareGold);
    }
  } else if (pose === 'jump') {
    // wings tucked
    rect(ctx, bx - 1, bodyTopY + 2, 2, isGray ? 4 : 8, shade);
    rect(ctx, bx + 8, bodyTopY + 2, 2, isGray ? 4 : 8, shade);
  }

  // --- S-neck + head ---
  const neckX = cx + 2 + neckLean;
  // neck drawn as 2 offset segments forming an S curve
  if (isGray) {
    rect(ctx, neckX, headY + 1, 2, 2, body);
    rect(ctx, neckX - 1, bodyTopY - 1, 2, 1, body);
  } else {
    const seg = Math.max(1, Math.floor(neckH / 3));
    rect(ctx, neckX + 1, bodyTopY - 1, 2, seg, body);       // base curves out
    rect(ctx, neckX, bodyTopY - 1 - seg, 2, seg, body);      // mid curves back
    rect(ctx, neckX + 1, headY, 2, neckH - 2 * seg + 1, body); // upper toward head
  }

  // head
  const headX = neckX + (isGray ? 0 : 1);
  rect(ctx, headX - 1, headY - 3, 5, 4, body);
  // one raised brow (the signature quizzical look)
  rect(ctx, headX + 1, headY - 4, 2, 1, shade);
  // beak
  rect(ctx, headX + 3, headY - 2, 3, 1, beak);
  px(ctx, headX + 5, headY - 1, shade);
  // eye
  px(ctx, headX, headY - 2, eye);

  if (power === 'flare') {
    // tiny flame crest above head
    px(ctx, headX, headY - 5, PALETTE.flareGold);
    px(ctx, headX + 1, headY - 6, '#ff7a3c');
  }

  if (stompSquat) {
    // dust-ready pose: squashed body already handled; add motion crease
    rect(ctx, bx, bodyTopY + bodyH - 2, 9, 1, shade);
  }

  if (hurtFlash) {
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
  }
}

function buildMingo() {
  const grayW = 16, grayH = 16;
  const tallW = 16, tallH = 28;
  const out = {};
  for (const power of ['gray', 'pink', 'flare']) {
    const w = power === 'gray' ? grayW : tallW;
    const h = power === 'gray' ? grayH : tallH;
    out[power] = {};
    for (const pose of POSES) {
      const c = makeCanvas(w, h);
      drawMingo(ctx2d(c), w, h, power, pose);
      out[power][pose] = c;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Enemies — original crustacean/lagoon fauna.
// ---------------------------------------------------------------------------

function enemyCanvas(w, h, draw) {
  const c = makeCanvas(w, h);
  draw(ctx2d(c), w, h);
  return c;
}

function drawCrabby(ctx, w, h, frame) {
  const flat = frame === 'flat';
  const legPhase = frame === 'b' ? 1 : 0;
  const bodyH = flat ? 4 : h - 4;
  const bodyY = h - bodyH;
  rect(ctx, 1, bodyY, w - 2, bodyH, PALETTE.crabRed);
  rect(ctx, 1, bodyY, w - 2, 2, '#e07050');
  rect(ctx, 2, bodyY + bodyH - 1, w - 4, 1, PALETTE.crabRedShade);
  if (!flat) {
    // eyes on stalks
    px(ctx, 3, bodyY - 2, PALETTE.crabRed); px(ctx, 3, bodyY - 3, PALETTE.ink);
    px(ctx, w - 4, bodyY - 2, PALETTE.crabRed); px(ctx, w - 4, bodyY - 3, PALETTE.ink);
    // claws — alternate raised
    const lRaise = legPhase === 0 ? 1 : 0;
    const rRaise = legPhase === 1 ? 1 : 0;
    rect(ctx, 0, bodyY + 2 - lRaise, 2, 3, PALETTE.crabRedShade);
    rect(ctx, w - 2, bodyY + 2 - rRaise, 2, 3, PALETTE.crabRedShade);
    // legs sidle
    for (let i = 0; i < 3; i++) {
      const off = (i + legPhase) % 2;
      px(ctx, 2 + i * 3, h - 1 - off, PALETTE.crabRedShade);
    }
  } else {
    rect(ctx, 0, h - 2, w, 2, PALETTE.crabRedShade);
  }
  ctx.strokeStyle = PALETTE.ink; ctx.lineWidth = 1;
  ctx.strokeRect(0.5, bodyY + 0.5, w - 1, bodyH - 1);
}

function drawClacker(ctx, w, h, frame) {
  if (frame === 'shut' || frame === 'slide' || frame === 'slide_b') {
    rect(ctx, 0, h / 2, w, h / 2, PALETTE.clamShell);
    rect(ctx, 0, h / 2, w, 2, PALETTE.clamShellShade);
    ctx.strokeStyle = PALETTE.ink; ctx.strokeRect(0.5, h / 2 + 0.5, w - 1, h / 2 - 1);
    const spinOff = frame === 'slide_b' ? 2 : 0;
    for (let i = 0; i < 3; i++) px(ctx, 2 + i * 5, h - 2 - ((i + spinOff) % 2), PALETTE.clamShellShade);
    return;
  }
  const waddle = frame === 'open_b' ? 1 : 0;
  rect(ctx, 1, 2, w - 2, h - 2, PALETTE.clamShellShade);
  rect(ctx, 2, 3, w - 4, 4, '#ffd8b0'); // soft inner body
  rect(ctx, 1, 2, w - 2, 2, PALETTE.clamShell);
  // shell halves hinge
  ctx.strokeStyle = PALETTE.ink; ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 2.5, w - 1, h - 3);
  // little feet waddle
  rect(ctx, 3 + waddle, h - 2, 2, 2, PALETTE.clamShellShade);
  rect(ctx, w - 5 - waddle, h - 2, 2, 2, PALETTE.clamShellShade);
  px(ctx, 5, 5, PALETTE.ink); px(ctx, w - 6, 5, PALETTE.ink);
}

function drawSnapper(ctx, w, h, frame) {
  ctx.clearRect(0, 0, w, h);
  const heights = { rise: 6, up: h, sink: 3, chomp: h };
  const visH = heights[frame] ?? h;
  const y0 = h - visH;
  rect(ctx, w / 2 - 3, y0, 6, visH, PALETTE.eelGreen);
  rect(ctx, w / 2 - 3, y0, 6, 2, PALETTE.eelGreenShade);
  if (visH > 3) {
    px(ctx, w / 2 - 3, y0 + 1, PALETTE.ink);
    px(ctx, w / 2 + 2, y0 + 1, PALETTE.ink);
    // teeth row (chomp = wider open mouth)
    const mouthW = frame === 'chomp' ? 6 : 4;
    rect(ctx, w / 2 - mouthW / 2, y0 + 2, mouthW, 2, '#e8f5f0');
    for (let i = 0; i < mouthW; i += 2) px(ctx, w / 2 - mouthW / 2 + i, y0 + 3, PALETTE.ink);
  }
}

function drawSkeeter(ctx, w, h, frame) {
  const up = frame === 'a';
  rect(ctx, w / 2 - 2, h / 2 - 2, 4, 4, '#3a2f1a');
  rect(ctx, w / 2 - 1, h / 2 - 4, 2, 2, '#3a2f1a');
  px(ctx, w / 2 - 1, h / 2 - 5, PALETTE.ink); px(ctx, w / 2, h / 2 - 5, PALETTE.ink);
  // wings up/down
  const wy = up ? 1 : 3;
  ctx.fillStyle = PALETTE.skeeterBlue;
  ctx.globalAlpha = 0.85;
  ctx.beginPath(); ctx.ellipse(w / 2 - 4, wy, 4, 2, 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(w / 2 + 4, wy, 4, 2, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
}

function drawPelicanGuard(ctx, w, h, frame) {
  const bob = frame === 'b' ? 1 : 0;
  rect(ctx, 3, 4 + bob, w - 6, h - 8, PALETTE.pelicanCream);
  rect(ctx, 3, 4 + bob, w - 6, 3, '#ffffff');
  rect(ctx, w - 7, 6 + bob, 6, 3, PALETTE.pelicanBeak); // beak/pouch
  px(ctx, w - 6, 5 + bob, PALETTE.ink);
  rect(ctx, 4, h - 4, 2, 4, '#e08a3c');
  rect(ctx, w - 8, h - 4, 2, 4, '#e08a3c');
  if (frame === 'throw') {
    rect(ctx, w - 2, 5, 3, 3, PALETTE.shrimpSalmon); // fish mid-throw
  }
  ctx.strokeStyle = PALETTE.ink; ctx.lineWidth = 1;
  ctx.strokeRect(2.5, 3.5 + bob, w - 5, h - 8);
}

function drawKingPelicano(ctx, w, h, frame) {
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2;
  let bodyY = 8, squat = 0, wingSpread = 0, flash = false, slump = false;
  switch (frame) {
    case 'strut_a': break;
    case 'strut_b': bodyY = 9; break;
    case 'crouch': squat = 6; break;
    case 'swoop': wingSpread = 1; bodyY = 4; break;
    case 'spit': break;
    case 'hurt': flash = true; break;
    case 'defeat': slump = true; bodyY = 16; break;
    default: break;
  }
  const bodyH = h - bodyY - 6 - squat;
  rect(ctx, cx - 12, bodyY + squat, 24, bodyH, PALETTE.pelicanCream);
  rect(ctx, cx - 12, bodyY + squat, 24, 4, '#ffffff');
  rect(ctx, cx - 13, bodyY + squat + bodyH - 3, 26, 3, '#d8c39a'); // belly shade
  // crown / head
  rect(ctx, cx + 8, bodyY + squat - 6, 10, 8, PALETTE.pelicanCream);
  rect(ctx, cx + 16, bodyY + squat - 2, 10, 5, PALETTE.pelicanBeak); // huge beak
  rect(ctx, cx + 16, bodyY + squat + 1, 10, 2, '#c96f1e');
  px(ctx, cx + 12, bodyY + squat - 4, PALETTE.ink);
  rect(ctx, cx + 6, bodyY + squat - 8, 4, 2, PALETTE.flareGold); // little crown tuft
  // wings
  ctx.fillStyle = '#d8c39a';
  if (wingSpread) {
    ctx.beginPath(); ctx.moveTo(cx - 12, bodyY + squat + 4); ctx.lineTo(cx - 24, bodyY - 4); ctx.lineTo(cx - 20, bodyY + squat + 10); ctx.closePath(); ctx.fill();
  } else {
    rect(ctx, cx - 16, bodyY + squat + 3, 5, bodyH - 6, '#d8c39a');
  }
  // legs
  if (!slump) {
    rect(ctx, cx - 6, h - 6, 3, 6, PALETTE.pelicanBeak);
    rect(ctx, cx + 2, h - 6, 3, 6, PALETTE.pelicanBeak);
  }
  if (frame === 'spit') {
    rect(ctx, cx + 26, bodyY + squat, 3, 3, PALETTE.shrimpSalmon);
  }
  ctx.strokeStyle = PALETTE.ink; ctx.lineWidth = 1;
  ctx.strokeRect(cx - 12.5, bodyY + squat - 0.5, 25, bodyH + 1);
  if (flash) {
    ctx.globalAlpha = 0.5; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h); ctx.globalAlpha = 1;
  }
  if (slump) {
    ctx.globalAlpha = 0.7; ctx.fillStyle = '#00000033'; ctx.fillRect(0, 0, w, h); ctx.globalAlpha = 1;
  }
}

const ENEMY_BUILDERS = {
  crabby: { w: 14, h: 12, frames: ['a', 'b', 'flat'], draw: drawCrabby },
  clacker: { w: 16, h: 14, frames: ['open_a', 'open_b', 'shut', 'slide', 'slide_b'], draw: drawClacker },
  snapper: { w: 14, h: 18, frames: ['rise', 'up', 'chomp', 'sink'], draw: drawSnapper },
  skeeter: { w: 12, h: 10, frames: ['a', 'b'], draw: drawSkeeter },
  pelican_guard: { w: 16, h: 20, frames: ['a', 'b', 'throw'], draw: drawPelicanGuard },
  king_pelicano: { w: 48, h: 48, frames: ['strut_a', 'strut_b', 'crouch', 'swoop', 'spit', 'hurt', 'defeat'], draw: drawKingPelicano },
};

function buildEnemies() {
  const out = {};
  for (const [name, spec] of Object.entries(ENEMY_BUILDERS)) {
    out[name] = {};
    for (const frame of spec.frames) {
      out[name][frame] = enemyCanvas(spec.w, spec.h, (ctx, w, h) => spec.draw(ctx, w, h, frame));
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Decorations — cage-cart (1-3 emotional core: caged shrimp, freed on boss defeat).
// ---------------------------------------------------------------------------

function drawCageCart(ctx, frame) {
  // wooden cart ~32x24: wheeled base, bar cage, 3-4 tiny shrimp inside.
  const w = 32, h = 24;
  const open = frame === 'open_a' || frame === 'open_b';
  const bob = (frame === 'caged_b' || frame === 'open_b') ? 1 : 0;

  // wheels
  ctx.fillStyle = '#3a281f';
  ctx.beginPath(); ctx.arc(8, h - 3, 4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(24, h - 3, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#6b4a3a';
  ctx.beginPath(); ctx.arc(8, h - 3, 1.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(24, h - 3, 1.4, 0, Math.PI * 2); ctx.fill();

  // cart bed (wood planks)
  rect(ctx, 2, h - 9, 28, 5, PALETTE.mangroveBark);
  rect(ctx, 2, h - 9, 28, 1, PALETTE.mangroveBarkShade);
  for (let x = 4; x < 30; x += 5) px(ctx, x, h - 6, PALETTE.mangroveBarkShade);

  // cage frame (bars) sitting on the bed
  const cageTop = 2;
  const cageBot = h - 9;
  rect(ctx, 1, cageTop, 30, cageBot - cageTop, 'rgba(0,0,0,0)');
  // corner posts
  rect(ctx, 2, cageTop, 2, cageBot - cageTop, '#8a6a3a');
  rect(ctx, 28, cageTop, 2, cageBot - cageTop, '#8a6a3a');
  rect(ctx, 2, cageTop, 28, 2, '#8a6a3a'); // roof bar

  if (open) {
    // door swung open on right hinge, cage empty
    ctx.save();
    ctx.translate(28, cageTop);
    ctx.rotate(-0.9);
    rect(ctx, 0, 0, 2, cageBot - cageTop, '#8a6a3a');
    for (let y = 3; y < cageBot - cageTop - 2; y += 4) rect(ctx, 0, y, 2, 1, '#6a4a2a');
    ctx.restore();
    // empty straw bed
    rect(ctx, 5, cageBot - 4, 22, 3, '#c9a35a');
    return;
  }

  // vertical bars (closed cage, shrimp visible behind)
  for (let x = 6; x < 28; x += 5) rect(ctx, x, cageTop, 1, cageBot - cageTop, '#8a6a3a');
  // door (closed, front-center)
  rect(ctx, 13, cageTop, 6, cageBot - cageTop, 'rgba(0,0,0,0)');

  // caged shrimp — 3-4 tiny salmon shrimp, bob/cheer alternating frame
  const shrimpSpots = [[7, cageBot - 6], [13, cageBot - 8], [19, cageBot - 6], [23, cageBot - 8]];
  ctx.strokeStyle = PALETTE.ink; ctx.lineWidth = 1;
  for (let i = 0; i < shrimpSpots.length; i++) {
    const [sx, sy0] = shrimpSpots[i];
    const lift = ((i % 2 === 0) === (bob === 0)) ? 1 : 0; // alternate shrimp cheer-hop per frame
    const sy = sy0 - lift;
    ctx.fillStyle = PALETTE.shrimpSalmon;
    ctx.beginPath(); ctx.arc(sx, sy, 2.4, 0.4, 5.4); ctx.lineWidth = 1.4; ctx.stroke();
    px(ctx, sx + 1, sy - 1, PALETTE.ink);
  }

  // straw bed under shrimp
  rect(ctx, 5, cageBot - 3, 22, 2, '#c9a35a');

  ctx.strokeStyle = '#3a281f'; ctx.lineWidth = 1;
  ctx.strokeRect(1.5, cageTop + 0.5, 29, cageBot - cageTop - 1);
}

function buildDecorations() {
  const out = {};
  out.cage_cart = {};
  for (const frame of ['caged_a', 'caged_b', 'open_a', 'open_b']) {
    out.cage_cart[frame] = enemyCanvas(32, 24, (ctx) => drawCageCart(ctx, frame));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

function drawShrimp(ctx, frame) {
  // curled shrimp, salmon colored
  const curl = frame === 'curl';
  ctx.strokeStyle = PALETTE.ink; ctx.lineWidth = 1;
  ctx.fillStyle = PALETTE.shrimpSalmon;
  if (curl) {
    ctx.beginPath(); ctx.arc(5, 5, 4, 0.2, 5.5); ctx.lineWidth = 2; ctx.strokeStyle = PALETTE.shrimpSalmon; ctx.stroke();
  } else {
    ctx.beginPath(); ctx.arc(5, 5, 4, 0.6, 5.2); ctx.lineWidth = 2; ctx.stroke();
  }
  px(ctx, 7, 3, PALETTE.ink);
  rect(ctx, 5, 7, 2, 1, PALETTE.shrimpSalmon);
}

function drawGoldenShrimp(ctx, frame) {
  drawShrimp(ctx, 'curl');
  ctx.strokeStyle = PALETTE.flareGold;
  ctx.fillStyle = PALETTE.flareGold;
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillRect(0, 0, 10, 10);
  ctx.globalCompositeOperation = 'source-over';
  if (frame === 'sparkle_a') { px(ctx, 1, 1, '#ffffff'); px(ctx, 8, 2, '#ffffff'); }
  else { px(ctx, 2, 8, '#ffffff'); px(ctx, 8, 8, '#ffffff'); }
}

function buildItems() {
  const out = {};
  out.shrimp = { curl: makeCanvas(10, 10), salmon: makeCanvas(10, 10) };
  drawShrimp(ctx2d(out.shrimp.curl), 'curl');
  drawShrimp(ctx2d(out.shrimp.salmon), 'salmon');

  out.golden_shrimp = { sparkle_a: makeCanvas(10, 10), sparkle_b: makeCanvas(10, 10) };
  drawGoldenShrimp(ctx2d(out.golden_shrimp.sparkle_a), 'sparkle_a');
  drawGoldenShrimp(ctx2d(out.golden_shrimp.sparkle_b), 'sparkle_b');

  out.preen_oil = makeCanvas(10, 12);
  {
    const ctx = ctx2d(out.preen_oil);
    rect(ctx, 2, 3, 6, 8, PALETTE.bioglow);
    rect(ctx, 3, 0, 4, 3, '#8a6a3a');
    rect(ctx, 2, 3, 6, 2, '#7ff5da');
    ctx.strokeStyle = PALETTE.ink; ctx.strokeRect(1.5, 2.5, 7, 8);
  }

  out.pearl = { shine_a: makeCanvas(10, 10), shine_b: makeCanvas(10, 10) };
  for (const [key, off] of [['shine_a', 0], ['shine_b', 2]]) {
    const ctx = ctx2d(out.pearl[key]);
    ctx.fillStyle = PALETTE.pearl;
    ctx.beginPath(); ctx.arc(5, 5, 4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = PALETTE.pearlShade; ctx.lineWidth = 1; ctx.stroke();
    px(ctx, 3 + off / 2, 3, '#ffffff');
  }

  out.egg = makeCanvas(10, 12);
  {
    const ctx = ctx2d(out.egg);
    ctx.fillStyle = '#fff7e6';
    ctx.beginPath(); ctx.ellipse(5, 6, 4, 5.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#c9a35a'; ctx.lineWidth = 1; ctx.stroke();
    px(ctx, 4, 4, PALETTE.flamingoPink); px(ctx, 6, 7, PALETTE.flamingoPink);
  }

  out.fish_projectile = makeCanvas(10, 6);
  {
    const ctx = ctx2d(out.fish_projectile);
    ctx.fillStyle = PALETTE.shrimpSalmon;
    ctx.beginPath(); ctx.ellipse(5, 3, 4, 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PALETTE.crabRedShade;
    ctx.beginPath(); ctx.moveTo(0, 3); ctx.lineTo(-2, 1); ctx.lineTo(-2, 5); ctx.closePath(); ctx.fill();
    px(ctx, 7, 2, PALETTE.ink);
  }

  out.flare_pellet = { a: makeCanvas(8, 8), b: makeCanvas(8, 8) };
  for (const [key, r] of [['a', 3], ['b', 2.4]]) {
    const ctx = ctx2d(out.flare_pellet[key]);
    ctx.fillStyle = PALETTE.flareGold;
    ctx.beginPath(); ctx.arc(4, 4, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff7a3c';
    ctx.beginPath(); ctx.arc(4, 4, r - 1.4, 0, Math.PI * 2); ctx.fill();
  }

  out.shell_kick_dust = makeCanvas(12, 8);
  {
    const ctx = ctx2d(out.shell_kick_dust);
    for (const [x, y, s] of [[1,4,2],[5,2,3],[9,5,2],[3,6,1]]) rect(ctx, x, y, s, s, '#ffffff88');
  }

  out.stomp_poof = makeCanvas(16, 10);
  {
    const ctx = ctx2d(out.stomp_poof);
    ctx.fillStyle = '#ffffffaa';
    for (const [x, y, s] of [[1,4,3],[6,1,3],[11,4,3],[4,6,2],[9,6,2]]) rect(ctx, x, y, s, s, ctx.fillStyle);
  }

  out.sparkle_trail = makeCanvas(6, 6);
  {
    const ctx = ctx2d(out.sparkle_trail);
    px(ctx, 3, 0, '#ffffff'); px(ctx, 0, 3, '#ffffff'); px(ctx, 3, 5, '#ffffff'); px(ctx, 5, 3, '#ffffff');
    px(ctx, 3, 3, PALETTE.flareGold);
  }

  return out;
}

// ---------------------------------------------------------------------------
// Parallax backgrounds — 3 themes.
// ---------------------------------------------------------------------------

function gradientLayer(w, h, topColor, bottomColor) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, topColor);
  grad.addColorStop(1, bottomColor);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  return c;
}

function saltMesaLayer(w, h) {
  const c = makeCanvas(w, h);
  const ctx = ctx2d(c);
  ctx.fillStyle = '#d9c7a9';
  for (let i = 0; i < 6; i++) {
    const bw = 50 + (i % 3) * 20;
    const bx = i * 70;
    const bh = 34 + (i % 2) * 14;
    rect(ctx, bx, h - bh, bw, bh, '#d9c7a9');
    rect(ctx, bx, h - bh, bw, 5, '#e8dcc0');
  }
  return c;
}

function duneLayer(w, h) {
  const c = makeCanvas(w, h);
  const ctx = ctx2d(c);
  ctx.fillStyle = '#c9b78e';
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.ellipse(i * 55, h, 60, 26, 0, Math.PI, 0);
    ctx.fill();
  }
  return c;
}

function rootCeilingLayer(w, h) {
  const c = makeCanvas(w, h);
  const ctx = ctx2d(c);
  ctx.fillStyle = PALETTE.mangroveBarkShade;
  for (let i = 0; i < 10; i++) {
    const rx = i * 42 + (i % 2) * 10;
    rect(ctx, rx, 0, 6, 20 + (i % 3) * 8, PALETTE.mangroveBarkShade);
  }
  return c;
}

function bioglowDotsLayer(w, h, count, size) {
  const c = makeCanvas(w, h);
  const ctx = ctx2d(c);
  let seed = count * 7 + size;
  for (let i = 0; i < count; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const x = seed % w;
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const y = (seed % h) * 0.7 + h * 0.15;
    ctx.fillStyle = PALETTE.bioglow;
    ctx.globalAlpha = 0.5 + (seed % 50) / 100;
    ctx.fillRect(x, y, size, size);
    ctx.globalAlpha = 1;
  }
  return c;
}

function sunLayer(w, h) {
  const c = makeCanvas(w, h);
  const ctx = ctx2d(c);
  ctx.fillStyle = '#ffe0a0';
  ctx.beginPath(); ctx.arc(w * 0.72, h * 0.32, 26, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = PALETTE.sunsetEmber;
  ctx.beginPath(); ctx.arc(w * 0.72, h * 0.32, 26, 0, Math.PI * 2); ctx.globalAlpha = 0.35; ctx.fill(); ctx.globalAlpha = 1;
  return c;
}

function pierPostsLayer(w, h) {
  const c = makeCanvas(w, h);
  const ctx = ctx2d(c);
  ctx.fillStyle = '#5a2c3a';
  for (let i = 0; i < 9; i++) {
    rect(ctx, i * 46 + 10, h - 70, 8, 70, '#5a2c3a');
  }
  return c;
}

function buildBackgrounds() {
  return {
    saltflats: [
      { canvas: gradientLayer(384, 216, PALETTE.lagoonSkyTop, PALETTE.lagoonSkyBottom), factor: 0.08, y: 0 },
      { canvas: saltMesaLayer(384, 216), factor: 0.25, y: 0 },
      { canvas: duneLayer(384, 216), factor: 0.5, y: 60 },
    ],
    underroots: [
      { canvas: gradientLayer(384, 216, PALETTE.underrootTeal, PALETTE.underrootTeal2), factor: 0.06, y: 0 },
      { canvas: bioglowDotsLayer(384, 216, 26, 2), factor: 0.2, y: 0 },
      { canvas: rootCeilingLayer(384, 216), factor: 0.35, y: 0 },
      { canvas: bioglowDotsLayer(384, 216, 14, 3), factor: 0.45, y: 0 },
    ],
    pier: [
      { canvas: gradientLayer(384, 216, PALETTE.sunsetEmber, PALETTE.sunsetEmber2), factor: 0.08, y: 0 },
      { canvas: sunLayer(384, 216), factor: 0.15, y: 0 },
      { canvas: pierPostsLayer(384, 216), factor: 0.4, y: 0 },
    ],
  };
}

// ---------------------------------------------------------------------------
// Logo — chunky pixel letters + flamingo one-legged on final O.
// ---------------------------------------------------------------------------

function buildLogo(font) {
  const c = makeCanvas(240, 56);
  const ctx = ctx2d(c);
  const scale = 3;
  // shadow pass
  font.drawText(ctx, 'SUPER', 6, 4 + 3, '#00000055', scale);
  font.drawText(ctx, 'MINGO', 6, 30 + 3, '#00000055', scale);
  font.drawText(ctx, 'SUPER', 6, 4, PALETTE.flareGold, scale);
  font.drawText(ctx, 'MINGO', 6, 30, PALETTE.flamingoPink, scale);

  // flamingo standing one-legged on the final O of MINGO
  const lastOX = 6 + font.measure('MING', scale) + (5 + 1) * scale + 1; // approx start of O
  const standX = 6 + 4 * (5 + 1) * scale + 4 * scale + 2;
  const standY = 30 - 12;
  const mini = makeCanvas(12, 18);
  drawMingo(ctx2d(mini), 12, 18, 'pink', 'pole');
  ctx.drawImage(mini, standX, standY);
  return c;
}

// ---------------------------------------------------------------------------

export function buildAssets() {
  const font = buildFont();
  return {
    tiles: buildTiles(),
    mingo: buildMingo(),
    enemies: buildEnemies(),
    items: buildItems(),
    decorations: buildDecorations(),
    bg: buildBackgrounds(),
    font,
    logo: buildLogo(font),
  };
}

export { PALETTE };
