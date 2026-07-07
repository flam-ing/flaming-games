# DOOMINGO — Game Design Document (v1)

**"They drained the lagoon. Wrong bird."**

A retro 2.5D raycaster FPS in the spirit of classic DOOM — except you are a flamingo.
100% original assets (all art procedurally drawn on canvas, all audio synthesized via WebAudio).
Parody/homage only: no DOOM assets, textures, music, or trademarked names may be copied.

## Fiction

Lake Natron — the caustic red soda lake where real flamingos live — has been invaded.
Demons crawled out of the brine and turned the colony's lawn-ornament cousins against them.
One flamingo didn't fly away.

- Level: **E1M1 "KNEE-DEEP IN THE BRINE"** (single level, v1)
- Death screen: **"YOU'VE GONE GRAY."**
- Win screen: kill %, items %, time. Tagline: **"THE LAGOON REMEMBERS."**

## Core biology-driven mechanics

- **PINK = health (0–100).** Flamingos are only pink because they eat shrimp. Player mugshot +
  viewmodel wing feathers desaturate from hot pink → pale gray as PINK drops.
- **SHRIMP pickups restore PINK** (+15, cap 100). Golden Shrimp: +50, rare.
- **Damage floors:** open caustic brine pools (bright red algae tiles) deal 5 PINK/sec when stood on.

## Tech

- Vanilla JS ES modules (`.mjs`), no deps, no build step (like seoul-flight-game). Deploy: GitHub Pages from main root.
- Internal framebuffer **320×200**, integer-upscaled to canvas, `imageSmoothing=false` (crunchy pixels).
- Column DDA raycaster: textured walls (64×64), flat-color floor/ceiling with distance shading,
  per-column z-buffer for sprite clipping, billboarded scaled sprites with animation frames.
- Map: 32×32 grid of cell ids. Doors = sliding cells. Things list = spawns/pickups/decor.
- Desktop: WASD + mouse (pointer lock) + 1-4 weapon keys + E use. Mobile: left virtual stick,
  right-half drag to turn, FIRE + weapon-cycle buttons (DOM overlay).

## Files & module contracts

| File | Owns | Exports (contract — do not drift) |
|---|---|---|
| `index.html` | canvas, menu overlay DOM, touch DOM | — |
| `src/art.mjs` | ALL procedural pixel art, drawn once at load | `buildAssets() -> {textures: {id: canvas64}, sprites: {id: frames[]}, hud: {mugshot: [7 states][frames]}, logo: canvas, weapons: {id: {idle, fire[]}}}` |
| `src/audio.mjs` | WebAudio synth SFX + music loop | `initAudio()`, `sfx(name)`, `music(on)`, names: squawk, peck, blast, lob, eggsplode, hurt, pickup, enemyPain, enemyDie, doorOpen, win, die |
| `src/map.mjs` | level grid + things + metadata | `MAP` `{grid: number[32][32], things: [{type,x,y,angle?}], playerStart, exit: {x,y}, name}` cell ids: 0 empty, 1-8 wall types, 9 door, 10 exit-switch wall, 20 brine damage floor (walkable) |
| `src/engine.mjs` | raycaster render + framebuffer + camera math | `render(state, assets, fb)`, `castRay(...)`, `Framebuffer` |
| `src/game.mjs` | entities, AI, combat, weapons, pickups, doors, player physics | `createGame(assets)`, `update(game, input, dt)`, entity states: idle/roam/chase/attack/pain/dead |
| `src/main.mjs` | boot, loop, input, HUD draw, menus, touch | wires everything |

## Palette (hex — use these, not approximations)

hot pink `#ff5e9c` · salmon `#ff8e72` · pale gray-pink `#cdb9b4` · caustic red `#a32c1e` ·
algae bright `#e04524` · salt white `#e8e2d2` · brine deep `#5a1420` · night purple `#241631` ·
horizon ember `#c96a3a` · plastic pink `#ff9ec4` · bone `#d9cfb8` · gator green `#4a5d3a`

Sky: vertical gradient night purple → horizon ember. Floor: brine deep. Ceiling: none (sky) outdoors, salt rock indoors.

## Wall texture set (64×64 procedural, ids 1-8)

1 salt crust (bone + cracks) · 2 salt brick (mortar lines) · 3 red algae rock (caustic red mottle)
4 plastic-pink ruin brick (the fallen lawn-flamingo shrine) · 5 rusted sheet metal · 6 bone pile
7 brine waterfall (animated 2 frames, emissive-looking) · 8 EXIT switch (big lever, salt frame)
9 door: corrugated metal with pink hazard chevrons

## Weapons (viewmodel = your beak/wings from first person, bottom center, bobs while walking)

