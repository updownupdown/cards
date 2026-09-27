// Builds src/data/campaign-map.generated.ts and assets/images/galaxy-glow.webp
// (the arms' glow, with their dust baked in) and the node and flare sprites
// in assets/images/campaign/
// from the game catalog. See docs/campaign-map.md.
//
//   npm run campaign:generate
//     Keeps every existing node (position, links and rewards), so players'
//     progress and collected rewards stay put. New games are placed out
//     towards the rim, linked in and given unused quotes.
//
//   npm run campaign:generate -- --rebuild
//     Lays out a fresh spiral galaxy and fits the games to it: Klondike at
//     the centre, the rest outwards by progression score, no game the only
//     way to an easier one, categories varied near the centre, and
//     local-only games on the rim as dead ends. Deals every reward again.
//
//   npm run campaign:generate -- --rebalance-rewards
//     Keeps the layout and deals every reward again.
//
//   npm run campaign:lock
//     Records every game's place, links and rewards in
//     src/data/campaign-map.lock.json. From then on --rebuild and
//     --rebalance-rewards are refused, and a plain run fails rather than
//     move, unlink, drop or re-reward a locked game.
//
//   npm run campaign:generate -- --sprites-only
//     Only redraws the node and flare sprites.
//
// The galaxy's shape is tuned from the parameter block below.

import { Buffer } from "node:buffer";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import ts from "typescript";

const root = process.cwd();
const gamesDirectory = path.join(root, "src/data/games");
const outputPath = path.join(root, "src/data/campaign-map.generated.ts");
const glowPath = path.join(root, "assets/images/galaxy-glow.webp");
const spriteDir = path.join(root, "assets/images/campaign");
const collectiblesPath = path.join(root, "src/data/collectibles.ts");
const lockPath = path.join(root, "src/data/campaign-map.lock.json");
const rebuild = process.argv.includes("--rebuild");
const rebalance = process.argv.includes("--rebalance-rewards");
const spritesOnly = process.argv.includes("--sprites-only");
const lockOnly = process.argv.includes("--lock");

// ── Map parameters ───────────────────────────────────────────────────────────
// Everything that shapes the galaxy lives here. Retune the map by editing this
// block and re-running with --rebuild; nothing below needs to change.

/** Klondike anchors the centre; every other game is placed by its score. */
const CAMPAIGN_START = "/klondike";

/** Must match WORLD_SIZE in src/components/Campaign/CampaignMap.tsx. */
const WORLD_SIZE = 1800;
/** The largest a node dot is ever drawn there: GAME_DOT_SIZE * the biggest
 *  STATE_SIZE_MULTIPLIER. */
const GAME_DOT_DIAMETER = 18 * 1.2;
/** Node centres stay at least this many dot-diameters apart. */
const MIN_SPACING_IN_DOTS = 3;
/** The same rule in map units, which is the -1..1 space coordinates live in. */
const MIN_SPACING =
  (MIN_SPACING_IN_DOTS * GAME_DOT_DIAMETER) / (WORLD_SIZE / 2);

const GALAXY = {
  /** Main spiral arms. */
  arms: 4,
  /** Radians an arm sweeps per e-fold of radius; higher curls tighter. */
  wind: 2.2,
  /** Angular half-width of an arm at the core, narrowing outwards. */
  width: 0.4,
  /** How far an arm's centre line strays from a true logarithmic spiral, as a
   *  share of its width. This is what keeps the arms from looking drafted. */
  wander: 0.2,
  /** Density between the arms, relative to an arm's centre line. Field stars
   *  in the gaps stop the map reading as five separate strands. */
  fieldDensity: 0.02,
  /** How steeply star density drops with radius, as an exponential disc. */
  radialFalloff: 1.1,
  /** How sharply density falls off across an arm; higher packs the spine. */
  armSharpness: 2,
  /** Share of an arm's width that counts as its spine for chaining. */
  armCore: 0.5,
  /**
   * A round central bulge, as a share of all nodes and how far out it reaches.
   * Without it the hub sits in a void: sampling evenly over area puts almost
   * no darts near the middle, and a real spiral is brightest at its core.
   */
  bulgeFraction: 0.16,
  bulgeRadius: 0.4,
  /** No node comes closer to the centre than this, nor goes beyond the rim. */
  coreRadius: 0.085,
  rimRadius: 1,
};

const CONNECTIONS = {
  /** Most links one node may hold. */
  max: 6,
  /** Longest link along an arm, in map units. */
  maxArmEdge: 0.2,
  /** Longest link between arms, or out to a field star. */
  maxBridgeEdge: 0.26,
  /** Links allowed between any one pair of arms, keeping the arms readable. */
  bridgesPerArmPair: 5,
  /** A node this well connected is passed over when adding optional links. */
  comfortable: 4,
  /** How close a link may pass to a node it does not join, in map units. */
  nodeClearance: 0.06,
  /**
   * A node left with a single link is a dead end at the tip of an arm. If
   * another node sits within this reach it gets a second link, so tips only
   * stay lonely when there is genuinely nothing nearby to join.
   */
  lonelyTipReach: 0.34,
};

/**
 * The glow and dust drawn along the arms (see CampaignMap). The glow is baked
 * into assets/images/galaxy-glow.webp here, with a real Gaussian blur;
 * widths are in world points, the same units CampaignMap draws in. The look is
 * modelled on artists' impressions of the Milky Way seen face-on: lavender
 * arms over a faint disc, a warm barred bulge, and knots of blue and pink
 * star-forming light. The dark dust lanes of the real thing are left out: at
 * map zoom they read as stray dark arcs across the arms.
 */
const ARM_ART = {
  /** Points sampled along each arm's centre line. */
  spineSamples: 60,
  /** Glow image size in pixels. The glow has little fine detail, so it is
   *  drawn under world resolution and stretched, which keeps it small. */
  glowResolution: 900,
  /** Overall strength of the finished glow, applied after every layer. */
  glowStrength: 0.48,
  /** The faint disc the arms sit in, so the gaps between them are not bare. */
  disc: { radius: 640, opacity: 0.1, blur: 150, color: "#6f7fc0" },
  /** A second, tighter disc that fills the gaps between the arms' roots, so
   *  the inner galaxy is one glow rather than arms over dark patches. */
  innerDisc: { radius: 400, opacity: 0.1, blur: 110, color: "#8793d2" },
  /**
   * Each arm is painted in passes, each blurred on its own and then laid over
   * the others. A pass is `core + rim` half-width at the centre, easing to
   * `rim` at the tip. Widths and blur are in world points.
   */
  passes: [
    // Haze: broad, faint and very soft. Where the hazes of neighbouring arms
    // overlap the gap between them fills in a little, so the arms meld at
    // their edges while each keeps its own shape.
    {
      core: 110,
      rim: 175,
      falloff: 1.4,
      opacity: 0.08,
      blur: 80,
      color: "#8391d6",
    },
    // Body: the arm itself, generous all the way out rather than pinching
    // soon after it leaves the core.
    // Its edges are blurred wide so the arms melt into the glow between them.
    {
      core: 81,
      rim: 64,
      falloff: 0.9,
      opacity: 0.15,
      blur: 34,
      color: "#a9b6ee",
    },
    // Spine: narrower and brighter, carrying the arm's strength to its tip.
    {
      core: 37.5,
      rim: 30,
      falloff: 1,
      opacity: 0.16,
      blur: 18,
      color: "#cbd6ff",
    },
    // Ridge: a thin bright line down the middle, which keeps each arm crisp
    // now that its edges are soft.
    { core: 12, rim: 9, falloff: 1, opacity: 0.12, blur: 8, color: "#e4eaff" },
  ],
  /** The last share of an arm over which it thins to nothing. */
  tipFade: 0.06,
  /**
   * The bulge: a warm bar with a bright nucleus, where the arms meet. Without
   * it the arms' roots overlap into a cross. Radii are the bar's half-length
   * and half-thickness in world points.
   */
  bulge: {
    angle: -0.62,
    layers: [
      { radiusX: 260, radiusY: 170, opacity: 0.14, blur: 70, color: "#d9c9b0" },
      { radiusX: 185, radiusY: 88, opacity: 0.28, blur: 30, color: "#f6dcaa" },
      { radiusX: 115, radiusY: 52, opacity: 0.32, blur: 18, color: "#ffeac2" },
      { radiusX: 42, radiusY: 28, opacity: 0.4, blur: 12, color: "#fff7e4" },
    ],
  },
  /**
   * Knots of light clumped along the arms, which break the smooth glow up
   * into the mottled, fibrous texture of a real spiral. A few are pink
   * nebulae, strung along the inside edge of each arm as they are in the sky.
   */
  knots: {
    count: 1500,
    radius: [0.9, 3.6],
    opacity: [0.1, 0.3],
    blur: 3.5,
    color: "#d5ecff",
    /** Share by which knots shrink out at the rim, so the thin arm tips are
     *  finely grained rather than blotchy. */
    tipShrink: 0.7,
  },
  nebulae: {
    count: 80,
    radius: [0.9, 3],
    opacity: [0.25, 0.65],
    blur: 3,
    color: "#ff7fa8",
    /** How far inside the spine they sit, as a share of the arm body's
     *  half-width. */
    offset: [0.4, 0.7],
  },
  /** Specks of dust scattered along the arms. */
  dustCount: 1400,
  /** The dust is baked into the glow image, which is stretched to this size
   *  for it (one and a half pixels per world point), so the specks stay crisp. */
  dustResolution: 2700,
  /** Dust colours, in the order of the tint indices dealt below (and of
   *  FLARE_SPRITES in CampaignMap, which the flaring stars use). */
  dustTints: ["#d6e6ff", "#ffffff", "#b4e4ff", "#ffb3cf", "#ffe7bf"],
  /** Every seventh speck is a brighter star; the rest are fine dust. Radii
   *  in world points. */
  dustRadius: { star: 1.95, fine: 1 },
  /** Dust is drawn a little fainter than its dealt opacity. */
  dustOpacity: 0.56,
  /** How far off the spine dust strays, as a share of the arm's half-width.
   *  Kept in step with the glow's width so the dust fills the arm it sits in. */
  dustSpread: 1.6,
  /** Extra scatter per unit of radius: the glow stays broad further out than
   *  the arm's own half-width does, so the dust has to widen with it. */
  dustFlare: 0.5,
  /** How often each dust tint is dealt, in the order CampaignMap holds the
   *  matching colours: blue-white, white, cyan, pink, and a warm tint that
   *  crowds towards the bulge. */
  dustTintWeights: [0.3, 0.22, 0.32, 0.06, 0.1],
  /** Inside this radius (map units) dust takes the bulge's warm tint. */
  dustWarmRadius: 0.22,
};

