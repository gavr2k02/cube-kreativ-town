// "Взрывающаяся тыква": maple leaves cover the bottom quarter of the cube; a soft plush pumpkin falls from above,
// slightly on its side, bursts into fluffy fibres, and the fibres float around the cube (some reach out to the
// viewers), then settle on the leaves and the loop starts again. Colours follow the reference: cream background,
// orange plush pumpkin with a green stem and leaves, rust-orange maple leaves.
//
// Everything is a pure function of time t ∈ [0, LOOP), so frames can be rendered in any order (offline export).
import * as THREE from 'three';

export const LOOP = 30;
export const WALL = 0xf1e7da;               // cream background of the reference
const T_FALL = 3, T_LAND = 4.9, T_BURST = 5.25, T_SETTLE = 24, T_GONE = 28;

let seed = 7;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const smooth = (a, b, x) => { const k = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };

// ---------- geometry helpers ----------
function pumpkinGeometry(R) {
  const g = new THREE.SphereGeometry(R, 128, 80), p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const phi = Math.atan2(v.z, v.x), lat = v.y / R;
    // eight soft lobes, flattened top and bottom with a dimple around the stem
    const lobe = 1 - 0.09 * Math.pow(Math.abs(Math.sin(phi * 4)), 0.7) * (1 - lat * lat);
    v.x *= lobe; v.z *= lobe;
    v.y *= 0.8;
    v.y -= 0.12 * R * Math.exp(-Math.pow((1 - Math.abs(lat)) * 6, 2)) * Math.sign(lat);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}
