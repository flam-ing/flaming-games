# Flamingo Pocket

36 original 2D browser minigames in the Flaming Games collection. Canvas drawings, characters, courses and puzzle layouts are created for this project. The collection reinterprets familiar sports, one-button arcade and mobile/ad puzzle mechanics; each game's metadata and in-app notes link its reference and explain changes.

- **Field Day (12):** sprint, hurdles, long jump, javelin, archery, swimming, rowing, basketball, table tennis, fencing, weightlifting and curling.
- **One More Tap (12):** spring jumps, swinging landings, pancake flips, moving gates, stacking, extending bridges, signal timing, orbital landings, elevators, catching, braking and a tilt maze.
- **Think & Play (12):** pull pins, parking escape, water sorting, screw supports, draw a bridge, rotating pipes, arithmetic gates, tower arithmetic, fruit merging, rope cutting, sliding blocks and match-three.

## Play

Serve the repository root over HTTP (for example, `python3 -m http.server 8896`) and visit `/flamingo-pocket/`. No build, dependencies, server API or external graphics are needed.

Use arrows/WASD for direction, Space/Q for A, E for B and P to pause. Touch controls and direct canvas tapping/dragging are supported. Read the instructions before each game; controls vary by game. Optional gamepad axes and buttons 0/1 are mapped to the same inputs. Best scores, play counts and earned medals are saved in this browser under `flamingo-pocket.records.v1`. Closing a tab does not preserve an unfinished round.

Losing focus or cancelling an active touch pauses play. Enter/Space activate normal buttons, including start, resume and replay. A short tap is queued even when press and release occur between animation frames. Sound is synthesized locally and can be muted.

## Structure

- `games/sports.js`, `games/tap.js`, `games/puzzle.js`: 12 distinct games per pack, with metadata, real game rules, drawings and normal-input QA bots.
- `core.js`: seeded randomness, edge-aware input and result lifecycle.
- `draw.js`: shared original vector drawing primitives.
- `app.js`: gallery, search, responsive play dialog, controls and local records.
- `CONTRACT.md`: pack interface and canvas/input contract.

Bots only emit ordinary player inputs. They do not set scores, solve boards directly or overwrite results. Nine puzzle types have three finite stages; the gate runner, fruit merge and match-three use timed rounds. Some puzzles intentionally wait for input without a time limit.

## Verification and release

Run `node flamingo-pocket/scripts/simulate.mjs` from the repository root. This checks 36 games across three seeds: 108 complete bot playthroughs plus 216 idle/varied-input runs. It validates metadata, finite states, drawing arguments and result termination; output goes to the ignored `scripts/out/` folder. Browser QA additionally covers actual keyboard, mouse and touch interactions, focus loss, touch cancellation, pause, replay and saved records.

After changing runtime files, run `node flamingo-pocket/scripts/release.mjs` to regenerate `release.json`. The release identifier is derived from all runtime asset hashes. After deployment, run `node flamingo-pocket/scripts/release.mjs https://flaming-games.vercel.app/flamingo-pocket/` (or the GitHub Pages URL) to verify the live manifest and every runtime asset against this checkout.

Existing hosting paths: `/flamingo-pocket/` on the connected Vercel project and `/flaming-games/flamingo-pocket/` on GitHub Pages. This is a browser collection; it does not publish native applications to an app store.