const REWARDS = {
  /** Every game has two or three rewards: a Tao chapter and one or two
   *  quotes, or quotes only. */
  min: 2,
  max: 3,
};

/**
 * How games are arranged, by the order they should be met in: a game's
 * progression score (difficulty, and some complexity, so the first games are
 * easy to win and to learn) sets how far out it sits.
 */
const PLACEMENT = {
  difficultyWeight: 0.75,
  complexityWeight: 0.25,
  /** How far out local-only games sit: among this outer share of the map. */
  localOnlyRim: 0.3,
  /** Cost of a game sitting further from its ideal ring, per point squared. */
  radialWeight: 1,
  /** Cost per difficulty point by which a game is harder than a game it
   *  gates (one that can only be reached through it). */
  gateWeight: 400,
  /** Cost of two linked games sharing a category, at the centre; it halves
   *  with every step out, where players have more to choose from. */
  sameCategoryWeight: 900,
  /** Among the first games (this many steps from Klondike), each category
   *  appearing more than once costs this much again. */
  openingDepth: 2,
  openingRepeatWeight: 900,
  /** Simulated annealing: moves tried, and the starting temperature. */
  iterations: 400000,
  temperature: 400,
};

function readCount(name) {
  const source = fs.readFileSync(collectiblesPath, "utf8");
  const value = Number(source.match(new RegExp(`${name}\\s*=\\s*(\\d+)`))?.[1]);
  if (!Number.isInteger(value)) {
    throw new Error(`Could not read ${name} from ${collectiblesPath}.`);
  }
  return value;
}

const TAO_COUNT = readCount("TAO_CHAPTER_COUNT");
const QUOTE_COUNT = readCount("QUOTE_COUNT");

function hash(value) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function parseGame(filename) {
  const source = fs.readFileSync(path.join(gamesDirectory, filename), "utf8");
  const gamePath = source.match(/path:\s*["']([^"']+)["']/)?.[1];
  const rating = (name) =>
    Number(source.match(new RegExp(`${name}:\\s*(\\d+)`))?.[1]);
  const complexity = rating("complexity");
  const difficulty = rating("difficulty");
  const luck = rating("luck");
  const tags = [
    ...(source
      .match(/tags:\s*\[([^\]]+)\]/s)?.[1]
      .matchAll(/GameTag\.(\w+)/g) ?? []),
  ].map((match) => match[1]);

  if (
    !gamePath ||
    !tags.length ||
    ![complexity, difficulty, luck].every(Number.isFinite)
  ) {
    throw new Error(`Could not parse node metadata from ${filename}.`);
  }

  return {
    path: gamePath,
    complexity,
    difficulty,
    luck,
    // A game's first tag is its category, as in the games list.
    category: tags[0],
    localOnly: /enabledOnLocalOnly:\s*true/.test(source),
  };
}

/** Lower scores sit nearer the centre; hard and intricate games drift out. */
function progressionScore(game) {
  return (
    PLACEMENT.difficultyWeight * game.difficulty +
    PLACEMENT.complexityWeight * game.complexity
  );
}