| # | Name | Type | Ammo | Notes |
|---|---|---|---|---|
| 1 | PECK | melee | ∞ | fast, short range; beak jabs upward from bottom of screen |
| 2 | SQUAWK CANNON | hitscan cone (shotgun-feel) | BREATH (max 50, regen 1/1.5s) | screen-shake, knockback, 5 pellets |
| 3 | FEATHER STORM | rapid hitscan (chaingun-feel) | FEATHERS (pickups, max 200) | 8/sec, slight spread, pink tracer lines |
| 4 | EGG LOBBER | arcing projectile + splash (rocket-feel) | EGGS (max 10, rare) | "EGGSPLOSION" radius 3 tiles, hurts player too |

## Enemies (DOOM archetype → Doomingo)

| Enemy | Archetype | HP | Attack | Behavior | Sprite notes |
|---|---|---|---|---|---|
| Lawn Flamingo | zombieman | 20 | slow pellet (ranged 8dmg) | wobbly waddle on metal spike leg | plastic pink, dead-eyed, paint chips when in pain |
| Crab Demon | imp | 35 | thrown pincer projectile (12) / claw melee | scuttles sideways, strafes | caustic red, bubbling |
| Brine Gator | pinky | 90 | bite melee (20) | fast charge when LOS | gator green, salt-crusted back |
| Ash Vulture | lost soul | 25 | dive melee (10) | hovers, swoop-charges | gray-black, ember eyes |
| PLASTINGO (mini-boss) | — | 400 | triple pellet spread + summons 2 lawn flamingos at 50% HP | guards exit hall | 2.5× scale lawn flamingo, cracked, one eye glows |

All enemies: idle → (see/hear player) chase → attack in range → pain flinch (chance) → die (3-4 frame collapse, corpse persists). Wall-slide steering, no pathfinding needed beyond LOS + wander.

## Pickups (floor sprites, gentle 1px bob)

shrimp +15 PINK · golden shrimp +50 · feather bundle +40 feathers · egg carton +3 eggs ·
preen oil = 30s damage-x0.5 buff (screen edge shimmer) — place 1, secret area.

## Level design: E1M1 KNEE-DEEP IN THE BRINE (~25 enemies + boss)

Zones, connected in order, one optional secret:
1. **Shore spawn** — open salt flat, 3 lawn flamingos scattered, shrimp intro pickup in plain sight.
2. **Salt canyon** — winding corridor (walls 1/2), 2 crabs ambush from alcoves, brine pool crossing (damage floor with stepping-stone safe tiles).
3. **The Shrine** — plastic-pink ruin room (wall 4), 4 lawn flamingos + 2 crabs, FEATHER STORM pickup on pedestal, secret pushwall (wall 4 with slightly different tint) → preen oil + golden shrimp.
4. **Gator pens** — metal walls (5), 3 gators released by walk-over trigger, egg carton reward.
5. **Vulture roost** — bone walls (6), open ceiling sky, 3 vultures + 2 crabs, EGG LOBBER on a bone altar.
6. **Boss hall** — long approach with brine gutters, PLASTINGO + 2 crabs, EXIT switch (wall 8) behind boss.

## HUD (drawn in framebuffer, DOOM-style status bar ~40px)

`PINK %` (left, big) · ammo of current weapon · weapon name · center: **flamingo mugshot**
(7 damage tiers hot-pink→gray; idle blink, looks left/right occasionally, "angry squint" while firing,
"ouch" on hit — this is the soul of the HUD, invest in it) · right: BREATH bar + kills counter.
Damage = red screen flash; pickup = pink flash. Minimal top-left: level name on entry (3s fade).

## Audio (all synthesized, initAudio on first user gesture)

- Music: ~140bpm driving loop, square-wave palm-mute-feel bass riff in E phrygian (DOOM energy,
  original melody!), noise-burst drums (kick/snare/hat), 8-bar loop with a B-section. Toggle M.
- squawk: descending saw sweep + noise. peck: short thock. blast: filtered noise burst + pitch drop.
- eggsplode: sub sine drop + noise decay. hurt: quick down-chirp. pickup: two-note up-blip.
- enemy sounds pitched per type (crab = bubbly, gator = low growl, vulture = screech, plastingo = detuned squawk).

## Menus

- Title: procedural pixel logo "DOOMINGO" (chunky 3D-extruded letters, hot pink on night purple,
  flamingo silhouette standing on the O), menu: START / HOW TO PLAY / MUSIC ON-OFF. Any key → start.
- Pause (Esc when pointer unlocks): resume/restart/music.
- Death: red-gray fade, "YOU'VE GONE GRAY." + press R. Win: stats screen.

## Non-negotiables

- 60fps target on desktop; framebuffer ops must be typed-array based (no per-pixel canvas API calls in the hot loop).
- No external assets/fonts/CDNs. All art from `art.mjs` drawing code. Pixel font: tiny 3×5 or 5×7 bitmap font drawn in art.mjs.
- Mobile playable (virtual stick + fire), though desktop-first.
- All-original content (parody names fine; no copied assets/lyrics/riffs).
