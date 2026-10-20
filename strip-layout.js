// How the cube's controller lays the six faces out in the 3840×640 video: which face goes into which 640×640
// slot, and how its picture is turned/mirrored inside the slot. Faces are named in cube-local axes:
//   0 перед · 1 право · 2 зад · 3 лево · 4 верх · 5 низ
// A face's picture is "upright" when its w axis (see faceDefs in index.html) points up in the slot.
//
// The real controller mapping is not known yet: play the test pattern (tools/pattern.mjs or the "Таблица граней"
// button) on the real cube, photograph it, and set order/rot/flip so the emulator shows the same thing.
export const STRIP = {
  order: [0, 1, 2, 3, 4, 5],                      // face index in strip slot 0, 1, … left to right
  rot: [0, 0, 0, 0, 0, 0],                        // per face: quarter turns counter-clockwise inside its slot
  flip: [false, false, false, false, false, false], // per face: mirrored left↔right (applied before the turn)
};

export const slotOf = face => STRIP.order.indexOf(face);

// face picture coords (u right, v up; 0..1) → coords inside the face's slot (a right, b up; 0..1)
export function faceToSlot(face, u, v) {
  let a = STRIP.flip[face] ? 1 - u : u, b = v;
  for (let k = 0; k < STRIP.rot[face]; k++) [a, b] = [1 - b, a];
  return [a, b];
}