function readExistingGameDots() {
  if (!fs.existsSync(outputPath)) return [];
  const source = fs.readFileSync(outputPath, "utf8");
  const sourceFile = ts.createSourceFile(
    outputPath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const declaration = sourceFile.statements
    .filter(ts.isVariableStatement)
    .flatMap((statement) => [...statement.declarationList.declarations])
    .find(
      (candidate) =>
        ts.isIdentifier(candidate.name) &&
        candidate.name.text === "GAME_DOT_DEFINITIONS",
    );
  if (!declaration?.initializer) {
    throw new Error(`Could not read the node list in ${outputPath}.`);
  }

  function readLiteral(node) {
    if (ts.isArrayLiteralExpression(node)) {
      return node.elements.map(readLiteral);
    }
    if (ts.isObjectLiteralExpression(node)) {
      return Object.fromEntries(
        node.properties.map((property) => {
          if (
            !ts.isPropertyAssignment(property) ||
            (!ts.isIdentifier(property.name) &&
              !ts.isStringLiteral(property.name) &&
              !ts.isNumericLiteral(property.name))
          ) {
            throw new Error("Only literal node properties may be generated.");
          }
          return [property.name.text, readLiteral(property.initializer)];
        }),
      );
    }
    if (ts.isStringLiteral(node)) return node.text;
    if (ts.isNumericLiteral(node)) return Number(node.text);
    // A field star between the arms carries `arm: null`.
    if (node.kind === ts.SyntaxKind.NullKeyword) return null;
    if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
    if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
    if (
      ts.isPrefixUnaryExpression(node) &&
      node.operator === ts.SyntaxKind.MinusToken &&
      ts.isNumericLiteral(node.operand)
    ) {
      return -Number(node.operand.text);
    }
    throw new Error("Only literal node values may be generated.");
  }

  return readLiteral(declaration.initializer);
}

const distance = (left, right) =>
  Math.hypot(left.x - right.x, left.y - right.y);
const radius = (node) => Math.hypot(node.x, node.y);
const nearestDistance = (point, nodes) =>
  Math.min(
    ...nodes
      .filter((node) => node.path !== point.path)
      .map((node) => distance(point, node)),
  );
const spacingRatio = (nodes) => {
  const nearest = nodes.map((node) => nearestDistance(node, nodes));
  return Math.max(...nearest) / Math.min(...nearest);
};
const crossProduct = (start, end, point) =>
  (end.x - start.x) * (point.y - start.y) -
  (end.y - start.y) * (point.x - start.x);

function segmentsCross(leftStart, leftEnd, rightStart, rightEnd) {
  const leftStartSide = crossProduct(rightStart, rightEnd, leftStart);
  const leftEndSide = crossProduct(rightStart, rightEnd, leftEnd);
  const rightStartSide = crossProduct(leftStart, leftEnd, rightStart);
  const rightEndSide = crossProduct(leftStart, leftEnd, rightEnd);
  return leftStartSide * leftEndSide < 0 && rightStartSide * rightEndSide < 0;
}

// ── Galaxy shape ─────────────────────────────────────────────────────────────

/** A deterministic 0..1 value for a label, so every rebuild is identical. */
function hashUnit(label) {
  return hash(label) / 0xffffffff;
}

/** A small deterministic random source, seeded by name. */
function makeRandom(seed) {
  let state = hash(seed) || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

/**
 * How far an arm's centre line strays from a true logarithmic spiral at this
 * radius. Two slow sine terms with per-arm phases bend each arm differently,
 * which is what keeps them from looking drafted.
 */
function armWander(arm, nodeRadius) {
  const first = hashUnit(`arm:${arm}:wander:1`) * Math.PI * 2;
  const second = hashUnit(`arm:${arm}:wander:2`) * Math.PI * 2;
  return (
    Math.sin(nodeRadius * 3.7 + first) * 0.62 +
    Math.sin(nodeRadius * 6.9 + second) * 0.38
  );
}

/**
 * The angle of an arm's centre line at a radius. Map y grows downward (see
 * toWorld in CampaignMap), so subtracting the curl winds anti-clockwise on
 * screen, and every arm uses the same sign so the galaxy reads as one
 * rotating disc.
 */
function armCentreAngle(arm, nodeRadius) {
  const base = (arm * Math.PI * 2) / GALAXY.arms;
  const curl = GALAXY.wind * Math.log(nodeRadius / GALAXY.coreRadius);
  return (
    base - curl + armWander(arm, nodeRadius) * GALAXY.width * GALAXY.wander
  );
}

/** An arm is widest at the core and tightens as it runs out. */
function armHalfWidth(nodeRadius) {
  return GALAXY.width / (1 + nodeRadius * 1.1);
}

/** The arm whose centre line runs closest to a point, and how far off it is. */
function nearestArm(x, y) {
  const nodeRadius = Math.hypot(x, y);
  const angle = Math.atan2(y, x);
  let best = { arm: 0, offset: Infinity };

  for (let arm = 0; arm < GALAXY.arms; arm += 1) {
    const delta = angle - armCentreAngle(arm, nodeRadius);
    const offset = Math.abs(Math.atan2(Math.sin(delta), Math.cos(delta)));
    if (offset < best.offset) best = { arm, offset };
  }
  return best;
}

/**
 * How likely the galaxy is to hold a star at a point: an exponential disc,
 * brightened along the arms, with a floor between them for field stars.
 */
function starDensity(x, y) {
  const nodeRadius = Math.hypot(x, y);
  if (nodeRadius < GALAXY.coreRadius || nodeRadius > GALAXY.rimRadius) return 0;

  const across = nearestArm(x, y).offset / armHalfWidth(nodeRadius);
  const onArm = Math.exp(-across * across * GALAXY.armSharpness);
  const disc = Math.exp(-nodeRadius * GALAXY.radialFalloff);
  return disc * (GALAXY.fieldDensity + (1 - GALAXY.fieldDensity) * onArm);
}

/** Which arm a node sits on, or null for a field star in the gaps. */
function armOf(point) {
  const nodeRadius = Math.hypot(point.x, point.y);
  if (nodeRadius < GALAXY.coreRadius) return null;
  const { arm, offset } = nearestArm(point.x, point.y);
  return offset <= armHalfWidth(nodeRadius) * GALAXY.armCore ? arm : null;
}

/**
 * Each arm's centre line as a polyline, which the glow strokes several times
 * over at decreasing width to give the arm a soft, blurred spine.
 */
function buildArmSpines(samples = ARM_ART.spineSamples) {
  const spines = [];
  for (let arm = 0; arm < GALAXY.arms; arm += 1) {
    // Every spine starts at the exact centre, so the arms meet there.
    const points = [[0, 0]];
    for (let step = 0; step <= samples; step += 1) {
      const nodeRadius =
        GALAXY.coreRadius +
        (GALAXY.rimRadius - GALAXY.coreRadius) * (step / samples);
      const angle = armCentreAngle(arm, nodeRadius);
      points.push([
        Number((Math.cos(angle) * nodeRadius).toFixed(4)),
        Number((Math.sin(angle) * nodeRadius).toFixed(4)),
      ]);
    }
    spines.push(points);
  }
  return spines;
}

/** Half-width of a pass, in world points, a share `along` of the way out. */
function passHalfWidth(pass, along) {
  const tip = Math.min(1, (1 - along) / ARM_ART.tipFade);
  return (pass.core * (1 - along) ** pass.falloff + pass.rim) * tip;
}

/**
 * A spine point with its unit normal, turned to face the galaxy's centre:
 * the inside of the arm, where the nebulae sit.
 */
function spineFrame(spine, index) {
  const [x, y] = spine[index];
  const [previousX, previousY] = spine[Math.max(0, index - 1)];
  const [nextX, nextY] = spine[Math.min(spine.length - 1, index + 1)];
  const length = Math.hypot(nextX - previousX, nextY - previousY) || 1;
  let normalX = -(nextY - previousY) / length;
  let normalY = (nextX - previousX) / length;
  if (normalX * x + normalY * y > 0) {
    normalX = -normalX;
    normalY = -normalY;
  }
  return { x, y, normalX, normalY, along: index / (spine.length - 1) };
}

/** One arm's outline for a pass: out along one side, back along the other. */
function armRibbon(spine, pass, size) {
  const toPixel = (coordinate) => ((coordinate + 1) * size) / 2;
  const pixelsPerPoint = size / WORLD_SIZE;
  const left = [];
  const right = [];

  for (let index = 0; index < spine.length; index += 1) {
    const { x, y, normalX, normalY, along } = spineFrame(spine, index);
    const halfWidth = passHalfWidth(pass, along) * pixelsPerPoint;
    const px = toPixel(x);
    const py = toPixel(y);
    left.push(
      `${(px + normalX * halfWidth).toFixed(1)},${(py + normalY * halfWidth).toFixed(1)}`,
    );
    right.push(
      `${(px - normalX * halfWidth).toFixed(1)},${(py - normalY * halfWidth).toFixed(1)}`,
    );
  }
  return `M${left.join(" L")} L${right.reverse().join(" L")} Z`;
}

/** A value between a [low, high] pair. */
function between(random, [low, high]) {
  return low + random() * (high - low);
}

/**
 * Points scattered along the arms, denser near the spines. `spread` scales
 * how far they stray, as for the dust.
 */
function scatterAlongArms(random, count, spread) {
  const points = [];
  for (
    let attempt = 0;
    points.length < count && attempt < 400000;
    attempt += 1
  ) {
    const nodeRadius = Math.sqrt(
      GALAXY.coreRadius ** 2 +
        random() * (GALAXY.rimRadius ** 2 - GALAXY.coreRadius ** 2),
    );
    const angle = random() * Math.PI * 2;
    const x = Math.cos(angle) * nodeRadius;
    const y = Math.sin(angle) * nodeRadius;
    const across =
      nearestArm(x, y).offset /
      (armHalfWidth(nodeRadius) *
        spread *
        (1 + nodeRadius * ARM_ART.dustFlare));
    if (random() > Math.exp(-across * across * 2.2)) continue;
    points.push({ x, y, nodeRadius });
  }
  return points;
}

/**
 * Points along the inside edge of each arm, clear of the bulge and short of
 * the tip, for the nebulae to sit on.
 */
function buildNebulaAnchors() {
  const random = makeRandom("nebula-anchors");
  const body = ARM_ART.passes[1];
  const unitsPerPoint = 2 / WORLD_SIZE;
  const anchors = [];

  for (const spine of buildArmSpines(320)) {
    const first = Math.round(0.15 * (spine.length - 1));
    const last = Math.round(0.93 * (spine.length - 1));
    for (let index = first; index <= last; index += 1) {
      const frame = spineFrame(spine, index);
      const inset =
        passHalfWidth(body, frame.along) *
        between(random, ARM_ART.nebulae.offset) *
        unitsPerPoint;
      anchors.push({
        x: frame.x + frame.normalX * inset,
        y: frame.y + frame.normalY * inset,
      });
    }
  }
  return anchors;
}

function hexToRgb(hex) {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255].map(
    (channel) => channel / 255,
  );
}

/** Blurs one layer of white-on-black shapes into a 0..1 coverage map. */
async function renderCoverage(shapes, blur, size) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
    `<rect width="${size}" height="${size}" fill="black"/>${shapes.join("")}</svg>`;
  const coverage = await sharp(Buffer.from(svg))
    .extractChannel(0)
    .raw()
    .toBuffer();
  // Kept single-channel explicitly: sharp otherwise hands a blurred
  // greyscale buffer back as three-channel sRGB.
  const blurred = await sharp(coverage, {
    raw: { width: size, height: size, channels: 1 },
  })
    .blur(Math.max(0.3, blur * (size / WORLD_SIZE)))
    .toColourspace("b-w")
    .raw()
    .toBuffer();
  if (blurred.length !== size * size) {
    throw new Error(
      `Glow layer is ${blurred.length} bytes, expected ${size * size}.`,
    );
  }
  return blurred;
}

/**
 * Bakes the arms' glow into one soft image. Each layer is painted as a
 * greyscale coverage mask, blurred, and then tinted: blurring coloured pixels
 * over transparency would bleed black into the edges. A real blur is the
 * only way to get arms that fade without visible steps - stacking
 * translucent shapes always bands - and SVG blur filters are not dependable
 * in react-native-svg on Android. At runtime this is a single image instead
 * of thousands of shapes, so it is cheaper to draw as well.
 */
