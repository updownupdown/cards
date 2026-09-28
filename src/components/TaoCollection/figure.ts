import { getTaoChapter } from "@/data/collectibles";
import type { Constellation } from "@/data/tao-constellations";
import {
  parseChapterText,
  planStarDust,
  SPECK_SCALE,
  type DustPoint,
} from "@/components/TaoReveal/timeline";

/**
 * Geometry shared by the collection's constellation drawings: the dust of
 * one brightness is one SVG path, so a figure is only a few elements.
 */

export const STAR_COLOR = "#ffffff";

const round = (value: number) => Math.round(value * 10) / 10;

/** One path made of many small circles. */
export function circlesPath(circles: { x: number; y: number; r: number }[]) {
  return circles
    .map(({ x, y, r }) => {
      const rr = round(r);
      return `M${round(x - r)} ${round(y)}a${rr} ${rr} 0 1 0 ${round(2 * r)} 0a${rr} ${rr} 0 1 0 ${-round(2 * r)} 0`;
    })
    .join("");
}

/** As many minor stars as the English chapter has letters, as the reveal. */
export function fullDustCount(constellation: Constellation) {
  const text = getTaoChapter(constellation.chapter)?.text ?? "";
  return parseChapterText(text).glyphs.length - constellation.stars.length;
}

/** The chapter's minor stars that fall inside the figure's square. */
export function figureDust(constellation: Constellation, count: number) {
  return planStarDust(constellation, count).filter(
    (point) =>
      point.x >= -2 && point.x <= 102 && point.y >= -2 && point.y <= 102,
  );
}

export function dustRadius(point: DustPoint) {
  return point.speck * SPECK_SCALE * 0.28;
}

// Brightness bands (dust opacity runs from about 0.35 to 0.75).
const DUST_BUCKETS = [0.47, 0.6, Infinity];

/** Dust split by brightness, one path per brightness. */
export function dustLayers(dust: DustPoint[], size: number) {
  const scale = size / 100;
  return DUST_BUCKETS.map((limit, index) => {
    const floor = index === 0 ? -Infinity : DUST_BUCKETS[index - 1];
    const points = dust.filter(
      (point) => point.opacity >= floor && point.opacity < limit,
    );
    const opacity = points.length
      ? points.reduce((sum, point) => sum + point.opacity, 0) / points.length
      : 0;
    return {
      opacity,
      d: circlesPath(
        points.map((point) => ({
          x: point.x * scale,
          y: point.y * scale,
          r: dustRadius(point),
        })),
      ),
    };
  }).filter((layer) => layer.d);
}

export type FigureSegment = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  length: number;
};

/**
 * The strokes as separate segments in drawing order, in px. Lines stop
 * `gap` short of each star, like a star chart; very short ones are dropped.
 */
export function figureSegments(
  constellation: Constellation,
  size: number,
  gap: number,
) {
  const scale = size / 100;
  const segments: FigureSegment[] = [];
  for (const stroke of constellation.strokes) {
    for (let i = 1; i < stroke.length; i++) {
      const a = constellation.stars[stroke[i - 1]];
      const b = constellation.stars[stroke[i]];
      const dx = (b.x - a.x) * scale;
      const dy = (b.y - a.y) * scale;
      const length = Math.hypot(dx, dy);
      if (length <= gap * 2 + 2) continue;
      const ux = dx / length;
      const uy = dy / length;
      segments.push({
        x1: a.x * scale + ux * gap,
        y1: a.y * scale + uy * gap,
        x2: b.x * scale - ux * gap,
        y2: b.y * scale - uy * gap,
        length: length - gap * 2,
      });
    }
  }
  return segments;
}