// noise of soft dots for plush fur shells: bright centres survive in the outer shells, so strands taper
function furTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 26000; i++) {
    const x = rnd() * 512, y = rnd() * 512, r = 1.2 + rnd() * 1.6;
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, '#fff'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(10, 6);
  return t;
}
// plush: the base mesh plus `n` shells pushed out along the normals, each keeping fewer, thinner strands
function plush(geo, color, tip, len, n, fur) {
  const grp = new THREE.Group();
  const base = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 1 }));
  base.castShadow = base.receiveShadow = true;
  grp.add(base);
  const nrm = geo.attributes.normal, pos = geo.attributes.position;
  for (let i = 1; i <= n; i++) {
    const k = i / n, g = geo.clone(), p = g.attributes.position;
    for (let j = 0; j < p.count; j++) {
      p.setXYZ(j, pos.getX(j) + nrm.getX(j) * len * k, pos.getY(j) + nrm.getY(j) * len * k, pos.getZ(j) + nrm.getZ(j) * len * k);
    }
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({
      color: new THREE.Color(color).lerp(new THREE.Color(tip), k), roughness: 1,
      alphaMap: fur, alphaTest: 0.08 + 0.75 * k, transparent: false }));
    m.castShadow = i < 3;
    grp.add(m);
  }
  return grp;
}
function mapleLeafGeometry(size) {
  // five pointed lobes with small teeth, slightly cupped
  const s = new THREE.Shape(), N = 90;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2;
    const lobes = Math.pow(Math.abs(Math.cos(2.5 * (a - Math.PI / 2))), 0.6);
    const teeth = 0.06 * Math.abs(Math.sin(a * 15));
    const r = size * (0.42 + 0.58 * lobes) * (1 - teeth) * (a > Math.PI * 1.35 && a < Math.PI * 1.65 ? 0.55 : 1);
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    i ? s.lineTo(x, y) : s.moveTo(x, y);
  }
  const g = new THREE.ShapeGeometry(s, 4), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, 0.12 * (p.getX(i) ** 2 + p.getY(i) ** 2) / size);
  g.computeVertexNormals();
  return g;
}
// Soft fluff puffs. Point size is given in metres and converted with the camera's own projection and the
// render target height (the stock PointsMaterial assumes the canvas height, far too small for the 2048 px bake).
function puffMaterial(sizeM) {
  return new THREE.ShaderMaterial({
    uniforms: { uSize: { value: sizeM }, uTargetH: { value: 2048 }, uOpacity: { value: 0 } },
    vertexShader: `
      uniform float uSize, uTargetH; attribute vec3 color; varying vec3 vColor;
      void main() {
        vColor = color;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize * projectionMatrix[1][1] * uTargetH * 0.5 / -mv.z;
      }`,
    fragmentShader: `
      uniform float uOpacity; varying vec3 vColor;
      void main() {
        float r = length(gl_PointCoord - 0.5) * 2.0;
        float a = smoothstep(1.0, 0.0, r);           // soft edge, dense core
        gl_FragColor = vec4(vColor, a * a * uOpacity);
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false,
  });
}
function fibreGeometry(L, r) {
  const pts = [new THREE.Vector3(0, 0, -L / 2), new THREE.Vector3(L * 0.12, L * 0.05, -L / 6),
    new THREE.Vector3(-L * 0.1, -L * 0.04, L / 6), new THREE.Vector3(0, 0, L / 2)];
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 8, r, 4, false);
}

// ---------- scene ----------
// ctx: { S, quat (cube orientation), faces (world, relative to the cube centre via `centre`), centre, viewpoints }
export function build(group, ctx) {
  seed = 7;
  const S = ctx.S, s = S / 2, q = ctx.quat, qi = q.clone().invert();
  const half = S * Math.sqrt(3) / 2;                         // the cube on a vertex spans y ∈ [−half, half]
  const leafTop = -half + 2 * half * 0.25;                   // leaves fill the bottom quarter of the height
  const inside = (p, m = 0) => { const l = p.clone().applyQuaternion(qi); return Math.max(Math.abs(l.x), Math.abs(l.y), Math.abs(l.z)) < s - m; };

  // soft warm light, as in the reference studio shot
  group.add(new THREE.HemisphereLight(0xfff6ea, 0xd9b48a, 1.4));
  const key = new THREE.DirectionalLight(0xfff0dc, 2.2);
  key.position.set(S * 0.6, S * 2, S * 0.9); key.target.position.set(0, -S * 0.3, 0);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0008; key.shadow.radius = 6;
  Object.assign(key.shadow.camera, { left: -S, right: S, top: S, bottom: -S, near: 0.1, far: S * 5 });
  group.add(key, key.target);

  // ---- maple leaves heaped in the bottom of the cube ----
  const leafGeo = mapleLeafGeometry(S * 0.075);
  // dry maple leaves as on the reference: light rust, tan and amber
  const leafColors = [0xd98a3d, 0xc9773a, 0xe6a253, 0xc46a2f, 0xeab56a, 0xb8622c].map(c => new THREE.Color(c));
  const leafCount = 3000;
  const leaves = new THREE.InstancedMesh(leafGeo, new THREE.MeshStandardMaterial({ roughness: 0.85, side: THREE.DoubleSide }), leafCount);
  leaves.castShadow = leaves.receiveShadow = true;
  const leafData = [];
  for (let i = 0; i < leafCount; i++) {
    let p;
    // rejection-sample points inside the cube below the leaf line, denser towards the top of the heap
    do { p = new THREE.Vector3((rnd() * 2 - 1) * half, -half + Math.pow(rnd(), 0.6) * (leafTop + half), (rnd() * 2 - 1) * half); } while (!inside(p, S * 0.01));
    const rot = new THREE.Euler(-Math.PI / 2 + (rnd() - 0.5) * 1.2, rnd() * Math.PI * 2, (rnd() - 0.5) * 1.2);
    leafData.push({ p, rot, sc: 0.7 + rnd() * 0.7, ph: rnd() * 6.28 });
    leaves.setColorAt(i, leafColors[Math.floor(rnd() * leafColors.length)].clone().offsetHSL((rnd() - 0.5) * 0.03, 0, (rnd() - 0.5) * 0.08));
  }
  group.add(leaves);

  // ---- the plush pumpkin ----
  const R = S * 0.27, fur = furTexture();
  const pumpkin = new THREE.Group();
  pumpkin.add(plush(pumpkinGeometry(R), 0xe07418, 0xf7a447, R * 0.06, 14, fur));
  const stemCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, R * 0.68, 0), new THREE.Vector3(R * 0.02, R * 0.95, 0), new THREE.Vector3(R * 0.12, R * 1.18, 0)]);
  pumpkin.add(plush(new THREE.TubeGeometry(stemCurve, 16, R * 0.08, 12, true), 0x4f7a2b, 0x7da84a, R * 0.02, 5, fur));
  const greenLeaf = new THREE.MeshStandardMaterial({ color: 0x5d8f35, roughness: 0.8, side: THREE.DoubleSide });
  for (const [a, tilt] of [[0.3, -0.5], [2.6, -0.4]]) {
    const leafShape = new THREE.Shape();
    leafShape.moveTo(0, 0); leafShape.quadraticCurveTo(R * 0.22, R * 0.2, R * 0.55, 0); leafShape.quadraticCurveTo(R * 0.22, -R * 0.2, 0, 0);
    const m = new THREE.Mesh(new THREE.ShapeGeometry(leafShape, 12), greenLeaf);
    m.position.set(0, R * 0.78, 0); m.rotation.set(Math.PI / 2 + tilt, 0, a, 'YXZ'); m.castShadow = true;
    pumpkin.add(m);
  }
  group.add(pumpkin);
  const restY = leafTop + R * 0.75;

  // ---- fibres: born on the pumpkin surface, fly out, drift, settle ----
  // thin wavy wisps (instanced tubes) and, below, soft fluff puffs (points) — together they read as plush fibre
  const fibreCount = 1400, fibreGeo = fibreGeometry(S * 0.045, S * 0.0018);
  const fibres = new THREE.InstancedMesh(fibreGeo, new THREE.MeshStandardMaterial({ roughness: 1 }), fibreCount);
  const fibreColors = [0xf08a2a, 0xf6a14a, 0xf9b866, 0xfccf96, 0xe9781e].map(c => new THREE.Color(c));
  const centre = new THREE.Vector3(0, restY, 0);
  const viewDirs = ctx.viewpoints.map(v => v.clone().sub(centre).setY(0).normalize());
  const fibreData = [];
  for (let i = 0; i < fibreCount; i++) {
    const dir = new THREE.Vector3(rnd() * 2 - 1, rnd() * 1.6 - 0.5, rnd() * 2 - 1).normalize();
    const start = centre.clone().addScaledVector(dir, R * (0.6 + rnd() * 0.3));
    const pop = i % 9 === 0;                   // every ninth fibre reaches out of the cube towards a viewer
    let reach;
    if (pop) {
      const vd = viewDirs[i % viewDirs.length];
      reach = vd.clone().multiplyScalar(S * (0.75 + rnd() * 0.45)).add(new THREE.Vector3(0, S * (0.1 + rnd() * 0.3), 0)).add(centre).sub(start);
    } else {
      reach = dir.clone().multiplyScalar(S * (0.18 + rnd() * 0.3));
      // keep ordinary fibres inside the cube: shorten the throw until the end point (plus drift) fits
      for (let k = 0; k < 12 && !inside(start.clone().add(reach), S * 0.1); k++) reach.multiplyScalar(0.8);
    }
    fibreData.push({ start, reach, k: 2.2 + rnd() * 1.8, ph: rnd() * 6.28, f: 0.25 + rnd() * 0.35,
      spin: new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(2),
      rot0: new THREE.Euler(rnd() * 6.28, rnd() * 6.28, rnd() * 6.28), sc: 0.6 + rnd() * 0.8,
      land: new THREE.Vector3(start.x + reach.x * 0.6, leafTop + rnd() * S * 0.03, start.z + reach.z * 0.6) });
    fibres.setColorAt(i, fibreColors[Math.floor(rnd() * fibreColors.length)]);
  }
  group.add(fibres);

  const puffCount = 4200, puffGeo = new THREE.BufferGeometry();
  puffGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(puffCount * 3), 3));
  const puffCol = new Float32Array(puffCount * 3), tmp = new THREE.Color();
  const puffData = [];
  for (let i = 0; i < puffCount; i++) {
    const f = fibreData[i % fibreCount];
    // each puff follows a fibre's path with its own offset, so wisps sit inside soft clouds of fluff
    puffData.push({ f, off: new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(S * 0.07) });
    tmp.copy(fibreColors[Math.floor(rnd() * fibreColors.length)]).lerp(new THREE.Color(0xffe6c8), rnd() * 0.35);
    puffCol.set([tmp.r, tmp.g, tmp.b], i * 3);
  }
  puffGeo.setAttribute('color', new THREE.Float32BufferAttribute(puffCol, 3));
  const puffs = new THREE.Points(puffGeo, puffMaterial(S * 0.05));
  puffs.frustumCulled = false;
  group.add(puffs);

  return { leaves, leafData, pumpkin, restY, R, fibres, fibreData, puffs, puffData, S, inside, leafTop };
}

const m4 = new THREE.Matrix4(), qt = new THREE.Quaternion(), v3 = new THREE.Vector3(), sc3 = new THREE.Vector3(), eu = new THREE.Euler();

export function update(d, t) {
  const { leaves, leafData, pumpkin, restY, R, fibres, fibreData, puffs, puffData, S } = d;

  // leaves: a barely visible breathing rustle (stronger right after the burst)
  const gust = 0.04 + 0.25 * Math.exp(-Math.max(0, t - T_BURST) * 1.5) * (t > T_BURST ? 1 : 0);
  leafData.forEach((l, i) => {
    eu.set(l.rot.x + Math.sin(t * 1.3 + l.ph) * gust, l.rot.y + Math.sin(t * 0.7 + l.ph) * gust * 0.5, l.rot.z);
    m4.compose(l.p, qt.setFromEuler(eu), sc3.setScalar(l.sc));
    leaves.setMatrixAt(i, m4);
  });
  leaves.instanceMatrix.needsUpdate = true;

  // pumpkin: hidden above → falls slightly on its side → squashes on the leaves → bursts
  if (t < T_FALL || t >= T_BURST + 0.12) pumpkin.visible = false;
  else {
    pumpkin.visible = true;
    const k = Math.min(1, (t - T_FALL) / (T_LAND - T_FALL));
    const y = THREE.MathUtils.lerp(S * 1.25, restY, k * k);          // accelerating fall from above the cube
    const after = Math.max(0, t - T_LAND);
    const squash = after > 0 ? Math.sin(Math.min(1, after / 0.35) * Math.PI) * 0.16 : 0;
    const swell = smooth(T_BURST - 0.2, T_BURST + 0.12, t) * 0.25;  // swells just before it bursts
    pumpkin.position.set(S * 0.02, y - squash * R * 0.5, 0);
    pumpkin.rotation.set(0.12, 0.6, 0.28 - k * 0.12);                 // falling slightly on its side
    pumpkin.scale.set(1 + squash * 0.6 + swell, 1 - squash + swell, 1 + squash * 0.6 + swell);
  }

  // fibres: τ = time since the burst; damped outward throw + slow wandering + settling at the end
  const tau = t - T_BURST;
  const settle = smooth(T_SETTLE, T_GONE - 0.5, t), fade = 1 - smooth(T_GONE - 1.2, T_GONE, t);
  fibreData.forEach((f, i) => {
    f.visible = tau >= 0 && fade > 0;
    if (!f.visible) { m4.makeScale(0, 0, 0); fibres.setMatrixAt(i, m4); return; }
    const throwK = 1 - Math.exp(-f.k * tau);
    const wander = S * 0.05 * smooth(0, 3, tau);
    v3.copy(f.start).addScaledVector(f.reach, throwK);
    v3.x += Math.sin(tau * f.f + f.ph) * wander;
    v3.y += Math.sin(tau * f.f * 0.8 + f.ph * 1.7) * wander * 0.7 - 0.006 * S * tau;
    v3.z += Math.cos(tau * f.f * 0.9 + f.ph) * wander;
    v3.lerp(f.land, settle);
    eu.set(f.rot0.x + f.spin.x * tau * (1 - settle * 0.8), f.rot0.y + f.spin.y * tau, f.rot0.z + f.spin.z * tau * (1 - settle * 0.8));
    const grow = smooth(0, 0.25, tau);
    (f.now ??= new THREE.Vector3()).copy(v3); f.grow = grow * fade;
    m4.compose(v3, qt.setFromEuler(eu), sc3.setScalar(f.sc * grow * fade));
    fibres.setMatrixAt(i, m4);
  });
  fibres.instanceMatrix.needsUpdate = true;

  // puffs: around their fibre, the cloud expands after the burst and tightens again as it settles
  const pp = puffs.geometry.attributes.position, spread = smooth(0, 1.5, tau) * (1 - settle * 0.7);
  puffData.forEach((p, i) => {
    if (!p.f.visible) { pp.setXYZ(i, 0, -1e4, 0); return; }
    pp.setXYZ(i, p.f.now.x + p.off.x * spread, p.f.now.y + p.off.y * spread, p.f.now.z + p.off.z * spread);
  });
  pp.needsUpdate = true;
  puffs.material.uniforms.uOpacity.value = 0.8 * (tau >= 0 ? smooth(0, 0.3, tau) * fade : 0);
}
