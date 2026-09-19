# Pocket pack contract

Use original Canvas 2D vector art. Logical surface 900 x 600, y grows down. All gameplay is single-player, own record/challenge; CPU rival if useful. No external runtime dependency, no DOM in game packs. Create real distinct mechanics, readable Korean instructions, actual mouse/touch/key gameplay. All graphics/assets original flamingo parody. Never claim exact original physics or levels.

Export `games` array from games/{sports,tap,puzzle}.js. Each entry:
`{id, name, category:'sports'|'tap'|'puzzle', kicker, description, controls, objective, inspiration, sourceUrl, adaptation, color, medal:[bronze,silver,gold], create(env)}`.
`medal` are increasing SCORE thresholds; higher score always better. Finish results can clear/fail/record. `sourceUrl` must be a verified primary page or legitimate rule reference, inspiration describes genre/example transparently.

`env` = `{random():[0,1), finish({score, outcome:'clear'|'fail'|'record', message}), sound(kind), seed}`. `sound` kind tap/good/bad/win only. Call finish exactly when natural round/level progression ends. No arbitrary fallback success. Game instance returned:
- `update(dt,input)` advances simulation; dt<=1/30. Own elapsed time. `update(0,neutralInput)` MUST be safe.
- `draw(ctx)` draws entire 900x600 canvas (real CanvasRenderingContext2D), no DOM.
- `hud()` returns `{score, label, value, hint, progress?}`. label/value supplementary e.g. 남은 시간/30s or 단계/2·4. progress optional0..1.
- `bot()` returns RAW input for deterministic QA, using normal actions only, no direct wins/state writes. Autoplay isn't shown in the product.
- `snapshot()` optional small numeric/state object for finite-value and mechanics verification.

Raw input: `{x: -1..1, y:-1..1, a:boolean, b:boolean, pointer:{x,y,down,valid}}`, pointer coordinates logical 900x600. Engine adds `{ap,bp,ar,br}` and pointer `{pressed,released}`. `ap`=press edge, `ar`=release edge. Session preserves both quick press/release between frames. Pointer valid only while interacting/hovering inside surface. Mobile touch pad supplies x/y and A/B. Space/Q/Enter=A; E/Shift=B; WASD/arrows move. Use A for tap games. Pointer click may be treated as A if pack explicitly handles `input.pointer.pressed` OR `input.ap`; don't engine-auto-duplicate taps.

Import shared helpers from `../draw.js`: `W=900,H=600,C` colors, `clamp(n,a,b)`, `lerp(a,b,t)`, `circle(ctx,x,y,r,fill,stroke?,lineWidth=2)`, `rect(ctx,x,y,w,h,fill,radius=0,stroke?)`, `line(ctx,x1,y1,x2,y2,color,width=3)`, `text(ctx,label,x,y,size=24,color=C.ink,align='center',weight=800)`, `bird(ctx,x,y,size=50,{color,flip,pose,rotation}={})` flamingo centered feet at x,y; `bg(ctx,{sky,ground,groundY=430}={})`; `button(ctx,label,x,y,w,h,{active,color}={})`; `hit(pointer,x,y,w,h)` rectangular hit, `distance(x1,y1,x2,y2)`. Default C={ink:'#233c37',pink:'#f27ca0',rose:'#c94f78',cream:'#fff7df',mint:'#a7c6ad',teal:'#4e857b',blue:'#8cbbce',gold:'#e7b650',red:'#d26b59',white:'#fffdf4'}. Do not require other exports. Don't modify core.js, draw.js, app.js, index.html, style.css, registry.js, shared CONTRACT.

12 games per pack. Sports IDs sports-...; tap IDs tap-...; puzzle IDs puzzle-.... Each must show visible player intention/action, meaningful loss or score, natural end, replay via new factory. Timed arcade rounds 30-60s; finite puzzles preferably 3-5 designed solvable levels. Include undo/reset for dead-end puzzles (B), visible hint/instructions; no trial-lock traps. Keyboard and pointer alternatives when practical. Large mobile-friendly hit targets. Use readable symbols/color+labels, not color alone. Coinciding timers/input edges must be correct.

Test game bots over seeds17/93/2026, idle/varied input finite, render with draw proxy; ensure each is completable via normal input, losses legitimate, finish present. Save QA script/report under projectless work/pocket-research (outside repo) and send summary. Real browser UI integration done by root later. Own game pack only.
