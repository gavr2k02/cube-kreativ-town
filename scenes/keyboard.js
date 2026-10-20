// "Клавиатура-коворкинг" (draft): a grey keyboard inside the cube, one big key lifted like a lid; under it a tiny
// coworking corner where a guy in a white T-shirt with a bright print and bright red headphones types on a laptop,
// turns round, waves to the people in the park and turns back. Built from primitives on purpose — a placeholder
// until the final video is generated with an AI video tool.
//
// Pure function of time t ∈ [0, LOOP), so frames can be rendered in any order.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const LOOP = 30;
export const WALL = 0xe9e9ec;
// timeline: type → turn to the viewers → wave → turn back → type
const T_TURN = 9, T_WAVE = 10.5, T_WAVE_END = 15.5, T_BACK = 17;

const smooth = (a, b, x) => { const k = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };

function printTexture() {
  // a bright graphic print for the T-shirt
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 256);
  const cols = ['#ff3b6b', '#ffcc00', '#2bd4ff', '#7c4dff', '#00d084'];
  for (let i = 0; i < 9; i++) {
    g.fillStyle = cols[i % cols.length];
    g.beginPath(); g.arc(70 + (i % 3) * 58, 80 + Math.floor(i / 3) * 48, 22 - (i % 2) * 6, 0, Math.PI * 2); g.fill();
  }
  g.strokeStyle = '#111'; g.lineWidth = 6; g.strokeRect(48, 52, 160, 150);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function screenTexture() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 80;
  const g = c.getContext('2d');
  g.fillStyle = '#1d2b44'; g.fillRect(0, 0, 128, 80);
  for (let i = 0; i < 7; i++) { g.fillStyle = ['#7fd1ff', '#ffd166', '#c3a6ff'][i % 3]; g.fillRect(10, 10 + i * 9, 30 + (i * 37) % 70, 4); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ctx: { S, quat, viewpoints (relative to the cube centre; the first is the main one) }
export function build(group, ctx) {
  const S = ctx.S, u = S * 0.2;                // u — one key unit
  group.add(new THREE.HemisphereLight(0xffffff, 0xb9bcc4, 1.5));
  const key = new THREE.DirectionalLight(0xffffff, 2);
  key.position.set(S, S * 2, S); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0008;
  Object.assign(key.shadow.camera, { left: -S, right: S, top: S, bottom: -S, near: 0.1, far: S * 5 });
  group.add(key);

  // the keyboard plane faces the main viewer from above, like the reference shot (seen from above at an angle)
  const toEye = ctx.viewpoints[0].clone().normalize();
  const normal = toEye.clone().setY(0).normalize().multiplyScalar(0.7).add(new THREE.Vector3(0, 1, 0)).normalize();
  const board = new THREE.Group();
  board.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
  // a turn about the board normal so that the rows run across the viewer's line of sight
  const across = Math.atan2(toEye.x, toEye.z);
  board.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), across));
  board.position.copy(normal).multiplyScalar(-S * 0.18);
  group.add(board);

  // keys (board-local: x along the rows, y up out of the board, +z towards the viewer)
  const keyGeo = new RoundedBoxGeometry(u * 0.9, u * 0.55, u * 0.9, 4, u * 0.12);
  const keyMat = new THREE.MeshStandardMaterial({ color: 0x8d9097, roughness: 0.55 });
  const deck = new THREE.Mesh(new RoundedBoxGeometry(u * 10, u * 0.4, u * 8, 4, u * 0.2), new THREE.MeshStandardMaterial({ color: 0x5f636b, roughness: 0.7 }));
  deck.position.y = -u * 0.3; deck.receiveShadow = true;
  board.add(deck);
  const keys = [];
  for (let r = -3; r <= 3; r++) for (let c = -4; c <= 4; c++) {
    if (r >= -1 && r <= 0 && c >= -1 && c <= 0) continue;   // the 2×2 slot under the lifted big key
    keys.push(new THREE.Vector3((c + 0.5) * u + (r % 2) * u * 0.25, u * 0.2, (r + 0.5) * u));
  }
  const keyMesh = new THREE.InstancedMesh(keyGeo, keyMat, keys.length);
  keys.forEach((p, i) => keyMesh.setMatrixAt(i, new THREE.Matrix4().makeTranslation(p.x, p.y, p.z)));
  keyMesh.castShadow = keyMesh.receiveShadow = true;
  board.add(keyMesh);

  // the lifted big key: hinged at its back edge, tipped open
  const lid = new THREE.Group();
  lid.position.set(0, u * 0.25, -u);
  const lidKey = new THREE.Mesh(new RoundedBoxGeometry(u * 1.9, u * 0.6, u * 1.9, 4, u * 0.15), keyMat);
  lidKey.position.set(0, u * 0.3, u * 0.95); lidKey.castShadow = true;
  lid.add(lidKey);
  lid.rotation.x = -0.75;
  lid.position.y += u * 1.5;
  board.add(lid);

  // the coworking corner in the slot (white walls, shelf, picture, desk, laptop, chair)
  const white = new THREE.MeshStandardMaterial({ color: 0xf3efe8, roughness: 0.9 });
  const wood = new THREE.MeshStandardMaterial({ color: 0xd9b07a, roughness: 0.7 });
  const room = new THREE.Group(); room.position.set(0, -u * 0.1, 0);
  const back = new THREE.Mesh(new THREE.BoxGeometry(u * 1.9, u * 2.1, u * 0.06), white); back.position.set(0, u * 1.05, -u * 0.95);
  const side = new THREE.Mesh(new THREE.BoxGeometry(u * 0.06, u * 2.1, u * 1.9), white); side.position.set(-u * 0.95, u * 1.05, 0);
  const floor = new THREE.Mesh(new THREE.BoxGeometry(u * 1.9, u * 0.04, u * 1.9), new THREE.MeshStandardMaterial({ color: 0xcfc6b8 }));
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(u * 0.6, u * 0.04, u * 0.18), wood); shelf.position.set(-u * 0.5, u * 1.5, -u * 0.85);
  const pic = new THREE.Mesh(new THREE.BoxGeometry(u * 0.5, u * 0.6, u * 0.02), new THREE.MeshStandardMaterial({ color: 0xffffff })); pic.position.set(u * 0.35, u * 1.45, -u * 0.91);
  const desk = new THREE.Mesh(new THREE.BoxGeometry(u * 1.2, u * 0.06, u * 0.6), wood); desk.position.set(u * 0.1, u * 0.62, -u * 0.55);
  const leg = new THREE.BoxGeometry(u * 0.05, u * 0.6, u * 0.05);
  for (const [x, z] of [[-0.45, -0.8], [0.65, -0.8], [-0.45, -0.3], [0.65, -0.3]]) { const l = new THREE.Mesh(leg, wood); l.position.set(u * x, u * 0.3, u * z); room.add(l); }
  const laptopBase = new THREE.Mesh(new THREE.BoxGeometry(u * 0.42, u * 0.02, u * 0.3), new THREE.MeshStandardMaterial({ color: 0xb8bcc4, metalness: 0.5, roughness: 0.4 }));
  laptopBase.position.set(u * 0.1, u * 0.66, -u * 0.5);
  const laptopLid = new THREE.Mesh(new THREE.BoxGeometry(u * 0.42, u * 0.3, u * 0.015), [0, 0, 0, 0, 1, 0].map(k => k ? new THREE.MeshBasicMaterial({ map: screenTexture() }) : laptopBase.material));
  laptopLid.position.set(u * 0.1, u * 0.8, -u * 0.68); laptopLid.rotation.x = -0.25;
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(u * 0.2, u * 0.2, u * 0.05, 20), wood); seat.position.set(u * 0.1, u * 0.4, -u * 0.05);
  const stool = new THREE.Mesh(new THREE.CylinderGeometry(u * 0.03, u * 0.05, u * 0.4, 8), wood); stool.position.set(u * 0.1, u * 0.2, -u * 0.05);
  for (const m of [back, side, floor, shelf, pic, desk, laptopBase, laptopLid, seat, stool]) { m.castShadow = m.receiveShadow = true; room.add(m); }
  for (const [x, h, col] of [[-0.7, 0.25, 0x3d7dd8], [-0.6, 0.32, 0xf2c14e], [-0.5, 0.2, 0xe86a5f]]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(u * 0.06, u * h, u * 0.12), new THREE.MeshStandardMaterial({ color: col })); b.position.set(u * x, u * (1.52 + h / 2), -u * 0.85); room.add(b);
  }
  board.add(room);

  // the guy, sitting on the stool facing the laptop (−z); pivot at the hips so he can turn round
  const skin = new THREE.MeshStandardMaterial({ color: 0xf1c6a5, roughness: 0.8 });
  const shirt = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
  const printMat = new THREE.MeshStandardMaterial({ map: printTexture(), roughness: 0.9 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2d2f36, roughness: 0.9 });
  const red = new THREE.MeshStandardMaterial({ color: 0xff1a1a, roughness: 0.35 });
  const guy = new THREE.Group(); guy.position.set(u * 0.1, u * 0.43, -u * 0.05);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(u * 0.16, u * 0.32, 6, 16), shirt); torso.position.y = u * 0.33;
  // the print sits on the chest (towards −z, i.e. the laptop, until he turns round to the viewers)
  const print = new THREE.Mesh(new THREE.PlaneGeometry(u * 0.22, u * 0.22), printMat); print.position.set(0, u * 0.38, -u * 0.165); print.rotation.y = Math.PI;
  const head = new THREE.Group(); head.position.y = u * 0.78;
  const skull = new THREE.Mesh(new THREE.SphereGeometry(u * 0.15, 24, 16), skin);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(u * 0.155, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), dark); hair.rotation.x = 0.35;
  const band = new THREE.Mesh(new THREE.TorusGeometry(u * 0.17, u * 0.022, 8, 24, Math.PI), red); band.rotation.y = Math.PI / 2;
  const cupGeo = new THREE.CylinderGeometry(u * 0.06, u * 0.06, u * 0.05, 16);
  const cupL = new THREE.Mesh(cupGeo, red); cupL.rotation.z = Math.PI / 2; cupL.position.x = -u * 0.16;
  const cupR = cupL.clone(); cupR.position.x = u * 0.16;
  head.add(skull, hair, band, cupL, cupR);
  const legs = new THREE.Mesh(new THREE.BoxGeometry(u * 0.3, u * 0.12, u * 0.4), dark); legs.position.set(0, 0, -u * 0.15);
  const shin = new THREE.Mesh(new THREE.BoxGeometry(u * 0.3, u * 0.38, u * 0.1), dark); shin.position.set(0, -u * 0.2, -u * 0.33);
  // arms: shoulder pivots so they can type (reach forward) and wave (raise one arm)
  const arm = side => {
    const pivot = new THREE.Group(); pivot.position.set(side * u * 0.2, u * 0.55, 0);
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(u * 0.05, u * 0.24, 4, 8), shirt); upper.position.y = -u * 0.15;
    const hand = new THREE.Mesh(new THREE.SphereGeometry(u * 0.05, 12, 8), skin); hand.position.y = -u * 0.33;
    pivot.add(upper, hand);
    return pivot;
  };
  const armL = arm(-1), armR = arm(1);
  guy.add(torso, print, head, legs, shin, armL, armR);
  guy.traverse(o => { if (o.isMesh) o.castShadow = true; });
  room.add(guy);

  return { guy, head, armL, armR };
}

export function update(d, t) {
  const { guy, head, armL, armR } = d;
  // how far he has turned round to the viewers (0 → facing the laptop, 1 → facing out of the key)
  const turn = smooth(T_TURN, T_TURN + 1.3, t) * (1 - smooth(T_BACK - 1.3, T_BACK, t));
  guy.rotation.y = turn * Math.PI * 0.85;
  head.rotation.y = turn * 0.25;
  const waving = smooth(T_WAVE - 0.4, T_WAVE, t) * (1 - smooth(T_WAVE_END - 0.4, T_WAVE_END, t));
  const typing = 1 - turn;
  // typing: both arms reach forward with a quick alternating tap
  const tapL = Math.sin(t * 14) * 0.08 * typing, tapR = Math.sin(t * 14 + 1.7) * 0.08 * typing;
  armL.rotation.set(-1.25 * typing + tapL, 0, 0.1);
  // the right arm types, or rises above the head and waves side to side
  armR.rotation.set(-1.25 * typing + tapR - 2.6 * waving, 0, -0.1 - waving * (0.35 + Math.sin(t * 9) * 0.35));
  head.rotation.x = typing * 0.15 + Math.sin(t * 2) * 0.02;
}
