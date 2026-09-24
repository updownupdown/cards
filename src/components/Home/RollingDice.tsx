import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useViewportDimensions } from "@/hooks/useViewportDimensions";
import { useEffect } from "react";
import { Platform } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import Svg, {
  Defs,
  Ellipse,
  Path,
  RadialGradient,
  Stop,
} from "react-native-svg";
import {
  DIE_CORE_HALF,
  DIE_EDGE_RADIUS,
  FRAME_RATE,
  FRAME_STRIDE,
  throwDice,
  type DiceThrow,
} from "./dice-physics";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

/** How long the dice sit still, showing their numbers, before fading. */
const RESTING_HOLD = 700;
/** How far above the bottom of the search box the dice land, in spacing units. */
const FLOOR_LIFT = 45;
const FADE_OUT = 350;

// Camera looking down onto the floor, from CAMERA_DISTANCE die units away.
const CAMERA_PITCH = (46 * Math.PI) / 180;
const COS_PITCH = Math.cos(CAMERA_PITCH);
const SIN_PITCH = Math.sin(CAMERA_PITCH);
const CAMERA_DISTANCE = 10;

// Light from the upper left, slightly in front.
const LIGHT = (() => {
  const l = [-0.4, 0.85, 0.55];
  const len = Math.hypot(l[0], l[1], l[2]);
  return l.map((c) => c / len);
})();
const IVORY = "rgb(252,249,242)";
const SHADOW_TINT = "rgb(24,20,18)";
const PIP_COLOR = "rgb(28,27,32)";

const PIP_OFFSET = 0.215;
const PIP_RADIUS = 0.078;
/** Rounding of the flat face's corners, so they blend into the edges. */
const FACE_CORNER = 0.09;
const KAPPA = 0.5523;

// Tangent axes (u, v) for each face in dice-physics' DIE_AXES order, chosen
// so u x v points out of the face.
const FACE_FRAMES: { n: number[]; u: number[]; v: number[] }[] = [
  { n: [1, 0, 0], u: [0, 1, 0], v: [0, 0, 1] },
  { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0] },
  { n: [0, 1, 0], u: [0, 0, 1], v: [1, 0, 0] },
  { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1] },
  { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] },
  { n: [0, 0, -1], u: [0, 1, 0], v: [1, 0, 0] },
];

// 3x3 grid slot indices used by each face value.
//   0 1 2
//   3 4 5
//   6 7 8
const PIP_PATTERNS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};
const PIP_POSITIONS: Record<number, number[][]> = Object.fromEntries(
  Object.entries(PIP_PATTERNS).map(([value, slots]) => [
    value,
    slots.map((slot) => [
      ((slot % 3) - 1) * PIP_OFFSET,
      (Math.floor(slot / 3) - 1) * PIP_OFFSET,
    ]),
  ]),
);

const CORE_CORNERS: number[][] = [];
for (const x of [-1, 1])
  for (const y of [-1, 1])
    for (const z of [-1, 1])
      CORE_CORNERS.push([
        x * DIE_CORE_HALF,
        y * DIE_CORE_HALF,
        z * DIE_CORE_HALF,
      ]);

const EMPTY_PATH = "M0 0";

type Viewport = { centreX: number; floorY: number; unit: number };

type DieShape = {
  hull: string;
  /** Opacity of the shadow layer over the rounded edges and each face. */
  hullShade: number;
  edgeWidth: number;
  faces: string[];
  faceShades: number[];
  pips: string;
  shadowX: number;
  shadowY: number;
  shadowRx: number;
  shadowRy: number;
  shadowOpacity: number;
};

const r1 = (n: number) => {
  "worklet";
  return Math.round(n * 10) / 10;
};

/** Projects a world point to the screen. */
function project(view: Viewport, x: number, y: number, z: number) {
  "worklet";
  const up = y * COS_PITCH - z * SIN_PITCH;
  const depth = y * SIN_PITCH + z * COS_PITCH;
  const scale = (view.unit * CAMERA_DISTANCE) / (CAMERA_DISTANCE - depth);
  return [view.centreX + x * scale, view.floorY - up * scale];
}

/**
 * Shading is a dark layer over the ivory, as web SVG doesn't take animated
 * colours.
 */
function shade(brightness: number) {
  "worklet";
  return Math.max(0, Math.min(1, 1 - brightness));
}

