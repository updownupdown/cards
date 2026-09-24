// Rigid-body simulation of a pair of dice thrown onto a floor.
//
// World units are die edges (a die is 1 x 1 x 1). X runs right, Y up, Z
// towards the viewer, and the floor is the plane Y = 0. The dice are rounded
// cubes: a smaller cube of half-size DIE_CORE_HALF grown by DIE_EDGE_RADIUS.
//
// A throw is simulated up front and sampled at FRAME_RATE; the renderer then
// just plays the samples back on the UI thread.

export const FRAME_RATE = 60;
/** Numbers per sampled frame: position x, y, z then quaternion w, x, y, z. */
export const FRAME_STRIDE = 7;

export const DIE_EDGE_RADIUS = 0.1;
export const DIE_CORE_HALF = 0.5 - DIE_EDGE_RADIUS;

/**
 * Body axes of a die, in the order faces are indexed everywhere:
 * +X, -X, +Y, -Y, +Z, -Z.
 */
export const DIE_AXES: Vec3[] = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];
// A standard die: opposite faces add up to 7.
const STANDARD_VALUES = [2, 5, 1, 6, 3, 4];

const GRAVITY = 55;
const RESTITUTION = 0.38;
const FRICTION = 0.5;
const INERTIA = 1 / 6; // solid unit cube, unit mass
const SUBSTEPS = 6;
const DT = 1 / (FRAME_RATE * SUBSTEPS);
const MAX_SECONDS = 3.6;

type Vec3 = [number, number, number];
type Quat = [number, number, number, number];

export type DiceThrow = {
  /** Frames for every die, all the same length. */
  frames: number[][];
  /** Pip count for each of the six DIE_AXES faces, per die. */
  faceValues: number[][];
  frameCount: number;
};

type ThrowBounds = {
  /** Half the visible width, in die units. */
  halfWidth: number;
  /** Visible height above the floor, in die units. */
  height: number;
};

const rand = (min: number, max: number) => min + Math.random() * (max - min);

const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

function rotate(q: Quat, v: Vec3): Vec3 {
  const [w, x, y, z] = q;
  // v + 2w(q x v) + 2 q x (q x v)
  const tx = 2 * (y * v[2] - z * v[1]);
  const ty = 2 * (z * v[0] - x * v[2]);
  const tz = 2 * (x * v[1] - y * v[0]);
  return [
    v[0] + w * tx + (y * tz - z * ty),
    v[1] + w * ty + (z * tx - x * tz),
    v[2] + w * tz + (x * ty - y * tx),
  ];
}

function quatMul(a: Quat, b: Quat): Quat {
  return [
    a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
    a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
    a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1],
    a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0],
  ];
}

function normalizeQuat(q: Quat): Quat {
  const len = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
  return [q[0] / len, q[1] / len, q[2] / len, q[3] / len];
}

function axisAngleQuat(axis: Vec3, angle: number): Quat {
  const len = Math.hypot(axis[0], axis[1], axis[2]);
  if (len < 1e-9) return [1, 0, 0, 0];
  const s = Math.sin(angle / 2) / len;
  return [Math.cos(angle / 2), axis[0] * s, axis[1] * s, axis[2] * s];
}

function randomQuat(): Quat {
  // Uniformly distributed rotation (Shoemake).
  const u1 = Math.random();
  const u2 = Math.random() * Math.PI * 2;
  const u3 = Math.random() * Math.PI * 2;
  const a = Math.sqrt(1 - u1);
  const b = Math.sqrt(u1);
  return [
    b * Math.cos(u3),
    a * Math.sin(u2),
    a * Math.cos(u2),
    b * Math.sin(u3),
  ];
}

const CORE_CORNERS: Vec3[] = [];
for (const x of [-1, 1])
  for (const y of [-1, 1])
    for (const z of [-1, 1])
      CORE_CORNERS.push([
        x * DIE_CORE_HALF,
        y * DIE_CORE_HALF,
        z * DIE_CORE_HALF,
      ]);

type Simulation = {
  frames: number[];
  finalX: number;
  landingX: number;
};

