// Shared model of the real plaza with the LED cube (Belgorod, the "Куб" decorative object, 50.607681 N 36.587177 E).
// Footprints are traced from Esri World Imagery z19 (0.19 m/px, taken during construction) and checked against the
// Yandex map; which building is which comes from the walk-around photos/videos of 19.10.2026. Heights are eyeballed.
// Used by map.html and the emulator (index.html).
import * as THREE from 'three';

const deg = THREE.MathUtils.degToRad;
const V = (x, z) => new THREE.Vector2(x, z);

// ---------- layout (metres; origin = the cube; x → east, z → south, so the 2D map has north up) ----------
// Around the plaza oval, clockwise from the cube: coffee shop (NW) → passage north to the lawn with lamps →
// R-CUTS block (NE) with the pavilion standing inside the oval → curved glass gallery (S) → passage south with "Укрытие" → curved canopy with swings (W) → back to the coffee shop.
export const LAYOUT = {
  centre: { x: 14, z: 0 },                    // middle of the plaza oval; facades are turned towards it
  paved: [V(-27, -21), V(52, -19), V(52, 30), V(-27, 30)],
  // edge 3.2 m ≈ 640 px per face at a 5 mm pixel pitch (the strip is 3840×640, six 640×640 faces);
  // yaw is derived below: the main face is turned towards the table on photo IMG_2089 and then by
  // yawOffset more, so that from that table one sees the edge between it and the upper face next to it — matched
  // to photo IMG_2089 (big upper face top-left, main face bottom-right). With the up-diagonal checked on the real
  // cube the same solid (edges where the photo has them) comes out at yawOffset −90 (yaw −153).
  cube: { x: 0, z: 0, edge: 3.2, lift: 1.3, yaw: 0, yawOffset: -90, photoSpot: { x: -17, z: 3.5 } },
  buildings: [
    { id: 'coffee', label: 'Кофейня', h: 4.5, warm: true, sign: 'П/ЛЕ  КОФЕЙНЯ',
      poly: [V(-22, -17), V(-8, -16.5), V(-4, -13), V(-13, -6), V(-22, -6)], front: [2, 3] },
    { id: 'rcuts', label: 'R-CUTS и павильоны', h: 5, sign: 'R-CUTS',
      poly: [V(14, -17.5), V(48.5, -14.5), V(48.5, 7.5), V(44, 7.8), V(41, 4.5), V(38, 0.5), V(34, -3), V(30, -6),
        V(25, -8.5), V(20, -10), V(14.5, -10.5)], front: [3, 10], front2: [10, 0] },
    // as on the Yandex map: 16 × 8 m, shifted south of the satellite roof outline so that a walkway is left
    // between it and the R-CUTS block behind it
    { id: 'pavilion', label: 'Павильон', h: 5, portico: true,
      poly: [V(11, -3.5), V(27, -3.5), V(27, 4.5), V(11, 4.5)], front: [3, 0] },
    { id: 'gallery', label: 'Галерея', h: 4.5, warm: true,
      poly: [V(10, 13.2), V(16, 12.8), V(22, 12.2), V(28, 11.2), V(34, 10), V(40, 8.6), V(45.5, 7.6), V(45, 25.5), V(10, 20.5)],
      front: [0, 6] },
  ],
  // open canopy on columns; `edge` is its plaza-side line, north → south
  canopy: { label: 'Навес, качели', h: 3.7, fascia: 1.1, depth: 6,
    poly: [V(-24, -4), V(-13.5, -4), V(-14.6, -2), V(-14.6, 1.5), V(-13.5, 4.8), V(-11.3, 7.6), V(-8.3, 9.6), V(-5, 10.8),
      V(-1.5, 11.4), V(0, 16), V(-24, 16)],
    edge: [V(-13.5, -4), V(-14.6, -2), V(-14.6, 1.5), V(-13.5, 4.8), V(-11.3, 7.6), V(-8.3, 9.6), V(-5, 10.8), V(-1.5, 11.4)] },
  shelter: { x: 3, z: 14.5, w: 2.6, d: 1.2, h: 1.7, rot: 0 },          // concrete "Укрытие", text to the north
  planter: { x: 12, z: 7, w: 9, d: 3, rot: -8 },
  lamps: [[-8, -24], [-1, -23], [6, -25], [-30, 2], [-30, 12]],
  // where we expect people to look from (eye height 1.7 m unless given). The first one is the main one: the north
  // end of the café terrace by the coffee shop, seated, where the cube is seen like the client's reference photo —
  // one upper face on top, two lower faces below, the edge between them straight down the middle. The second is
  // the back one (a second video). The last two are side views, the main one turned by ±120° about the cube.
  viewpoints: [
    { label: 'Терраса у кофейни (основная)', x: -16.5, z: -5.4, y: 1.2 },
    // straight across the cube from the main point; the other three faces face it. At the main point's distance it
    // would stand inside the pavilion, so it is closer: in front of the pavilion
    { label: 'Сзади, у павильона', x: 8.6, z: 2.8 },
    { label: 'Южный проход (сбоку)', x: 2.5, z: 11.7 },   // closer than the others: further south «Укрытие» blocks the view
    { label: 'У R-CUTS (сбоку)', x: 12.9, z: -11.6 },
    { label: 'Сзади, как на видео с площади', x: 10, z: -2.5 },   // where the client's phone videos were shot: faces 5 + 3 large
    // not a place to stand: above the pavilion point, from where all three back faces (2, 3, 5) are seen well; the
    // main clip projected from here wraps the whole back triple, upright, like the client's own clips
    { label: 'Сзади, сверху (проекция на три грани)', x: 8.6, z: 2.8, y: 6 },
    { label: 'Сзади, с другой стороны', x: 5.6, z: 9.2 },   // mirror of the video spot across the back diagonal: faces 5 + 2
  ],
};

