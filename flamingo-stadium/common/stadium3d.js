import * as THREE from './vendor/three.module.min.js';

/**
 * Procedural presentation only. The original games own physics, input, clocks,
 * random choices and scores. Nothing in this module mutates a player's state.
 *
 * new Stadium3D('splash' | 'run' | 'topsy')
 *   available: boolean (WebGL2 initialization/context-loss fallback)
 *   render(ctx, {time, players: original P, raceTime?, ended?, winner?, over?})
 *     -> boolean; the caller draws its HUD afterwards, or the original 2D view
 *        if false. This does not start another animation loop.
 *   projectPlayer(i, offsetY?) -> {x,y} in the original 960 × 540 canvas
 *   project(worldX,worldY,worldZ) -> {x,y}
 *   dispose() releases WebGL resources.
 *
 * All meshes/materials are constructed once and reused. Three.js 0.180.0 is
 * vendored with its MIT license; no network, external art or build is required.
 */
const W = 960, H = 540, TAU = Math.PI * 2;
const COLORS = ['#f26b91', '#57b9f2', '#ffc954', '#79ce9c'];
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const material = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: .86, ...extra });
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);

function mesh(parent, geometry, mat, x = 0, y = 0, z = 0, shadow = true) {
  const obj = new THREE.Mesh(geometry, mat);
  obj.position.set(x, y, z); obj.castShadow = shadow; obj.receiveShadow = true;
  parent.add(obj); return obj;
}
function box(parent, x, y, z, sx, sy, sz, mat, shadow = true) {
  return mesh(parent, new THREE.BoxGeometry(sx, sy, sz), mat, x, y, z, shadow);
}
function sphere(parent, x, y, z, sx, sy, sz, mat, shadow = true) {
  const o = mesh(parent, new THREE.SphereGeometry(1, 12, 8), mat, x, y, z, shadow);
  o.scale.set(sx, sy, sz); return o;
}
function tube(parent, points, radius, mat, segments = 20) {
  return mesh(parent, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => v3(...p))), segments, radius, 7, false), mat);
}
function rod(parent, a, b, radius, mat) {
  const p = v3(...a), q = v3(...b), delta = q.clone().sub(p);
  const o = mesh(parent, new THREE.CylinderGeometry(radius, radius, delta.length(), 7), mat);
  o.position.copy(p.add(q).multiplyScalar(.5));
  o.quaternion.setFromUnitVectors(v3(0, 1, 0), delta.normalize()); return o;
}
function ring(parent, radius, width, mat, y = .02) {
  const o = mesh(parent, new THREE.TorusGeometry(radius, width, 6, 72), mat, 0, y, 0, false);
  o.rotation.x = Math.PI / 2; return o;
}
function sign(parent, label, x, y, z, width, height, color = '#233a50') {
  const c = document.createElement('canvas'); c.width = 768; c.height = 160;
  const ctx = c.getContext('2d');
  ctx.fillStyle = color; ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#fff3dd'; ctx.font = '900 62px system-ui, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, 384, 82);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const o = mesh(parent, new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: tex }), x, y, z, false);
  return o;
}