function simulate(
  position: Vec3,
  velocity: Vec3,
  orientation: Quat,
  spin: Vec3,
): Simulation {
  const p: Vec3 = [...position];
  const v: Vec3 = [...velocity];
  const w: Vec3 = [...spin];
  let q: Quat = [...orientation];
  const homeZ = position[2];
  const frames: number[] = [];
  let landingX: number | null = null;
  let restingTime = 0;

  const maxFrames = Math.round(MAX_SECONDS * FRAME_RATE);
  for (let frame = 0; frame < maxFrames; frame++) {
    frames.push(p[0], p[1], p[2], q[0], q[1], q[2], q[3]);

    let touching = false;
    for (let step = 0; step < SUBSTEPS; step++) {
      v[1] -= GRAVITY * DT;
      for (let i = 0; i < 3; i++) p[i] += v[i] * DT;
      q = normalizeQuat(quatAdd(q, quatMul([0, w[0], w[1], w[2]], q), DT / 2));

      // Keep the dice in their own lanes so they never pass through each
      // other; they are drawn back to front.
      if (Math.abs(p[2] - homeZ) > 0.3 && v[2] * (p[2] - homeZ) > 0)
        v[2] *= -0.4;

      // Resolve floor contacts corner by corner.
      let lowest = 0;
      for (let iteration = 0; iteration < 4; iteration++) {
        for (const corner of CORE_CORNERS) {
          const offset = rotate(q, corner);
          const height = p[1] + offset[1] - DIE_EDGE_RADIUS;
          if (iteration === 0) lowest = Math.min(lowest, height);
          if (height > 0.003) continue;
          touching = true;
          const r: Vec3 = [offset[0], offset[1] - DIE_EDGE_RADIUS, offset[2]];
          let pointVelocity = addV(v, cross(w, r));
          const normalSpeed = pointVelocity[1];
          if (normalSpeed >= 0) continue;

          const bounce =
            iteration === 0 && normalSpeed < -1.5 ? RESTITUTION : 0;
          const rxn: Vec3 = [-r[2], 0, r[0]]; // r x (0, 1, 0)
          const normalImpulse =
            (-(1 + bounce) * normalSpeed) / (1 + dot(rxn, rxn) / INERTIA);
          v[1] += normalImpulse;
          for (let i = 0; i < 3; i++)
            w[i] += (rxn[i] * normalImpulse) / INERTIA;

          pointVelocity = addV(v, cross(w, r));
          const slide = Math.hypot(pointVelocity[0], pointVelocity[2]);
          if (slide < 1e-6) continue;
          const t: Vec3 = [
            -pointVelocity[0] / slide,
            0,
            -pointVelocity[2] / slide,
          ];
          const rxt = cross(r, t);
          const frictionImpulse = Math.min(
            slide / (1 + dot(rxt, rxt) / INERTIA),
            FRICTION * normalImpulse,
          );
          for (let i = 0; i < 3; i++) {
            v[i] += t[i] * frictionImpulse;
            w[i] += (rxt[i] * frictionImpulse) / INERTIA;
          }
        }
      }
      if (lowest < 0) p[1] -= lowest;

      if (touching) {
        // Rolling resistance of the rounded edges.
        const damping = Math.exp(-1.6 * DT);
        for (let i = 0; i < 3; i++) w[i] *= damping;
        v[0] *= Math.exp(-0.5 * DT);
        v[2] *= Math.exp(-0.5 * DT);
      }
    }

    if (touching && landingX === null) landingX = p[0];
    const speed = dot(v, v);
    const angular = dot(w, w);
    restingTime =
      touching && speed < 0.05 && angular < 0.3 ? restingTime + 1 : 0;
    if (restingTime > FRAME_RATE * 0.15) break;
  }

  return { frames, finalX: p[0], landingX: landingX ?? p[0] };
}

function quatAdd(a: Quat, b: Quat, scale: number): Quat {
  return [
    a[0] + b[0] * scale,
    a[1] + b[1] * scale,
    a[2] + b[2] * scale,
    a[3] + b[3] * scale,
  ];
}

function addV(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function frameQuat(frames: number[], index: number): Quat {
  const o = index * FRAME_STRIDE;
  return [frames[o + 3], frames[o + 4], frames[o + 5], frames[o + 6]];
}

/** Index into DIE_AXES of the face pointing most nearly up. */
function topAxis(q: Quat) {
  let best = 0;
  let bestY = -Infinity;
  DIE_AXES.forEach((axis, index) => {
    const y = rotate(q, axis)[1];
    if (y > bestY) {
      bestY = y;
      best = index;
    }
  });
  return best;
}

/**
 * Eases the die flat onto its nearest face over a few extra frames, so it
 * always comes to rest showing a clear number.
 */
function settleFlat(frames: number[]) {
  const last = frames.length / FRAME_STRIDE - 1;
  const q = frameQuat(frames, last);
  const up = rotate(q, DIE_AXES[topAxis(q)]);
  const angle = Math.acos(Math.min(1, up[1]));
  const axis = cross(up, [0, 1, 0]);
  const o = last * FRAME_STRIDE;
  const [x, y, z] = [frames[o], frames[o + 1], frames[o + 2]];
  const steps = Math.round(6 + angle * 24);
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const eased = t * t * (3 - 2 * t);
    const settled = normalizeQuat(
      quatMul(axisAngleQuat(axis, angle * eased), q),
    );
    frames.push(x, y + (0.5 - y) * eased, z, ...settled);
  }
  return topAxis(frameQuat(frames, last + steps));
}

