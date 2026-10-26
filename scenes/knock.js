// "Кто стучит за замёрзшим окном" (sketch): the cube is split by one frosted ice pane through its centre. Above it
// (seen from the terrace) is a cold room with ice walls, below it (seen from the pavilion) a niche of the same ice
// whose front is the LED screen itself. A huge mandarin rests in the terrace room's far corner, then goes wild:
// it ricochets off a wall, the pane and the other wall, each hit leaving a crack star, and at t = 8 smashes through
// the middle of the pane. Down in the niche it ricochets off both side walls and the pane's underside and at t = 16
// hits the screen towards the pavilion viewer, cracking it. It bounces back up through the hole, rolls back into its
// corner, and the frost grows back over every crack and over the hole by t = 23.
//
// The pane is the plane y = 0 in cube-local axes (parallel to the bottom face 5) and much larger than the cube:
// the terrace eye is far above it and the pavilion eye far below it (in local y), so every terrace ray meets the
// pane from above and every pavilion ray from below — each viewpoint sees only its own half, even through the
// corners of its faces that lie on the other side of the plane. Only the hole lets one half see the other.
//
// Pure function of time t ∈ [0, LOOP), so frames can be rendered in any order.
import * as THREE from 'three';

export const LOOP = 24;
export const WALL = 0x081426;                // dark navy: what the seams between the two triples fade to
const R = 0.15, HOLE = 0.21;                 // mandarin radius and the radius of the hole it breaks, in edges S
const TEX = 2048, PANE = 2.4;                // pane texture size; the pane is PANE × S wide (it overhangs the cube)
const T_BREACH = 8, T_SCREEN = 16;

const smooth = (a, b, x) => { const k = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };

let seed = 7;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// Frost on a canvas: icy blue ground, feathery branches growing from scattered seeds, thick towards the edges, a fine grain
function frostCanvas() {
  const c = document.createElement('canvas'); c.width = c.height = TEX;
  const g = c.getContext('2d');
  g.fillStyle = '#9fc4e4'; g.fillRect(0, 0, TEX, TEX);
  const branch = (x, y, a, len, w, depth) => {
    for (let i = 0; i < len; i += 6) {
      const nx = x + Math.cos(a) * 6, ny = y + Math.sin(a) * 6;
      g.lineWidth = w; g.beginPath(); g.moveTo(x, y); g.lineTo(nx, ny); g.stroke();
      x = nx; y = ny; a += (rnd() - 0.5) * 0.25;
      if (depth > 0 && rnd() < 0.18) branch(x, y, a + (rnd() < 0.5 ? 1 : -1) * (0.6 + rnd() * 0.5), len * 0.45, w * 0.7, depth - 1);
    }
  };
  g.lineCap = 'round';
  for (let k = 0; k < 260; k++) {
    g.strokeStyle = `rgba(235,246,255,${0.25 + rnd() * 0.45})`;
    const x = rnd() * TEX, y = rnd() * TEX, n = 3 + Math.floor(rnd() * 4), a0 = rnd() * 6.3;
    for (let j = 0; j < n; j++) branch(x, y, a0 + j * 6.283 / n, 60 + rnd() * 160, 1.5 + rnd() * 2.5, 2);
  }
  // window frost is thick towards the frame and thin in the middle: the mandarin's shadow shows only near the middle
  const perS = TEX / PANE, mid = g.createRadialGradient(TEX / 2, TEX / 2, perS * 0.15, TEX / 2, TEX / 2, perS * 0.6);
  mid.addColorStop(0, 'rgba(120,165,205,0.35)'); mid.addColorStop(0.4, 'rgba(225,240,255,0)'); mid.addColorStop(1, 'rgba(225,240,255,0.55)');
  g.fillStyle = mid; g.fillRect(0, 0, TEX, TEX);
  const grain = g.getImageData(0, 0, TEX, TEX), p = grain.data;
  for (let i = 0; i < p.length; i += 4) {
    // and darker towards the cube's walls and beyond, so the pane meets the edges of the cube as calm as the walls
    const x = (i / 4) % TEX, y = Math.floor(i / 4 / TEX), edge = Math.max(Math.abs(x - TEX / 2), Math.abs(y - TEX / 2)) / (perS / 2);
    const f = 1 - 0.7 * smooth(0.7, 1.15, edge), n = (rnd() - 0.5) * 22;
    p[i] = (p[i] + n) * f; p[i + 1] = (p[i + 1] + n) * f; p[i + 2] = (p[i + 2] + n) * (0.25 + 0.75 * f);
  }
  g.putImageData(grain, 0, 0);
  return c;
}

