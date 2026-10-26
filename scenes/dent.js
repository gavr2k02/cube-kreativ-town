// "Вмятина" (sketch): the cube is a soft glossy shell. An invisible giant finger presses the upper face in; the dent
// crawls over the edge onto the front face, slides down to the lower vertex and pops out there as a bulge that wobbles
// and smooths out. The shell lies exactly on the LED surface, so where it is flat it simply is the screen; the dent is
// pushed towards the cube centre, so it stays continuous across the edges. The three back faces get their own
// motion: the bottom face swells out towards the pavilion.
//
// Pure function of time t ∈ [0, LOOP), so frames can be rendered in any order.
import * as THREE from 'three';

export const LOOP = 12;
export const WALL = 0x0c0a14;
const N = 140;                               // segments per face edge

const smooth = (a, b, x) => { const k = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };

// ctx: { S, quat, viewpoints }
export function build(group, ctx) {
  const S = ctx.S, s = S / 2;
  const geo = new THREE.BoxGeometry(S, S, S, N, N, N);
  const base = geo.attributes.position.array.slice();
  geo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(base.length).fill(1), 3));
  const shell = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({
    color: 0xb4abc8, roughness: 0.26, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.12,
    sheen: 1, sheenColor: new THREE.Color(0xff9ad5), sheenRoughness: 0.4, vertexColors: true, envMapIntensity: 1.6 }));
  shell.quaternion.copy(ctx.quat);
  shell.castShadow = shell.receiveShadow = true;
  group.add(shell);

  // one coloured light per face of each viewed triple (lilac upper, pink and cyan lower), a little towards the viewer:
  // every face is lit, and wherever the dent tilts the surface the colours mix — that is what reads at low resolution
  group.add(new THREE.HemisphereLight(0xe8e0ff, 0x302040, 0.35));
  const toViewer = ctx.viewpoints[0].clone().normalize();
  const faceLight = (local, color, power, shadow) => {
    const l = new THREE.DirectionalLight(color, power);
    l.position.copy(new THREE.Vector3(...local).applyQuaternion(ctx.quat).multiplyScalar(0.8).addScaledVector(toViewer, 0.6).normalize().multiplyScalar(S * 3));
    if (shadow) {
      l.castShadow = true; l.shadow.mapSize.set(2048, 2048); l.shadow.bias = -0.0005; l.shadow.normalBias = 0.01;
      Object.assign(l.shadow.camera, { left: -S, right: S, top: S, bottom: -S, near: 0.1, far: S * 6 });
    }
    group.add(l);
  };
  faceLight([0, 1, 0], 0xb48cff, 3.2, true);   // face 4 (upper)
  faceLight([0, 0, 1], 0xff3d9a, 3.0, false);  // face 0 (lower)
  faceLight([1, 0, 0], 0x22c8ff, 3.4, false);  // face 1 (lower)
  faceLight([0, -1, 0], 0xff3d9a, 2.6, false); // back triple: 5, 2, 3
  faceLight([0, 0, -1], 0x22c8ff, 2.8, false);
  faceLight([-1, 0, 0], 0xb48cff, 2.6, false);
  // a light grazing the bottom face from one side: the swell there faces the pavilion, so frontal light flattens it
  const graze = new THREE.DirectionalLight(0x22c8ff, 3.2);
  graze.position.copy(new THREE.Vector3(1, -0.25, -0.4).applyQuaternion(ctx.quat).normalize().multiplyScalar(S * 3));
  group.add(graze);

  // the dent's path in cube-local coordinates: upper face → over its edge → front face → past the lower vertex
  // (local (1, −1, 1), shared by faces 0, 1, 5) → the middle of the other lower face, where it pops out
  const path = [[0, s, 0], [0, s, s], [0, 0, s], [s * 0.7, -s * 0.7, s], [s, 0, 0]].map(p => new THREE.Vector3(...p));
  return { S, s, geo, base, path, bottom: new THREE.Vector3(0, -s, 0) };
}

const P = new THREE.Vector3(), v = new THREE.Vector3();
function onPath(path, u) {                   // u ∈ [0, 1] along the polyline, projected back onto the cube surface
  const n = path.length - 1, k = Math.min(n - 1, Math.floor(u * n)), f = u * n - k;
  P.lerpVectors(path[k], path[k + 1], f);
  const s = Math.max(Math.abs(path[0].x), Math.abs(path[0].y), Math.abs(path[0].z));
  return P.multiplyScalar(s / Math.max(Math.abs(P.x), Math.abs(P.y), Math.abs(P.z)));
}

export function update(d, t) {
  const { S, geo, base, path } = d;
  // depth > 0 presses in, < 0 bulges out
  const press = smooth(1.5, 3, t);
  const travel = smooth(3, 8, t);
  const pop = smooth(8, 8.35, t);
  const wobble = t > 8.35 ? Math.cos((t - 8.35) * 9) * Math.exp(-(t - 8.35) * 1.4) : 1;
  const depth = S * 0.2 * (press * (1 - pop) - pop * 1.3 * wobble) * (1 - smooth(10, 11.8, t));
  const radius = S * (0.3 - 0.04 * pop);
  const c = onPath(path, travel);
  // the back point (pavilion) stands close and low: it sees the bottom face squarely and the two upper back faces
  // edge-on, so a dent crawling over an edge would be lost there. Instead the bottom face swells towards it like a
  // blown bubble, peaks with the front dent and settles back
  const c2 = d.bottom, swell = smooth(1.5, 7.5, t) * (1 - smooth(9, 11.8, t)), r2 = S * 0.3;   // edges stay put
  const out = S * 0.3 * swell * (1 + 0.08 * Math.sin(t * 7) * smooth(6, 8, t));

  const pos = geo.attributes.position.array, col = geo.attributes.color.array;
  for (let i = 0; i < pos.length; i += 3) {
    v.set(base[i], base[i + 1], base[i + 2]);
    const dd = depth * Math.exp(-v.distanceToSquared(c) / (radius * radius)) - out * Math.exp(-v.distanceToSquared(c2) / (r2 * r2)), l = v.length();
    pos[i] = v.x - dd * v.x / l; pos[i + 1] = v.y - dd * v.y / l; pos[i + 2] = v.z - dd * v.z / l;
    const shade = 1 - 1.6 * Math.max(0, dd) / S;      // darker deep in the dent (soft occlusion)
    col[i] = col[i + 1] = col[i + 2] = shade;
  }
  geo.attributes.position.needsUpdate = true;
  geo.attributes.color.needsUpdate = true;
  geo.computeVertexNormals();
}