function computeDieShape(
  frames: number[],
  faceValues: number[],
  frame: number,
  view: Viewport,
): DieShape {
  "worklet";
  const count = frames.length / FRAME_STRIDE;
  const i0 = Math.max(0, Math.min(count - 1, Math.floor(frame)));
  const i1 = Math.min(count - 1, i0 + 1);
  const t = Math.max(0, Math.min(1, frame - i0));
  const a = i0 * FRAME_STRIDE;
  const b = i1 * FRAME_STRIDE;
  const px = frames[a] + (frames[b] - frames[a]) * t;
  const py = frames[a + 1] + (frames[b + 1] - frames[a + 1]) * t;
  const pz = frames[a + 2] + (frames[b + 2] - frames[a + 2]) * t;
  // Normalised lerp between the two sampled orientations.
  const sign =
    frames[a + 3] * frames[b + 3] +
      frames[a + 4] * frames[b + 4] +
      frames[a + 5] * frames[b + 5] +
      frames[a + 6] * frames[b + 6] <
    0
      ? -1
      : 1;
  let qw = frames[a + 3] + (sign * frames[b + 3] - frames[a + 3]) * t;
  let qx = frames[a + 4] + (sign * frames[b + 4] - frames[a + 4]) * t;
  let qy = frames[a + 5] + (sign * frames[b + 5] - frames[a + 5]) * t;
  let qz = frames[a + 6] + (sign * frames[b + 6] - frames[a + 6]) * t;
  const len = Math.hypot(qw, qx, qy, qz) || 1;
  qw /= len;
  qx /= len;
  qy /= len;
  qz /= len;

  // Rotation matrix, row major.
  const m00 = 1 - 2 * (qy * qy + qz * qz);
  const m01 = 2 * (qx * qy - qz * qw);
  const m02 = 2 * (qx * qz + qy * qw);
  const m10 = 2 * (qx * qy + qz * qw);
  const m11 = 1 - 2 * (qx * qx + qz * qz);
  const m12 = 2 * (qy * qz - qx * qw);
  const m20 = 2 * (qx * qz - qy * qw);
  const m21 = 2 * (qy * qz + qx * qw);
  const m22 = 1 - 2 * (qx * qx + qy * qy);
  const rotate = (v: number[]) => [
    m00 * v[0] + m01 * v[1] + m02 * v[2],
    m10 * v[0] + m11 * v[1] + m12 * v[2],
    m20 * v[0] + m21 * v[1] + m22 * v[2],
  ];

  // Silhouette: the hull of the inner cube, stroked with round joins to
  // the edge radius, is exactly the outline of the rounded cube.
  const points = CORE_CORNERS.map((corner) => {
    const c = rotate(corner);
    return project(view, px + c[0], py + c[1], pz + c[2]);
  }).sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  const turn = (o: number[], p: number[], q: number[]) =>
    (p[0] - o[0]) * (q[1] - o[1]) - (p[1] - o[1]) * (q[0] - o[0]);
  const lower: number[][] = [];
  for (const p of points) {
    while (
      lower.length >= 2 &&
      turn(lower[lower.length - 2], lower[lower.length - 1], p) <= 0
    )
      lower.pop();
    lower.push(p);
  }
  const upper: number[][] = [];
  for (let i = points.length - 1; i >= 0; i--) {
    const p = points[i];
    while (
      upper.length >= 2 &&
      turn(upper[upper.length - 2], upper[upper.length - 1], p) <= 0
    )
      upper.pop();
    upper.push(p);
  }
  const hullPoints = lower.slice(0, -1).concat(upper.slice(0, -1));
  let hull = "";
  hullPoints.forEach((p, index) => {
    hull += `${index === 0 ? "M" : "L"}${r1(p[0])} ${r1(p[1])}`;
  });
  hull += "Z";

  const centreDepth = py * SIN_PITCH + pz * COS_PITCH;
  const scale = (view.unit * CAMERA_DISTANCE) / (CAMERA_DISTANCE - centreDepth);

  const faces: string[] = [];
  const faceShades: number[] = [];
  let pips = "";
  let litTotal = 0;
  let litCount = 0;
  for (let f = 0; f < 6; f++) {
    const frameAxes = FACE_FRAMES[f];
    const n = rotate(frameAxes.n);
    const facing = n[1] * SIN_PITCH + n[2] * COS_PITCH;
    if (facing <= 0.01) {
      faces.push(EMPTY_PATH);
      faceShades.push(0);
      continue;
    }
    const u = rotate(frameAxes.u);
    const v = rotate(frameAxes.v);
    const cx = px + n[0] * 0.5;
    const cy = py + n[1] * 0.5;
    const cz = pz + n[2] * 0.5;
    const at = (lu: number, lv: number) => {
      const p = project(
        view,
        cx + u[0] * lu + v[0] * lv,
        cy + u[1] * lu + v[1] * lv,
        cz + u[2] * lu + v[2] * lv,
      );
      return `${r1(p[0])} ${r1(p[1])}`;
    };

    // Rounded square on the flat part of the face; the silhouette behind
    // shows through as the rounded edges. Each corner is drawn by turning
    // the first one.
    const h = DIE_CORE_HALF;
    const rc = FACE_CORNER;
    const k = rc * (1 - KAPPA);
    const turned = (k4: number, x: number, y: number) =>
      k4 === 0
        ? at(x, y)
        : k4 === 1
          ? at(-y, x)
          : k4 === 2
            ? at(-x, -y)
            : at(y, -x);
    let face = `M${turned(0, -h + rc, -h)}`;
    for (let c = 0; c < 4; c++) {
      face += `L${turned(c, h - rc, -h)}C${turned(c, h - k, -h)} ${turned(
        c,
        h,
        -h + k,
      )} ${turned(c, h, -h + rc)}`;
    }
    faces.push(face + "Z");

    // Lambert shading with a little specular sheen towards the light.
    const lit = Math.max(
      0,
      n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2],
    );
    const brightness = 0.7 + 0.3 * lit + 0.08 * Math.pow(lit, 12);
    faceShades.push(shade(brightness));
    litTotal += brightness * facing;
    litCount += facing;

    // Pips: circles as four cubic arcs, which stay exact under projection
    // to within a pixel at this size.
    const kr = PIP_RADIUS * KAPPA;
    const pr = PIP_RADIUS;
    for (const [pu, pv] of PIP_POSITIONS[faceValues[f]] ?? []) {
      pips += `M${at(pu + pr, pv)}C${at(pu + pr, pv + kr)} ${at(
        pu + kr,
        pv + pr,
      )} ${at(pu, pv + pr)}C${at(pu - kr, pv + pr)} ${at(
        pu - pr,
        pv + kr,
      )} ${at(pu - pr, pv)}C${at(pu - pr, pv - kr)} ${at(
        pu - kr,
        pv - pr,
      )} ${at(pu, pv - pr)}C${at(pu + kr, pv - pr)} ${at(
        pu + pr,
        pv - kr,
      )} ${at(pu + pr, pv)}Z`;
    }
  }

  // Soft contact shadow on the floor, spreading and fading as the die rises.
  const lift = Math.max(0, py - 0.5);
  const shadowCentre = project(view, px + lift * 0.25, 0, pz - lift * 0.1);
  const shadowRx = scale * (0.78 + lift * 0.12);

  return {
    hull,
    hullShade: shade(litCount > 0 ? litTotal / litCount : 0.8),
    edgeWidth: DIE_EDGE_RADIUS * 2 * scale,
    faces,
    faceShades,
    pips: pips || EMPTY_PATH,
    shadowX: shadowCentre[0],
    shadowY: shadowCentre[1],
    shadowRx,
    shadowRy: shadowRx * SIN_PITCH * 1.05,
    shadowOpacity: 0.55 / (1 + lift * 0.7),
  };
}