// Dimpled peel: a bump map of small soft pits
function peelCanvas() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#808080'; g.fillRect(0, 0, 1024, 512);
  for (let k = 0; k < 9000; k++) {
    const x = rnd() * 1024, y = rnd() * 512, r = 2 + rnd() * 4;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(40,40,40,0.8)'); gr.addColorStop(1, 'rgba(128,128,128,0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  return c;
}

// Cracks: branching polylines from the impact point, in pane-texture pixels, each with the moment (0…1) it is
// reached, so they can be drawn growing outwards
function crackPaths(cx, cy, reach) {
  const segs = [];
  const run = (x, y, a, len, w, t0, depth) => {
    const n = Math.ceil(len / 14);
    for (let i = 0; i < n; i++) {
      const nx = x + Math.cos(a) * 14, ny = y + Math.sin(a) * 14, t1 = t0 + 14 / reach;
      segs.push([x, y, nx, ny, w, t0]);
      x = nx; y = ny; t0 = t1; a += (rnd() - 0.5) * 0.5; w *= 0.985;
      if (depth > 0 && rnd() < 0.07) run(x, y, a + (rnd() < 0.5 ? 1 : -1) * (0.5 + rnd() * 0.6), len * (0.3 + rnd() * 0.3), w * 0.7, t0, depth - 1);
    }
  };
  for (let k = 0; k < 7; k++) run(cx, cy, k / 7 * 6.283 + rnd() * 0.4, reach * (0.6 + rnd() * 0.4), 9, 0, 1);   // a few thick ones
  // a broken ring around the hit
  for (let k = 0; k < 40; k++) {
    if (rnd() < 0.25) continue;
    const a0 = k / 40 * 6.283, a1 = (k + 1) / 40 * 6.283, rr = reach * 0.3 * (0.95 + rnd() * 0.1);
    segs.push([cx + Math.cos(a0) * rr, cy + Math.sin(a0) * rr, cx + Math.cos(a1) * rr, cy + Math.sin(a1) * rr, 3, 0.3]);
  }
  return segs;
}

// The mandarin's way, in edges S, cube-local: [time, x, y, z, hit] — hit names the surface it bounces off there
// (its centre is then r from that surface). Straight fast stretches between hits: a ricochet, not a glide.
const s0 = 0.5, rr = R, REST = [-s0 + 1.6 * rr, rr, -s0 + 1.6 * rr];
const WAY = [
  [0, ...REST], [1.0, ...REST],
  [2.2, -s0 + rr, 0.2, 0.08, 'wall3'],             // the far walls are hit low, away from the seams at their tops
  [4.4, 0.12, rr, 0.05, 'paneTop'],
  [6.0, 0.08, 0.2, -s0 + rr, 'wall2'],
  [7.1, 0.02, 0.34, -0.06],                          // top of its climb, then straight down
  [T_BREACH, 0, 0, 0, 'breach'],                     // its centre in the plane of the pane: half through the hole
  [10.4, s0 - rr, -0.19, -0.05, 'wall1'],          // the niche walls are hit high up, away from the screen's edges
  [12.2, 0.05, -0.19, s0 - rr, 'wall0'],
  [14.0, -0.18, -rr, 0.12, 'paneUnder'],
  [T_SCREEN, 0.03, -s0 + rr, 0.03, 'screen'],
  [17.4, 0.02, -0.25, 0.02],
  [20.5, 0, 0, 0],                                   // back up through the hole
  [21.3, -0.1, 0.3, -0.1],
  [22.0, -0.16, rr, -0.16],                          // lands on the ice and rolls home
  [23.0, ...REST], [LOOP, ...REST],
];
// how each stretch is paced: 'in' speeds up, 'out' slows down, 'both' starts and stops softly, else steady
const EASE = { 1: 'in', 4: 'out', 5: 'in', 10: 'out', 13: 'both', 14: 'both' };
const AXIS = { wall3: 0, wall1: 0, paneTop: 1, paneUnder: 1, screen: 1, wall2: 2, wall0: 2 };

const P = new THREE.Vector3();
function path(S, t) {
  let i = 0;
  while (i < WAY.length - 2 && WAY[i + 1][0] <= t) i++;
  const a = WAY[i], b = WAY[i + 1];
  let u = THREE.MathUtils.clamp((t - a[0]) / (b[0] - a[0]), 0, 1);
  const e = EASE[i];
  if (e === 'in') u = u * u; else if (e === 'out') u = 1 - (1 - u) ** 2; else if (e === 'both') u = u * u * (3 - 2 * u);
  return P.set(a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u, a[3] + (b[3] - a[3]) * u).multiplyScalar(S);
}

// A crack star on its own canvas, for the walls and the screen
function starCanvas() {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d'), segs = crackPaths(256, 256, 230);
  g.lineCap = 'round';
  for (const [col, wk] of [['#ffffff', 1.8], ['#1e3c5a', 0.5]]) {
    g.strokeStyle = col;
    for (const [x0, y0, x1, y1, w] of segs) { g.lineWidth = w * wk; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }
  }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ctx: { S, quat, viewpoints }
export function build(group, ctx) {
  seed = 7;
  const S = ctx.S, s = S / 2, r = R * S;
  const room = new THREE.Group();                // everything below is in cube-local axes
  room.quaternion.copy(ctx.quat);
  group.add(room);
  const frost = frostCanvas();

  // ---- ice walls: the terrace room's two far walls above the pane, the niche's two side walls below it. Frosted,
  // brightest where they meet the pane and fading to navy towards the cube's edges (the seams) ----
  const iceWall = (up) => {
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const g = c.getContext('2d');
    g.drawImage(frost, TEX * 0.3, TEX * 0.3, TEX * 0.4, TEX * 0.4, 0, 0, 512, 512);
    const gr = g.createLinearGradient(0, up ? 512 : 0, 0, up ? 0 : 512);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#202a44');
    g.globalCompositeOperation = 'multiply'; g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({ color: 0x9fc4ee, map: tex, roughness: 0.6 });
  };
  const above = iceWall(true), below = iceWall(false);
  const e = s * 0.995;                               // just inside the emulator's own backdrop box (no z-fighting)
  const wall = (pos, normal, mat) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(S, s), mat);
    m.position.set(...pos); m.lookAt(m.position.clone().add(new THREE.Vector3(...normal)));
    m.receiveShadow = true; room.add(m);
  };
  wall([-e, s / 2, 0], [1, 0, 0], above);           // inner side of face 3
  wall([0, s / 2, -e], [0, 0, 1], above);           // inner side of face 2
  wall([e, -s / 2, 0], [-1, 0, 0], below);          // inner side of face 1
  wall([0, -s / 2, e], [0, 0, -1], below);          // inner side of face 0
  // what the hole looks into: a lit ceiling over the terrace room (the pavilion looks up through it) and a lit floor
  // under the niche (the terrace looks down through it). Each lies on the other viewpoint's own screen and faces
  // away from it, so that viewpoint never sees it.
  for (const [y, up] of [[e, -1], [-e, 1]]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(S, S), new THREE.MeshStandardMaterial({ color: 0x4f7fb8, roughness: 0.9 }));
    m.position.y = y; m.lookAt(0, y + up, 0); room.add(m);
  }

  // ---- the ice pane: two meshes on one plane, the upper side for the terrace, the lower for the pavilion ----
  const geo = new THREE.PlaneGeometry(PANE * S, PANE * S);
  geo.rotateX(-Math.PI / 2);                     // normal +y, towards the terrace room
  const side = (sideMode, emissive) => {
    const c = document.createElement('canvas'); c.width = c.height = TEX;
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const mat = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: emissive, emissiveIntensity: 0.55,
      roughness: 0.3, metalness: 0, transparent: true, side: sideMode });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true; room.add(mesh);
    return { c, g: c.getContext('2d'), tex };
  };
  const top = side(THREE.FrontSide, 0x2f5f8f), bottom = side(THREE.BackSide, 0x6f9fd0);
  const px = TEX / (PANE * S);                   // texture pixels per metre; the pane centre is the texture centre
  const toPx = (x, z) => [TEX / 2 + x * px, TEX / 2 + z * px];   // the plane's u runs along x, v along z
  // crack stars on the pane, where it is hit (seen from both sides), and the jagged rim of the hole
  const paneStars = WAY.filter(w => w[4] === 'paneTop' || w[4] === 'paneUnder' || w[4] === 'breach').map(w => {
    const [cx, cy] = toPx(w[1] * S, w[3] * S);
    return { t: w[0], segs: crackPaths(cx, cy, (w[4] === 'breach' ? 0.5 : 0.3) * S * px) };
  });
  const rim = Array.from({ length: 28 }, (_, i) => [i / 28 * 6.283, HOLE * S * px * (0.82 + rnd() * 0.3)]);

  // ---- crack stars on the walls and on the screen (a clear glass just inside face 5, seen only from the
  // pavilion), plus a frost veil on that glass that heals the screen cracks ----
  const stars = [];
  for (const w of WAY) {
    if (!w[4] || w[4].startsWith('pane') || w[4] === 'breach') continue;
    const ax = AXIS[w[4]], p = new THREE.Vector3(w[1], w[2], w[3]).multiplyScalar(S), n = new THREE.Vector3();
    n.setComponent(ax, -Math.sign(p.getComponent(ax)));          // facing into the chamber…
    const screen = w[4] === 'screen';
    p.setComponent(ax, -n.getComponent(ax) * (screen ? s * 0.985 : s * 0.99));
    if (screen) n.negate();                                       // …except the screen's, which faces the pavilion viewer
    const m = new THREE.Mesh(new THREE.PlaneGeometry(S * (screen ? 0.7 : 0.45), S * (screen ? 0.7 : 0.45)), new THREE.MeshBasicMaterial({ map: starCanvas(),
      transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    m.position.copy(p); m.lookAt(p.clone().add(n)); room.add(m);
    stars.push({ t: w[0], m, screen });
  }
  const veilTex = new THREE.CanvasTexture(frost); veilTex.colorSpace = THREE.SRGBColorSpace;
  const veil = new THREE.Mesh(new THREE.PlaneGeometry(S, S), new THREE.MeshBasicMaterial({ map: veilTex, transparent: true, depthWrite: false }));
  veil.position.y = -s * 0.98; veil.lookAt(0, -s * 2, 0); room.add(veil);

  // ---- ice shards from the breach: a few big ones, a burst up into the room and down into the niche ----
  const shardMat = new THREE.MeshStandardMaterial({ color: 0xdff0ff, emissive: 0x6f9fd0, emissiveIntensity: 0.4, roughness: 0.2, transparent: true });
  const shards = Array.from({ length: 14 }, (_, i) => {
    // slow and short-lived, so even the fastest stays well inside the cube (rim + 0.8 s of flight < 0.45·S)
    const m = new THREE.Mesh(new THREE.TetrahedronGeometry(S * (0.025 + rnd() * 0.02)), shardMat);
    const a = rnd() * 6.283, out = HOLE * S * (0.8 + rnd() * 0.3);
    room.add(m);
    return { m, x: Math.cos(a) * out, z: Math.sin(a) * out, vx: Math.cos(a) * S * (0.1 + rnd() * 0.12), vz: Math.sin(a) * S * (0.1 + rnd() * 0.12),
      vy: S * (i % 3 === 0 ? 0.25 : -0.3) * (0.6 + rnd() * 0.4), spin: rnd() * 10 };
  });

  // ---- the mandarin: a slightly flattened ball with a dimpled peel, a stem and a leaf, so its spin reads ----
  const peel = new THREE.CanvasTexture(peelCanvas());
  const ball = new THREE.Group(), spin = new THREE.Group();
  ball.add(spin); room.add(ball);
  const fruit = new THREE.Mesh(new THREE.SphereGeometry(r, 96, 64), new THREE.MeshStandardMaterial({
    color: 0xff7a12, roughness: 0.5, bumpMap: peel, bumpScale: 2.5, emissive: 0xff4a00, emissiveIntensity: 0.12 }));
  fruit.scale.y = 0.9; fruit.castShadow = true;           // a little flattened; r stays its reach in every direction
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.05, r * 0.07, r * 0.12, 12), new THREE.MeshStandardMaterial({ color: 0x3d5a1e, roughness: 0.8 }));
  stem.position.y = r * 0.9;
  const leaf = new THREE.Mesh(new THREE.SphereGeometry(r * 0.26, 24, 12), new THREE.MeshStandardMaterial({ color: 0x2f8a2a, roughness: 0.6 }));
  leaf.scale.set(1, 0.12, 0.45); leaf.position.set(r * 0.22, r * 0.85, 0); leaf.rotation.z = -0.3;   // stays within r
  spin.add(fruit, stem, leaf);
  const spin0 = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0.5, 0.75, 0.45).normalize());

  // ---- light: cold sky, a key from behind the terrace viewer (casts the mandarin's shadow), a cool fill from the
  // pavilion side, a grazing light into the niche from outside the cube, and the mandarin's own warm glow ----
  group.add(new THREE.HemisphereLight(0xcfe9ff, 0x0a1a33, 0.7));
  const key = new THREE.DirectionalLight(0xeaf4ff, 2.4);
  key.position.copy(ctx.viewpoints[0]).normalize().multiplyScalar(S * 3).add(new THREE.Vector3(0, S * 2.5, 0));
  const aim = new THREE.Object3D(); group.add(aim); key.target = aim;   // aimed at the cube centre, not the world origin
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.001; key.shadow.normalBias = 0.03;
  Object.assign(key.shadow.camera, { left: -S, right: S, top: S, bottom: -S, near: 0.1, far: S * 8 });
  group.add(key);
  const fill = new THREE.DirectionalLight(0x9cc8ff, 1.2);
  fill.position.copy(ctx.viewpoints[1]).normalize().multiplyScalar(S * 3);
  group.add(fill);
  const graze = new THREE.SpotLight(0xd8ecff, S * S * 2.5, S * 5, 0.45, 0.8, 1);
  graze.position.set(S * 1.6, -S * 0.55, S * 0.4);
  room.add(graze, graze.target);
  const glow = new THREE.PointLight(0xff8a2a, 0, S * 0.9, 1.5);   // short reach: the flashes stay off the seams
  ball.add(glow);

  return { S, s, r, frost, top, bottom, px, toPx, paneStars, rim, stars, veil, shards, shardMat, ball, spin, spin0, glow };
}