// ---------- cube orientation ----------
// The cube stands on a vertex: this cube-local diagonal points straight up, so the strip's faces 0, 1, 5 are the
// three LOWER ones and 2, 3, 4 the upper ones. Checked on the real cube (21.10.2026): a phone video of our clip from
// the pavilion shows slot 5 on the lower face facing it and slot 3 on the upper face next to it, and the client's own
// fish clip reads as a level water tank only with this diagonal. Then the cube is turned about the vertical by `yaw`.
export const CUBE_UP_DIAGONAL = new THREE.Vector3(-1, 1, -1).normalize();
export function cubeQuaternion(yawDeg) {
  return new THREE.Quaternion().setFromUnitVectors(CUBE_UP_DIAGONAL, new THREE.Vector3(0, 1, 0))
    .premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), deg(yawDeg)));
}
// azimuth (degrees, atan2(x, z) — the same convention as the emulator's viewpoint angle) from (x, z) to (tx, tz)
export const azimuth = (x, z, tx, tz) => THREE.MathUtils.radToDeg(Math.atan2(tx - x, tz - z));
// yaw that turns the main face's horizontal direction towards (tx, tz)
export function yawToward(tx, tz) {
  const n = new THREE.Vector3(0, 0, 1).applyQuaternion(cubeQuaternion(0));
  const y = azimuth(LAYOUT.cube.x, LAYOUT.cube.z, tx, tz) - THREE.MathUtils.radToDeg(Math.atan2(n.x, n.z));
  return Math.round(((y % 360) + 540) % 360 - 180);
}
// where the main face looks: the table on photo IMG_2089 (the cube's turn was matched from there)
export function faceTarget() {
  return { ...LAYOUT.cube.photoSpot };
}

export function boxPolygon({ x, z, w, d, rot = 0 }) {
  const c = Math.cos(deg(rot)), s = Math.sin(deg(rot));
  return [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]]
    .map(([px, pz]) => V(x + px * c - pz * s, z + px * s + pz * c));
}
export const centroid = poly => poly.reduce((a, p) => a.add(p), V(0, 0)).multiplyScalar(1 / poly.length);
{ const t = faceTarget(); LAYOUT.cube.yaw = yawToward(t.x, t.z) + LAYOUT.cube.yawOffset; }

