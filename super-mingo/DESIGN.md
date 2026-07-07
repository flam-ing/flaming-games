# SUPER MINGO — Game Design Document (v1)

**"King Pelicano scooped every shrimp in the lagoon into his pouch. The colony is going gray. One bird runs."**

A side-scrolling platformer in the spirit of classic 8-bit plumber games — except you are a flamingo.
Sister project of DOOMINGO (same lagoon universe). 100% original: procedural pixel art, synthesized
WebAudio chiptune, original level layouts and names. NO Nintendo assets, sprites, layouts, melodies,
or names (no goomba/koopa/mario strings anywhere in code).

## Core biology mechanic (the mushroom translation)

- **Gray Mingo** (small state): faded, small hitbox (14×15px). Flamingos NEED shrimp to be pink.
- **SHRIMP** pickup → **Pink Mingo**: full plumage, taller (14×27px), can break salt-brick tiles by
  head-bump. Getting hit while pink → revert to gray + 1.5s blink invincibility (no death).
- **GOLDEN SHRIMP** (only spawns when already pink) → **FLARE MINGO**: pink-gold plumage; X spits a
  bouncing flare pellet (2 max on screen, kills most enemies). Flamingo → flame. Yes.
- **PREEN OIL** (star equivalent): 8s sparkle invincibility, kill-on-touch, music double-time.
- **PEARL** (coin): collect 100 → +1 life (egg jingle). **EGG** (1UP): hidden, rare.
- Death: fall in pit / hit while gray / time out → "MINGO DOWN!" respawn (3 lives, checkpoint mid-level).

## Move feel (tune to these numbers, 60fps fixed-step)

Walk 1.3px/f max, run 2.2px/f (hold RUN), accel 0.08/f, skid decel 0.18/f with turn-skid dust.
Jump: press = -4.6px/f, hold sustains up to 18 frames (variable height); gravity 0.28px/f²; terminal 4.5.
**FLUTTER**: press JUMP again mid-air → one small wing-flap lift (-2.2px/f, resets on landing) with
flap animation — the flamingo signature move, makes gaps forgiving. Coyote time 5f, jump buffer 5f.
Stomp bounce -3.2 (hold jump: -4.6). Max jump ≈ 4 tiles high / 5-tile gap walking, 7-tile gap running+flutter.

## Tiles (16px, ASCII legend for levels.mjs)

`.` air · `#` ground saltstone · `=` platform top (one-way) · `B` salt brick (breakable when pink) ·
`?` oyster block (bump: pearl ×1 default; `S` shrimp block, `G` golden-shrimp block, `E` egg block,
`O` preen-oil block — all render as pulsing oyster, spent = closed gray shell) · `|` mangrove stump
(warp when DOWN pressed on top, only marked pairs) · `^` spikes (urchin bed) · `~` brine surface
(deadly pit water, animated) · `P` perch pole (level end: grab → slide → **one-legged stand pose** +
jingle + score by grab height) · `-` barrel float platform (moves on path) · `C` checkpoint shell.

## Enemies (all original crustacean/lagoon fauna)

| Enemy | Inspired-by role | Behavior | Stomp | Other kill |
|---|---|---|---|---|
| **Crabby** | goomba | sidles, turns at edges/walls | flattens, squeak | flare, oil, slide-shell |
| **Clacker** (clam) | shell turtle | waddles; stomp → closes shut; kick shut shell → slides, kills enemies, rebounds off walls, can hurt Mingo on return | close/kick | flare while open |
| **Snapper** (eel) | piranha plant | rises/sinks from stump hollows on timer; won't rise if Mingo adjacent | NO — hurts | flare only |
| **Skeeter** (dragonfly) | flying patrol | hover-bobs horizontal/vertical path | yes (bounce high) | flare |
| **Pelican Guard** | hammer bro (lite) | paces short range, lobs fish in arcs every ~2.5s | yes | flare ×2 |
| **KING PELICANO** | boss (1-3 end) | pier arena; cycle: strut → swoop across (telegraph crouch) → land, spit 3 fish arcs → repeat; **stomp his head 3×** (each stomp: faster + angrier, brief invuln flash); defeated → pouch bursts, shrimp rain, cage opens | 3 stomps | flare ×12 |

## Levels (original layouts — author to these beats, ~200 tiles wide each)

**1-1 SALT FLATS SPRINT** (day; sky pink-blue gradient, distant salt mesas parallax)
Beats: safe flat run-up → first Crabby pair → oyster row (pearl, pearl, SHRIMP tutorial) → salt-brick
staircase with hidden EGG block above (flutter to reach) → stump warp down to 12s pearl bonus cave
(8 pearls arc) → Clacker intro on wide ledge (kick corridor teaches shell slide wiping Crabbies) →
double gap (walk-able, then run-able) → checkpoint → skeeter over urchin bed → descending steps →
perch pole. ~14 enemies, gentle.