function makeFlamingo(color) {
  const root = new THREE.Group(), yaw = new THREE.Group(), body = new THREE.Group();
  root.add(yaw); yaw.add(body);
  const pink = material('#fb8aaf'), soft = material('#ffc0cc'), dark = material('#e85688');
  const black = material('#233446'), ivory = material('#fff2d7'), legsMat = material('#d97986');
  const team = material(color), gold = material('#ffd164', { metalness: .15, roughness: .45 });
  sphere(body, -.06, 1.04, 0, .6, .4, .36, pink);
  sphere(body, -.19, .98, 0, .48, .27, .3, soft);
  // A continuous S neck, a crooked beak, and long jointed legs preserve the
  // flamingo silhouette at gameplay size, including when seen from the back.
  tube(body, [[.23, 1.16, 0], [.49, 1.4, 0], [.22, 1.72, 0], [.27, 2.04, 0], [.57, 2.15, 0]], .105, pink);
  sphere(body, .59, 2.13, 0, .235, .195, .19, pink);
  const beak = new THREE.Group(); beak.position.set(.77, 2.095, 0); body.add(beak);
  sphere(beak, .1, -.035, 0, .19, .105, .11, ivory);
  const tip = sphere(beak, .22, -.135, 0, .095, .145, .087, black); tip.rotation.z = -.3;
  for (const side of [-1, 1]) {
    sphere(body, .65, 2.19, side * .172, .052, .052, .016, ivory, false);
    sphere(body, .662, 2.19, side * .188, .025, .032, .013, black, false);
  }
  // Player-colour shoulder ribbons keep all characters recognizably pink.
  const wings = [];
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group(); pivot.position.set(.04, 1.15, side * .27); body.add(pivot);
    const wing = sphere(pivot, -.22, -.04, side * .06, .43, .22, .11, dark);
    wing.rotation.z = .22;
    sphere(pivot, -.05, .045, side * .14, .24, .1, .025, team);
    for (let j = 0; j < 3; j++) {
      const feather = sphere(pivot, -.39 + j * .13, -.15, side * .07, .16, .065, .072, pink);
      feather.rotation.z = -.3;
    }
    wings.push(pivot);
  }
  const tail = mesh(body, new THREE.ConeGeometry(.17, .42, 5), dark, -.64, 1.08, 0);
  tail.rotation.z = Math.PI / 2 + .2;
  const legs = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(-.08, .95, side * .17); yaw.add(leg);
    rod(leg, [0, 0, 0], [.075, -.46, 0], .038, legsMat);
    sphere(leg, .075, -.46, 0, .06, .06, .06, legsMat);
    rod(leg, [.075, -.46, 0], [-.025, -.91, 0], .031, legsMat);
    for (let toe = -1; toe <= 1; toe++) rod(leg, [-.025, -.9, 0], [.21, -.93, toe * .09], .023, legsMat);
    legs.push(leg);
  }
  const badge = sphere(body, .33, 1.055, .28, .1, .1, .024, gold, false);
  badge.rotation.y = .6;
  const base = ring(root, .59, .045, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .9 }), .028);
  const aura = ring(root, .76, .035, new THREE.MeshBasicMaterial({ color: '#fff6c5', transparent: true, opacity: .55 }), .2);
  aura.visible = false;
  const shadow = mesh(root, new THREE.CircleGeometry(.59, 32), new THREE.MeshBasicMaterial({ color: '#253d4b', transparent: true, opacity: .14, depthWrite: false }), 0, .022, 0, false);
  shadow.rotation.x = -Math.PI / 2; shadow.scale.y = .75;
  const mats = [pink, soft, dark, black, ivory, legsMat, team, gold];
  return { root, yaw, body, wings, legs, base, aura, shadow, mats, team, color, scale: 1 };
}

function animateBird(bird, p, t) {
  const { root, yaw, body, wings, legs, base, aura, shadow } = bird;
  const pose = p.pose || 'idle', phase = t * (pose === 'run' ? 16 : 3.3) + p.i * 1.7;
  const run = pose === 'run', air = ['jump', 'fly', 'ball'].includes(pose), crouch = pose === 'harden';
  const spin = pose === 'ball', hit = ['hit', 'dizzy'].includes(pose), sleep = pose === 'sleep';
  root.visible = p.active !== false; root.position.set(p.x, p.y, p.z);
  root.scale.setScalar(p.scale ?? 1);
  yaw.rotation.set(0, p.rotation || 0, 0);
  yaw.rotation.z = hit ? Math.sin(t * 18 + p.i) * .22 : run ? -.06 : 0;
  body.position.y = crouch ? -.25 - Math.sin(t * 55) * .018 : sleep ? -.35 : Math.sin(phase) * (run ? .085 : .025);
  body.rotation.z = crouch ? -.12 : sleep ? .28 : hit ? -.2 : 0;
  for (let k = 0; k < 2; k++) {
    const s = k ? 1 : -1;
    wings[k].rotation.x = s * (spin ? 1.4 : air ? .65 + Math.sin(t * 14) * .48 : run ? .18 + Math.sin(phase) * .14 : .04);
    legs[k].rotation.z = run ? Math.sin(phase + k * Math.PI) * .65 : air ? .58 + k * .22 : crouch ? .48 : sleep ? .85 : Math.sin(phase + k) * .035;
  }
  base.visible = p.grounded !== false;
  base.scale.setScalar(1 + (p.charge || 0) * .22);
  base.material.opacity = crouch ? .75 + Math.sin(t * 25) * .2 : .72;
  aura.visible = spin || (p.charge || 0) >= .95;
  aura.position.y = spin ? .78 : .08;
  aura.scale.setScalar(spin ? 1.12 + Math.sin(t * 24) * .06 : 1.07 + Math.sin(t * 12) * .09);
  shadow.visible = p.grounded !== false;
  const alpha = p.alpha ?? 1;
  for (const mat of bird.mats) {
    mat.transparent = alpha < 1; mat.opacity = alpha;
    mat.emissive.set(p.flash > 0 ? '#ffc65b' : '#000000');
    mat.emissiveIntensity = p.flash > 0 ? .2 : 0;
  }
}