// Footprints of everything solid, for keeping the camera and the cube out of buildings. People can walk under
// the canopy (only its columns block them); the cube cannot stand there, its roof is in the way (`roofs`).
export function solidFootprints({ roofs = false } = {}) {
  const col = (p, w) => boxPolygon({ x: p.x, z: p.y, w, d: w });
  return [
    ...LAYOUT.buildings.map(b => b.poly), boxPolygon(LAYOUT.shelter), boxPolygon(LAYOUT.planter),
    ...canopyColumns().map(p => col(p, 0.7)),
    ...LAYOUT.buildings.filter(b => b.portico).flatMap(b => porticoColumns(b).map(p => col(p, 0.8))),
    ...(roofs ? [LAYOUT.canopy.poly] : []),
  ];
}
// outward unit normal of edge a→b of `poly`
function outward(poly, a, b) {
  const d = b.clone().sub(a).normalize(), n = V(d.y, -d.x), mid = a.clone().add(b).multiplyScalar(0.5);
  return pointInPolygon(mid.clone().addScaledVector(n, 0.3), poly) ? n.negate() : n;
}
// true when p is inside poly and at least `margin` metres from its outline
function insideBy(p, poly, margin) {
  return pointInPolygon(p, poly) && poly.every((a, i) => distToSegment(p, a, poly[(i + 1) % poly.length]) >= margin);
}
// walking along the canopy's plaza-side edge: point and inward normal at distance t
function canopyEdge() {
  const c = LAYOUT.canopy, edge = c.edge;
  const len = edge.reduce((a, p, i) => a + (i ? p.distanceTo(edge[i - 1]) : 0), 0);
  const at = t => {
    let run = 0;
    for (let i = 1; i < edge.length; i++) {
      const seg = edge[i].distanceTo(edge[i - 1]);
      if (run + seg >= t || i === edge.length - 1) {
        const k = Math.min(1, (t - run) / seg);
        return { p: edge[i - 1].clone().lerp(edge[i], k), inward: outward(c.poly, edge[i - 1], edge[i]).negate() };
      }
      run += seg;
    }
  };
  return { len, at, count: Math.round(len / 4.5) };
}
// canopy columns: a row along the plaza edge and one `depth` metres in, dropped where they would leave the roof
export function canopyColumns() {
  const c = LAYOUT.canopy, { len, at, count } = canopyEdge(), out = [];
  for (let i = 0; i <= count; i++) for (const d of [0.6, c.depth]) {
    const { p, inward } = at(i * len / count), q = p.clone().addScaledVector(inward, d);
    if (insideBy(q, c.poly, 0.35)) out.push(q);
  }
  return out;
}
// two columns in front of a portico, 2 m out from the middle of its front
export function porticoColumns(b) {
  const pts = polyline(b.poly, b.front), a = pts[0], z = pts[pts.length - 1], n = outward(b.poly, a, z);
  const mid = a.clone().add(z).multiplyScalar(0.5), along = z.clone().sub(a).normalize();
  return [-3.5, 3.5].map(off => mid.clone().addScaledVector(along, off).addScaledVector(n, 2));
}
export function pointInPolygon(p, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
function distToSegment(p, a, b) {
  const ab = b.clone().sub(a), t = THREE.MathUtils.clamp(p.clone().sub(a).dot(ab) / ab.lengthSq(), 0, 1);
  return p.distanceTo(a.clone().addScaledVector(ab, t));
}
// true when a disc of radius r around (x, z) touches no solid footprint (pass { roofs: true } for the cube)
export function isClear(x, z, r = 0, opts) {
  const p = V(x, z);
  return solidFootprints(opts).every(poly => !pointInPolygon(p, poly) &&
    poly.every((a, i) => distToSegment(p, a, poly[(i + 1) % poly.length]) >= r));
}
// vertices [from..to] of a closed polygon, wrapping around
function polyline(poly, [from, to]) {
  const pts = [];
  for (let i = from; ; i = (i + 1) % poly.length) { pts.push(poly[i]); if (i === to) break; }
  return pts;
}

// Adds the plaza (ground, buildings, canopy, lamps, trees, their lights) to `root`
export function buildPlaza(root) {
  const L = LAYOUT;
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  function canvasTex(w, h, draw, repeat) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
    return t;
  }
  // tiles: long light-grey slabs with random darker ones (as on the photos); 1 texture repeat = 8 m
  const tileTex = canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = '#6f7076'; g.fillRect(0, 0, w, h);
    const tw = 64, th = 32;
    for (let y = 0; y < h; y += th) for (let x = -((y / th) % 2) * tw / 2; x < w; x += tw) {
      const v = rnd() < 0.12 ? 40 + rnd() * 25 : 95 + rnd() * 25;
      g.fillStyle = `rgb(${v},${v},${v + 4})`; g.fillRect(x + 1, y + 1, tw - 2, th - 2);
    }
  });
  tileTex.wrapS = tileTex.wrapT = THREE.RepeatWrapping;
  // glass facade: 16 lit windows per texture, wrapped every 12 m along the facade
  const windowTex = warm => {
    const t = canvasTex(512, 128, (g, w, h) => {
      g.fillStyle = '#1a1c22'; g.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 32) {
        const lit = rnd() < 0.85, k = 0.6 + rnd() * 0.4;
        g.fillStyle = lit ? (warm ? `rgba(255,${190 + rnd() * 40},${120 + rnd() * 50},${k})` : `rgba(${200 + rnd() * 40},${225 + rnd() * 30},255,${k})`) : '#23262e';
        g.fillRect(x + 2, 6, 28, h - 12);
        g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(x + 2, h * 0.55, 28, 2);
      }
    });
    t.wrapS = THREE.RepeatWrapping;
    return t;
  };
  const textTex = (text, color, bg) => canvasTex(512, 128, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = color; g.font = 'bold 64px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 4);
  });

  const metal = new THREE.MeshStandardMaterial({ color: 0x8a8f99, roughness: 0.6, metalness: 0.3 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x33373f, roughness: 0.6, metalness: 0.3 });
  const ledMat = new THREE.MeshBasicMaterial({ color: 0xe8f4ff, side: THREE.DoubleSide });

  // ---------- ground ----------
  const lawn = new THREE.Mesh(new THREE.CircleGeometry(160, 64), new THREE.MeshStandardMaterial({ color: 0x1d2a18, roughness: 1 }));
  lawn.rotation.x = -Math.PI / 2; lawn.receiveShadow = true;
  root.add(lawn);
  const paved = flat(L.paved, 0.01, new THREE.MeshStandardMaterial({ map: tileTex, roughness: 0.32, metalness: 0.15 })); // wet, so glossy
  root.add(paved);

  // flat polygon on the ground with world-scaled UVs (1 repeat = 8 m)
  function flat(poly, y, mat) {
    const g = new THREE.ShapeGeometry(new THREE.Shape(poly.map(p => V(p.x, -p.y))));
    g.rotateX(-Math.PI / 2); g.translate(0, y, 0);
    const pos = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / 8, pos.getZ(i) / 8);
    const m = new THREE.Mesh(g, mat); m.receiveShadow = true;
    return m;
  }
  function prism(poly, h, mat, y0 = 0) {
    const shape = new THREE.Shape(poly.map(p => V(p.x, -p.y)));
    const g = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false });
    g.rotateX(-Math.PI / 2); g.translate(0, y0, 0);
    const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true;
    return m;
  }
  // vertical strip along a polyline, pushed `off` metres outside the polygon; u runs in metres / uScale
  function ribbon(poly, pts, y0, y1, off, mat, uScale = 12) {
    const pos = [], uv = [], idx = [];
    let run = 0;
    pts.forEach((p, i) => {
      // vertex normal = average of the adjacent edge normals
      const ns = [];
      if (i > 0) ns.push(outward(poly, pts[i - 1], p));
      if (i < pts.length - 1) ns.push(outward(poly, p, pts[i + 1]));
      const n = ns.reduce((a, v) => a.add(v), V(0, 0)).normalize();
      if (i > 0) run += p.distanceTo(pts[i - 1]);
      const q = p.clone().addScaledVector(n, off);
      pos.push(q.x, y0, q.y, q.x, y1, q.y);
      uv.push(run / uScale, 0, run / uScale, 1);
      if (i > 0) { const k = (i - 1) * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    return new THREE.Mesh(g, mat);
  }
  // a sign on the middle of the given polyline, facing outwards
  function sign(poly, pts, text, y, w, h, colors) {
    let best = 0;
    for (let i = 1; i < pts.length; i++) if (pts[i].distanceTo(pts[i - 1]) > pts[best + 1].distanceTo(pts[best])) best = i - 1;
    const a = pts[best], b = pts[best + 1], n = outward(poly, a, b), mid = a.clone().add(b).multiplyScalar(0.5).addScaledVector(n, 0.08);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: textTex(text, ...colors) }));
    m.position.set(mid.x, y, mid.y); m.rotation.y = Math.atan2(n.x, n.y);
    return m;
  }

  // ---------- buildings ----------
  for (const b of L.buildings) {
    root.add(prism(b.poly, b.h, metal));
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x111318, emissive: 0xffffff, emissiveMap: windowTex(b.warm),
      emissiveIntensity: 1.25, roughness: 0.15, metalness: 0.6, side: THREE.DoubleSide });
    for (const key of ['front', 'front2']) {
      if (!b[key]) continue;
      const pts = polyline(b.poly, b[key]);
      root.add(ribbon(b.poly, pts, 0.15, b.h * 0.68, 0.03, glassMat));
      root.add(ribbon(b.poly, pts, b.h - 0.65, b.h - 0.6, 0.06, ledMat)); // LED strip under the roof edge, as on the photos
      if (b.sign && key === 'front') root.add(sign(b.poly, pts, b.sign, b.h - 1.1, Math.min(5, b.sign.length * 0.42), 0.9, ['#ffffff', '#2b2d33']));
    }
    if (b.warm) {
      const c = centroid(b.poly), toC = V(L.centre.x - c.x, L.centre.z - c.y).normalize();
      const l = new THREE.PointLight(0xffc27a, 22, 14, 2);
      const p = centroid(polyline(b.poly, b.front));
      l.position.set(p.x + toC.x * 2, 2, p.y + toC.y * 2); root.add(l);
    }
    if (b.portico) {
      // two columns and a roof slab in front of the glass front
      const pts = polyline(b.poly, b.front), a = pts[0], z = pts[pts.length - 1], n = outward(b.poly, a, z);
      const mid = a.clone().add(z).multiplyScalar(0.5);
      for (const p of porticoColumns(b)) {
        const col = new THREE.Mesh(new THREE.BoxGeometry(0.8, b.h, 0.8), metal);
        col.position.set(p.x, b.h / 2, p.y); col.castShadow = true; root.add(col);
      }
      const roof = new THREE.Mesh(new THREE.BoxGeometry(9, 1.1, 2.6), metal), p = mid.clone().addScaledVector(n, 1.3);
      roof.position.set(p.x, b.h - 0.55, p.y); roof.rotation.y = Math.atan2(n.x, n.y); root.add(roof);
    }
  }
  if (L.buildings.some(b => b.id === 'gallery')) {
    // pink neon inside the gallery (seen through the glass on the photos)
    const neon = new THREE.PointLight(0xff4fd8, 18, 16, 2); neon.position.set(30, 2, 13); root.add(neon);
  }

  // ---------- shelter block ----------
  {
    const b = L.shelter, wall = new THREE.MeshStandardMaterial({ color: 0xd8d6d2 }), text = new THREE.MeshStandardMaterial({ map: textTex('УКРЫТИЕ', '#d01a1a', '#e2e0dc') });
    const m = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), [wall, wall, wall, wall, text, text]);
    m.position.set(b.x, b.h / 2, b.z); m.rotation.y = -deg(b.rot); m.castShadow = true;
    root.add(m);
  }
  // ---------- planter with shrubs ----------
  {
    const b = L.planter, c = Math.cos(deg(b.rot)), s = Math.sin(deg(b.rot));
    root.add(prism(boxPolygon(b), 0.6, new THREE.MeshStandardMaterial({ color: 0xb9bbbe, roughness: 0.8 })));
    const shrubMat = new THREE.MeshStandardMaterial({ color: 0x2c4a26, roughness: 1 });
    for (let i = 0; i < 8; i++) {
      const t = (i + 0.5) / 8 - 0.5, sh = new THREE.Mesh(new THREE.SphereGeometry(0.55 + rnd() * 0.2, 12, 8), shrubMat);
      sh.position.set(b.x + t * b.w * 0.9 * c, 0.9, b.z + t * b.w * 0.9 * s); root.add(sh);
    }
  }

  // ---------- canopy: roof on two rows of columns, LED strip, string lights, swings, tables ----------
  {
    const c = L.canopy, edge = c.edge;
    root.add(prism(c.poly, c.fascia, darkMetal, c.h));
    root.add(ribbon(c.poly, edge, c.h + 0.02, c.h + 0.08, 0.04, ledMat));
    const { len, at, count } = canopyEdge(), colGeo = new THREE.BoxGeometry(0.7, c.h, 0.7);
    for (const q of canopyColumns()) {
      const col = new THREE.Mesh(colGeo, darkMetal); col.position.set(q.x, c.h / 2, q.y); col.castShadow = true; root.add(col);
    }
    // string lights: three sagging rows between the column rows
    const bulbs = [];
    for (let r = 0; r < 3; r++) {
      const d = 1.4 + r * (c.depth - 2) / 2;
      for (let t = 0; t <= len; t += 0.45) {
        const { p, inward } = at(t), q = p.clone().addScaledVector(inward, d), k = (t % (len / count)) / (len / count);
        if (!insideBy(q, c.poly, 0.2)) continue; // only under the roof
        bulbs.push(new THREE.Vector3(q.x, c.h - 0.15 - Math.sin(Math.PI * k) * 0.6, q.y));
      }
    }
    const bulbMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd9a0 }), bulbs.length);
    bulbs.forEach((p, i) => bulbMesh.setMatrixAt(i, new THREE.Matrix4().makeTranslation(p.x, p.y, p.z)));
    root.add(bulbMesh);
    for (const t of [0.2, 0.5, 0.8]) {
      const { p, inward } = at(t * len), q = p.clone().addScaledVector(inward, c.depth / 2);
      const l = new THREE.PointLight(0xffc27a, 20, 16, 2); l.position.set(q.x, c.h - 0.6, q.y); root.add(l);
    }
    // hanging swings near the north end (by the coffee shop), tables further south
    const ropeMat = new THREE.LineBasicMaterial({ color: 0xbbb4a6 }), seatMat = new THREE.MeshStandardMaterial({ color: 0xe9e2d2, roughness: 0.9 });
    for (let i = 0; i < 4; i++) {
      const { p, inward } = at(1.5 + i * 2.2), q = p.clone().addScaledVector(inward, 1.8 + (i % 2) * 2);
      const seat = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.05, 8, 24), seatMat);
      seat.position.set(q.x, 0.75, q.y); seat.rotation.x = Math.PI / 2.4; root.add(seat);
      root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(q.x, 0.8, q.y), new THREE.Vector3(q.x, c.h, q.y)]), ropeMat));
    }
    const tableMat = new THREE.MeshStandardMaterial({ color: 0x9c9b97, roughness: 0.7 });
    for (let i = 0; i < 4; i++) {
      const { p, inward } = at(len * 0.45 + i * 3), q = p.clone().addScaledVector(inward, 3 + (i % 2));
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.75, 16), tableMat);
      t.position.set(q.x, 0.375, q.y); t.castShadow = true; root.add(t);
    }
    // tall grass behind the canopy (west side, towards the lawn)
    root.add(prism([V(-27, -3), V(-24.5, -3), V(-24.5, 15), V(-27, 15)], 0.9, new THREE.MeshStandardMaterial({ color: 0x3d4a22, roughness: 1 })));
  }

  // ---------- lamps on the lawns, trees around the block ----------
  {
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x8e2f3a, roughness: 0.6 });
    for (const [x, z] of L.lamps) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 5, 8), poleMat);
      pole.position.set(x, 2.5, z); root.add(pole);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffd28a }));
      head.position.set(x, 5.05, z); root.add(head);
      const l = new THREE.PointLight(0xffc27a, 40, 22, 2); l.position.set(x, 4.9, z); root.add(l);
    }
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3a2c22, roughness: 1 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x3d3a1c, roughness: 1, flatShading: true });
    for (let i = 0; i < 90; i++) {
      const a = rnd() * Math.PI * 2, d = 50 + rnd() * 45, h = 8 + rnd() * 9;
      const x = L.centre.x + Math.cos(a) * d, z = L.centre.z + Math.sin(a) * d * 0.8;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, h * 0.5, 8), trunkMat);
      trunk.position.set(x, h * 0.25, z);
      const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(h * 0.3, 1), leafMat);
      crown.position.set(x, h * 0.62, z);
      root.add(trunk, crown);
    }
  }
}
