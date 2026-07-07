# 🦩 SUPER MINGO

**Shrimp is the new mushroom.**

A side-scrolling platformer in the spirit of classic 8-bit plumber games — except you're a flamingo, and the thing that makes you glow up isn't a mushroom, it's a shrimp.

**[▶ Play it live](https://flam-ing.github.io/flaming-games/super-mingo/)**

## Concept

King Pelicano scooped every shrimp out of the lagoon into his pouch, and the flamingo colony is going gray — literally. Flamingos are pink because of the shrimp they eat (real biology!), so in SUPER MINGO, shrimp pickups are the power-up chain instead of mushrooms/flowers. One gray flamingo runs across the salt flats, through the mangrove roots, and out onto the pier to get the colony's dinner back.

Sister project: **[DOOMINGO](../doomingo/)** — same lagoon universe, different genre.

100% original: procedural pixel art, synthesized WebAudio chiptune, original level layouts, names, and mechanics. No borrowed assets, sprites, melodies, or strings from any existing game.

## Controls

**Desktop (keyboard)**
| Key | Action |
|---|---|
| ◀ / ▶ (arrow keys) | Walk / turn |
| Z or Shift | Run (hold) / Flare spit (when Flare Mingo) |
| X or Space | Jump — press again mid-air to **Flutter** (wing-flap lift) |
| ↓ (on marked stump tile) | Warp down |

**Mobile (touch overlay)**
| Control | Action |
|---|---|
| ◀ ▶ D-pad (bottom-left) | Walk / turn |
| B button | Run / Flare spit |
| A button | Jump / Flutter |

## Power-up chain

| State | Trigger | Effect |
|---|---|---|
| **Gray Mingo** | start / hit while gray | Small hitbox, faded plumage — one hit from game over |
| **Pink Mingo** | eat SHRIMP | Full plumage, taller hitbox, can head-bump salt-brick tiles. Hit while pink → revert to gray (no death) + 1.5s invincibility blink |
| **Flare Mingo** | eat GOLDEN SHRIMP (only while already pink) | Pink-gold plumage, spits a bouncing flare pellet that kills most enemies |
| **Sparkle invincibility** | eat PREEN OIL | 8s kill-on-touch invincibility, music kicks into double-time |
| **Extra life** | collect 100 PEARLS, or find a hidden EGG | +1 life |

## Enemies

| Enemy | Behavior | Stomp | Other kill |
|---|---|---|---|
| **Crabby** | Sidles along, turns at edges/walls | Flattens (squeak) | Flare, oil, sliding shell |
| **Clacker** (clam) | Waddles; stomp closes it shut; kick the shut shell to slide it into other enemies | Close / kick | Flare while open |
| **Snapper** (eel) | Rises/sinks from stump hollows on a timer; won't rise if you're adjacent | Hurts you instead | Flare only |
| **Skeeter** (dragonfly) | Hover-bobs a horizontal/vertical patrol path | Bounces you high | Flare |
| **Pelican Guard** | Paces a short range, lobs fish in arcs | Yes | Flare ×2 |
| **KING PELICANO** (boss) | Struts, swoops across the pier, lands and spits 3 fish arcs, repeats — gets faster and angrier each hit | 3 stomps to defeat | Flare ×12 |

## The three levels

1. **1-1 SALT FLATS SPRINT** — day, salt-mesa parallax. A gentle intro run: Crabby pairs, the shrimp tutorial, a salt-brick staircase, a pearl bonus cave, and a first Clacker corridor.
2. **1-2 MANGROVE UNDERROOTS** — dark teal underground with bioluminescent accents. Snapper alleys, ascending root platforms, a golden-shrimp maze pocket, and barrel floats over brine pools.
3. **1-3 PIER OF KING PELICANO** — sunset pier over open brine. Plank runs with missing boards, Pelican Guards, a checkpoint, and the King Pelicano boss fight to close out the colony's rescue.

## Tech notes

- **Vanilla JS ES modules** (`.mjs`) — zero dependencies, zero build step, zero external assets or CDNs
- Internal render resolution **384×216**, integer-scaled and pixelated for a crisp retro look
- All art is **procedurally generated pixel art** drawn at runtime (`src/art.mjs`), including a custom 5×7 bitmap font
- All music and sound effects are **synthesized live via the Web Audio API** (`src/audio.mjs`) — original chiptune melodies, no samples
- Fixed-step 60fps game loop, swept-AABB tile collision, camera look-ahead (`src/engine.mjs`, `src/game.mjs`)
- Deploys as a static site straight from the repo root via GitHub Pages

Module layout: `src/art.mjs` (art + font), `src/audio.mjs` (sound), `src/levels.mjs` (ASCII level maps + legend), `src/engine.mjs` (render/camera helpers), `src/game.mjs` (physics/collision/entities), `src/main.mjs` (boot, input, HUD, screens).

## Disclaimer

SUPER MINGO is an original work — original code, original pixel art, original music, original level design and enemy roster. It's an affectionate parody of the 8-bit platformer genre in general, not a reproduction of any specific game's assets, code, or content. Any resemblance in genre conventions (side-scrolling, power-up chains, stomp-to-kill enemies) reflects a shared, decades-old genre vocabulary, not copied material.