type DieProps = { shape: SharedValue<DieShape | null> };

function DieFace({ shape, index }: DieProps & { index: number }) {
  const faceProps = useAnimatedProps(() => ({
    d: shape.value?.faces[index] ?? EMPTY_PATH,
  }));
  const shadeProps = useAnimatedProps(() => ({
    d: shape.value?.faces[index] ?? EMPTY_PATH,
    opacity: shape.value?.faceShades[index] ?? 0,
  }));
  return (
    <>
      <AnimatedPath animatedProps={faceProps} fill={IVORY} />
      <AnimatedPath animatedProps={shadeProps} fill={SHADOW_TINT} />
    </>
  );
}

function DieShadow({ shape }: DieProps) {
  const props = useAnimatedProps(() => {
    const s = shape.value;
    return {
      cx: s?.shadowX ?? -100,
      cy: s?.shadowY ?? -100,
      rx: s?.shadowRx ?? 0,
      ry: s?.shadowRy ?? 0,
      opacity: s?.shadowOpacity ?? 0,
    };
  });
  return <AnimatedEllipse animatedProps={props} fill="url(#diceShadow)" />;
}

function Die({ shape }: DieProps) {
  const hullProps = useAnimatedProps(() => ({
    d: shape.value?.hull ?? EMPTY_PATH,
    strokeWidth: shape.value?.edgeWidth ?? 0,
  }));
  const hullShadeProps = useAnimatedProps(() => ({
    d: shape.value?.hull ?? EMPTY_PATH,
    strokeWidth: shape.value?.edgeWidth ?? 0,
    opacity: shape.value?.hullShade ?? 0,
  }));
  const pipProps = useAnimatedProps(() => ({
    d: shape.value?.pips ?? EMPTY_PATH,
  }));

  return (
    <>
      <AnimatedPath
        animatedProps={hullProps}
        fill={IVORY}
        stroke={IVORY}
        strokeLinejoin="round"
      />
      <AnimatedPath
        animatedProps={hullShadeProps}
        fill={SHADOW_TINT}
        stroke={SHADOW_TINT}
        strokeLinejoin="round"
      />
      {FACE_FRAMES.map((_, index) => (
        <DieFace key={index} shape={shape} index={index} />
      ))}
      <AnimatedPath animatedProps={pipProps} fill={PIP_COLOR} />
    </>
  );
}