export class Stadium3D {
  constructor(kind) {
    this.kind = kind; this._available = false; this.players = []; this.ripples = []; this.flags = [];
    this._point = new THREE.Vector3();
    try {
      this.canvas = document.createElement('canvas');
      this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: false, preserveDrawingBuffer: true, powerPreference: 'low-power' });
      this.renderer.setPixelRatio(1); this.renderer.setSize(W, H, false);
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.24;
      this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); this._available = false; });
      this.scene = new THREE.Scene(); this.scene.background = new THREE.Color('#b8e8ed');
      this.scene.fog = new THREE.Fog('#b8e8ed', 32, 66);
      this.scene.add(new THREE.HemisphereLight('#efffff', '#9b8491', 2.6));
      const sun = new THREE.DirectionalLight('#fff0ce', 3.3); sun.position.set(-10, 18, 10);
      sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
      Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 15, bottom: -15, near: 1, far: 50 });
      sun.shadow.normalBias = .04; sun.shadow.bias = -.0003; this.scene.add(sun);
      const fill = new THREE.DirectionalLight('#dae8ff', .55); fill.position.set(10, 5, -10); this.scene.add(fill);
      const size = kind === 'splash' ? 10.7 : kind === 'run' ? 11.6 : 12.2;
      this.camera = new THREE.OrthographicCamera(-size * W / H / 2, size * W / H / 2, size / 2, -size / 2, .1, 100);
      if (kind === 'splash') { this.camera.position.set(0, 9, 24); this.camera.lookAt(0, 2.6, 0); }
      else if (kind === 'run') { this.camera.position.set(0, 21, 16); this.camera.lookAt(0, 1.2, 0); }
      else { this.camera.position.set(0, 15, 17); this.camera.lookAt(0, .35, 0); }
      this.camera.updateMatrixWorld();
      this.mats = { cream: material('#fff0d7'), white: material('#fffaf0'), navy: material('#264b58'), coral: material('#ee8e7f'),
        sand: material('#e8cca0'), teal: material('#51b9bb'), darkteal: material('#348899'), pink: material('#edabc1'),
        gold: material('#ffd16a', { roughness: .4, metalness: .25 }), grass: material('#a9cd8c') };
      this.buildBackdrop();
      if (kind === 'splash') this.buildSplash();
      else if (kind === 'run') this.buildRun();
      else if (kind === 'topsy') this.buildTopsy();
      else throw new Error(`Unknown stadium scene: ${kind}`);
      this.players = COLORS.map((color, i) => { const bird = makeFlamingo(color); bird.i = i; this.scene.add(bird.root); return bird; });
      this._available = true;
    } catch (error) {
      this.error = error; this.dispose();
    }
  }

  get available() { return this._available; }

  buildBackdrop() {
    const { scene, mats: m, kind } = this;
    box(scene, 0, kind === 'topsy' ? -1.3 : -.85, 0, 70, .5, 70, m.sand, false);
    // Island horizon, soft low-poly clouds and curved stadium terraces.
    const cloud = material('#fff9ee');
    for (let i = 0; i < 8; i++) {
      const x = (i - 3.5) * 6.8, z = -23 - (i % 3) * 4;
      sphere(scene, x, 6 + (i % 3) * .8, z, 2.2, .63, .72, cloud, false);
      sphere(scene, x + 1.2, 6.3 + (i % 3) * .8, z, 1.6, .72, .7, cloud, false);
      sphere(scene, x, -.1, z, 5, 2.4 + i % 2, 3, m.grass, false);
    }
    const back = kind === 'splash' ? -5.7 : -6.9;
    const stadium = new THREE.Group(); stadium.position.z = back; scene.add(stadium);
    for (let row = 0; row < 4; row++) {
      box(stadium, 0, .12 + row * .38, -row * .68, 23, .5, .75, row % 2 ? m.cream : m.coral);
      box(stadium, 0, .4 + row * .38, -row * .68 + .1, 22.5, .09, .4, m.white);
    }
    // Repeated spectators are instanced, avoiding hundreds of draw calls.
    const crowd = new THREE.InstancedMesh(new THREE.SphereGeometry(.16, 7, 5), material('#ffffff'), 4 * 46);
    const torso = new THREE.InstancedMesh(new THREE.ConeGeometry(.16, .31, 5), material('#ffffff'), 4 * 46);
    const dummy = new THREE.Object3D(), c = new THREE.Color();
    const crowdColors = ['#f7c17d', '#ff87a7', '#52bdb7', '#4b7ea8', '#d29dcf', '#f2e6d4'];
    let n = 0;
    for (let row = 0; row < 4; row++) for (let col = 0; col < 46; col++) {
      const x = (col - 22.5) * .47, y = .62 + row * .38, z = -row * .68;
      dummy.position.set(x, y + .23, z); dummy.updateMatrix(); crowd.setMatrixAt(n, dummy.matrix);
      crowd.setColorAt(n, c.set(crowdColors[(col * 3 + row) % crowdColors.length]));
      dummy.position.set(x, y, z); dummy.updateMatrix(); torso.setMatrixAt(n, dummy.matrix);
      torso.setColorAt(n, c.set(crowdColors[(col + row * 2 + 2) % crowdColors.length])); n++;
    }
    stadium.add(crowd, torso);
    box(stadium, 0, .05, .55, 23, .8, .28, m.teal);
    for (let i = -3; i <= 3; i++) sign(stadium, i % 2 ? 'FLAMING GAMES' : 'FLAMINGO STADIUM', i * 3.15, .08, .702, 2.8, .35, i % 2 ? '#fb9d8f' : '#296071');
    for (const x of [-11.5, 11.5]) {
      this.palm(x, -.4, back + 1.5, x < 0 ? -.16 : .16);
      this.palm(x * .89, -.4, back - 3.3, x < 0 ? .17 : -.17);
    }
    for (let i = 0; i < 6; i++) {
      const x = (i - 2.5) * 4.2, z = back - 2.7;
      rod(scene, [x, .5, z], [x, 4.05, z], .042, m.white);
      const flag = box(scene, x + .45, 3.69, z, .9, .55, .025, material(COLORS[i % 4]), false);
      this.flags.push(flag);
    }
  }

  palm(x, y, z, lean) {
    const palm = new THREE.Group(); palm.position.set(x, y, z); palm.rotation.z = lean; this.scene.add(palm);
    const trunk = material('#b98762'), leaf = material('#51a995'), leafLight = material('#7dc387');
    const height = 3.8;
    mesh(palm, new THREE.CylinderGeometry(.11, .24, height, 7), trunk, 0, height / 2, 0);
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * TAU, group = new THREE.Group(); group.rotation.y = a; group.position.y = height; palm.add(group);
      tube(group, [[0, 0, 0], [.5, .3, 0], [1.1, .13, 0], [1.75, -.32, 0]], .12, i % 2 ? leaf : leafLight, 8);
      const blade = sphere(group, .8, .12, 0, .84, .065, .28, i % 2 ? leaf : leafLight); blade.rotation.z = -.13;
    }
    for (let i = 0; i < 3; i++) sphere(palm, Math.cos(i * 2) * .18, height - .12, Math.sin(i * 2) * .18, .15, .18, .15, trunk);
  }

  water(parent, width, depth, y = .02) {
    const waterMat = material('#55c8cf', { roughness: .32, metalness: .1 });
    box(parent, 0, y - .12, 0, width, .2, depth, waterMat, false);
    const waveMat = new THREE.MeshBasicMaterial({ color: '#d2f8ec', transparent: true, opacity: .28, depthWrite: false });
    for (let i = 0; i < 35; i++) {
      const wave = box(parent, Math.sin(i * 12.7) * width * .44, y + .003, Math.cos(i * 7.3) * depth * .42, .3 + (i % 4) * .18, .009, .035, waveMat, false);
      this.ripples.push({ mesh: wave, x: wave.position.x, i });
    }
  }

  buildSplash() {
    const { scene, mats: m } = this;
    box(scene, 0, -.38, .25, 16.4, .6, 6.4, m.cream);
    this.water(scene, 15.4, 5.4, .02);
    for (const z of [-2.85, 2.85]) box(scene, 0, .08, z, 16, .27, .33, m.white);
    for (const x of [-7.9, 7.9]) box(scene, x, .08, 0, .35, .27, 5.8, m.white);
    for (let i = 0; i < 5; i++) {
      const x = (i - 2) * 3.5;
      if (i > 0 && i < 4) for (let j = 0; j < 13; j++) {
        const o = mesh(scene, new THREE.CylinderGeometry(.075, .075, .22, 8), j % 2 ? m.coral : m.white, x, .095, -2.3 + j * .39, false);
        o.rotation.x = Math.PI / 2;
      }
    }
    this.bells = [];
    for (let i = 0; i < 4; i++) {
      const x = (i - 1.5) * 3.5;
      const platform = mesh(scene, new THREE.CylinderGeometry(.93, 1.05, .22, 32), m.cream, x, .02, 0);
      const inset = mesh(scene, new THREE.CylinderGeometry(.8, .8, .03, 32), material(COLORS[i]), x, .15, 0);
      inset.receiveShadow = true; platform.receiveShadow = true;
      const bell = new THREE.Group(); bell.position.set(x + .45, 6.55, .12); scene.add(bell);
      rod(bell, [0, 0, 0], [0, -.4, 0], .035, m.navy);
      const shape = [[0, .04], [.38, .04], [.37, .14], [.27, .27], [.22, .52], [.12, .64], [0, .64]].map(([r, y]) => new THREE.Vector2(r, y));
      const goldBell = mesh(bell, new THREE.LatheGeometry(shape, 24), m.gold, 0, -1.05, 0);
      mesh(bell, new THREE.TorusGeometry(.38, .035, 8, 24), m.gold, 0, -1.01, 0).rotation.x = Math.PI / 2;
      sphere(bell, 0, -1.1, 0, .09, .11, .09, m.navy);
      this.bells.push({ group: bell, bell: goldBell });
      // Reusable landing rings and tiny droplets.
      const splash = new THREE.Group(); splash.position.set(x, .23, 0); scene.add(splash);
      const splashRing = ring(splash, .7, .025, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .6 }), 0);
      const drops = [];
      for (let n = 0; n < 8; n++) drops.push(sphere(splash, 0, 0, 0, .055, .09, .055, m.white, false));
      this.bells[i].splash = splash; this.bells[i].splashRing = splashRing; this.bells[i].drops = drops;
    }
    for (const x of [-7.75, 7.75]) {
      box(scene, x, 3.3, -.25, .32, 6.7, .34, m.coral);
      box(scene, x, .34, -.25, .65, .5, .65, m.cream);
      sphere(scene, x, 6.7, -.25, .25, .25, .25, m.gold);
    }
    box(scene, 0, 6.55, -.25, 15.85, .24, .34, m.coral);
    sign(scene, 'SPLASH CLUB', 0, 6.8, -.01, 3.9, .61, '#326b77');
    for (let i = 0; i < 9; i++) {
      box(scene, (i - 4) * 1.7, -.01, 3.5, .8, .08, .7, i % 2 ? m.coral : m.cream, false);
    }
  }

  buildRun() {
    const { scene, mats: m } = this;
    this.lanes = [];
    box(scene, 0, -.25, 0, 23, .5, 10.1, m.cream);
    for (let i = 0; i < 4; i++) {
      const z = (i - 1.5) * 2.15;
      const group = new THREE.Group(); group.position.z = z; scene.add(group);
      box(group, 0, .035, 0, 21.6, .07, 1.9, material(i % 2 ? '#dbad87' : '#e5bc96'));
      for (const side of [-1, 1]) box(group, 0, .084, side * .965, 21.8, .038, .065, m.white, false);
      // Belt markings repeat but move by actual per-player race distance.
      const marks = [];
      for (let j = 0; j < 25; j++) marks.push(box(group, j, .083, 0, .026, .02, 1.74, j % 5 ? m.cream : m.white, false));
      const hurdles = [];
      for (let j = 0; j < 10; j++) {
        const hurdle = new THREE.Group(); group.add(hurdle);
        for (const zz of [-.67, .67]) {
          box(hurdle, 0, .41, zz, .075, .8, .085, m.navy);
          box(hurdle, .17, .09, zz, .5, .08, .18, m.navy);
        }
        const plank = box(hurdle, 0, .75, 0, .13, .26, 1.55, m.white);
        for (let n = 0; n < 8; n++) box(hurdle, -.073, .75, -.67 + n * .19, .013, .26, .095, n % 2 ? m.navy : material(COLORS[i]), false);
        plank.castShadow = true; hurdles.push(hurdle);
      }
      const finish = new THREE.Group(); group.add(finish);
      box(finish, 0, .095, 0, .23, .025, 1.88, m.gold, false);
      for (let n = 0; n < 8; n++) box(finish, .18, .094, -.79 + n * .225, .23, .027, .11, n % 2 ? m.navy : m.white, false);
      const pennant = new THREE.Group(); pennant.position.set(-3.8, .1, .55); group.add(pennant);
      rod(pennant, [0, 0, 0], [0, 1.6, 0], .035, m.white);
      box(pennant, .26, 1.36, 0, .52, .34, .025, material(COLORS[i]), false); pennant.visible = false;
      this.lanes.push({ group, marks, hurdles, finish, pennant });
    }
    for (const x of [-11.3, 11.3]) for (let i = 0; i < 10; i++) {
      mesh(scene, new THREE.CylinderGeometry(.15, .22, .12, 10), i % 2 ? m.coral : m.white, x, -.05, i - 4.5);
    }
    sign(scene, 'FLAMINGO ATHLETICS', 0, 2.7, -8.95, 6.7, .9, '#296071');
  }

  buildTopsy() {
    const { scene, mats: m } = this;
    this.water(scene, 50, 40, -.62);
    const radius = 200 / 45;
    mesh(scene, new THREE.CylinderGeometry(radius, radius + .17, .68, 96), m.coral, 0, -.34, 0);
    mesh(scene, new THREE.CylinderGeometry(radius, radius, .1, 96), m.cream, 0, .02, 0);
    const danger = mesh(scene, new THREE.RingGeometry(radius - 20 / 45, radius, 96), m.gold, 0, .078, 0, false);
    danger.rotation.x = -Math.PI / 2;
    ring(scene, radius, .035, m.white, .091);
    for (const r of [60 / 45, 130 / 45]) ring(scene, r, .018, m.pink, .082);
    for (let n = 0; n < 48; n++) {
      const a = n / 48 * TAU, marker = box(scene, Math.cos(a) * (radius - .23), .09, Math.sin(a) * (radius - .23), .07, .013, .23, m.coral, false);
      marker.rotation.y = -a - Math.PI / 2;
    }
    const emblem = new THREE.Group(); emblem.position.y = .088; scene.add(emblem);
    ring(emblem, .47, .055, m.pink, 0);
    box(emblem, .2, .002, 0, .6, .013, .1, m.pink, false);
    for (let i = 0; i < 4; i++) {
      const a = (225 + (i % 2) * 90 - Math.floor(i / 2) * 90) / 180 * Math.PI;
      const glow = new THREE.Group(); glow.position.set(Math.cos(a) * 2.45, .09, Math.sin(a) * 2.45); scene.add(glow);
      ring(glow, .59, .025, material(COLORS[i]), 0);
    }
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * TAU, r = 6.1 + Math.sin(i * 6) * .55;
      const pad = mesh(scene, new THREE.CylinderGeometry(.37, .38, .035, 8), material(i % 2 ? '#64b99b' : '#88c294'), Math.cos(a) * r, -.46, Math.sin(a) * r, false);
      pad.rotation.z = .025;
      if (i % 3 === 0) sphere(scene, pad.position.x, -.38, pad.position.z, .13, .09, .13, m.pink, false);
    }
    sign(scene, 'SPIN TO WIN', 0, 2.7, -9.2, 4.8, .88, '#326b77');
  }

  updateSplash(p, t, frame) {
    const i = p.i, x = (i - 1.5) * 3.5, ended = frame.ended;
    const max = Math.max(0, ...frame.players.map(q => q.count || 0));
    let pose = p.air ? p.dizzy > 0 ? 'dizzy' : p.vy < 0 ? 'jump' : 'fly' : p.holding ? 'harden' : p.landT > 0 ? 'hit' : 'idle';
    let y = .19 - (p.y || 0) / 70;
    if (ended) { pose = p.count === max ? 'jump' : 'sleep'; if (p.count === max) y += Math.abs(Math.sin(t * 5)) * .5; }
    const bell = this.bells[i];
    bell.group.rotation.z = (p.swing || 0) * .12;
    bell.group.position.y = 6.55 + Math.max(0, p.press || 0) / .25 * .15;
    const cycle = p.air ? clamp(-(p.y || 0) / 120, 0, 1) : clamp(1 - Math.max(0, -p.landT) * 2.5, 0, 1);
    bell.splash.visible = cycle > .01; bell.splashRing.scale.setScalar(1 + (1 - cycle) * 1.3);
    bell.splashRing.material.opacity = cycle * .55;
    bell.drops.forEach((drop, n) => {
      const a = n / 8 * TAU + i, r = .7 + (1 - cycle) * .8;
      drop.position.set(Math.cos(a) * r, Math.sin(cycle * Math.PI) * (.3 + n % 3 * .13), Math.sin(a) * r);
      drop.visible = cycle > .15;
    });
    return { ...p, x, y, z: 0, pose, rotation: -.45, charge: p.holding ? clamp(p.holdT / .2, 0, 1) : 0, grounded: !p.air };
  }

  updateRun(p, t, frame) {
    const lane = this.lanes[p.i], dist = p.dist || 0, scale = 1.55, x = -4.8;
    for (let k = 0; k < lane.marks.length; k++) {
      lane.marks[k].position.x = ((k * scale - dist * scale + 1000 * scale) % (25 * scale)) - 12;
    }
    lane.hurdles.forEach((h, j) => {
      const state = (p.hs || [])[j];
      const hx = state ? x + (state.d - dist) * scale : -99;
      h.visible = !!state && state.pop >= 0 && hx > -11.8 && hx < 11.8;
      if (!h.visible) return;
      h.position.set(hx, .1, 0);
      h.rotation.z = state.hit ? -Math.PI / 2 : 0;
      h.scale.y = state.hit ? 1 : clamp(((frame.raceTime || 0) - state.pop) / .2, .05, 1);
    });
    lane.finish.position.x = x + (50 - dist) * scale;
    lane.finish.visible = lane.finish.position.x < 12 && lane.finish.position.x > -12;
    lane.pennant.visible = p.fin >= 0;
    const done = p.fin >= 0, win = done && p.rank === 1;
    const pose = p.dnf ? 'sleep' : done ? win ? 'fly' : 'idle' : p.stun > .8 ? 'hit' : p.stun > 0 ? 'dizzy' : p.jt >= 0 ? 'jump' : p.v > .3 ? 'run' : 'idle';
    return { ...p, x, z: (p.i - 1.5) * 2.15, y: .11 + (p.y || 0) * 1.7 + (win ? .15 + Math.abs(Math.sin(t * 5)) * .15 : 0),
      pose, rotation: 0, scale: .8, charge: 0, grounded: p.jt < 0 };
  }

  updateTopsy(p, t, frame) {
    const arena = frame.arena || { x: 480, y: 300, radius: 200 };
    const x = (p.x - arena.x) / 45, z = (p.y - arena.y) / 45;
    let y = .11, alpha = 1, rotation = p.flip ? Math.PI : 0, pose = 'idle', scale = .76;
    const win = frame.over ? p.i === frame.over.w : p.ko === Math.max(...frame.players.map(q => q.ko || 0)) && p.ko > 0;
    if (p.st === 'fall') { const k = clamp(p.t / .9, 0, 1); y -= k * k * 3; alpha = 1 - k; pose = 'dizzy'; rotation = p.rot; scale *= 1 - k * .3; }
    else if (p.st === 'spawn') { y += 3 * (1 - clamp(p.t / .6, 0, 1)); pose = 'fly'; }
    else if ((frame.over || frame.ended) && win) { y += Math.abs(Math.sin(t * 5)) * .6; pose = 'jump'; }
    else if (p.spin > 0) { pose = 'ball'; rotation = p.rot; }
    else if (p.hit > 0) pose = 'hit';
    else if (p.gap > 0) pose = 'dizzy';
    else if (Math.hypot(p.vx || 0, p.vy || 0) > 30) { pose = 'run'; rotation = Math.atan2(-(p.vy || 0), p.vx || 0); }
    if (p.inv > 0 && Math.floor(t * 10) % 2) alpha *= .4;
    return { ...p, x, y, z, pose, rotation, scale, alpha, charge: p.ready ? 1 : 0, grounded: p.st === 'play' };
  }

  render(ctx, frame = {}) {
    if (!this.available) return false;
    const t = frame.time || 0, players = frame.players || [];
    for (const flag of this.flags) flag.rotation.y = Math.sin(t * 2.1 + flag.position.x) * .15;
    for (const ripple of this.ripples) {
      ripple.mesh.position.x = ripple.x + Math.sin(t * 1.1 + ripple.i) * .18;
      ripple.mesh.scale.x = .85 + Math.sin(t * 1.6 + ripple.i) * .2;
    }
    for (let i = 0; i < 4; i++) {
      const raw = players.find(p => p.i === i), bird = this.players[i];
      if (!raw) { bird.root.visible = false; continue; }
      if (raw.color && raw.color !== bird.color) { bird.team.color.set(raw.color); bird.base.material.color.set(raw.color); bird.color = raw.color; }
      const p = this.kind === 'splash' ? this.updateSplash(raw, t, frame) : this.kind === 'run' ? this.updateRun(raw, t, frame) : this.updateTopsy(raw, t, frame);
      animateBird(bird, p, t); bird.scale = p.scale || 1;
    }
    this.renderer.render(this.scene, this.camera);
    ctx.drawImage(this.canvas, 0, 0, W, H);
    return true;
  }

  project(x, y, z) {
    this._point.set(x, y, z).project(this.camera);
    return { x: (this._point.x + 1) * W / 2, y: (1 - this._point.y) * H / 2 };
  }

  projectPlayer(i, offsetY) {
    const bird = this.players[i];
    if (!bird) return { x: W / 2, y: H / 2 };
    const p = bird.root.position;
    return this.project(p.x, p.y + (offsetY ?? 2.42 * bird.scale), p.z);
  }

  dispose() {
    this._available = false;
    const geometries = new Set(), materials = new Set(), textures = new Set();
    this.scene?.traverse(obj => {
      if (obj.geometry) geometries.add(obj.geometry);
      for (const mat of Array.isArray(obj.material) ? obj.material : obj.material ? [obj.material] : []) {
        materials.add(mat); if (mat.map) textures.add(mat.map);
      }
    });
    for (const resource of [...geometries, ...materials, ...textures]) resource.dispose();
    this.renderer?.dispose();
  }
}