**1-2 MANGROVE UNDERROOTS** (underground; dark teal + bioluminal accents, root ceiling)
Enter by stump. Beats: low-ceiling crawl over brine gutters → Snapper stump alley (rhythm gate) →
one-way root platforms ascending (skeeter crossfire) → salt-brick maze pocket with `G` golden-shrimp
block (needs pink from 1-1 or the `S` block just before) → barrel floats over long brine pool →
checkpoint → Clacker gauntlet on slope → shell-kick opens brick wall → exit stump rises to sunset
surface, short victory run to perch pole. ~18 enemies.

**1-3 PIER OF KING PELICANO** (sunset pier; ember sky, brine below between planks)
Beats: plank runs with missing boards (flutter tester) → Pelican Guard intro on crates → barrel float
chain over open brine → skeeter swarm weave → checkpoint at cage-cart (caged shrimp visible, they
cheer) → guard duo + urchin planks → arena gate drops → **KING PELICANO** boss → cage opens, shrimp
rain, `THE COLONY FEASTS TONIGHT.` + stats. ~16 enemies + boss.

## Files & module contracts

| File | Owns | Exports |
|---|---|---|
| `index.html` | canvas, touch DOM | — |
| `src/art.mjs` | all procedural pixel art + 5×7 font | `buildAssets()` → `{tiles:{}, mingo:{gray/pink/flare × idle/walk2f/run2f/skid/jump/flutter2f/stomp/hurt/pole}, enemies:{...perType frames}, items:{}, bg:{parallax layers per level theme}, font, logo}` |
| `src/audio.mjs` | WebAudio | `initAudio()`, `sfx(name)`, `music(track:'overworld'/'underroots'/'boss'/'off', fast=false)` |
| `src/levels.mjs` | 3 ASCII maps + legend + entity spawns + theme ids | `LEVELS[3]`, `TILE_LEGEND` |
| `src/engine.mjs` | fixed-step loop helper, camera (look-ahead + platform-snap), tile renderer, parallax, sprite draw | small render/camera API |
| `src/game.mjs` | player physics per the numbers above, entities, collisions (swept AABB vs tile grid), blocks, powerups, boss, win/lose | `createGame(levelIdx)`, `update(g, input)` |
| `src/main.mjs` | boot, input (kbd+touch), HUD, title/level-card/death/win screens, level flow | — |

Internal res **384×216**, integer scale, pixelated. No deps, no build. Deploy: GitHub Pages main root.

## Palette

flamingo pink `#ff5e9c` · flare gold `#ffc857` · gray mingo `#b9a8a6` · lagoon sky `#8fd3e8` →
`#f7c8d8` (1-1 gradient) · underroot teal `#0f2f33` + bioglow `#3ee6c4` · sunset ember `#ff8a5c` /
`#c9366b` (1-3) · saltstone `#e3d9c4` (+shade `#b8ab8e`) · mangrove bark `#6b4a3a` · brine `#virulent
red-teal mix #1e5f5a` with foam `#d8f0e8` · pearl `#f2ecdf` · shrimp salmon `#ff8e72`.

## HUD & screens

Top bar (font): `MINGO ×{lives(egg icons)}  ⬤{pearls}  WORLD 1-{n}  TIME {t}` + power icon.
Title: logo "SUPER MINGO" (chunky pixel, flamingo neck forms the S curve... if too hard: flamingo
standing on the final O), lagoon bg, START / HOW TO PLAY / MUSIC. Level card between levels
(black: `WORLD 1-n` + name + lives). Death: "MINGO DOWN!". Game over: "THE COLONY GOES HUNGRY."
Win: shrimp-rain stats screen "THE COLONY FEASTS TONIGHT."

## Audio (all original melodies!)

overworld: bouncy major-key chiptune ~150bpm (pulse lead + triangle bass + noise hats, 8-bar AABA);
underroots: same engine, minor key, sparse echo feel; boss: driving 6/8; perch-pole jingle; sfx:
flap-jump (short chirp+noise), flutter (double chirp), stomp squeak, pearl ding, shrimp powerup
arpeggio up, flare spit, hurt down-chirp, 1up egg jingle, shell kick clack, boss squawk, win fanfare.

## Non-negotiables

- All 3 levels completable: respect the movement numbers when authoring gaps/heights (max run+flutter
  gap 7 tiles, max jump height 4 tiles; checkpoint mid-level each).
- 60fps; single canvas; typed input state; no per-frame allocations in hot paths.
- Mobile: left D-pad (◀ ▶) + B (run/flare) + A (jump/flutter) touch overlay.
- Zero external assets/CDNs/deps. Original everything (parody names fine).
