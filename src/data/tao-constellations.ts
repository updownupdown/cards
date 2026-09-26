import { TAO_CHAPTERS } from "@/components/Campaign/TaoChapters";

/**
 * One constellation per Tao chapter: the figure its letters form when the
 * chapter is earned, and its place in the collection.
 *
 * Each figure is drawn on a 100 x 100 grid (y grows downward):
 * - `mag` is a star's brightness, 1 (faint) to 3 (brightest).
 * - Strokes are pen paths through stars, in drawing order.
 * - Nebulae are optional polygons that draw part of the star dust, to shade
 *   an area (a canopy, a lake, the light half of yin and yang).
 * - `keyPhrases` name the line(s) the image comes from. Their letters become
 *   the named stars. Lines are matched in the English text and used by index,
 *   which holds for every translation (they keep the English line breaks).
 * - `name` and `confidence` are for us: what the figure shows, and how
 *   directly the chapter names it (A: the text names it; B: a symbol drawn
 *   from the text; C: an interpretive choice). Neither is shown to players.
 */

export type ConstellationStar = { x: number; y: number; mag: number };
export type Confidence = "A" | "B" | "C";

export type Constellation = {
  chapter: number;
  name: string;
  confidence: Confidence;
  keyPhrases: string[];
  stars: ConstellationStar[];
  strokes: number[][];
  nebulae: [number, number][][];
  /** Share of star dust drawn into the nebulae. */
  nebulaShare: number;
};

type Point = [number, number];
type StarPoint = [number, number] | [number, number, number];

function createBuilder() {
  const stars: ConstellationStar[] = [];
  const strokes: number[][] = [];
  const nebulae: Point[][] = [];

  const star = (x: number, y: number, mag = 1.8) => {
    stars.push({ x, y, mag });
    return stars.length - 1;
  };
  const pts = (points: StarPoint[], mag = 1.8) =>
    points.map(([x, y, m]) => star(x, y, m ?? mag));
  const line = (...ids: number[]) => {
    strokes.push(ids);
    return ids;
  };
  const arcPoints = (
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    fromDeg: number,
    toDeg: number,
    count: number,
  ): Point[] =>
    Array.from({ length: count }, (_, index) => {
      const t = count === 1 ? 0 : index / (count - 1);
      const angle = ((fromDeg + (toDeg - fromDeg) * t) * Math.PI) / 180;
      return [cx + rx * Math.cos(angle), cy + ry * Math.sin(angle)];
    });

  return {
    star,
    starAt: (id: number) => stars[id],
    pts,
    line,
    arcPoints,
    /** Stars joined by one stroke. */
    path: (points: StarPoint[], mag?: number) => line(...pts(points, mag)),
    /** Stars joined by a closed stroke. */
    loop: (points: StarPoint[], mag?: number) => {
      const ids = pts(points, mag);
      line(...ids, ids[0]);
      return ids;
    },
    close: (ids: number[]) => line(...ids, ids[0]),
    /** `count` stars around an ellipse, the first at `startDeg` (-90 = top). */
    ring: (
      cx: number,
      cy: number,
      r: number,
      count: number,
      mag = 1.8,
      startDeg = -90,
      ry = r,
    ) =>
      pts(
        arcPoints(cx, cy, r, ry, startDeg, startDeg + 360, count + 1).slice(
          0,
          count,
        ),
        mag,
      ),
    arc: (
      cx: number,
      cy: number,
      r: number,
      fromDeg: number,
      toDeg: number,
      count: number,
      mag = 1.8,
      ry = r,
    ) => pts(arcPoints(cx, cy, r, ry, fromDeg, toDeg, count), mag),
    nebula: (points: Point[]) => nebulae.push(points),
    build: (
      chapter: number,
      name: string,
      confidence: Confidence,
      keyPhrases: string[],
      nebulaShare = 0.25,
    ): Constellation => ({
      chapter,
      name,
      confidence,
      keyPhrases,
      stars,
      strokes,
      nebulae,
      nebulaShare: nebulae.length ? nebulaShare : 0,
    }),
  };
}

type Builder = ReturnType<typeof createBuilder>;