async function renderGalaxyGlow(spines, dust) {
  const size = ARM_ART.glowResolution;
  const pixelsPerPoint = size / WORLD_SIZE;
  const toPixel = (coordinate) => ((coordinate + 1) * size) / 2;
  const centre = size / 2;
  const { bulge, knots, nebulae, disc } = ARM_ART;
  const nebulaAnchors = buildNebulaAnchors();

  const circle = (x, y, radius, opacity) =>
    `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(radius * pixelsPerPoint).toFixed(2)}" fill="white" fill-opacity="${opacity.toFixed(3)}"/>`;

  const knotRandom = makeRandom("arm-knots");
  const knotShapes = scatterAlongArms(knotRandom, knots.count, 1.1).map(
    ({ x, y, nodeRadius }) => {
      const shrink = 1 - knots.tipShrink * nodeRadius ** 1.5;
      return circle(
        toPixel(x),
        toPixel(y),
        between(knotRandom, knots.radius) * shrink,
        between(knotRandom, knots.opacity) * (0.5 + shrink * 0.5),
      );
    },
  );
  const nebulaRandom = makeRandom("arm-nebulae");
  const nebulaShapes = Array.from({ length: nebulae.count }, () => {
    const anchor =
      nebulaAnchors[Math.floor(nebulaRandom() * nebulaAnchors.length)];
    const jitter = 8 / (WORLD_SIZE / 2);
    return circle(
      toPixel(anchor.x + (nebulaRandom() - 0.5) * jitter),
      toPixel(anchor.y + (nebulaRandom() - 0.5) * jitter),
      between(nebulaRandom, nebulae.radius),
      between(nebulaRandom, nebulae.opacity),
    );
  });

  // Each layer is its own set of shapes with its own blur and colour: the
  // haze needs a far softer edge than the arm itself, or its rim would show
  // as an outline.
  const lights = [
    {
      blur: disc.blur,
      color: disc.color,
      shapes: [circle(centre, centre, disc.radius, disc.opacity)],
    },
    {
      blur: ARM_ART.innerDisc.blur,
      color: ARM_ART.innerDisc.color,
      shapes: [
        circle(
          centre,
          centre,
          ARM_ART.innerDisc.radius,
          ARM_ART.innerDisc.opacity,
        ),
      ],
    },
    ...ARM_ART.passes.map((pass) => ({
      blur: pass.blur,
      color: pass.color,
      shapes: spines.map(
        (spine) =>
          `<path d="${armRibbon(spine, pass, size)}" fill="white" fill-opacity="${pass.opacity}"/>`,
      ),
    })),
    { blur: knots.blur, color: knots.color, shapes: knotShapes },
    ...bulge.layers.map((layer) => ({
      blur: layer.blur,
      color: layer.color,
      shapes: [
        `<ellipse cx="${centre}" cy="${centre}" rx="${layer.radiusX * pixelsPerPoint}" ry="${layer.radiusY * pixelsPerPoint}" transform="rotate(${((bulge.angle * 180) / Math.PI).toFixed(2)} ${centre} ${centre})" fill="white" fill-opacity="${layer.opacity}"/>`,
      ],
    })),
  ];

  // Light adds up per channel: each layer lets through only what the others
  // have not already lit, so overlaps brighten without clipping.
  const unlit = [0, 1, 2].map(() => new Float32Array(size * size).fill(1));
  const addLight = (coverage, color) => {
    const rgb = hexToRgb(color);
    for (let index = 0; index < coverage.length; index += 1) {
      const amount = coverage[index] / 255;
      for (let channel = 0; channel < 3; channel += 1) {
        unlit[channel][index] *= 1 - amount * rgb[channel];
      }
    }
  };
  for (const layer of lights) {
    addLight(await renderCoverage(layer.shapes, layer.blur, size), layer.color);
  }

  const lit = unlit.map((channel) => channel.map((value) => 1 - value));

  // Nebulae glow over the arm they sit in.
  const nebulaCoverage = await renderCoverage(nebulaShapes, nebulae.blur, size);
  const nebulaRgb = hexToRgb(nebulae.color);
  for (let index = 0; index < nebulaCoverage.length; index += 1) {
    const amount = nebulaCoverage[index] / 255;
    for (let channel = 0; channel < 3; channel += 1) {
      const value = lit[channel][index];
      lit[channel][index] = 1 - (1 - value) * (1 - amount * nebulaRgb[channel]);
    }
  }

  // The light is premultiplied; unpremultiply it into colour plus alpha, so
  // it lays over the dark sky exactly as it was lit.
  const pixels = Buffer.alloc(size * size * 4);
  for (let index = 0; index < size * size; index += 1) {
    const red = lit[0][index] * ARM_ART.glowStrength;
    const green = lit[1][index] * ARM_ART.glowStrength;
    const blue = lit[2][index] * ARM_ART.glowStrength;
    const alpha = Math.max(red, green, blue);
    const offset = index * 4;
    if (alpha > 0) {
      pixels[offset] = Math.round((red / alpha) * 255);
      pixels[offset + 1] = Math.round((green / alpha) * 255);
      pixels[offset + 2] = Math.round((blue / alpha) * 255);
    }
    pixels[offset + 3] = Math.round(alpha * 255);
  }

  // The dust goes on top, drawn at a higher resolution than the glow needs
  // so that the specks are sharp rather than smudges.
  const dustSize = ARM_ART.dustResolution;
  const dustScale = dustSize / WORLD_SIZE;
  const toDustPixel = (coordinate) => ((coordinate + 1) * dustSize) / 2;
  const specks = dust.map(([x, y, tint, opacity], index) => {
    const radius =
      index % 7 === 0 ? ARM_ART.dustRadius.star : ARM_ART.dustRadius.fine;
    return (
      `<circle cx="${toDustPixel(x)}" cy="${toDustPixel(y)}" r="${radius * dustScale}" ` +
      `fill="${ARM_ART.dustTints[tint] ?? "#ffffff"}" fill-opacity="${opacity * ARM_ART.dustOpacity}"/>`
    );
  });
  const dustSvg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${dustSize}" height="${dustSize}">` +
    `${specks.join("")}</svg>`;

  const glow = await sharp(pixels, {
    raw: { width: size, height: size, channels: 4 },
  })
    .resize(dustSize, dustSize, { kernel: "cubic" })
    .png()
    .toBuffer();
  await sharp(glow, { limitInputPixels: false })
    .composite([{ input: Buffer.from(dustSvg), limitInputPixels: false }])
    .webp({ quality: 88, alphaQuality: 90, effort: 6 })
    .toFile(glowPath);
}

/**
 * Sprites for the map on native (see CampaignMap). Android draws blurred box
 * shadows and full-map SVG layers very slowly, so each node's look (its
 * halo, dot, glint and shade, the same box shadows the web draws) and each
 * flaring star's halo are baked into small images here instead. Sizes are
 * in world points.
 */
const SPRITES = {
  /** Must match GAME_DOT_SPRITE_SIZE in CampaignMap: room for the widest halo. */
  nodeSize: 96,
  /** Each dot is shaded as a sphere lit from the upper left, subtly: its far
   *  side darkens by up to `shadow`, and a soft highlight (`highlight`
   *  times the state's `glint`) sits towards the light. Must match the web's gradients in
   *  CampaignMap. */
  sphere: {
    light: [-0.45, -0.6, 0.66],
    shadow: 0.26,
    shininess: 14,
    highlight: 0.75,
  },
  /** Must match GAME_DOT_SIZE in CampaignMap. */
  nodeDot: 18,
  /** Enough for a crisp dot at the closest zoom. */
  pixelsPerPoint: 4,
  /** Must match STATE_SIZE_MULTIPLIER, STATE_COLORS and GAME_DOT_GLOW in
   *  CampaignMap; `glint` is the strength of the highlight. */
  states: {
    locked: {
      size: 0.72,
      color: "#746e6e",
      blur: 3,
      spread: 0,
      opacity: 0.28,
      glint: 0.2,
    },
    connected: {
      size: 1.2,
      color: "#b74ec5",
      blur: 9,
      spread: 2,
      opacity: 0.68,
      glint: 0.55,
    },
    won: {
      size: 1,
      color: "#ffda5f",
      blur: 8,
      spread: 1,
      opacity: 0.55,
      glint: 0.55,
    },
    complete: {
      size: 0.85,
      color: "#a2ffa2",
      blur: 13,
      spread: 3,
      opacity: 0.75,
      glint: 0.55,
    },
  },
  /** Must match FLARE_RADIUS in CampaignMap. */
  flareRadius: 10,
  flarePixels: 96,
};

/** A separable Gaussian blur of a single-channel float image. */
function gaussianBlur(source, size, sigma) {
  if (sigma < 0.3) return Float32Array.from(source);
  const reach = Math.ceil(sigma * 3);
  const kernel = Array.from({ length: reach * 2 + 1 }, (_, index) =>
    Math.exp(-((index - reach) ** 2) / (2 * sigma * sigma)),
  );
  const total = kernel.reduce((sum, value) => sum + value, 0);
  const weights = kernel.map((value) => value / total);
  const pass = (input, horizontal) => {
    const output = new Float32Array(size * size);
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        let sum = 0;
        for (let step = -reach; step <= reach; step += 1) {
          const sx = horizontal ? x + step : x;
          const sy = horizontal ? y : y + step;
          if (sx < 0 || sy < 0 || sx >= size || sy >= size) continue;
          sum += input[sy * size + sx] * weights[step + reach];
        }
        output[y * size + x] = sum;
      }
    }
    return output;
  };
  return pass(pass(source, true), false);
}

/** Anti-aliased coverage of a disc, in pixels. */
function discCoverage(size, centreX, centreY, radius) {
  const coverage = new Float32Array(size * size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const distance = Math.hypot(x + 0.5 - centreX, y + 0.5 - centreY);
      coverage[y * size + x] = Math.min(
        1,
        Math.max(0, radius - distance + 0.5),
      );
    }
  }
  return coverage;
}

/** Paints a colour over premultiplied RGBA pixels through a 0..1 mask. */
function paintOver(pixels, mask, color, opacity) {
  const rgb = hexToRgb(color);
  for (let index = 0; index < mask.length; index += 1) {
    const alpha = mask[index] * opacity;
    if (alpha <= 0) continue;
    const offset = index * 4;
    for (let channel = 0; channel < 3; channel += 1) {
      pixels[offset + channel] =
        rgb[channel] * alpha + pixels[offset + channel] * (1 - alpha);
    }
    pixels[offset + 3] = alpha + pixels[offset + 3] * (1 - alpha);
  }
}

async function writeSprite(pixels, size, filePath) {
  const bytes = Buffer.alloc(size * size * 4);
  for (let index = 0; index < size * size; index += 1) {
    const alpha = pixels[index * 4 + 3];
    for (let channel = 0; channel < 3; channel += 1) {
      bytes[index * 4 + channel] =
        alpha > 0
          ? Math.round(Math.min(1, pixels[index * 4 + channel] / alpha) * 255)
          : 0;
    }
    bytes[index * 4 + 3] = Math.round(alpha * 255);
  }
  await sharp(bytes, { raw: { width: size, height: size, channels: 4 } })
    .webp({ lossless: true, effort: 6 })
    .toFile(filePath);
}

/**
 * Paints a dot shaded as a sphere: diffuse light from SPRITES.sphere.light,
 * plus a soft highlight towards it that fades the colour to white.
 */
function paintSphere(pixels, coverage, size, centre, radius, color, glint) {
  const rgb = hexToRgb(color);
  const [lx, ly, lz] = SPRITES.sphere.light;
  const lightLength = Math.hypot(lx, ly, lz);
  const light = [lx / lightLength, ly / lightLength, lz / lightLength];
  // Halfway between the light and the viewer, for the highlight.
  const halfLength = Math.hypot(light[0], light[1], light[2] + 1);
  const half = [
    light[0] / halfLength,
    light[1] / halfLength,
    (light[2] + 1) / halfLength,
  ];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = y * size + x;
      const alpha = coverage[index];
      if (alpha <= 0) continue;
      let nx = (x + 0.5 - centre) / radius;
      let ny = (y + 0.5 - centre) / radius;
      const flat = Math.hypot(nx, ny);
      if (flat > 1) {
        nx /= flat;
        ny /= flat;
      }
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      const diffuse = Math.max(
        0,
        nx * light[0] + ny * light[1] + nz * light[2],
      );
      const brightness = 1 - SPRITES.sphere.shadow * (1 - diffuse);
      const highlight =
        glint *
        SPRITES.sphere.highlight *
        Math.max(0, nx * half[0] + ny * half[1] + nz * half[2]) **
          SPRITES.sphere.shininess;
      const offset = index * 4;
      for (let channel = 0; channel < 3; channel += 1) {
        const shaded = rgb[channel] * brightness;
        const lit = shaded + (1 - shaded) * highlight;
        pixels[offset + channel] =
          lit * alpha + pixels[offset + channel] * (1 - alpha);
      }
      pixels[offset + 3] = alpha + pixels[offset + 3] * (1 - alpha);
    }
  }
}

