// "Гравитация наоборот" (sketch): a glowing amber liquid lies in the lower vertex of the cube, trembles, then gravity
// flips — the whole mass stretches up in one thick column and hangs in the upper vertex, drips, lets go, falls back in
// one heavy drop and splashes. The liquid is one implicit surface (marching cubes) clipped by the cube walls; a light
// inside it makes the dark walls glow where the liquid is.
//
// Pure function of time t ∈ [0, LOOP), so frames can be rendered in any order.
import * as THREE from 'three';
import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js';

export const LOOP = 15;
export const WALL = 0x14091a;              // dark plum: the glow of the liquid carries the picture
const T_TREMBLE = 3, T_LIFT = 4.5, T_UP = 7, T_LET_GO = 10, T_HIT = 10.8;
const RES = 96;

const smooth = (a, b, x) => { const k = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
const W = 2 * Math.PI / LOOP;               // waves use whole multiples of it, so the loop is seamless

let seed = 11;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// ctx: { S, quat, viewpoints }
export function build(group, ctx) {
  seed = 11;
  const S = ctx.S, s = S / 2, H = S * Math.sqrt(3) / 2;     // the cube on a vertex spans y ∈ [−H, H]
  const m = new THREE.Matrix4().makeRotationFromQuaternion(ctx.quat.clone().invert()).elements;

  // inner walls that catch the liquid's light (the emulator's own backdrop is unlit)
  const walls = new THREE.Mesh(new THREE.BoxGeometry(S * 0.995, S * 0.995, S * 0.995),
    new THREE.MeshStandardMaterial({ color: 0x2a1530, roughness: 0.9, side: THREE.BackSide }));
  walls.quaternion.copy(ctx.quat);
  group.add(walls);

  group.add(new THREE.HemisphereLight(0x8a6cff, 0x1a0710, 0.35));
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(-S * 0.8, S * 2, S * 1.2);
  group.add(key);
  const glow = new THREE.PointLight(0xff7a1a, 0, S * 3, 1.6);
  group.add(glow);

  const R = H * 1.06;                                          // the grid spans a little more than the cube
  const mc = new MarchingCubes(RES, new THREE.MeshPhysicalMaterial({
    color: 0xff8a1c, emissive: 0xff4a00, emissiveIntensity: 0.45, roughness: 0.1, metalness: 0,
    clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 2.5 }), false, false, 400000);
  mc.isolation = 0;
  mc.scale.setScalar(R);
  group.add(mc);

  // splash droplets: launched from the impact point, ballistic, merging back into the pool
  const drops = Array.from({ length: 18 }, (_, i) => {
    const a = i / 18 * Math.PI * 2 + rnd() * 0.3, sp = S * (0.35 + rnd() * 0.45);
    return { vx: Math.cos(a) * sp, vz: Math.sin(a) * sp, vy: S * (1.1 + rnd() * 0.9), r: S * (0.035 + rnd() * 0.035) };
  });
  const drips = [0, 1, 2].map(i => ({ x: Math.cos(i * 2.1 + 0.4) * S * 0.12, z: Math.sin(i * 2.1 + 0.4) * S * 0.12, at: T_UP + 0.8 + i * 0.5 }));

  return { S, s, H, m, mc, R, glow, drops, drips };
}

export function update(d, t) {
  const { S, s, H, m, mc, R, glow, drops, drips } = d;
  const B0 = -H + 0.62 * H, T0 = -B0;                       // rest levels of the bottom and the hanging pool

  // ---- the shapes of this moment ----
  const tremble = smooth(T_TREMBLE, T_LIFT, t) * (1 - smooth(T_LIFT, T_LIFT + 0.6, t));
  const hit = t - T_HIT, ring = hit > 0 ? Math.exp(-hit * 1.3) * (1 - smooth(LOOP - 1, LOOP, t)) : 0;
  let levelB;
  if (t < T_LIFT) levelB = B0;
  else if (t < T_HIT) levelB = THREE.MathUtils.lerp(B0, -H * 1.2, smooth(T_LIFT + 0.3, T_UP - 0.3, t));
  else levelB = THREE.MathUtils.lerp(-H * 0.75, B0, smooth(0, 0.35, hit));
  let levelT;
  if (t < T_LIFT + 0.6) levelT = H * 1.3;
  else if (t < T_LET_GO) levelT = THREE.MathUtils.lerp(H * 1.3, T0, smooth(T_LIFT + 0.6, T_UP + 0.4, t));
  else levelT = THREE.MathUtils.lerp(T0, H * 1.3, smooth(T_LET_GO, T_LET_GO + 0.3, t));

  // column: its top shoots up, then its foot leaves the floor; it necks in the middle as it thins out
  const colOn = t > T_LIFT && t < T_UP + 0.9;
  const y1 = THREE.MathUtils.lerp(B0 - S * 0.1, T0 + S * 0.15, smooth(T_LIFT, T_LIFT + 1.4, t));
  const y0 = THREE.MathUtils.lerp(-H, T0 + S * 0.1, smooth(T_LIFT + 1.2, T_UP + 0.8, t));
  const colR = S * 0.17 * smooth(T_LIFT, T_LIFT + 0.4, t) * (1 - smooth(T_UP, T_UP + 0.9, t) * 0.9);

  // the falling mass: gathers under the top pool, falls with acceleration, stretched by its speed
  const fallK = (t - T_LET_GO) / (T_HIT - T_LET_GO);
  const blobOn = t > T_LET_GO && t < T_HIT + 0.4;
  const blobY = THREE.MathUtils.lerp(T0 - S * 0.05, B0 + S * 0.05, THREE.MathUtils.clamp(fallK, 0, 1) ** 2);
  const blobR = S * 0.3 * smooth(T_LET_GO, T_LET_GO + 0.3, t) * (1 - smooth(T_HIT, T_HIT + 0.35, t));
  const stretch = 1 + 0.7 * THREE.MathUtils.clamp(fallK, 0, 1);

  const live = [];
  if (hit > 0 && hit < 1.8) for (const p of drops) {
    const y = B0 + p.vy * hit - 0.5 * 9.0 * S * hit * hit;   // falls back under its own "gravity"
    const r = p.r * (1 - smooth(1.2, 1.8, hit));
    if (r > 1e-4) live.push([p.vx * hit * 0.6, y, p.vz * hit * 0.6, r]);
  }
  for (const p of drips) {
    const g = smooth(p.at, p.at + 1.2, t) * (1 - smooth(T_LET_GO, T_LET_GO + 0.2, t));
    if (g > 0) live.push([p.x, T0 - S * 0.03 - g * S * 0.09, p.z, S * 0.055 * g]);
  }

  const k = S * 0.09, wave = S * (0.012 + 0.03 * tremble);
  const surfB = (x, z) => levelB
    + wave * (Math.sin(x / S * 9 + 7 * W * t) + Math.sin(z / S * 11 - 9 * W * t))
    + S * 0.08 * tremble * Math.exp(-(x * x + z * z) / (S * S * 0.03))                 // the surface bulges up before the lift
    + S * 0.07 * ring * Math.sin(Math.hypot(x, z) / S * 22 - hit * 14) * Math.exp(-Math.hypot(x, z) / S * 1.5);
  const surfT = (x, z) => levelT + S * 0.012 * (Math.sin(x / S * 8 - 6 * W * t) + Math.sin(z / S * 10 + 8 * W * t));

  // ---- signed distance (negative inside the liquid) sampled on the grid ----
  mc.reset();
  const N = RES, half = N / 2, f = mc.field, cell = 2 * R / N;
  for (let iz = 0; iz < N; iz++) {
    const z = (iz - half) / half * R;
    for (let iy = 0; iy < N; iy++) {
      const y = (iy - half) / half * R;
      for (let ix = 0; ix < N; ix++) {
        const x = (ix - half) / half * R;
        const lx = m[0] * x + m[4] * y + m[8] * z, ly = m[1] * x + m[5] * y + m[9] * z, lz = m[2] * x + m[6] * y + m[10] * z;
        const box = Math.max(Math.abs(lx), Math.abs(ly), Math.abs(lz)) - s * 0.985;
        let dl = y - surfB(x, z);
        dl = smin(dl, surfT(x, z) - y, k);
        if (colOn && colR > 1e-4) {
          const cy = THREE.MathUtils.clamp(y, y0, y1), mid = (y - (y0 + y1) / 2) / Math.max(y1 - y0, 1e-3);
          dl = smin(dl, Math.hypot(x, y - cy, z) - colR * (1 - 0.35 * Math.cos(mid * Math.PI) ** 2), k);
        }
        if (blobOn && blobR > 1e-4) dl = smin(dl, (Math.hypot(x, (y - blobY) / stretch, z) - blobR) * Math.min(1, stretch ** -0.5), k);
        for (const [px, py, pz, pr] of live) dl = smin(dl, Math.hypot(x - px, y - py, z - pz) - pr, k * 0.6);
        f[iz * N * N + iy * N + ix] = -Math.max(dl, box) / cell;
      }
    }
  }
  mc.update();

  // the glow follows the mass
  const gy = t < T_LIFT ? B0 - S * 0.2 : t < T_LET_GO ? THREE.MathUtils.lerp(B0, T0, smooth(T_LIFT, T_UP, t)) : t < T_HIT ? blobY : B0 - S * 0.2;
  glow.position.set(0, gy, 0);
  glow.intensity = S * S * (3 + 5 * ring + 2 * tremble);
}
