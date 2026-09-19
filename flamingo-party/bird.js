import * as THREE from '../flamingo-stadium/common/vendor/three.module.min.js';
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


export { makeFlamingo, animateBird };