/**
 * One sprite per node state, its halo drawn the way a browser draws the web's
 * box shadows: the dot grown by its spread and blurred (a CSS blur radius is
 * two standard deviations).
 */
async function renderGameDotSprites() {
  const scale = SPRITES.pixelsPerPoint;
  const size = SPRITES.nodeSize * scale;
  const centre = size / 2;
  for (const [state, look] of Object.entries(SPRITES.states)) {
    const radius = (SPRITES.nodeDot * look.size * scale) / 2;
    const pixels = new Float32Array(size * size * 4);
    const outer = (blur, opacity) =>
      paintOver(
        pixels,
        gaussianBlur(
          discCoverage(size, centre, centre, radius + look.spread * scale),
          size,
          (blur * scale) / 2,
        ),
        look.color,
        opacity,
      );
    const dot = discCoverage(size, centre, centre, radius);

    outer(look.blur * 2.2, look.opacity * 0.35);
    outer(look.blur, look.opacity);
    paintSphere(pixels, dot, size, centre, radius, look.color, look.glint);
    await writeSprite(pixels, size, path.join(spriteDir, `node-${state}.webp`));
  }
}

/** A soft halo per dust tint, for the stars along the arms that flare. */
async function renderFlareSprites() {
  const size = SPRITES.flarePixels;
  const stops = [
    [0, null, 0.95],
    [0.18, "tint", 0.6],
    [0.45, "tint", 0.16],
    [1, "tint", 0],
  ];
  for (const [tintIndex, tint] of ARM_ART.dustTints.entries()) {
    const pixels = new Float32Array(size * size * 4);
    const tintRgb = hexToRgb(tint);
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const along = Math.min(
          1,
          Math.hypot(x + 0.5 - size / 2, y + 0.5 - size / 2) / (size / 2),
        );
        const next = stops.findIndex(([offset]) => offset >= along);
        const [fromOffset, fromColor, fromOpacity] =
          stops[Math.max(0, next - 1)];
        const [toOffset, toColor, toOpacity] = stops[next];
        const share =
          toOffset > fromOffset
            ? (along - fromOffset) / (toOffset - fromOffset)
            : 0;
        const colorOf = (which) => (which === null ? [1, 1, 1] : tintRgb);
        const from = colorOf(fromColor);
        const to = colorOf(toColor);
        const alpha = fromOpacity + (toOpacity - fromOpacity) * share;
        const offset = (y * size + x) * 4;
        for (let channel = 0; channel < 3; channel += 1) {
          pixels[offset + channel] =
            (from[channel] + (to[channel] - from[channel]) * share) * alpha;
        }
        pixels[offset + 3] = alpha;
      }
    }
    await writeSprite(
      pixels,
      size,
      path.join(spriteDir, `flare-${tintIndex}.webp`),
    );
  }
}

/** Deals a dust tint by the weights in ARM_ART. */
function pickTint(random, nodeRadius) {
  const weights = ARM_ART.dustTintWeights;
  const warm = weights.length - 1;
  if (nodeRadius < ARM_ART.dustWarmRadius && random() < 0.7) return warm;
  let roll = random() * weights.reduce((sum, weight) => sum + weight, 0);
  for (let tint = 0; tint < weights.length; tint += 1) {
    roll -= weights[tint];
    if (roll <= 0) return tint;
  }
  return 0;
}

/**
 * Specks of light scattered along the arms. They carry no meaning and are
 * never interactive; they are there so the spiral reads as a galaxy rather
 * than as a graph that happens to curve. Density follows the same field the
 * nodes were placed against, so the dust thins out away from the spines.
 */
function buildArmDust() {
  const random = makeRandom("arm-dust");
  // Dust clings closer to the spine than the nodes do, which is what makes
  // the arm read as a band of light rather than a scatter.
  return scatterAlongArms(random, ARM_ART.dustCount, ARM_ART.dustSpread).map(
    ({ x, y, nodeRadius }) => [
      Number(x.toFixed(3)),
      Number(y.toFixed(3)),
      pickTint(random, nodeRadius),
      Number((0.35 + random() * 0.65).toFixed(2)),
    ],
  );
}

// ── Connections ──────────────────────────────────────────────────────────────

/** Distance from a point to the segment `start`-`end`. */
function pointToSegment(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return distance(point, start);
  let along =
    ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared;
  along = Math.max(0, Math.min(1, along));
  return distance(point, { x: start.x + along * dx, y: start.y + along * dy });
}

/** A link that skims past an unrelated node reads as running through it. */
function passesThroughGameDot(records, left, right) {
  return records.some(
    (record) =>
      record !== left &&
      record !== right &&
      pointToSegment(record, left, right) < CONNECTIONS.nodeClearance,
  );
}

/** Crossed lines are the one thing that always looks like a mistake. */
function crossesExistingLink(records, connections, left, right) {
  const byPath = new Map(records.map((record) => [record.path, record]));
  for (const record of records) {
    for (const otherPath of connections.get(record.path)) {
      if (record.path >= otherPath) continue;
      if (
        record.path === left.path ||
        record.path === right.path ||
        otherPath === left.path ||
        otherPath === right.path
      ) {
        continue;
      }
      if (segmentsCross(left, right, record, byPath.get(otherPath)))
        return true;
    }
  }
  return false;
}

/**
 * Joins two nodes if the link is legal. `maxLength` varies by link type, and
 * `force` is for the repairs that keep the map whole, which must succeed even
 * where a tidier link would not.
 */
function link(records, connections, left, right, maxLength, force = false) {
  if (left.path === right.path) return false;
  const leftLinks = connections.get(left.path);
  const rightLinks = connections.get(right.path);
  if (leftLinks.has(right.path)) return false;
  if (leftLinks.size >= CONNECTIONS.max || rightLinks.size >= CONNECTIONS.max) {
    return false;
  }
  if (distance(left, right) > maxLength) return false;
  if (!force) {
    if (passesThroughGameDot(records, left, right)) return false;
    if (crossesExistingLink(records, connections, left, right)) return false;
  }
  leftLinks.add(right.path);
  rightLinks.add(left.path);
  return true;
}

/** The groups of nodes that can reach each other. */
function components(records, connections) {
  const seen = new Set();
  const groups = [];
  for (const record of records) {
    if (seen.has(record.path)) continue;
    const group = [];
    const queue = [record.path];
    seen.add(record.path);
    while (queue.length > 0) {
      const current = queue.pop();
      group.push(current);
      for (const next of connections.get(current)) {
        if (seen.has(next)) continue;
        seen.add(next);
        queue.push(next);
      }
    }
    groups.push(group);
  }
  return groups;
}

/**
 * Links the nearest pair of nodes across separate groups until every game can
 * be reached. These links are forced through even if they cross something.
 */
function joinComponents(records, connections) {
  const byPath = new Map(records.map((record) => [record.path, record]));
  for (let guard = 0; guard < records.length; guard += 1) {
    const groups = components(records, connections);
    if (groups.length <= 1) break;

    const main = groups.reduce((largest, group) =>
      group.length > largest.length ? group : largest,
    );
    const mainSet = new Set(main);
    let best = null;
    for (const fromPath of main) {
      for (const record of records) {
        if (mainSet.has(record.path)) continue;
        const length = distance(byPath.get(fromPath), record);
        if (!best || length < best.length) {
          best = { from: byPath.get(fromPath), to: record, length };
        }
      }
    }
    if (!best) break;
    link(records, connections, best.from, best.to, Infinity, true);
  }
}

/**
 * Wires the map: arms first, because they are the shape the galaxy is read
 * by, then bridges across the gaps, then whatever repairs are needed so every
 * game is reachable.
 */
function wireGalaxy(records, connections) {
  const byPath = new Map(records.map((record) => [record.path, record]));

  // Each arm, chained outwards. These are the map's thick strands.
  const arms = new Map();
  for (const record of records) {
    if (record.arm === null) continue;
    if (!arms.has(record.arm)) arms.set(record.arm, []);
    arms.get(record.arm).push(record);
  }
  for (const members of arms.values()) {
    members.sort((left, right) => radius(left) - radius(right));
    for (let index = 1; index < members.length; index += 1) {
      link(
        records,
        connections,
        members[index - 1],
        members[index],
        CONNECTIONS.maxArmEdge,
      );
    }
  }

  // Bridges: the short hops that tie arms to each other and pick up the field
  // stars between them. Shortest first, so the map keeps its nearest links.
  const candidates = [];
  for (let left = 0; left < records.length; left += 1) {
    for (let right = left + 1; right < records.length; right += 1) {
      const from = records[left];
      const to = records[right];
      if (from.arm !== null && from.arm === to.arm) continue;
      const length = distance(from, to);
      if (length > CONNECTIONS.maxBridgeEdge) continue;
      candidates.push({ from, to, length });
    }
  }
  candidates.sort((left, right) => left.length - right.length);

  const perArmPair = new Map();
  for (const { from, to } of candidates) {
    if (
      connections.get(from.path).size >= CONNECTIONS.comfortable ||
      connections.get(to.path).size >= CONNECTIONS.comfortable
    ) {
      continue;
    }
    if (from.arm !== null && to.arm !== null) {
      const key = [from.arm, to.arm].sort().join("-");
      if ((perArmPair.get(key) ?? 0) >= CONNECTIONS.bridgesPerArmPair) continue;
      if (link(records, connections, from, to, CONNECTIONS.maxBridgeEdge)) {
        perArmPair.set(key, (perArmPair.get(key) ?? 0) + 1);
      }
    } else {
      link(records, connections, from, to, CONNECTIONS.maxBridgeEdge);
    }
  }

  // Nobody is left floating: an unlinked node takes its nearest neighbour.
  for (const record of records) {
    if (connections.get(record.path).size > 0) continue;
    const nearest = records
      .filter((other) => other !== record)
      .sort((left, right) => distance(record, left) - distance(record, right));
    for (const candidate of nearest) {
      if (link(records, connections, record, candidate, Infinity, true)) break;
    }
  }

  // A single-link node is a dead end. Give it a second where anything is in
  // reach, so an arm tip is only ever isolated when it truly stands alone.
  for (const record of records) {
    if (connections.get(record.path).size !== 1) continue;
    const reachable = records
      .filter((other) => other !== record)
      .sort((left, right) => distance(record, left) - distance(record, right));
    for (const candidate of reachable) {
      if (distance(record, candidate) > CONNECTIONS.lonelyTipReach) break;
      if (
        link(
          records,
          connections,
          record,
          candidate,
          CONNECTIONS.lonelyTipReach,
        )
      ) {
        break;
      }
    }
  }

  // One galaxy, not several: join separate groups by their closest pair. The
  // map has to be walkable from the hub or games would be unreachable, so
  // these links are forced through even if they cross something.
  joinComponents(records, connections);
}

