# 🦩 DOOMINGO

**They drained the lagoon. Wrong bird.**

[![Play Now](https://img.shields.io/badge/▶_PLAY_NOW-live_demo-ff5e9c?style=for-the-badge)](https://flam-ing.github.io/flaming-games/doomingo/)

A retro 2.5D raycaster FPS in the spirit of classic '90s shooters — except you are a flamingo, and the lake is fighting back.

## The Story

Lake Natron — the real, caustic red soda lake where actual flamingos live — has been invaded. Demons crawled out of the brine and corrupted the colony's lawn-ornament cousins, turning them against their own kind. One flamingo didn't fly away.

**E1M1 "KNEE-DEEP IN THE BRINE"** — fight through salt canyons, a fallen plastic-pink shrine, gator pens, and a bone-strewn vulture roost to reach the **PLASTINGO**, the corrupted lawn ornament guarding the exit.

### The PINK mechanic

Flamingos are only pink because of what they eat — beta-carotene from shrimp. That biology is the whole health system: **PINK is your health (0–100)**. Take damage and your feathers desaturate from hot pink toward pale gray. Eat shrimp to stay vivid. Run out of pink, and you've gone gray for good.

## Controls

| Action | Desktop | Mobile |
|---|---|---|
| Move | WASD | Left virtual stick |
| Look / Turn | Mouse (pointer lock) | Drag right half of screen |
| Fire | Left click | FIRE button |
| Switch weapon | 1–4 | Weapon-cycle button |
| Use / open door | E | Tap door |
| Pause | Esc | — |
| Toggle music | M | — |

## Weapons

| # | Name | Type | Ammo |
|---|---|---|---|
| 1 | PECK | Melee, fast & short range | Infinite |
| 2 | SQUAWK CANNON | Hitscan cone (shotgun-feel), 5 pellets + knockback | BREATH (max 50, regens) |
| 3 | FEATHER STORM | Rapid hitscan (chaingun-feel), 8/sec | FEATHERS (pickups, max 200) |
| 4 | EGG LOBBER | Arcing splash projectile, radius-3 "EGGSPLOSION" (hurts you too) | EGGS (max 10, rare) |

## Enemies

| Enemy | HP | Attack | Behavior |
|---|---|---|---|
| Lawn Flamingo | 20 | Slow ranged pellet (8) | Wobbly waddle on a metal spike leg |
| Crab Demon | 35 | Thrown pincer (12) / claw melee | Scuttles sideways, strafes |
| Brine Gator | 90 | Bite melee (20) | Fast charge on line of sight |
| Ash Vulture | 25 | Dive melee (10) | Hovers, then swoop-charges |
| **PLASTINGO** (boss) | 400 | Triple pellet spread + summons 2 Lawn Flamingos at 50% HP | Guards the exit hall, one eye glows |

21 regular enemies plus the PLASTINGO boss patrol the level.

## Tech Notes

- **Vanilla JS ES modules**, zero dependencies, zero build step — open `index.html` or serve the folder statically.
- Internal **320×200 framebuffer**, integer-upscaled with `imageSmoothing` disabled for crunchy, period-correct pixels.
- Column-DDA raycaster: textured walls, distance-shaded flat floor/ceiling, per-column z-buffer sprite clipping, billboarded animated sprites.
- **All art is procedurally drawn on `<canvas>`** at load time — no image files, no external fonts.
- **All audio is synthesized live via the WebAudio API** — music loop, SFX, everything. No audio files.
- Mobile-playable via an on-screen virtual stick + drag-to-turn + fire button, desktop-first control scheme.

## Disclaimer

DOOMINGO is an original parody/homage inspired by classic 1990s raycaster shooters. All code, art, level design, sound, and music are 100% original and created for this project — **no assets, textures, sounds, or trademarked material from id Software or any other studio were copied, extracted, or used.** Any resemblance in tone or structure is affectionate parody, not reproduction.