const figures: ((b: Builder) => Constellation)[] = [
  // 1 - "This source is called darkness": a gateway onto the dark.
  (b) => {
    b.path([[8, 19, 2.2], [18, 25], [34, 21], [50, 19, 2.4], [66, 21], [82, 25], [92, 19, 2.2]]);
    const [, beamL, beamR] = b.path([[22, 33, 1.4], [30, 33, 2], [70, 33, 2], [78, 33, 1.4]]);
    const [lowL, lowR] = b.path([[30, 45, 1.6], [70, 45, 1.6]]);
    const [footL, footR] = b.pts([[30, 90, 2.2], [70, 90, 2.2]]);
    b.line(beamL, lowL, footL);
    b.line(beamR, lowR, footR);
    return b.build(1, "The Gateway", "B", ["This source is called darkness."]);
  },
  // 2 - Being and non-being produce each other: sun and moon.
  (b) => {
    const sun = b.ring(32, 34, 11, 8, 2);
    b.close(sun);
    const rays = b.ring(32, 34, 19, 8, 1.2);
    sun.forEach((id, index) => b.line(id, rays[index]));
    const outer = b.arc(68, 62, 18, -60, -300, 8, 2);
    const inner = b.arc(78, 62, 15.6, -258, -102, 6, 1.2);
    b.line(...outer, ...inner, outer[0]);
    return b.build(2, "Sun and Moon", "B", ["Being and non-being produce each other."]);
  },
  // 3 - Do not display your treasures: a closed chest.
  (b) => {
    const [lidL, , , , , , lidR] = b.path([[20, 50, 2], [24, 36], [38, 28], [50, 27, 2.2], [62, 28], [76, 36], [80, 50, 2]]);
    const [strapL, strapR] = b.pts([[32, 50, 1.4], [68, 50, 1.4]]);
    b.line(lidL, strapL, strapR, lidR);
    const [botL, strapBL, strapBR, botR] = b.path([[20, 86, 2], [32, 86, 1.4], [68, 86, 1.4], [80, 86, 2]]);
    b.line(lidL, botL);
    b.line(lidR, botR);
    b.line(strapL, strapBL);
    b.line(strapR, strapBR);
    b.loop([[45, 53, 1.2], [55, 53, 1.2], [55, 64, 1.2], [45, 64, 1.2]]);
    b.star(50, 58, 2.8);
    return b.build(3, "The Closed Chest", "B", ["Do not display your treasures"]);
  },
  // 4 - Infinitely deep: a well.
  (b) => {
    const rim = b.ring(50, 55, 26, 8, 1.8, 0, 7);
    b.close(rim);
    const [, roofL, , roofR] = b.path([[22, 22, 1.6], [31.6, 17.5, 1.8], [50, 9, 2.4], [68.4, 17.5, 1.8], [78, 22, 1.6]]);
    const [midL, pulley, midR] = b.path([[31.6, 28, 1.4], [50, 28, 2.2], [68.4, 28, 1.4]]);
    b.line(rim[5], midL, roofL);
    b.line(rim[7], midR, roofR);
    const rope = b.star(50, 40, 1.4);
    b.line(pulley, rope);
    const bucket = b.loop([[45, 43, 1.6], [55, 43, 1.6], [53, 49, 1.6], [47, 49, 1.6]]);
    b.line(bucket[0], rope, bucket[1]);
    b.line(rim[4], ...b.pts([[24, 86, 1.4], [50, 90, 1.6], [76, 86, 1.4]]), rim[0]);
    return b.build(4, "The Bottomless Well", "A", ["Infinitely deep, it is the source of all things."]);
  },
  // 5 - The space between Heaven and Earth is like a bellows.
  (b) => {
    const upper = b.path([[18, 36, 2], [34, 30], [52, 33], [68, 43], [79, 48]]);
    const lower = b.path([[18, 64, 2], [34, 70], [52, 67], [68, 57], [79, 52]]);
    b.line(upper[0], ...b.pts([[12, 43, 1.4], [10, 50, 1.6], [12, 57, 1.4]]), lower[0]);
    const nozzle = b.star(94, 50, 2.8);
    b.line(upper[4], nozzle, lower[4]);
    b.line(upper[0], b.star(5, 27, 2.2));
    b.line(lower[0], b.star(5, 73, 2.2));
    b.close(b.ring(38, 50, 4.5, 5, 1.2));
    return b.build(5, "The Bellows", "A", ["is like a bellows;"]);
  },
  // 6 - Like a vapor: mist rising from a valley.
  (b) => {
    b.path([[3, 38, 1.4], [18, 28, 2.2], [30, 46], [44, 74], [50, 80, 2], [56, 74], [70, 44], [82, 26, 2.2], [97, 36, 1.4]]);
    b.path([[50, 72, 1.2], [44, 62, 1.4], [52, 52, 1.6], [46, 42, 1.8], [54, 32, 2], [48, 22, 2.4]]);
    b.path([[58, 68, 1.2], [64, 58, 1.4], [58, 48, 1.6], [66, 40, 2]]);
    b.nebula([[40, 70], [36, 44], [46, 18], [62, 24], [72, 40], [62, 70]]);
    return b.build(6, "The Valley Mist", "B", ["It is like a vapor,"], 0.3);
  },
  // 7 - The Tao of Heaven is eternal, and the earth is long enduring.
  (b) => {
    const dome = b.arc(50, 70, 44, 180, 360, 9, 2);
    b.line(...dome);
    b.line(dome[0], ...b.pts([[26, 82, 1.4], [50, 87, 1.6], [74, 82, 1.4]]), dome[8]);
    b.line(dome[0], dome[8]);
    b.star(50, 56, 3);
    b.pts([[32, 44, 1], [62, 36, 1], [72, 52, 1]]);
    return b.build(7, "Heaven over Earth", "B", ["The Tao of Heaven is eternal,"]);
  },
  // 8 - The supreme good is like water; it gathers in the low places.
  (b) => {
    const ridge = b.path([[3, 66, 1.4], [13, 44, 1.6], [24, 22, 2.6], [36, 40, 1.6], [47, 56, 2], [60, 42, 1.6], [72, 30, 2.6], [85, 50, 1.6], [97, 68, 1.4]]);
    const lakeRing = b.arcPoints(50, 89, 24, 6.5, -90, 270, 9).slice(0, 8);
    const lake = b.pts(lakeRing);
    b.line(ridge[4], ...b.pts([[54, 64, 1.6], [44, 71, 1.6], [53, 78, 1.8]]), lake[0]);
    b.close(lake);
    b.nebula(lakeRing);
    return b.build(8, "Water", "A", ["The supreme good is like water,", "It gathers in unpopular places."]);
  },
  // 9 - Easier to carry an empty cup than one filled to the brim.
  (b) => {
    const bowl = b.path([[20, 30, 2], [26, 46], [38, 58], [50, 62, 2], [62, 58], [74, 46], [80, 30, 2]]);
    b.line(bowl[0], ...b.pts([[36, 24, 1.6], [50, 22, 2.2], [64, 24, 1.6]]), bowl[6]);
    b.line(bowl[6], ...b.pts([[85, 40, 1.4], [84, 49, 1.4]]));
    b.star(84, 57, 2.6);
    const stem = b.star(50, 82, 1.6);
    b.line(bowl[3], stem);
    b.path([[34, 88, 1.8], [50, 84, 1.4], [66, 88, 1.8]]);
    return b.build(9, "The Brimming Cup", "A", ["than one that is filled to the brim."]);
  },
  // 10 - Cleanse your inner vision: an eye.
  (b) => {
    const [cornerL, , , , cornerR] = b.path([[8, 50, 2], [28, 37], [50, 31], [72, 37], [92, 50, 2]]);
    b.line(cornerL, ...b.pts([[28, 62], [50, 68], [72, 62]]), cornerR);
    b.close(b.ring(50, 49, 13, 8, 1.6));
    b.star(50, 49, 3);
    b.path([[30, 24, 1.2], [26, 16, 1.6]]);
    b.path([[50, 20, 1.2], [50, 10, 1.8]]);
    b.path([[70, 24, 1.2], [74, 16, 1.6]]);
    return b.build(10, "The Inner Eye", "B", ["While you cleanse your inner vision"]);
  },
  // 11 - Thirty spokes join at the hub; the hole at the centre is the use.
  (b) => {
    const rim = b.ring(50, 50, 42, 12, 2.4);
    // The hub is a faint ring around an empty centre: the "center hole".
    const hub = b.ring(50, 50, 9, 12, 1.2);
    b.close(rim);
    hub.forEach((id, index) => b.line(id, rim[index]));
    b.close(hub);
    return b.build(11, "The Wheel", "A", ["but it is the center hole", "that allows the wheel to function."]);
  },
  // 12 - Five notes deafen the ear: a lute.
  (b) => {
    const body = b.loop([[45, 42, 1.6], [34, 48], [25, 60], [23, 76], [32, 89], [50, 94, 2.2], [68, 89], [77, 76], [75, 60], [66, 48], [55, 42, 1.6]]);
    const neckL = b.star(46, 14, 1.6);
    const neckR = b.star(54, 14, 1.6);
    b.line(body[0], neckL);
    b.line(body[10], neckR);
    b.line(neckL, ...b.pts([[45, 5, 2], [55, 5, 2]]), neckR);
    b.pts([[39, 8, 1.2], [61, 8, 1.2], [39, 12, 1.2], [61, 12, 1.2]]);
    b.close(b.ring(50, 64, 6, 6, 1.4));
    b.path([[40, 81, 1.4], [60, 81, 1.4]]);
    b.path([[50, 14, 1], [50, 58, 1]]);
    return b.build(12, "The Lute", "B", ["Five notes deafen the ear."]);
  },
  // 13 - The superior is also someone's subordinate: a ladder.
  (b) => {
    const left = b.pts([[28, 94, 1.8], [30, 80], [32, 66], [34, 52], [36, 38], [38, 24], [40, 10, 2.2]]);
    const right = b.pts([[58, 94, 1.8], [60, 80], [62, 66], [64, 52], [66, 38], [68, 24], [70, 10, 2.2]]);
    b.line(...left);
    b.line(...right);
    for (let i = 1; i < 7; i++) b.line(left[i], right[i]);
    b.star(55, 3, 3);
    return b.build(13, "The Ladder", "C", ["He who is superior is also someone's subordinate."]);
  },
  // 14 - Follow it and there will be no end: an endless spiral.
  (b) => {
    const points: StarPoint[] = [];
    for (let i = 0; i < 22; i++) {
      const angle = (i * 45 * Math.PI) / 180;
      const r = 3 + i * 1.95;
      points.push([50 + r * Math.cos(angle), 50 + r * Math.sin(angle), i === 0 ? 3 : 1.2 + (i % 4 === 0 ? 0.8 : 0)]);
    }
    b.path(points);
    return b.build(14, "The Endless Thread", "C", ["follow it and there will be no end."]);
  },
  // 15 - Careful as someone crossing a frozen stream in winter.
  (b) => {
    b.close(b.ring(40, 18, 4.5, 5, 1.6));
    const neck = b.star(40, 26, 2);
    const cloakL = b.star(29, 60, 1.8);
    const cloakR = b.star(51, 60, 1.8);
    b.line(neck, cloakL, cloakR, neck);
    b.line(b.star(36, 60, 1.2), b.star(30, 78, 2));
    b.line(b.star(46, 60, 1.2), b.star(55, 75, 2));
    const staffTop = b.star(52, 24, 2);
    const hand = b.star(54, 38, 1.4);
    b.line(neck, hand);
    b.line(staffTop, hand, b.star(61, 80, 1.6));
    b.path([[4, 80, 1.2], [18, 76, 1.4], [32, 81, 1.2], [48, 77, 1.4], [64, 82, 1.2], [80, 77, 1.4], [96, 81, 1.2]]);
    b.path([[10, 90, 1], [30, 87, 1.2], [50, 91, 1], [70, 87, 1.2], [90, 90, 1]]);
    return b.build(15, "The Winter Crossing", "A", ["as someone crossing a frozen stream in winter."]);
  },
  // 16 - Empty your mind: a single drop, and its ripples on still water.
  (b) => {
    b.star(50, 22, 2.6);
    b.star(50, 32, 1.4);
    b.close(b.ring(50, 60, 10, 6, 2.4, -90, 3.5));
    b.close(b.ring(50, 60, 24, 10, 1.8, -90, 8));
    b.close(b.ring(50, 60, 40, 14, 1.2, -90, 13));
    return b.build(16, "The Ripple", "B", ["If you can empty your mind of all thoughts"]);
  },
  // 17 - The best leaders are hardly known: a shepherd behind the flock.
  (b) => {
    b.close(b.ring(78, 22, 4, 5, 1.6));
    const neck = b.star(78, 29, 1.8);
    const hips = b.star(77, 56, 2);
    b.line(neck, hips);
    b.line(hips, b.star(71, 78, 1.8));
    b.line(hips, b.star(83, 78, 1.8));
    const hand = b.star(68, 42, 1.4);
    b.line(neck, hand);
    b.path([[66, 82, 1.4], [66, 42, 1.2], [66, 16, 1.6], [62, 10, 1.6], [56, 12, 1.4], [55, 18, 1.2]]);
    for (const [x, y] of [[16, 70], [34, 76], [50, 68]] as Point[]) {
      b.loop([[x - 6, y, 1.4], [x - 2, y - 4, 1.6], [x + 3, y - 4, 1.6], [x + 6, y, 1.4], [x, y + 3, 1.2]]);
      b.star(x - 9, y - 3, 2);
    }
    return b.build(17, "The Shepherd", "C", ["The best leaders are those the people hardly know exist."]);
  },
  // 18 - Hypocrisy is close behind: a smiling mask on a stick.
  (b) => {
    const face = b.ring(50, 44, 24, 10, 1.8, -90, 30);
    b.close(face);
    b.loop([[32, 38, 1.4], [39, 34, 1.6], [46, 38, 1.4], [39, 41, 1.2]]);
    b.loop([[54, 38, 1.4], [61, 34, 1.6], [68, 38, 1.4], [61, 41, 1.2]]);
    b.path([[36, 58, 1.6], [50, 65, 2.2], [64, 58, 1.6]]);
    b.line(face[5], b.star(52, 96, 1.8));
    return b.build(18, "The Mask", "B", ["hypocrisy is close behind."]);
  },
  // 19 - Keep us at the center of the circle.
  (b) => {
    b.close(b.ring(50, 50, 40, 16, 1.8));
    b.close(b.ring(50, 50, 12, 6, 1.2));
    b.star(50, 50, 3);
    return b.build(19, "The Centre of the Circle", "A", ["to keep us at the center of the circle, so we must also:"]);
  },
  // 20 - I drift on the waves on the ocean: a boat adrift.
  (b) => {
    const hull = b.path([[20, 60, 2], [30, 71], [70, 71], [80, 60, 2]]);
    b.line(hull[0], hull[3]);
    b.line(b.star(36, 60, 1.4), b.star(42, 50, 1.8), b.star(58, 49, 1.8), b.star(64, 60, 1.4));
    b.path([[2, 80, 1.2], [14, 76, 1.4], [26, 81, 1.2], [38, 77, 1.4], [50, 82, 1.2], [62, 77, 1.4], [74, 82, 1.2], [86, 77, 1.4], [98, 81, 1.2]]);
    b.path([[10, 30, 1.2], [22, 26, 1.6], [34, 30, 1.2]]);
    b.path([[62, 22, 1.2], [74, 18, 1.6], [86, 22, 1.2]]);
    return b.build(20, "The Drifting Boat", "A", ["I drift on the waves on the ocean,"]);
  },
  // 21 - Secluded and dark, yet there is a vitality within it: a seed.
  (b) => {
    b.close(b.ring(50, 60, 16, 10, 1.6, -90, 22));
    b.star(50, 62, 3);
    b.path([[50, 38, 1.4], [53, 28, 1.6], [48, 20, 1.8], [40, 16, 2]]);
    b.path([[53, 28, 1.6], [60, 22, 1.8]]);
    return b.build(21, "The Seed", "C", ["Secluded and dark, yet there is a vitality within it."]);
  },
  // 22 - To become full, first become empty: the crescent.
  (b) => {
    const outer = b.arc(50, 50, 38, -70, -290, 7, 2.2);
    const inner = b.arc(65.8, 50, 35.8, -260, -100, 5, 1.4);
    b.line(...outer, ...inner, outer[0]);
    // The rest of the moon, not yet lit.
    b.pts(b.arcPoints(50, 50, 38, 38, -50, 50, 5), 0.8);
    return b.build(22, "The Crescent Moon", "B", ["If you want to become full,"]);
  },
  // 23 - When the gale blows, it will not last long.
  (b) => {
    b.loop([[20, 44, 1.6], [16, 34], [24, 24], [36, 24], [42, 14, 2], [56, 12, 2.2], [66, 20], [78, 20], [86, 30, 2], [82, 42], [66, 46], [50, 46], [34, 46]]);
    for (const x of [28, 42, 70]) b.path([[x, 52, 1.2], [x - 4, 64, 1.4]]);
    b.path([[36, 70, 1.2], [32, 82, 1.4]]);
    b.path([[74, 70, 1.2], [70, 82, 1.4]]);
    b.path([[56, 50, 2], [48, 64, 2.2], [58, 64, 2.2], [48, 84, 2.8]]);
    return b.build(23, "The Passing Storm", "A", ["when the gale blows, it will not last long;"]);
  },
  // 24 - Those who stand on tiptoes do not stand firmly.
  (b) => {
    b.close(b.ring(52, 13, 4.5, 5, 1.6));
    const neck = b.star(52, 21, 2);
    const hips = b.star(50, 52, 2);
    b.line(neck, hips);
    b.line(neck, ...b.pts([[42, 12, 1.4], [36, 3, 1.8]]));
    b.line(neck, ...b.pts([[62, 12, 1.4], [68, 3, 1.8]]));
    b.line(hips, ...b.pts([[45, 71, 1.6], [45, 86, 1.4], [47, 94, 2.2]]));
    b.line(hips, ...b.pts([[56, 71, 1.6], [56, 86, 1.4], [54, 94, 2.2]]));
    b.path([[30, 48, 1], [26, 56, 1]]);
    b.path([[72, 48, 1], [76, 56, 1]]);
    return b.build(24, "The One on Tiptoe", "A", ["Those who stand on tiptoes"]);
  },
  // 25 - Tao, Heaven, Earth, Humanity: the four great things.
  (b) => {
    b.close(b.ring(50, 50, 44, 16, 1.2));
    b.line(...b.arc(50, 72, 30, 180, 360, 7, 1.6));
    b.path([[16, 72, 1.8], [84, 72, 1.8]]);
    b.close(b.ring(50, 46, 3.5, 4, 1.6));
    const neck = b.star(50, 51, 1.6);
    const hips = b.star(50, 62, 1.8);
    b.line(neck, hips);
    b.line(hips, b.star(45, 72, 1.8));
    b.line(hips, b.star(55, 72, 1.8));
    b.path([[43, 56, 1.4], [50, 54, 1.2], [57, 56, 1.4]]);
    return b.build(25, "The Four Great Things", "C", ["Within the universe, these are the four great things."]);
  },
  // 26 - She travels all day without ever leaving her wagon.
  (b) => {
    const box = b.loop([[18, 40, 2], [72, 40, 2], [72, 62, 1.8], [18, 62, 1.8]]);
    b.line(box[0], ...b.pts([[26, 30, 1.4], [40, 24, 1.6], [56, 25, 1.6], [66, 31, 1.4]]), box[1]);
    for (const cx of [32, 60]) {
      b.close(b.ring(cx, 72, 10, 6, 1.6));
      b.star(cx, 72, 2.2);
    }
    b.line(b.star(72, 50, 1.4), b.star(95, 56, 2.2));
    return b.build(26, "The Laden Wagon", "A", ["without ever leaving her wagon."]);
  },
  // 27 - A good knot needs no rope and can not come undone.
  (b) => {
    const top: Point = [50, 12];
    const right: Point = [88, 50];
    const left: Point = [12, 50];
    const at = (u: number, v: number): Point => [
      top[0] + u * (right[0] - top[0]) + v * (left[0] - top[0]),
      top[1] + u * (right[1] - top[1]) + v * (left[1] - top[1]),
    ];
    const grid: number[][] = [];
    for (let i = 0; i < 4; i++) {
      grid.push([]);
      for (let j = 0; j < 4; j++) {
        const [x, y] = at(i / 3, j / 3);
        const corner = (i === 0 || i === 3) && (j === 0 || j === 3);
        grid[i].push(b.star(x, y, corner ? 2.4 : 1.5));
      }
    }
    for (let i = 0; i < 4; i++) {
      b.line(...grid[i]);
      b.line(...grid.map((row) => row[i]));
    }
    // A loop at each corner, pointing outward.
    const loops: [number, Point][] = [
      [grid[0][0], [50, 2]],
      [grid[3][0], [98, 50]],
      [grid[3][3], [50, 98]],
      [grid[0][3], [2, 50]],
    ];
    for (const [corner, [x, y]] of loops) {
      const { x: cx, y: cy } = b.starAt(corner);
      const [mx, my] = [(cx + x) / 2, (cy + y) / 2];
      const [px, py] = [(y - cy) / 2, -(x - cx) / 2];
      b.line(
        corner,
        b.star(mx + px, my + py, 1.2),
        b.star(x, y, 1.6),
        b.star(mx - px, my - py, 1.2),
        corner,
      );
    }
    return b.build(27, "The Knot", "A", ["A good knot needs no rope and it can not come undone."]);
  },
  // 28 - Return to the Uncarved Block: a log, end on.
  (b) => {
    const end = b.ring(24, 50, 12, 8, 1.8, -90, 20);
    b.close(end);
    b.close(b.ring(24, 50, 5, 4, 1.2, -90, 9));
    b.star(24, 50, 2.6);
    const right = b.path([[84, 32, 1.8], [89, 50, 1.6], [84, 68, 1.8]]);
    b.line(end[0], right[0]);
    b.line(end[4], right[2]);
    b.path([[44, 42, 1], [64, 44, 1]]);
    b.path([[48, 58, 1], [72, 56, 1]]);
    return b.build(28, "The Uncarved Block", "A", ["Uncarved Block."]);
  },
  // 29 - The world is a sacred vessel: a bronze ding.
  (b) => {
    const rim = b.path([[20, 34, 2], [28, 34, 1.4], [38, 34, 1.4], [62, 34, 1.4], [72, 34, 1.4], [80, 34, 2]]);
    const belly = b.pts([[18, 48], [26, 62], [40, 68], [60, 68], [74, 62], [82, 48]]);
    b.line(rim[0], ...belly, rim[5]);
    b.line(rim[1], ...b.pts([[28, 20, 2], [38, 20, 2]]), rim[2]);
    b.line(rim[3], ...b.pts([[62, 20, 2], [72, 20, 2]]), rim[4]);
    b.line(belly[1], b.star(24, 90, 2.2));
    b.line(belly[4], b.star(76, 90, 2.2));
    b.line(b.star(50, 68, 1.4), b.star(50, 92, 2.2));
    return b.build(29, "The Sacred Vessel", "A", ["The world is sacred vessel"]);
  },
  // 30 - Where armies march, thorns and briars grow.
  (b) => {
    const stem = b.path([[6, 82, 1.8], [20, 72], [34, 66], [46, 56], [58, 50], [70, 38], [82, 30], [94, 20, 1.8]]);
    const thorns: Point[] = [[16, 64], [34, 74], [44, 48], [60, 58], [66, 30], [86, 40]];
    thorns.forEach(([x, y], index) => b.line(stem[index + 1], b.star(x, y, 1.2)));
    const branch = b.pts([[42, 40, 1.4], [36, 28, 1.6]]);
    b.line(stem[3], ...branch);
    b.close(b.ring(34, 22, 4, 5, 2));
    return b.build(30, "The Bramble", "A", ["thorns and briars bloom and grow."]);
  },
  // 31 - Weapons are the bearers of bad news: a sword in its scabbard.
  (b) => {
    const [ax, ay] = [22, 84];
    const [tx, ty] = [84, 16];
    const length = Math.hypot(tx - ax, ty - ay);
    const [dx, dy] = [(tx - ax) / length, (ty - ay) / length];
    const [px, py] = [-dy, dx];
    const along = (d: number, side = 0, mag = 1.6) =>
      b.star(ax + dx * d + px * side, ay + dy * d + py * side, mag);
    const pommel = along(0, 0, 2.4);
    const guard = along(14, 0, 1.4);
    b.line(pommel, guard);
    b.line(along(14, -9, 1.8), guard, along(14, 9, 1.8));
    const sheathL = [along(17, -3.5, 1.4), along(length - 8, -3.5, 1.4)];
    const sheathR = [along(17, 3.5, 1.4), along(length - 8, 3.5, 1.4)];
    const tip = along(length, 0, 2.6);
    b.line(sheathL[0], sheathL[1], tip, sheathR[1], sheathR[0], sheathL[0]);
    b.line(along(40, -3.5, 1), along(40, 3.5, 1));
    b.line(pommel, ...b.pts([[16, 90, 1.2], [18, 97, 1.6]]));
    return b.build(31, "The Sheathed Sword", "A", ["Weapons are the bearers of bad news;"]);
  },
  // 32 - Streams and rivers flow through valleys to the sea.
  (b) => {
    b.path([[4, 86, 1.2], [16, 82, 1.4], [28, 86, 1.2], [40, 82, 1.4], [52, 86, 1.2], [64, 82, 1.4], [76, 86, 1.2], [88, 82, 1.4], [98, 86, 1.2]]);
    const main = b.path([[50, 82, 2.4], [46, 70, 1.8], [52, 58, 1.8], [48, 46, 1.8]]);
    const left = b.pts([[36, 34, 1.6], [26, 20, 1.4]]);
    b.line(main[3], ...left);
    b.line(main[3], ...b.pts([[58, 30, 1.6], [66, 16, 1.4]]));
    b.line(left[0], ...b.pts([[40, 20, 1.2], [38, 8, 1.2]]));
    b.line(main[2], ...b.pts([[70, 52, 1.4], [86, 40, 1.2]]));
    b.line(main[1], ...b.pts([[28, 62, 1.4], [12, 54, 1.2]]));
    b.nebula([[0, 84], [100, 84], [100, 99], [0, 99]]);
    return b.build(32, "Rivers to the Sea", "A", ["flow through valleys to the sea."]);
  },
  // 33 - Those who persist will reach their goal.
  (b) => {
    const ridge = b.path([[4, 90, 1.4], [22, 62, 1.6], [32, 66, 1.4], [50, 20, 2.6], [62, 40, 1.6], [72, 34, 1.6], [96, 90, 1.4]]);
    b.path([[30, 84, 1], [56, 74, 1.2], [42, 58, 1.2], [50, 36, 1.4]]);
    const flag = b.star(50, 6, 2);
    b.line(ridge[3], flag, b.star(62, 9, 2.2), b.star(50, 13, 1.4));
    return b.build(33, "The Summit", "B", ["Those who persist will reach their goal."]);
  },
  // 34 - The great Tao flows unobstructed in every direction: a spring.
  (b) => {
    const top = b.star(50, 26, 2.8);
    b.line(b.star(50, 80, 1.6), b.star(50, 52, 1.4), top);
    b.line(top, ...b.pts([[40, 24], [30, 30], [22, 44], [18, 60, 1.4]]));
    b.line(top, ...b.pts([[60, 24], [70, 30], [78, 44], [82, 60, 1.4]]));
    b.path([[46, 38, 1.2], [38, 40, 1.4], [32, 52, 1.4], [30, 64, 1.2]]);
    b.path([[54, 38, 1.2], [62, 40, 1.4], [68, 52, 1.4], [70, 64, 1.2]]);
    b.close(b.ring(50, 82, 30, 8, 1.4, 0, 6));
    return b.build(34, "The Spring", "B", ["The great Tao flows unobstructed in every direction."]);
  },
  // 35 - Where there is music ... there is nothing for them to hear.
  (b) => {
    b.loop([[10, 80, 1.6], [86, 18, 1.8], [90, 23, 1.8], [14, 85, 1.6]]);
    const holes: Point[] = [[24, 71], [44, 55], [52, 48.5], [60, 42], [68, 35.5], [76, 29]];
    holes.forEach(([x, y], index) => b.star(x, y, index === 0 ? 2.6 : 2));
    b.path([[32, 60, 1], [36, 64, 1]]);
    b.path([[80, 20, 1.2], [84, 24, 1.2]]);
    b.line(b.star(12, 83, 1.2), ...b.pts([[8, 92, 1.4], [4, 97, 1.8]]));
    return b.build(35, "The Silent Flute", "B", ["Where there is music and good food,"]);
  },
  // 36 - Just as fish remain hidden in deep waters.
  (b) => {
    const body = b.loop([[80, 58, 2.2], [68, 48], [52, 44, 1.6], [38, 48], [28, 56], [16, 46, 2], [20, 58, 1.2], [16, 70, 2], [28, 60], [40, 66], [56, 68, 1.6], [70, 64]]);
    b.line(body[2], b.star(44, 36, 1.6), body[3]);
    b.star(73, 55, 2.6);
    b.path([[6, 26, 1.2], [20, 22, 1.4], [34, 26, 1.2], [48, 22, 1.4], [62, 26, 1.2], [76, 22, 1.4], [94, 26, 1.2]]);
    b.nebula([[0, 30], [100, 30], [100, 98], [0, 98]]);
    return b.build(36, "The Hidden Fish", "A", ["Just as fish remain hidden in deep waters,"], 0.3);
  },
  // 37 - The world would naturally settle into peace: moon on still water.
  (b) => {
    b.close(b.ring(50, 26, 14, 10, 2));
    b.path([[4, 56, 1.4], [26, 56, 1.4], [50, 56, 1.6], [74, 56, 1.4], [96, 56, 1.4]]);
    b.path([[38, 64, 1.6], [62, 64, 1.6]]);
    b.path([[42, 72, 1.4], [58, 72, 1.4]]);
    b.path([[46, 80, 1.2], [54, 80, 1.2]]);
    return b.build(37, "Moon on Still Water", "C", ["the world would naturally settle into peace."]);
  },
  // 38 - The master abides in the fruit and not in the husk: a peach.
  (b) => {
    const peach = b.loop([[50, 34, 1.8], [62, 28], [74, 34], [80, 48, 2], [76, 64], [64, 78], [50, 88, 2.2], [36, 78], [24, 64], [20, 48, 2], [26, 34], [38, 28]]);
    b.line(peach[0], ...b.pts([[46, 50, 1.2], [48, 68, 1.2]]));
    const stem = b.star(52, 22, 1.6);
    b.line(peach[0], stem);
    b.line(stem, ...b.pts([[62, 13, 1.6], [76, 11, 2], [67, 22, 1.6]]), stem);
    return b.build(38, "The Fruit and the Husk", "A", ["The master abides in the fruit and not in the husk."]);
  },
  // 39 - Be as dull as a common stone, not a precious gem.
  (b) => {
    b.loop([[18, 64, 2], [24, 46], [40, 36, 2.2], [60, 36], [76, 44, 2], [84, 60], [76, 76], [54, 82, 2], [32, 80]]);
    b.pts([[44, 56, 1], [60, 62, 1]]);
    const gem = b.loop([[80, 16, 1], [86, 10, 1], [94, 16, 1], [86, 28, 1]]);
    b.line(gem[0], gem[2]);
    return b.build(39, "The Common Stone", "C", ["but be as dull as a common stone."]);
  },
  // 40 - All movement returns to the Tao: a swallow coming home.
  (b) => {
    const head = b.star(76, 30, 2.4);
    const body = b.star(62, 38, 2);
    const tail = b.star(46, 46, 1.8);
    b.line(head, body, tail);
    b.line(body, ...b.pts([[54, 24, 1.6], [40, 8, 2]]));
    b.line(body, ...b.pts([[70, 52, 1.6], [64, 72, 2]]));
    b.line(tail, b.star(26, 44, 2));
    b.line(tail, b.star(32, 58, 2));
    // Its way home, as a trail of faint stars.
    b.pts(b.arcPoints(50, 64, 34, 22, 150, 30, 6).map(([x, y]) => [x, y, 1]));
    return b.build(40, "The Returning Swallow", "C", ["All movement returns to the Tao."]);
  },
  // 41 - The greatest sounds cannot be heard: a silent bell.
  (b) => {
    b.close(b.ring(50, 8, 4, 4, 1.6));
    const shoulders = b.path([[38, 16, 1.8], [62, 16, 1.8]]);
    const lip = b.path([[20, 84, 2.2], [35, 88], [50, 89, 1.6], [65, 88], [80, 84, 2.2]]);
    b.line(shoulders[0], ...b.pts([[32, 30], [29, 50], [26, 70]]), lip[0]);
    b.line(shoulders[1], ...b.pts([[68, 30], [71, 50], [74, 70]]), lip[4]);
    b.path([[30, 40, 1.2], [70, 40, 1.2]]);
    b.pts([[40, 50, 1.2], [50, 50, 1.2], [60, 50, 1.2], [40, 60, 1.2], [50, 60, 1.2], [60, 60, 1.2]]);
    return b.build(41, "The Silent Bell", "B", ["the greatest sounds cannot be heard,"]);
  },
  // 42 - All things carry yin yet embrace yang.
  (b) => {
    const outer = b.ring(50, 50, 42, 16, 2.2);
    // The S curve, clear of the rim so it doesn't knot into the circle.
    const upper = b.arc(50, 29, 21, -150, -210, 3, 1.8);
    const middle = b.star(50, 50, 2.6);
    const lower = b.arc(50, 71, 21, -30, 30, 3, 1.8);
    // Dark eye in the light half: a hollow ring. Light eye in the dark half.
    const hollowEye = b.ring(50, 29, 4, 5, 1);
    b.star(50, 71, 3);
    b.close(outer);
    b.line(outer[0], ...upper, middle, ...lower, outer[8]);
    b.close(hollowEye);
    // Half the dust fills the yang half, so the light side reads as light.
    b.nebula([
      ...b.arcPoints(50, 50, 42, 42, -90, 90, 14),
      ...b.arcPoints(50, 71, 21, 21, 90, -90, 8),
      ...b.arcPoints(50, 29, 21, 21, 90, 270, 8),
    ]);
    return b.build(42, "Yin and Yang", "A", ["All things carry Yin", "yet embrace Yang."], 0.5);
  },
  // 43 - That which offers no resistance enters where there is no space.
  (b) => {
    const shaft = b.path([[26, 92, 1.6], [32, 78], [42, 60], [54, 42], [66, 26], [78, 12, 2.4]]);
    b.line(shaft[1], ...b.pts([[26, 64], [28, 50], [36, 36], [48, 24], [62, 14]]), shaft[5]);
    b.line(shaft[1], ...b.pts([[44, 74], [56, 60], [66, 46], [74, 30]]), shaft[5]);
    return b.build(43, "The Feather", "C", ["That which offers no resistance,"]);
  },
  // 44 - Knowing when to stop will keep you from danger.
  (b) => {
    b.path([[22, 8, 2], [78, 8, 2]]);
    b.path([[22, 92, 2], [78, 92, 2]]);
    b.path([[34, 12], [36, 28], [47, 46, 1.4], [47, 54, 1.4], [36, 72], [34, 88]]);
    b.path([[66, 12], [64, 28], [53, 46, 1.4], [53, 54, 1.4], [64, 72], [66, 88]]);
    b.path([[40, 33, 1.4], [60, 33, 1.4]]);
    b.path([[38, 88, 1.6], [50, 78, 2.4], [62, 88, 1.6]]);
    b.pts([[50, 58, 1], [50, 66, 1.2]]);
    return b.build(44, "The Hourglass", "B", ["and knowing when to stop will keep you from danger"]);
  },
  // 45 - The greatest straightness seems crooked: a staff and gourd.
  (b) => {
    b.path([[30, 94, 1.6], [34, 76], [31, 60], [38, 44], [35, 28], [42, 14], [50, 8, 2.2]]);
    const knot = b.star(44, 12, 1.2);
    const gourdTop = b.ring(56, 26, 4, 5, 1.6);
    b.line(knot, gourdTop[0]);
    b.close(gourdTop);
    b.close(b.ring(58, 39, 7.5, 7, 1.8));
    return b.build(45, "The Crooked Staff", "B", ["The greatest straightness seems crooked."]);
  },
  // 46 - Horses run free to fertilize the fields.
  (b) => {
    const head = b.loop([[94, 40, 2], [86, 24, 1.6], [82, 13, 2], [77, 22, 1.4], [75, 36, 1.4], [86, 46, 1.6]]);
    const withers = b.star(60, 34, 1.8);
    const chest = b.star(68, 54, 1.8);
    b.line(head[3], withers);
    b.line(head[4], chest);
    const croup = b.star(26, 38, 2);
    b.line(withers, b.star(44, 38, 1.6), croup);
    const hind = b.star(28, 54, 1.6);
    b.line(chest, ...b.pts([[54, 58, 1.4], [38, 58, 1.4]]), hind, croup);
    b.line(croup, ...b.pts([[16, 40, 1.4], [8, 48, 1.4], [6, 62, 1.8]]));
    b.line(chest, ...b.pts([[80, 64, 1.4], [91, 70, 1.8]]));
    b.line(chest, ...b.pts([[66, 68, 1.4], [70, 82, 1.8]]));
    b.line(hind, ...b.pts([[20, 66, 1.4], [8, 72, 1.8]]));
    b.line(hind, ...b.pts([[36, 70, 1.4], [30, 84, 1.8]]));
    b.path([[74, 20, 1], [64, 28, 1.2]]);
    return b.build(46, "The Free Horse", "B", ["horses run free to fertilize the fields."]);
  },
  // 47 - Without looking out your window.
  (b) => {
    b.loop([[18, 14, 2], [82, 14, 2], [82, 82, 2], [18, 82, 2]]);
    const [top, bottom] = b.pts([[50, 14, 1.4], [50, 82, 1.4]]);
    const [left, right] = b.pts([[18, 48, 1.4], [82, 48, 1.4]]);
    const centre = b.star(50, 48, 1.6);
    b.line(top, centre, bottom);
    b.line(left, centre, right);
    b.path([[12, 90, 1.4], [88, 90, 1.4]]);
    b.path([[64, 22, 1.4], [70, 28, 2], [64, 36, 1.4]]);
    return b.build(47, "The Window", "A", ["Without looking out your window,"]);
  },
  // 48 - Unlearn something new every day: leaves falling from a branch.
  (b) => {
    b.path([[4, 10, 1.6], [30, 14, 1.8], [54, 10, 1.6], [72, 16, 1.4]]);
    for (const [x, y, angle] of [[32, 38, 20], [62, 58, -30], [40, 82, 10]]) {
      const rad = (angle * Math.PI) / 180;
      const rot = (u: number, v: number): StarPoint => [
        x + u * Math.cos(rad) - v * Math.sin(rad),
        y + u * Math.sin(rad) + v * Math.cos(rad),
        1.6,
      ];
      const leaf = b.loop([rot(-7, 0), rot(0, -3.5), rot(7, 0), rot(0, 3.5)]);
      const [sx, sy] = rot(10, 0);
      b.line(leaf[2], b.star(sx, sy, 1.2));
    }
    b.pts([[42, 24, 1], [26, 50, 1], [52, 70, 1]]);
    return b.build(48, "Falling Leaves", "C", ["One who seeks the Tao unlearns something new every day."]);
  },
  // 49 - She treats them all as her children: a nest.
  (b) => {
    const bowl = b.path([[14, 62, 1.8], [24, 76], [50, 84, 2], [76, 76], [86, 62, 1.8]]);
    b.line(bowl[0], bowl[4]);
    b.path([[26, 70, 1], [44, 78, 1]]);
    b.path([[56, 78, 1], [74, 70, 1]]);
    for (const x of [34, 50, 66]) {
      const head = b.star(x, 55, 2);
      b.line(b.star(x - 3, 46, 1.4), head, b.star(x + 3, 46, 1.4));
    }
    const body = b.star(52, 24, 2);
    b.line(b.star(34, 22, 1.4), body, b.star(66, 20, 2.2));
    b.line(body, ...b.pts([[46, 10, 1.6], [40, 4, 1.8]]));
    b.line(body, ...b.pts([[62, 12, 1.6], [70, 6, 1.8]]));
    return b.build(49, "The Nest", "B", ["Yet she treats them all as her children."]);
  },
  // 50 - Those who celebrate life walk safely among the wild animals.
  (b) => {
    const head = b.loop([[84, 30, 1.8], [90, 34, 1.6], [92, 44, 2], [86, 50, 1.6], [78, 44, 1.6]]);
    b.star(88, 38, 2.4);
    const back = b.path([[78, 36, 1.4], [66, 36, 1.6], [46, 34, 1.6], [26, 38, 1.8]]);
    b.line(head[0], back[0]);
    b.line(back[3], ...b.pts([[16, 34, 1.4], [10, 24, 1.4], [14, 16, 1.8]]));
    const belly = b.path([[76, 56, 1.4], [52, 58, 1.4], [30, 56, 1.4]]);
    b.line(head[3], belly[0]);
    b.line(back[3], belly[2]);
    b.line(belly[0], b.star(76, 80, 1.8));
    b.line(b.star(66, 57, 1.2), b.star(62, 80, 1.8));
    b.line(belly[2], b.star(28, 80, 1.8));
    b.line(b.star(40, 57, 1.2), b.star(44, 80, 1.8));
    for (const x of [40, 50, 60]) b.path([[x, 37, 1], [x + 2, 48, 1]]);
    return b.build(50, "The Tiger", "C", ["walk safely among the wild animals."]);
  },
  // 51 - It gives them a place of refuge: cupped hands around a sprout.
  (b) => {
    b.path([[28, 44, 2], [20, 56, 1.6], [26, 72], [40, 82], [50, 84, 1.8], [60, 82], [74, 72], [80, 56, 1.6], [72, 44, 2]]);
    b.path([[40, 82, 1.2], [36, 96, 1.4]]);
    b.path([[60, 82, 1.2], [64, 96, 1.4]]);
    const base = b.star(50, 72, 1.6);
    const top = b.star(50, 52, 2);
    b.line(base, top);
    b.line(b.star(50, 60, 1.2), b.star(42, 50, 2.4));
    b.line(top, b.star(58, 44, 2.4));
    return b.build(51, "Cupped Hands", "B", ["gives them a place of refuge and peace,"]);
  },
  // 52 - Use your inner light for understanding: a lamp.
  (b) => {
    b.loop([[50, 14, 2.8], [56, 28, 2], [50, 36, 1.8], [44, 28, 2]]);
    const dish = b.path([[28, 42, 1.8], [38, 49], [62, 49], [72, 42, 1.8]]);
    b.line(dish[0], dish[3]);
    const stand = b.star(50, 78, 1.4);
    b.line(b.star(50, 49, 1.2), stand);
    b.line(b.star(36, 86, 1.8), stand, b.star(64, 86, 1.8));
    for (const angle of [-150, -120, -90, -60, -30]) {
      const rad = (angle * Math.PI) / 180;
      b.path([[50 + 17 * Math.cos(rad), 26 + 17 * Math.sin(rad), 1], [50 + 23 * Math.cos(rad), 26 + 23 * Math.sin(rad), 1.2]]);
    }
    return b.build(52, "The Lamp", "B", ["To use your inner light for understanding"]);
  },
  // 53 - No one out working the fields: a plough.
  (b) => {
    const handle = b.star(18, 14, 2);
    const stilt = b.star(32, 56, 1.6);
    b.line(handle, b.star(26, 34, 1.4), stilt);
    b.line(stilt, ...b.pts([[40, 70, 1.8], [60, 72, 2.2]]), stilt);
    b.line(b.star(28, 36, 1.2), ...b.pts([[50, 34, 1.4], [72, 38, 1.4], [90, 44, 2]]));
    b.path([[4, 82, 1.2], [36, 80, 1.2], [66, 82, 1.2], [96, 80, 1.2]]);
    b.path([[10, 91, 1], [50, 90, 1], [90, 91, 1]]);
    return b.build(53, "The Plough", "B", ["because there is no one out working the fields."]);
  },
  // 54 - That which is well built will never be torn down.
  (b) => {
    const roof = b.path([[4, 36, 1.6], [12, 40, 1.8], [30, 22], [50, 18, 2], [70, 22], [88, 40, 1.8], [96, 36, 1.6]]);
    b.line(roof[3], b.star(50, 11, 2.4));
    const walls = b.pts([[18, 40, 1.4], [18, 84, 1.8], [82, 84, 1.8], [82, 40, 1.4]]);
    b.line(...walls);
    b.line(roof[1], walls[0]);
    b.line(roof[5], walls[3]);
    b.line(b.star(42, 84, 1.2), ...b.pts([[42, 60, 1.6], [58, 60, 1.6]]), b.star(58, 84, 1.2));
    b.loop([[25, 50, 1.2], [34, 50, 1.2], [34, 61, 1.2], [25, 61, 1.2]]);
    b.loop([[66, 50, 1.2], [75, 50, 1.2], [75, 61, 1.2], [66, 61, 1.2]]);
    return b.build(54, "The Well-Built House", "A", ["That which is well built"]);
  },
  // 55 - One who is filled with the Tao is like a newborn child.
  (b) => {
    b.close(b.ring(32, 42, 11, 8, 1.8));
    b.path([[27, 42, 1], [31, 43, 1]]);
    b.path([[34, 43, 1], [38, 42, 1]]);
    b.loop([[42, 32, 1.6], [62, 28], [80, 34], [88, 48, 2], [82, 60], [62, 64], [42, 58]]);
    b.path([[48, 34, 1.2], [56, 62, 1.2]]);
    b.close(b.ring(46, 70, 3.5, 4, 2.2));
    b.path([[48, 96, 1.4], [46, 74, 1.4]]);
    return b.build(55, "The Newborn", "A", ["is like a newborn child."]);
  },
  // 56 - Stop talking, meditate in silence: a seated sage.
  (b) => {
    b.close(b.ring(50, 18, 6.5, 6, 1.8));
    const neck = b.star(50, 27, 1.6);
    const shoulders = b.pts([[38, 33, 1.8], [62, 33, 1.8]]);
    b.line(shoulders[0], neck, shoulders[1]);
    const lap = b.star(50, 62, 2.4);
    b.line(neck, b.star(50, 54, 1.4));
    b.line(shoulders[0], b.star(31, 50, 1.6), lap);
    b.line(shoulders[1], b.star(69, 50, 1.6), lap);
    b.loop([[20, 74, 1.8], [34, 66], [50, 67, 1.4], [66, 66], [80, 74, 1.8], [64, 82], [50, 84, 1.6], [36, 82]]);
    b.pts(b.arcPoints(50, 18, 15, 15, 200, 340, 5).map(([x, y]) => [x, y, 1]));
    return b.build(56, "The Silent Sage", "A", ["meditate in silence,"]);
  },
  // 57 - I let go of all my desires: an open palm.
  (b) => {
    const palm = b.loop([[36, 58, 1.6], [44, 54], [52, 53], [60, 55], [66, 60, 1.6], [64, 80], [52, 88, 1.6], [40, 84]]);
    b.line(palm[0], ...b.pts([[28, 50, 1.4], [20, 42, 2]]));
    b.line(palm[1], ...b.pts([[40, 38, 1.4], [38, 24, 2]]));
    b.line(palm[2], ...b.pts([[50, 34, 1.4], [50, 18, 2.2]]));
    b.line(palm[3], ...b.pts([[60, 36, 1.4], [62, 22, 2]]));
    b.line(palm[4], ...b.pts([[70, 44, 1.4], [74, 34, 1.8]]));
    b.line(palm[6], b.star(52, 98, 1.2));
    return b.build(57, "The Open Palm", "C", ["I let go of all my desires,"]);
  },
  // 58 - Good fortune has its roots in disaster: a lotus from the mud.
  (b) => {
    const flower = b.loop([
      [34, 46, 1.4], [16, 32, 2], [31, 38, 1.2], [30, 17, 2], [42, 31, 1.2],
      [50, 6, 2.6], [58, 31, 1.2], [70, 17, 2], [69, 38, 1.2], [84, 32, 2],
      [66, 46, 1.4], [50, 48, 1.6],
    ]);
    const root = b.star(50, 86, 1.6);
    b.line(flower[11], b.star(52, 66, 1.2), root);
    b.path([[4, 64, 1.2], [26, 62, 1.4], [48, 65, 1.2], [70, 62, 1.4], [96, 64, 1.2]]);
    b.loop([[62, 64, 1.2], [72, 61, 1.4], [82, 64, 1.2], [72, 67, 1.2]]);
    b.line(root, b.star(40, 94, 1.2));
    b.line(root, b.star(60, 94, 1.2));
    b.nebula([[0, 78], [100, 78], [100, 99], [0, 99]]);
    return b.build(58, "Lotus in the Mud", "B", ["Good fortune has its roots in disaster,"]);
  },
  // 59 - The deep root and the firm trunk.
  (b) => {
    const [, trunkBase] = b.path([[8, 50, 1.2], [50, 50, 1.6], [92, 50, 1.2]]);
    const trunkTop = b.star(50, 32, 1.8);
    b.line(trunkBase, trunkTop);
    b.line(trunkTop, ...b.pts([[32, 32], [28, 20], [38, 8, 1.8], [50, 4, 2], [62, 8, 1.8], [72, 20], [68, 32]]), trunkTop);
    const split = b.star(50, 58, 1.8);
    b.line(trunkBase, split);
    b.line(split, ...b.pts([[50, 72, 1.6], [48, 86, 1.4], [50, 98, 2]]));
    const left = b.pts([[34, 66, 1.6], [22, 80, 1.4], [14, 94, 1.8]]);
    b.line(split, ...left);
    const right = b.pts([[66, 66, 1.6], [78, 80, 1.4], [86, 94, 1.8]]);
    b.line(split, ...right);
    b.line(left[0], b.star(32, 88, 1.2));
    b.line(right[0], b.star(68, 88, 1.2));
    return b.build(59, "The Deep Root", "A", ["This is spoken of as the deep root and the firm trunk,"]);
  },
  // 60 - Governing a large country is like frying small fish.
  (b) => {
    const pan = b.ring(46, 58, 34, 10, 1.8, 0, 14);
    b.close(pan);
    b.line(pan[0], b.star(97, 50, 2.2));
    for (const [x, flip] of [[36, 1], [58, -1]]) {
      const fish = b.loop([[x - 7 * flip, 58, 1.6], [x, 54.5, 1.6], [x + 7 * flip, 58, 2], [x, 61.5, 1.6]]);
      b.line(b.star(x - 11 * flip, 54, 1.2), fish[0], b.star(x - 11 * flip, 62, 1.2));
    }
    b.path([[38, 38, 1], [36, 30, 1.2], [39, 22, 1.4]]);
    b.path([[50, 36, 1], [48, 28, 1.2], [51, 18, 1.4]]);
    b.path([[62, 38, 1], [60, 30, 1.2], [63, 22, 1.4]]);
    return b.build(60, "The Small Fish", "A", ["is like frying small fish."]);
  },
  // 61 - A large country should take the low place: a figure bowing.
  (b) => {
    b.close(b.ring(69, 48, 4.5, 5, 1.6));
    const shoulders = b.star(63, 41, 2);
    const hips = b.star(40, 40, 2);
    b.line(hips, shoulders);
    b.line(shoulders, ...b.pts([[64, 52, 1.2], [62, 62, 1.8]]));
    b.line(hips, ...b.pts([[36, 66, 1.4], [34, 90, 1.8]]));
    b.line(hips, ...b.pts([[44, 66, 1.4], [46, 90, 1.8]]));
    b.path([[20, 92, 1.2], [62, 92, 1.2]]);
    return b.build(61, "The Bowing Figure", "B", ["A large country should take the low place like a great watershed,"]);
  },
  // 62 - The Tao is the tabernacle of creation: a temple.
  (b) => {
    b.path([[22, 20, 1.6], [30, 24], [50, 12, 2.4], [70, 24], [78, 20, 1.6]]);
    const lower = b.path([[6, 42, 1.6], [16, 46], [28, 40], [72, 40], [84, 46], [94, 42, 1.6]]);
    b.line(b.star(38, 20, 1.2), lower[2]);
    b.line(b.star(62, 20, 1.2), lower[3]);
    b.line(b.star(26, 46, 1.4), b.star(26, 84, 1.8));
    b.line(b.star(74, 46, 1.4), b.star(74, 84, 1.8));
    b.line(b.star(44, 84, 1.2), ...b.pts([[44, 62, 1.4], [56, 62, 1.4]]), b.star(56, 84, 1.2));
    b.path([[16, 86, 1.4], [84, 86, 1.4]]);
    b.path([[10, 93, 1.4], [90, 93, 1.4]]);
    return b.build(62, "The Temple", "A", ["The Tao is the tabernacle of creation,"]);
  },
  // 63 - Great projects are best started while they are small: a cairn.
  (b) => {
    b.close(b.ring(50, 84, 22, 7, 1.8, 0, 8));
    b.close(b.ring(50, 66, 16, 6, 1.8, 0, 7));
    b.close(b.ring(50, 51, 11, 5, 1.8, 0, 5.5));
    b.close(b.ring(50, 40, 6, 4, 2, 0, 4));
    b.star(50, 32, 3);
    return b.build(63, "The Cairn", "B", ["Great projects are best started while they are small."]);
  },
  // 64 - The tallest tree begins as a tiny sprout.
  (b) => {
    const ground = b.path([[6, 90, 1.4], [22, 91, 1.2], [38, 90, 2.2], [58, 91, 1.2], [77, 90, 2], [94, 90, 1.4]]);
    const fork = b.star(41, 58, 2.4);
    b.line(ground[2], b.star(39, 74, 1.8), fork);
    b.line(fork, ...b.pts([[30, 45, 1.6], [21, 35, 1.4]]));
    b.line(fork, ...b.pts([[43, 38, 1.6], [45, 21, 1.6]]));
    b.line(fork, ...b.pts([[53, 44, 1.6], [63, 32, 1.4]]));
    const canopy: Point[] = [[14, 48], [10, 34], [18, 20], [30, 11], [44, 7], [58, 10], [70, 19], [76, 32], [72, 46], [62, 53], [48, 55], [34, 55], [22, 54]];
    b.close(canopy.map(([x, y], index) => b.star(x, y, index % 3 === 0 ? 2.2 : 1.5)));
    // The sprout is small but the brightest thing on the ground.
    const sproutTop = b.star(77, 82, 2.6);
    b.line(ground[4], sproutTop, b.star(71, 77, 3));
    b.line(sproutTop, b.star(83, 78, 3));
    b.nebula(canopy);
    return b.build(64, "The Tree and the Sprout", "A", ["The tallest tree", "begins as a tiny sprout."]);
  },
  // 65 - Knowing the two alternatives is a pattern: a loom.
  (b) => {
    b.loop([[16, 12, 2], [84, 12, 2], [84, 88, 2], [16, 88, 2]]);
    for (const x of [30, 42, 58, 70]) b.path([[x, 12, 1.2], [x, 88, 1.2]]);
    b.path([[16, 40, 1.4], [30, 36, 1.4], [42, 44, 1.4], [58, 36, 1.4], [70, 44, 1.4], [84, 40, 1.4]]);
    b.path([[16, 60, 1.4], [30, 64, 1.4], [42, 56, 1.4], [58, 64, 1.4], [70, 56, 1.4], [84, 60, 1.4]]);
    return b.build(65, "The Loom", "C", ["Knowing the two alternatives is a pattern."]);
  },
  // 66 - Rivers and seas rule the streams of a hundred valleys: a great wave.
  (b) => {
    b.path([[4, 82, 1.4], [18, 72], [32, 56], [44, 42], [58, 32, 2], [72, 31, 2.2], [83, 38], [86, 50, 2], [79, 57], [71, 52], [73, 44, 2.4]]);
    b.path([[58, 32, 1.2], [60, 24, 1.4]]);
    b.path([[72, 31, 1.2], [76, 23, 1.4]]);
    b.path([[36, 90, 1.2], [52, 84, 1.4], [68, 90, 1.2], [84, 84, 1.4], [98, 88, 1.2]]);
    b.star(18, 22, 2.6);
    b.nebula([[4, 84], [32, 58], [58, 34], [80, 36], [86, 54], [98, 90], [4, 96]]);
    return b.build(66, "The Sea", "A", ["Rivers and seas are rulers"]);
  },
  // 67 - Three jewels: compassion, moderation, and humility.
  (b) => {
    for (const [x, y] of [[50, 32], [34, 60], [66, 60]] as Point[]) {
      b.close(b.ring(x, y, 9, 6, 1.6));
      b.star(x, y, 2.8);
    }
    b.path([[22, 78, 1.4], [36, 84, 1.6], [50, 86, 1.8], [64, 84, 1.6], [78, 78, 1.4]]);
    b.path(b.arcPoints(50, 60, 34, 42, 160, 380, 7).map(([x, y]) => [x, y, 1]));
    return b.build(67, "The Three Jewels", "A", ["There are three jewels that I cherish:"]);
  },
  // 68 - The best warriors do not use violence: a shield.
  (b) => {
    b.loop([[22, 14, 2], [50, 10, 1.8], [78, 14, 2], [78, 46], [70, 68], [50, 90, 2.2], [30, 68], [22, 46]]);
    b.close(b.ring(50, 44, 8, 6, 1.6));
    b.star(50, 44, 2.6);
    return b.build(68, "The Shield", "B", ["The best warriors"]);
  },
  // 69 - Better to retreat a foot than advance an inch: steps backward.
  (b) => {
    for (const [x, y, flip] of [[36, 20, 1], [58, 44, -1], [40, 72, 1]]) {
      b.loop([[x, y, 1.6], [x + 5 * flip, y + 4], [x + 5 * flip, y + 14], [x + 1 * flip, y + 20, 1.6], [x - 3 * flip, y + 13], [x - 3 * flip, y + 4]]);
      b.pts([[x - 2 * flip, y - 5, 1.4], [x + 2 * flip, y - 6, 1.4], [x + 6 * flip, y - 4, 1.2]]);
    }
    return b.build(69, "Steps Backward", "A", ["It is better to retreat a foot"]);
  },
  // 70 - My teachings come from the ancients: a scroll.
  (b) => {
    for (const x of [14, 80]) {
      b.loop([[x, 20, 1.6], [x + 6, 20, 1.6], [x + 6, 80, 1.6], [x, 80, 1.6]]);
      b.star(x + 3, 14, 2);
      b.star(x + 3, 86, 2);
    }
    b.path([[20, 24, 1.2], [80, 24, 1.2]]);
    b.path([[20, 76, 1.2], [80, 76, 1.2]]);
    for (const x of [34, 46, 58, 70]) b.path([[x, 32, 1], [x, 66, 1]]);
    return b.build(70, "The Scroll", "B", ["My teachings come from the ancients,"]);
  },
  // 71 - Recognize the illness to seek a cure: a healing herb.
  (b) => {
    b.path([[18, 60, 1.2], [82, 60, 1.2]]);
    const top = b.star(50, 32, 2);
    b.line(b.star(50, 60, 1.6), top);
    for (const [x, y] of [[26, 22], [50, 8], [74, 22]] as Point[]) {
      const tip = b.star(x, y, 1.8);
      b.line(top, tip);
      b.line(b.star(x - 6, y + 6, 1.2), tip, b.star(x + 6, y + 6, 1.2));
    }
    b.close(b.ring(50, 26, 3, 4, 2.4));
    const root = b.star(47, 76, 1.6);
    b.line(b.star(50, 62, 1.2), root, b.star(40, 92, 1.8));
    b.line(root, ...b.pts([[58, 84, 1.4], [62, 94, 1.6]]));
    return b.build(71, "The Healing Herb", "C", ["can you move to seek a cure."]);
  },
  // 72 - The Master knows herself but is not arrogant: a hand mirror.
  (b) => {
    const glass = b.ring(50, 36, 26, 12, 1.8);
    b.close(glass);
    b.path([[50, 62, 1.6], [50, 90, 1.6], [50, 96, 2.2]]);
    b.path([[34, 30, 1.4], [42, 20, 1.4]]);
    b.path([[38, 38, 1.2], [48, 26, 1.2]]);
    return b.build(72, "The Mirror", "B", ["Therefore, the Master knows herself but is not arrogant."]);
  },
  // 73 - The nets of Heaven are wide, but nothing escapes.
  (b) => {
    const rows = 4;
    const cols = 7;
    const grid: number[][] = [];
    for (let r = 0; r < rows; r++) {
      grid.push([]);
      for (let c = 0; c < cols; c++) {
        const x = 8 + c * 14 + (r % 2) * 7;
        const sag = 10 * Math.sin((Math.PI * x) / 100);
        grid[r].push(b.star(x, 20 + r * 18 + sag, r === 0 ? 2 : 1.4));
      }
    }
    b.line(...grid[0]);
    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < cols; c++) {
        const shift = r % 2 === 0 ? -1 : 0;
        const a = grid[r + 1][c + shift];
        const d = grid[r + 1][c + shift + 1];
        if (a !== undefined) b.line(grid[r][c], a);
        if (d !== undefined) b.line(grid[r][c], d);
      }
    }
    return b.build(73, "The Net of Heaven", "A", ["The nets of Heaven are wide,"]);
  },
  // 74 - Taking the place of a great lumberjack: an axe.
  (b) => {
    const handle = b.path([[26, 94, 2], [36, 70], [46, 46], [54, 26], [58, 14, 1.6]]);
    const blade = b.pts([[60, 12, 1.6], [78, 6, 1.8], [88, 14, 2.2], [92, 26, 2.4], [86, 38, 2.2], [66, 30, 1.6]]);
    b.line(handle[4], ...blade, handle[3]);
    b.line(handle[4], b.star(46, 10, 1.6), handle[3]);
    return b.build(74, "The Axe", "A", ["trying to take the place of a great lumberjack."]);
  },
  // 75 - Only those who do not cling to their life can save it.
  (b) => {
    const dome = b.arc(46, 42, 28, 180, 360, 5, 1.8);
    b.line(...dome);
    b.line(dome[2], b.star(46, 6, 2));
    const base = b.path([[18, 88, 1.8], [74, 88, 1.8]]);
    b.line(dome[0], base[0]);
    b.line(dome[4], base[1]);
    for (const index of [1, 2, 3]) {
      b.line(dome[index], b.star(18 + index * 14, 88, 1.2));
    }
    b.loop([[74, 60, 1.2], [90, 54, 1.4], [90, 80, 1.4], [74, 86, 1.2]]);
    b.path([[80, 20, 1.6], [86, 25, 2.2], [94, 16, 1.6]]);
    return b.build(75, "The Open Cage", "B", ["Only those who do not cling to their life can save it."]);
  },
  // 76 - The soft and yielding will overcome.
  (b) => {
    b.path([[10, 92, 1.2], [90, 92, 1.2]]);
    const reed = b.path([[30, 92, 1.6], [32, 72], [38, 52], [48, 34], [62, 22], [76, 18, 2.4]]);
    b.line(reed[1], b.star(18, 60, 1.6));
    b.line(reed[2], b.star(52, 50, 1.6));
    b.line(reed[5], b.star(82, 24, 1.8));
    b.line(b.star(68, 92, 1.8), ...b.pts([[70, 70, 1.4], [72, 62, 1.8], [67, 60, 1.4]]));
    b.path([[74, 90, 1.4], [92, 84, 1.6]]);
    b.line(b.star(84, 87, 1), b.star(86, 80, 1.2));
    return b.build(76, "The Reed and the Broken Branch", "A", ["The soft and yielding will overcome."]);
  },
  // 77 - The Tao of Heaven is like the drawing of a bow.
  (b) => {
    b.close(b.ring(30, 17, 5.5, 5, 1.8));
    const shoulder = b.star(34, 31, 2.4);
    const hips = b.star(35, 57, 2.2);
    b.line(shoulder, hips);
    b.line(hips, b.star(45, 72, 1.8), b.star(51, 89, 2));
    b.line(hips, b.star(29, 73, 1.8), b.star(22, 89, 2));
    const bowHand = b.star(70, 34, 2.4);
    const drawHand = b.star(41, 26, 2.2);
    b.line(shoulder, b.star(52, 33, 1.6), bowHand);
    b.line(shoulder, b.star(19, 27, 1.8), drawHand);
    // The top is bent downward; the bottom is bent up.
    const bowTop = b.star(58, 6, 2.6);
    const bowBottom = b.star(58, 62, 2.6);
    b.line(bowTop, ...b.pts([[66, 12, 1.4], [70, 22, 1.4]]), bowHand, ...b.pts([[70, 45, 1.4], [66, 55, 1.4]]), bowBottom);
    b.line(bowTop, drawHand, bowBottom);
    const tip = b.star(90, 30, 3);
    b.line(drawHand, tip);
    b.line(b.star(85, 26, 1.2), tip, b.star(85, 34, 1.2));
    return b.build(77, "The Archer", "A", ["The Tao of Heaven works in the world", "like the drawing of a bow."]);
  },
  // 78 - Nothing is better than water for overcoming the hard.
  (b) => {
    b.loop([[24, 74, 1.6], [28, 58], [40, 48, 1.8], [48, 50], [52, 56, 1.4], [56, 50], [66, 50, 1.8], [76, 60], [78, 74, 1.6]]);
    b.loop([[52, 22, 2.4], [55, 30, 1.8], [52, 34, 1.6], [49, 30, 1.8]]);
    b.pts([[52, 8, 1], [52, 14, 1.2]]);
    b.path([[2, 80, 1.2], [12, 76, 1.4], [24, 80, 1.2]]);
    b.path([[78, 80, 1.2], [88, 76, 1.4], [98, 80, 1.2]]);
    b.path([[10, 90, 1], [50, 88, 1.2], [90, 90, 1]]);
    return b.build(78, "Water and Stone", "A", ["Water is the softest and most yielding substance."]);
  },
  // 79 - The Tao does not choose sides: a balance.
  (b) => {
    const top = b.star(50, 12, 2.4);
    const beamL = b.star(16, 24, 2);
    const beamR = b.star(84, 24, 2);
    const pivot = b.star(50, 24, 1.8);
    b.line(beamL, pivot, beamR);
    b.line(top, pivot, b.star(50, 86, 1.6));
    b.path([[34, 90, 1.8], [66, 90, 1.8]]);
    for (const [beam, x] of [[beamL, 16], [beamR, 84]]) {
      const pan = b.pts([[x - 10, 54, 1.6], [x, 60, 1.8], [x + 10, 54, 1.6]]);
      b.line(pan[0], beam, pan[2]);
      b.line(...pan);
    }
    return b.build(79, "The Balance", "B", ["The Tao does not choose sides,"]);
  },
  // 80 - They can hear their roosters crowing.
  (b) => {
    const outline = b.path([
      [86, 20, 2.4], [80, 14, 1.6], [74, 16, 1.4], [70, 24, 1.4], [66, 36, 1.4],
      [54, 46, 1.6], [40, 46, 1.8],
    ]);
    b.line(outline[1], ...b.pts([[78, 6, 2], [72, 8, 1.6]]), outline[2]);
    b.line(outline[0], ...b.pts([[84, 26, 1.4], [80, 32, 1.8]]));
    b.line(outline[6], ...b.pts([[30, 24, 1.4], [22, 18, 1.8]]));
    b.line(outline[6], ...b.pts([[24, 32, 1.4], [12, 36, 1.8]]));
    b.line(outline[6], ...b.pts([[22, 48, 1.4], [12, 58, 1.8]]));
    const belly = b.path([[40, 48, 1.2], [46, 64], [60, 66], [72, 52], [80, 32, 1.4]]);
    b.line(belly[2], ...b.pts([[56, 80, 1.4], [50, 86, 1.6]]));
    b.line(belly[2], ...b.pts([[64, 80, 1.4], [68, 86, 1.6]]));
    b.star(76, 18, 2.2);
    return b.build(80, "The Rooster", "A", ["that they can hear their roosters crowing and dogs barking,"]);
  },
  // 81 - The finale: the sage leaving on an ox, as Lao Tzu is said to have.
  (b) => {
    const back = b.path([[20, 50, 1.6], [34, 46, 1.6], [56, 46, 1.8], [74, 48, 1.6], [84, 54, 1.8]]);
    b.line(back[4], ...b.pts([[88, 60, 1.2], [90, 76, 1.6]]));
    const head = b.loop([[20, 50], [12, 52, 1.6], [6, 62, 2], [12, 66, 1.6], [22, 60]]);
    b.line(head[0], b.star(12, 42, 2));
    b.line(head[0], b.star(24, 40, 2));
    const belly = b.path([[24, 66, 1.4], [50, 70, 1.4], [78, 66, 1.4]]);
    b.line(head[4], belly[0]);
    b.line(back[4], belly[2]);
    for (const x of [28, 38, 66, 76]) b.line(b.star(x, 68, 1), b.star(x, 88, 1.8));
    b.close(b.ring(52, 14, 4.5, 5, 1.8));
    const neck = b.star(52, 21, 1.8);
    const seat = b.star(54, 42, 1.8);
    b.line(neck, seat);
    b.line(seat, b.star(46, 52, 1.6));
    b.line(neck, b.star(62, 30, 1.4), b.star(70, 20, 2.2));
    return b.build(81, "The Sage on the Ox", "C", ["The Tao of Heaven nourishes by not forcing."]);
  },
];

export const TAO_CONSTELLATIONS: readonly Constellation[] = figures.map((draw) =>
  draw(createBuilder()),
);

export function getTaoConstellation(chapter: number) {
  return TAO_CONSTELLATIONS[chapter - 1]?.chapter === chapter
    ? TAO_CONSTELLATIONS[chapter - 1]
    : TAO_CONSTELLATIONS.find((item) => item.chapter === chapter);
}

/**
 * Indices (among the chapter's non-empty lines) of the lines holding the key
 * phrases, found in the English text.
 */
export function getKeyLineIndices(constellation: Constellation) {
  const lines = (TAO_CHAPTERS[constellation.chapter - 1]?.text ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return constellation.keyPhrases
    .map((phrase) => lines.findIndex((line) => line.includes(phrase)))
    .filter((index) => index >= 0);
}