// ── Layout ───────────────────────────────────────────────────────────────────

/**
 * Scatters `count` positions across the galaxy by dart-throwing: a candidate
 * is kept in proportion to the star density there, and only if it clears
 * MIN_SPACING from everything already placed. Sampling against the density
 * field is what gives the arms soft, uneven edges; snapping nodes onto an
 * arm's centre line instead produces a drawn spiral rather than a galaxy.
 */
function scatterPositions(count) {
  const random = makeRandom("galaxy-positions");
  const positions = [{ x: 0, y: 0 }];
  const maxAttempts = count * 6000;

  // The bulge: a round, evenly packed core the arms then wind out of. It is
  // filled first so the innermost, easiest games always have somewhere to go.
  const bulgeCount = Math.round(count * GALAXY.bulgeFraction);
  for (
    let attempt = 0;
    positions.length < bulgeCount && attempt < maxAttempts;
    attempt += 1
  ) {
    const nodeRadius = Math.sqrt(
      GALAXY.coreRadius ** 2 +
        random() * (GALAXY.bulgeRadius ** 2 - GALAXY.coreRadius ** 2),
    );
    const angle = random() * Math.PI * 2;
    const candidate = {
      x: Number((Math.cos(angle) * nodeRadius).toFixed(4)),
      y: Number((Math.sin(angle) * nodeRadius).toFixed(4)),
    };
    if (positions.some((placed) => distance(placed, candidate) < MIN_SPACING)) {
      continue;
    }
    positions.push(candidate);
  }

  for (
    let attempt = 0;
    positions.length < count && attempt < maxAttempts;
    attempt += 1
  ) {
    // Uniform over area first, so density alone shapes the result.
    const nodeRadius = Math.sqrt(
      GALAXY.coreRadius ** 2 +
        random() * (GALAXY.rimRadius ** 2 - GALAXY.coreRadius ** 2),
    );
    const angle = random() * Math.PI * 2;
    const x = Math.cos(angle) * nodeRadius;
    const y = Math.sin(angle) * nodeRadius;

    if (random() > starDensity(x, y)) continue;
    const candidate = { x: Number(x.toFixed(4)), y: Number(y.toFixed(4)) };
    if (positions.some((placed) => distance(placed, candidate) < MIN_SPACING)) {
      continue;
    }
    positions.push(candidate);
  }

  if (positions.length < count) {
    throw new Error(
      `Only placed ${positions.length} of ${count} nodes. The galaxy is too ` +
        `tight for a ${MIN_SPACING.toFixed(4)} minimum gap: raise WORLD_SIZE, ` +
        `widen GALAXY.arms/width, or lower GALAXY.radialFalloff.`,
    );
  }
  return positions;
}

/** Which nodes can only be reached through `gate`: they gate on it. */
function gatedBy(order, adjacency, gate) {
  const reached = new Set();
  const queue = [0];
  while (queue.length > 0) {
    const current = queue.pop();
    if (current === gate || reached.has(current)) continue;
    reached.add(current);
    for (const next of adjacency[current]) {
      if (!reached.has(next) && next !== gate) queue.push(next);
    }
  }
  return order.filter((slot) => slot !== gate && !reached.has(slot));
}

/** Steps from the centre along links, for every slot. */
function depths(adjacency) {
  const depth = adjacency.map(() => Infinity);
  depth[0] = 0;
  const queue = [0];
  while (queue.length > 0) {
    const current = queue.shift();
    for (const next of adjacency[current]) {
      if (depth[next] !== Infinity) continue;
      depth[next] = depth[current] + 1;
      queue.push(next);
    }
  }
  return depth;
}

/**
 * Slots for local-only games: out on the rim, and dead ends, so that when a
 * build leaves them out every other game can still be reached exactly as
 * before. Prefers slots not beside one another.
 */
function pickLocalOnlySlots(slots, adjacency, count) {
  if (count === 0) return [];
  const withoutSlots = (removed) =>
    adjacency.map((links, slot) =>
      removed.has(slot) ? [] : links.filter((next) => !removed.has(next)),
    );
  const reachesAll = (removed) => {
    const trimmed = withoutSlots(removed);
    const reached = new Set();
    const queue = [0];
    while (queue.length > 0) {
      const current = queue.pop();
      if (reached.has(current)) continue;
      reached.add(current);
      for (const next of trimmed[current]) queue.push(next);
    }
    return reached.size === slots.length - removed.size;
  };

  const rimFrom = Math.floor(slots.length * (1 - PLACEMENT.localOnlyRim));
  const outermost = slots
    .map((slot, index) => ({ index, radius: radius(slot) }))
    .filter(({ index }) => index !== 0)
    .sort((left, right) => right.radius - left.radius)
    .slice(0, slots.length - rimFrom)
    .map(({ index }) => index);

  const chosen = new Set();
  for (const apart of [true, false]) {
    for (const slot of outermost) {
      if (chosen.size >= count) break;
      if (chosen.has(slot)) continue;
      if (apart && adjacency[slot].some((next) => chosen.has(next))) continue;
      const trial = new Set([...chosen, slot]);
      if (reachesAll(trial)) chosen.add(slot);
    }
  }
  if (chosen.size < count) {
    throw new Error(
      `Only found ${chosen.size} of ${count} rim slots that local-only games ` +
        `could leave without cutting the map; widen PLACEMENT.localOnlyRim.`,
    );
  }
  return [...chosen];
}

/**
 * Every node from scratch, as a spiral galaxy. The positions and links come
 * from the galaxy's shape alone; games are then fitted to them:
 *
 * - Klondike at the centre, and progression scores rising outwards;
 * - no game the only way through to an easier one (checked on the map as
 *   release builds show it, without local-only games);
 * - categories varied between neighbours, most of all near the centre;
 * - local-only games on the rim, as dead ends.
 */