function useDieShape(
  roll: SharedValue<DiceThrow | null>,
  frame: SharedValue<number>,
  view: SharedValue<Viewport>,
  index: number,
) {
  return useDerivedValue(() => {
    const current = roll.value;
    if (!current) return null;
    return computeDieShape(
      current.frames[index],
      current.faceValues[index],
      frame.value,
      view.value,
    );
  });
}

type RollingDiceProps = {
  /** Change this to throw the dice again. */
  rollKey: number;
  /** Distance of the floor the dice land on from the bottom of the screen. */
  floorBottom: number;
  /** Called once the dice have come to rest and shown their numbers. */
  onSettled: () => void;
};

/**
 * Full-screen overlay that throws two dice in from the side of the screen
 * onto a floor near the bottom.
 */
export function RollingDice({
  rollKey,
  floorBottom,
  onSettled,
}: RollingDiceProps) {
  const { spacing } = useResponsiveMetrics();
  const { width, height } = useViewportDimensions();
  const unit = spacing(58);
  const floorY = height - floorBottom - spacing(FLOOR_LIFT);

  const roll = useSharedValue<DiceThrow | null>(null);
  const frame = useSharedValue(0);
  const opacity = useSharedValue(1);
  const view = useSharedValue<Viewport>({ centreX: 0, floorY: 0, unit });
  const backDie = useDieShape(roll, frame, view, 0);
  const frontDie = useDieShape(roll, frame, view, 1);

  useEffect(() => {
    // The resting dice sit with their near edges on the floor line.
    view.value = {
      centreX: width / 2,
      floorY: floorY - unit * 0.75,
      unit,
    };
  }, [floorY, unit, view, width]);

  useEffect(() => {
    if (width === 0) return;
    const dice = throwDice({
      halfWidth: width / 2 / unit,
      height: floorY / unit,
    });
    const duration = ((dice.frameCount - 1) / FRAME_RATE) * 1000;
    roll.value = dice;
    frame.value = 0;
    frame.value = withTiming(dice.frameCount - 1, {
      duration,
      easing: Easing.linear,
    });
    opacity.value = 1;
    opacity.value = withDelay(
      duration + RESTING_HOLD,
      withTiming(0, { duration: FADE_OUT }),
    );
    const settledTimeout = setTimeout(onSettled, duration + RESTING_HOLD);
    return () => {
      clearTimeout(settledTimeout);
      cancelAnimation(frame);
      cancelAnimation(opacity);
    };
    // Only a new roll (or first measurement) should rethrow the dice.
  }, [rollKey, width === 0]);

  const containerStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        {
          position: Platform.OS === "web" ? ("fixed" as any) : "absolute",
          left: 0,
          top: 0,
          width,
          height,
          zIndex: 7,
          pointerEvents: "none",
        },
        containerStyle,
      ]}
    >
      <Svg width={width} height={height}>
        <Defs>
          <RadialGradient id="diceShadow" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#000" stopOpacity={0.9} />
            <Stop offset="0.55" stopColor="#000" stopOpacity={0.45} />
            <Stop offset="1" stopColor="#000" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <DieShadow shape={backDie} />
        <DieShadow shape={frontDie} />
        <Die shape={backDie} />
        <Die shape={frontDie} />
      </Svg>
    </Animated.View>
  );
}