// The 24 rotations of a cube, as signed permutation matrices.
const CUBE_ROTATIONS: number[][][] = (() => {
  const rotations: number[][][] = [];
  const permutations = [
    [0, 1, 2, 1],
    [0, 2, 1, -1],
    [1, 0, 2, -1],
    [1, 2, 0, 1],
    [2, 0, 1, 1],
    [2, 1, 0, -1],
  ];
  for (const [a, b, c, parity] of permutations)
    for (const sa of [-1, 1])
      for (const sb of [-1, 1])
        for (const sc of [-1, 1]) {
          if (parity * sa * sb * sc !== 1) continue;
          const m = [
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
          ];
          m[0][a] = sa;
          m[1][b] = sb;
          m[2][c] = sc;
          rotations.push(m);
        }
  return rotations;
})();

const applyMatrix = (m: number[][], v: Vec3): Vec3 => [
  m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
  m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
  m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
];
const axisIndex = (v: Vec3) => DIE_AXES.findIndex((axis) => dot(axis, v) > 0.5);

/**
 * Labels the faces of a standard die, turned so that `value` lands on the
 * face at `top`.
 */
function labelFaces(top: number, value: number) {
  const valueAxis = DIE_AXES[STANDARD_VALUES.indexOf(value)];
  const matching = CUBE_ROTATIONS.filter(
    (m) => axisIndex(applyMatrix(m, valueAxis)) === top,
  );
  const m = matching[Math.floor(Math.random() * matching.length)];
  // Face n shows the standard value of the axis that m carries onto n.
  const transpose = m[0].map((_, i) => m.map((row) => row[i]));
  return DIE_AXES.map(
    (axis) => STANDARD_VALUES[axisIndex(applyMatrix(transpose, axis))],
  );
}

/**
 * Finds a throw that comes in from off screen on the `dir` side, lands on
 * screen, and rolls to rest at `targetX`.
 */
function throwDie(
  dir: 1 | -1,
  targetX: number,
  z: number,
  bounds: ThrowBounds,
) {
  const startX = -dir * (bounds.halfWidth + 1.4);
  const reach = Math.max(1, bounds.halfWidth / 3.5);
  let best: { sim: Simulation; shift: number; penalty: number } | null = null;

  for (let attempt = 0; attempt < 30; attempt++) {
    const sim = simulate(
      [startX, rand(0.3, 0.55) * Math.max(5, bounds.height), z],
      [dir * rand(6.5, 10) * Math.sqrt(reach), rand(-1, 3), rand(-0.3, 0.3)],
      randomQuat(),
      [rand(-9, 9), rand(-9, 9), -dir * rand(5, 15)],
    );
    // The whole throw can slide sideways, as long as it still starts off
    // screen and first hits the floor on screen.
    const shift = targetX - sim.finalX;
    const offScreenBy = -dir * (startX + shift) - (bounds.halfWidth + 0.9);
    const landsOnScreenBy =
      dir * (sim.landingX + shift) + (bounds.halfWidth - 0.6);
    const penalty = Math.max(0, -offScreenBy) + Math.max(0, -landsOnScreenBy);
    if (!best || penalty < best.penalty) best = { sim, shift, penalty };
    if (penalty === 0) break;
  }

  const { sim, shift } = best!;
  const frames = sim.frames;
  for (let i = 0; i < frames.length; i += FRAME_STRIDE) frames[i] += shift;

  // Drop the frames spent flying towards the edge of the screen.
  let first = 0;
  while (
    first < frames.length / FRAME_STRIDE - 1 &&
    -dir * frames[(first + 1) * FRAME_STRIDE] > bounds.halfWidth + 1
  )
    first++;
  return frames.slice(first * FRAME_STRIDE);
}

/** Throws two dice, back one first, that come to rest side by side. */
export function throwDice(bounds: ThrowBounds): DiceThrow {
  const dir = Math.random() < 0.5 ? 1 : -1;
  const spread = rand(0.85, 1.2);
  const centre = rand(-0.35, 0.35);
  const lanes = Math.random() < 0.5 ? [-1, 1] : [1, -1];
  const depths = [-0.6, 0.6];

  const dice = depths.map((z, index) => {
    const frames = throwDie(dir, centre + lanes[index] * spread, z, bounds);
    const top = settleFlat(frames);
    const value = 1 + Math.floor(Math.random() * 6);
    // Stagger the dice slightly, as if thrown from one hand.
    const delay = Math.round(rand(0, 0.16) * FRAME_RATE);
    const waiting = frames.slice(0, FRAME_STRIDE);
    for (let i = 0; i < delay; i++) frames.unshift(...waiting);
    return { frames, faceValues: labelFaces(top, value) };
  });

  const frameCount = Math.max(
    ...dice.map(({ frames }) => frames.length / FRAME_STRIDE),
  );
  for (const { frames } of dice) {
    const resting = frames.slice(-FRAME_STRIDE);
    while (frames.length / FRAME_STRIDE < frameCount) frames.push(...resting);
  }

  return {
    frames: dice.map(({ frames }) => frames),
    faceValues: dice.map(({ faceValues }) => faceValues),
    frameCount,
  };
}