function layoutAll(games) {
  const positions = scatterPositions(games.length);
  const [centre, ...outer] = positions;
  outer.sort((left, right) => radius(left) - radius(right));
  const slots = [centre, ...outer].map((point, index) => ({
    path: `slot:${String(index).padStart(3, "0")}`,
    x: point.x,
    y: point.y,
    arm: armOf(point),
    connections: [],
    rewards: [],
  }));

  const connections = new Map(slots.map((slot) => [slot.path, new Set()]));
  wireGalaxy(slots, connections);
  const indexOf = new Map(slots.map((slot, index) => [slot.path, index]));
  const adjacency = slots.map((slot) =>
    [...connections.get(slot.path)].map((next) => indexOf.get(next)),
  );

  const hub = games.find((game) => game.path === CAMPAIGN_START);
  const local = games.filter((game) => game.localOnly);
  const placed = games.filter((game) => game !== hub && !game.localOnly);

  const localSlots = pickLocalOnlySlots(slots, adjacency, local.length);
  const localSet = new Set(localSlots);
  const released = adjacency.map((links, slot) =>
    localSet.has(slot) ? [] : links.filter((next) => !localSet.has(next)),
  );
  const freeSlots = slots
    .map((_, index) => index)
    .filter((index) => index !== 0 && !localSet.has(index));

  // Gates, on the map as release builds show it.
  const gates = [];
  for (const gate of freeSlots) {
    const blocked = gatedBy(freeSlots, released, gate);
    if (blocked.length > 0) gates.push([gate, blocked]);
  }
  const depth = depths(released);

  // Each free slot's ideal score: the score of the game at its rank by radius.
  const sortedScores = placed.map(progressionScore).sort((a, b) => a - b);
  const target = new Map(
    freeSlots.map((slot, rank) => [slot, sortedScores[rank]]),
  );
  const edges = [];
  for (const slot of [0, ...freeSlots]) {
    for (const next of released[slot])
      if (slot < next) edges.push([slot, next]);
  }
  const opening = [0, ...freeSlots].filter(
    (slot) => depth[slot] <= PLACEMENT.openingDepth,
  );

  // game at each slot; starts in rank order.
  const at = new Map([[0, hub]]);
  const byScore = [...placed].sort(
    (left, right) =>
      progressionScore(left) - progressionScore(right) ||
      left.path.localeCompare(right.path),
  );
  freeSlots.forEach((slot, rank) => at.set(slot, byScore[rank]));

  const cost = () => {
    let total = 0;
    for (const slot of freeSlots) {
      const off = progressionScore(at.get(slot)) - target.get(slot);
      total += PLACEMENT.radialWeight * off * off;
    }
    for (const [gate, blocked] of gates) {
      const gateDifficulty = at.get(gate).difficulty;
      for (const slot of blocked) {
        const over = gateDifficulty - at.get(slot).difficulty;
        if (over > 0) total += PLACEMENT.gateWeight * over;
      }
    }
    for (const [left, right] of edges) {
      if (at.get(left).category !== at.get(right).category) continue;
      const steps = Math.min(depth[left], depth[right]);
      total += PLACEMENT.sameCategoryWeight / 2 ** steps;
    }
    const seen = new Map();
    for (const slot of opening) {
      const category = at.get(slot).category;
      seen.set(category, (seen.get(category) ?? 0) + 1);
    }
    for (const count of seen.values()) {
      if (count > 1) total += PLACEMENT.openingRepeatWeight * (count - 1);
    }
    return total;
  };

  // Simulated annealing over swaps, seeded so every rebuild is identical.
  const random = makeRandom("galaxy-placement");
  let current = cost();
  let best = current;
  let bestAt = new Map(at);
  for (let step = 0; step < PLACEMENT.iterations; step += 1) {
    const heat = PLACEMENT.temperature * (1 - step / PLACEMENT.iterations);
    const left = freeSlots[Math.floor(random() * freeSlots.length)];
    const right = freeSlots[Math.floor(random() * freeSlots.length)];
    if (left === right) continue;
    const held = at.get(left);
    at.set(left, at.get(right));
    at.set(right, held);
    const next = cost();
    if (next <= current || random() < Math.exp((current - next) / heat)) {
      current = next;
      if (current < best) {
        best = current;
        bestAt = new Map(at);
      }
    } else {
      at.set(right, at.get(left));
      at.set(left, held);
    }
  }

  // Local-only games take the rim slots, gentlest nearest the centre.
  const localByScore = [...local].sort(
    (left, right) => progressionScore(left) - progressionScore(right),
  );
  [...localSlots]
    .sort((left, right) => radius(slots[left]) - radius(slots[right]))
    .forEach((slot, rank) => bestAt.set(slot, localByScore[rank]));

  const records = slots.map((slot, index) => ({
    ...slot,
    path: bestAt.get(index).path,
  }));
  const pathOf = new Map(
    slots.map((slot, index) => [slot.path, records[index].path]),
  );
  for (const [index, record] of records.entries()) {
    record.connections = [...connections.get(slots[index].path)]
      .map((slotPath) => pathOf.get(slotPath))
      .sort();
  }
  return records;
}

/**
 * A spot for a new game out towards the rim, where the newest and usually
 * hardest games belong. Keeps the existing map untouched so saved progress
 * and collected rewards stay where they are.
 */
function rimPoint(game, records) {
  const random = makeRandom(`rim:${game.path}`);
  let fallback = null;

  for (let attempt = 0; attempt < 40000; attempt += 1) {
    const nodeRadius = Math.sqrt(
      0.55 ** 2 + random() * (GALAXY.rimRadius ** 2 - 0.55 ** 2),
    );
    const angle = random() * Math.PI * 2;
    const x = Number((Math.cos(angle) * nodeRadius).toFixed(4));
    const y = Number((Math.sin(angle) * nodeRadius).toFixed(4));
    if (random() > starDensity(x, y)) continue;

    const point = { x, y };
    const nearest = nearestDistance(point, records);
    if (nearest < MIN_SPACING) continue;
    // Close enough to link to, far enough not to crowd.
    if (nearest <= CONNECTIONS.maxBridgeEdge) return point;
    if (!fallback) fallback = point;
  }

  if (fallback) return fallback;
  throw new Error(`Could not find room for ${game.path} at the rim.`);
}

/** The existing map as-is, with removed games dropped and new games added. */
function extendMap(existing, games) {
  const gamePaths = new Set(games.map((game) => game.path));
  const records = existing
    .filter((record) => gamePaths.has(record.path))
    .map((record) => ({
      ...record,
      arm: record.arm ?? armOf(record),
      connections: record.connections.filter((path) => gamePaths.has(path)),
    }));

  const known = new Set(records.map((record) => record.path));
  const added = games.filter((game) => !known.has(game.path));

  const connections = new Map(
    records.map((record) => [record.path, new Set(record.connections)]),
  );
  // Removing games can cut the map in two: bridge the gaps they left.
  joinComponents(records, connections);

  for (const game of added) {
    const point = rimPoint(game, records);
    const record = {
      path: game.path,
      ...point,
      connections: [],
      rewards: [],
      arm: armOf(point),
    };
    records.push(record);
    connections.set(record.path, new Set());

    const nearest = records
      .filter((other) => other !== record)
      .sort((left, right) => distance(record, left) - distance(record, right));
    for (const candidate of nearest) {
      if (connections.get(record.path).size >= 2) break;
      link(records, connections, record, candidate, CONNECTIONS.maxBridgeEdge);
    }
    if (connections.get(record.path).size === 0) {
      link(records, connections, record, nearest[0], Infinity, true);
    }
  }

  for (const record of records) {
    record.connections = [...connections.get(record.path)].sort();
  }
  return { records, added };
}

// ── Rewards ──────────────────────────────────────────────────────────────────

/**
 * Deals every reward from scratch:
 *
 * - one Tao chapter each for the easiest games (never two, and never on a
 *   local-only game), numbered outwards from Klondike so the chapters are met
 *   roughly in order;
 * - quotes shuffled and dealt so every game has two rewards, then the rest to
 *   games at random, up to three each (never extra ones to local-only games,
 *   whose quotes would be lost if they were left out of a release).
 *
 * Rewards are awarded one per win, in the order listed: a Tao chapter first.
 */
function dealRewards(records, gamesByPath) {
  const released = records.filter(
    (record) => !gamesByPath.get(record.path).localOnly,
  );
  if (released.length < TAO_COUNT) {
    throw new Error(
      `${TAO_COUNT} Tao chapters need as many released games; there are ${released.length}.`,
    );
  }
  const easiest = [...released]
    .sort(
      (left, right) =>
        (left.path === CAMPAIGN_START ? -1 : 0) -
          (right.path === CAMPAIGN_START ? -1 : 0) ||
        progressionScore(gamesByPath.get(left.path)) -
          progressionScore(gamesByPath.get(right.path)) ||
        radius(left) - radius(right),
    )
    .slice(0, TAO_COUNT)
    .sort((left, right) => radius(left) - radius(right));
  for (const record of records) record.rewards = [];
  easiest.forEach((record, index) =>
    record.rewards.push({ type: "tao", id: index + 1 }),
  );

  const random = makeRandom("quote-rewards");
  const shuffle = (list) => {
    for (let index = list.length - 1; index > 0; index -= 1) {
      const other = Math.floor(random() * (index + 1));
      [list[index], list[other]] = [list[other], list[index]];
    }
    return list;
  };
  const quotes = shuffle(
    Array.from({ length: QUOTE_COUNT }, (_, index) => index + 1),
  );

  const needed = records.reduce(
    (sum, record) => sum + Math.max(0, REWARDS.min - record.rewards.length),
    0,
  );
  if (quotes.length < needed) {
    throw new Error(
      `${records.length} games need ${needed} quotes to have ${REWARDS.min} ` +
        `rewards each, and there are ${quotes.length}. Add quotes.`,
    );
  }
  for (const record of records) {
    while (record.rewards.length < REWARDS.min) {
      record.rewards.push({ type: "quote", id: quotes.pop() });
    }
  }
  const roomy = shuffle(
    released.filter((record) => record.rewards.length < REWARDS.max),
  );
  for (const record of roomy) {
    if (quotes.length === 0) break;
    record.rewards.push({ type: "quote", id: quotes.pop() });
  }

  for (const record of records) {
    record.rewards.sort(
      (left, right) =>
        (left.type === "tao" ? 0 : 1) - (right.type === "tao" ? 0 : 1) ||
        left.id - right.id,
    );
  }
  return quotes.sort((left, right) => left - right);
}

/**
 * Rewards for games added to an existing map: unused quotes only, as every
 * Tao chapter is already out. Existing games keep theirs untouched.
 */
function rewardNewGames(records, added) {
  const used = new Set(
    records.flatMap((record) =>
      record.rewards
        .filter((reward) => reward.type === "quote")
        .map((reward) => reward.id),
    ),
  );
  const spare = [];
  for (let id = 1; id <= QUOTE_COUNT; id += 1) {
    if (!used.has(id)) spare.push(id);
  }
  for (const game of added) {
    const record = records.find((candidate) => candidate.path === game.path);
    while (record.rewards.length < REWARDS.min) {
      const id = spare.shift();
      if (id === undefined) {
        throw new Error(
          `No unused quotes left for ${game.path}: add quotes to ` +
            `QuotesText.ts (appended, so existing IDs keep their quotes).`,
        );
      }
      record.rewards.push({ type: "quote", id });
    }
  }
  return spare;
}

// ── Validation and output ────────────────────────────────────────────────────

/**
 * The rules the map must hold to, checked on every run. Each one is here
 * because breaking it either makes a game unreachable or makes the map look
 * wrong; nothing is checked purely for tidiness.
 */