// a short pulse at each hit: 1 at the moment of contact
const pulse = (t, at, w) => Math.exp(-(((t - at) / w) ** 2));

export function update(d, t) {
  const { S, r, frost, top, bottom, toPx, paneStars, rim, stars, veil, shards, shardMat, ball, spin, spin0, glow } = d;
  const heal = smooth(17, 23, t);                                  // the frost grows back over every crack; 23–24 still
  const hole = smooth(T_BREACH - 0.15, T_BREACH - 0.02, t) * (1 - smooth(21.5, 23, t));   // fully open at the breach

  // ---- mandarin: position, a squash along the normal of whatever it hits, spin ----
  const c = path(S, t);
  ball.position.copy(c);
  ball.scale.set(1, 1, 1);
  let flash = 0;
  for (const w of WAY) {
    if (!w[4] || w[4] === 'breach') continue;
    const k = pulse(t, w[0], w[4] === 'screen' ? 0.12 : 0.07);
    flash = Math.max(flash, k);
    const ax = AXIS[w[4]];
    ball.scale.setComponent(ax, ball.scale.getComponent(ax) - 0.3 * k);
    for (const o of [0, 1, 2]) if (o !== ax) ball.scale.setComponent(o, ball.scale.getComponent(o) + 0.12 * k);
    // squashed against the surface, not floating: the centre moves towards it by what the squash takes off
    // (walls and screen lie beyond the centre's coordinate, the pane at 0 lies behind it)
    const toward = w[4].startsWith('pane') ? -Math.sign(w[[1, 2, 3][ax]]) : Math.sign(w[[1, 2, 3][ax]]);
    ball.position.setComponent(ax, ball.position.getComponent(ax) + toward * r * 0.3 * k);
  }
  // spin: whole turns between leaving the corner and getting back, still at rest
  spin.quaternion.setFromAxisAngle(new THREE.Vector3(0.8, 0.3, -0.5).normalize(), 2 * Math.PI * 7 * smooth(1, 23, t)).multiply(spin0);
  glow.intensity = S * S * (0.1 + 0.8 * flash);

  // ---- crack stars on walls and screen: snap in at the hit, heal with the frost ----
  for (const st of stars) {
    const o = smooth(st.t - 0.1, st.t, t) * (1 - (st.screen ? smooth(19.5, 23, t) : heal));   // complete at the contact
    st.m.material.opacity = o; st.m.visible = o > 0.003;
  }
  const v = 0.55 * smooth(19.5, 21.5, t) * (1 - smooth(21.5, 23, t));
  veil.material.opacity = v; veil.visible = v > 0.003;

  // ---- shards fly out of the breach for a second ----
  const dt = t - T_BREACH, live = dt >= 0 && dt < 0.8;               // already there at the breach itself
  shardMat.opacity = live ? 1 - smooth(0.4, 0.8, dt) : 0;
  for (const p of shards) {
    p.m.visible = live;
    if (!live) continue;
    p.m.position.set(p.x + p.vx * dt, p.vy * dt - Math.sign(p.vy) * 0.2 * S * dt * dt, p.z + p.vz * dt);
    p.m.rotation.set(p.spin * dt, p.spin * 0.7 * dt, 0);
  }

  // ---- paint both sides of the pane ----
  for (const [sideIdx, sd] of [top, bottom].entries()) {
    const g = sd.g;
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    g.drawImage(frost, 0, 0);
    if (sideIdx === 1 && t < T_BREACH) {
      // the pavilion sees the mandarin only as a warm blur through the frost: stronger the nearer it is to the ice,
      // and a faint flash at each hit up in the terrace room
      const [sx, sy] = toPx(c.x, c.z), k = THREE.MathUtils.clamp((c.y - r) / (S * 0.3), 0, 1);
      const wallHit = Math.max(pulse(t, 2.2, 0.18), pulse(t, 6.0, 0.18));
      const a = Math.max(0.85 * (1 - k) * smooth(1.2, 2, t), 0.4 * wallHit);
      const rad = r * d.px * (1.1 + 0.4 * k), gr = g.createRadialGradient(sx, sy, rad * (0.55 - 0.4 * k), sx, sy, rad);
      gr.addColorStop(0, `rgba(255,115,25,${a})`); gr.addColorStop(1, 'rgba(255,115,25,0)');
      g.fillStyle = gr; g.fillRect(sx - rad, sy - rad, rad * 2, rad * 2);
    }
    // cracks where the pane was hit: they shoot out at the hit and heal with the frost
    g.lineCap = 'round';
    for (const st of paneStars) {
      const grow = smooth(st.t - 0.15, st.t, t), a = grow * (1 - heal);
      if (a <= 0) continue;
      for (const [col, wk, al] of [['#ffffff', 1.8, 0.9], ['#1e3c5a', 0.5, 0.5]]) {
        g.globalAlpha = al * a; g.strokeStyle = col;
        for (const [x0, y0, x1, y1, w, t0] of st.segs) {
          if (t0 > grow) continue;
          g.lineWidth = w * wk; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
        }
      }
      g.globalAlpha = 1;
    }
    // the hole: broken out at the breach, frozen over again at the end
    if (hole > 0) {
      g.globalCompositeOperation = 'destination-out'; g.globalAlpha = hole; g.fillStyle = '#000000';
      g.beginPath();
      rim.forEach(([a, rad], i) => { const x = TEX / 2 + Math.cos(a) * rad, y = TEX / 2 + Math.sin(a) * rad; i ? g.lineTo(x, y) : g.moveTo(x, y); });
      g.closePath(); g.fill();
      g.globalAlpha = 1;
    }
    sd.tex.needsUpdate = true;
  }
}