function validate(records, gamesByPath) {
  const errors = [];
  const byPath = new Map(records.map((record) => [record.path, record]));

  // Nodes must not crowd each other, or the dots overlap when drawn.
  const closest = Math.min(
    ...records.map((record) => nearestDistance(record, records)),
  );
  if (closest < MIN_SPACING) {
    errors.push(
      `closest pair ${closest.toFixed(4)} is under the ${MIN_SPACING.toFixed(4)} minimum gap`,
    );
  }

  for (const record of records) {
    // A node with no links cannot be reached, and one with too many is a mess.
    if (record.connections.length < 1) {
      errors.push(`${record.path} has no connections`);
    }
    if (record.connections.length > CONNECTIONS.max) {
      errors.push(
        `${record.path} has ${record.connections.length} connections, over the ${CONNECTIONS.max} limit`,
      );
    }
    if (
      record.rewards.length < REWARDS.min ||
      record.rewards.length > REWARDS.max
    ) {
      errors.push(`${record.path} has ${record.rewards.length} rewards`);
    }
    // Links run both ways, or the map walks differently in each direction.
    for (const other of record.connections) {
      if (!byPath.get(other)?.connections.includes(record.path)) {
        errors.push(`${record.path} -> ${other} is not mutual`);
      }
    }
  }

  // Every game has to be reachable from the starting node.
  const connections = new Map(
    records.map((record) => [record.path, new Set(record.connections)]),
  );
  const groups = components(records, connections);
  if (groups.length > 1) {
    errors.push(
      `the map is in ${groups.length} pieces; ${records.length - Math.max(...groups.map((group) => group.length))} games cannot be reached`,
    );
  }

  // Every Tao chapter must be collectable somewhere.
  const chapters = new Set(
    records.flatMap((record) =>
      record.rewards.filter((reward) => reward.type === "tao").map((r) => r.id),
    ),
  );
  for (let id = 1; id <= TAO_COUNT; id += 1) {
    if (!chapters.has(id)) errors.push(`Tao chapter ${id} is not awarded`);
  }

  // One Tao chapter at most per game, and none on local-only games.
  for (const record of records) {
    const chapterCount = record.rewards.filter(
      (reward) => reward.type === "tao",
    ).length;
    if (chapterCount > 1)
      errors.push(`${record.path} has ${chapterCount} Tao chapters`);
    if (chapterCount > 0 && gamesByPath.get(record.path)?.localOnly) {
      errors.push(`${record.path} is local-only but has a Tao chapter`);
    }
    for (const reward of record.rewards) {
      const max = reward.type === "tao" ? TAO_COUNT : QUOTE_COUNT;
      if (!(reward.id >= 1 && reward.id <= max)) {
        errors.push(
          `${record.path} has an unknown ${reward.type} ${reward.id}`,
        );
      }
    }
  }

  // Release builds leave local-only games out: the rest must stay whole.
  const released = records.filter(
    (record) => !gamesByPath.get(record.path)?.localOnly,
  );
  const releasedPaths = new Set(released.map((record) => record.path));
  const releasedLinks = new Map(
    released.map((record) => [
      record.path,
      new Set(record.connections.filter((next) => releasedPaths.has(next))),
    ]),
  );
  if (components(released, releasedLinks).length > 1) {
    errors.push("the map comes apart without its local-only games");
  }

  // No game is the only way through to an easier one.
  const order = released.map((record) => record.path);
  const indexOf = new Map(order.map((gamePath, index) => [gamePath, index]));
  const adjacency = order.map((gamePath) =>
    [...releasedLinks.get(gamePath)].map((next) => indexOf.get(next)),
  );
  const start = indexOf.get(CAMPAIGN_START);
  const swap = (index) => (index === 0 ? start : index === start ? 0 : index);
  const rooted = adjacency.map((_, index) => adjacency[swap(index)].map(swap));
  const indices = order.map((_, index) => index).filter((index) => index !== 0);
  for (const gate of indices) {
    const gateGame = gamesByPath.get(order[swap(gate)]);
    for (const blocked of gatedBy(indices, rooted, gate)) {
      const blockedGame = gamesByPath.get(order[swap(blocked)]);
      if (blockedGame.difficulty < gateGame.difficulty) {
        errors.push(
          `${gateGame.path} (difficulty ${gateGame.difficulty}) is the only way to ` +
            `${blockedGame.path} (difficulty ${blockedGame.difficulty})`,
        );
      }
    }
  }

  // No reward may be handed out twice, or it cannot be collected twice over.
  const seen = new Set();
  for (const record of records) {
    for (const reward of record.rewards) {
      const key = `${reward.type}:${reward.id}`;
      if (seen.has(key)) errors.push(`${key} is awarded more than once`);
      seen.add(key);
    }
  }

  if (errors.length > 0) throw new Error(errors.join("\n"));
}

/**
 * Once the map is locked, a player's progress depends on it: which games are
 * unlocked comes from the links, and every collected reward belongs to a
 * game. So a locked game must keep its place, its links and its rewards;
 * new games may only be added around it.
 */
function checkLock(lock, records) {
  const byPath = new Map(records.map((record) => [record.path, record]));
  const errors = [];
  for (const [gamePath, before] of Object.entries(lock.gameDots)) {
    const now = byPath.get(gamePath);
    if (!now) {
      errors.push(`${gamePath} is locked and cannot leave the map`);
      continue;
    }
    if (now.x !== before.x || now.y !== before.y) {
      errors.push(`${gamePath} is locked and cannot move`);
    }
    for (const next of before.connections) {
      if (!now.connections.includes(next)) {
        errors.push(
          `${gamePath} is locked and cannot lose its link to ${next}`,
        );
      }
    }
    if (JSON.stringify(now.rewards) !== JSON.stringify(before.rewards)) {
      errors.push(`${gamePath} is locked and its rewards cannot change`);
    }
  }
  if (errors.length > 0) throw new Error(errors.join("\n"));
}

function lockFileFor(records) {
  return `${JSON.stringify(
    {
      note:
        "Written by npm run campaign:lock. Players' progress depends on these " +
        "games' places, links and rewards; see docs/campaign-map.md.",
      gameDots: Object.fromEntries(
        records.map(({ path: gameDotPath, x, y, connections, rewards }) => [
          gameDotPath,
          { x, y, connections, rewards },
        ]),
      ),
    },
    null,
    2,
  )}\n`;
}

// Every game is on the map, local-only ones included: they sit on the rim as
// dead ends, and release builds simply leave them out (see campaign-map.ts).
const games = fs
  .readdirSync(gamesDirectory)
  .filter((filename) => filename.endsWith(".ts"))
  .map(parseGame)
  .sort((left, right) => left.path.localeCompare(right.path));
if (!games.some((game) => game.path === CAMPAIGN_START)) {
  throw new Error(`${CAMPAIGN_START} must exist as the first node.`);
}

const existing = readExistingGameDots();
const gamesByPath = new Map(games.map((game) => [game.path, game]));
const locked = fs.existsSync(lockPath)
  ? JSON.parse(fs.readFileSync(lockPath, "utf8"))
  : null;
let records;
let summary;
let unassigned = [];

if (lockOnly) {
  if (locked) throw new Error(`The map is already locked (${lockPath}).`);
  records = existing;
  summary = `Locked ${records.length} nodes`;
} else if (locked && (rebuild || rebalance)) {
  throw new Error(
    `The map is locked (${path.relative(root, lockPath)}): players' progress ` +
      `depends on every game's place, links and rewards, so --rebuild and ` +
      `--rebalance-rewards are refused. New games can still be added with a ` +
      `plain run.`,
  );
} else if (rebuild || existing.length === 0) {
  records = layoutAll(games);
  unassigned = dealRewards(records, gamesByPath);
  summary = `Rebuilt ${records.length} nodes and dealt every reward`;
} else if (rebalance) {
  records = existing;
  unassigned = dealRewards(records, gamesByPath);
  summary = `Kept ${records.length} nodes and dealt every reward again`;
} else {
  const result = extendMap(existing, games);
  records = result.records;
  unassigned = rewardNewGames(records, result.added);
  summary =
    result.added.length > 0
      ? `Added ${result.added.map((game) => game.path).join(", ")} at the edge (${records.length} nodes)`
      : `No new games; kept all ${records.length} nodes`;
}

validate(records, gamesByPath);
if (locked) checkLock(locked, records);
if (unassigned.length > 0) {
  summary += `; ${unassigned.length} quotes left unassigned (${unassigned.join(", ")})`;
}

const armed = records.filter((record) => record.arm !== null).length;
summary += ` (${armed} on arms, ${records.length - armed} between them)`;

const armDust = buildArmDust();
const output =
  `// Generated by scripts/generate-campaign-map.mjs. Coordinates and entries may be edited manually.\n` +
  `import type { ArmDust, GameDotDefinition } from "./campaign-map";\n\n` +
  `/** Decorative specks along the arms: x, y, tint index, opacity. */\n` +
  `export const ARM_DUST: ArmDust[] = ${JSON.stringify(armDust)};\n\n` +
  `export const GAME_DOT_DEFINITIONS: GameDotDefinition[] = ${JSON.stringify(
    records.map(({ path: gameDotPath, x, y, arm, connections, rewards }) => ({
      path: gameDotPath,
      x,
      y,
      arm: arm ?? null,
      connections,
      rewards,
    })),
    null,
    2,
  )};\n`;

if (lockOnly) {
  fs.writeFileSync(lockPath, lockFileFor(records));
} else if (!spritesOnly) {
  fs.writeFileSync(outputPath, output);
  await renderGalaxyGlow(buildArmSpines(), armDust);
}
if (!lockOnly) {
  fs.mkdirSync(spriteDir, { recursive: true });
  await renderGameDotSprites();
  await renderFlareSprites();
}
console.log(
  spritesOnly
    ? `Redrew the sprites in ${path.relative(root, spriteDir)}.`
    : lockOnly
      ? `${summary} in ${path.relative(root, lockPath)}.`
      : `${summary} in ${path.relative(root, outputPath)}.`,
);
