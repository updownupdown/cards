import type { Candidate } from "../types.ts";
import { g, reuse } from "./lib.ts";

/** Round-one picks: "current" keeps the figure the game uses now. */
export const PICKS: Record<number, "current" | number> = {
  1: "current", 2: "current", 3: 1, 4: "current", 5: 3, 6: 3, 7: 2, 8: 2, 9: 1, 10: 3,
  11: "current", 12: 2, 13: 2, 14: "current", 15: 1, 16: "current", 17: 1, 18: 3, 19: 3, 20: 2,
  21: 5, 22: "current", 23: "current", 24: 1, 25: 5, 26: 3, 27: 4, 28: "current", 29: 5, 30: 4,
  31: 5, 32: 4, 33: 2, 34: "current", 35: 3, 36: 1, 37: "current", 38: 1, 39: 1, 40: "current",
  41: 5, 42: 2, 43: "current", 44: "current", 45: 3, 46: "current", 47: 3, 48: 2, 49: "current", 50: 5,
  51: 2, 52: 2, 53: "current", 54: "current", 55: 1, 56: "current", 57: "current", 58: 1, 59: 1, 60: 1,
  61: 4, 62: 2, 63: "current", 64: "current", 65: "current", 66: 3, 67: 3, 68: 2, 69: 1, 70: "current",
  71: 1, 72: "current", 73: 3, 74: "current", 75: 1, 76: "current", 77: "current", 78: "current", 79: "current", 80: "current",
  81: 3,
};

/** Picks redrawn with the requested changes. */
export const FIXED: Record<number, Candidate> = {
  5: reuse(5, "The Swelling Sail", {
    theme: "The space between Heaven and Earth: an empty sail full of wind (waves joined, shorter wind lines)",
    draw: (b) => {
      b.path([[44, 8, 2.2], [44, 30], [44, 52], [44, 72, 1.6]]);
      b.line(b.star(44, 8), ...b.pts([[58, 16], [68, 30], [72, 46, 1.8], [66, 62]]), b.star(44, 66, 1.4));
      b.path([[14, 72, 1.8], [26, 84], [68, 84], [84, 72, 1.8]]);
      b.path(g([[14, 72], [84, 72]], 1));
      b.path([[4, 92, 1], [20, 89, 1.2], [36, 93, 1], [50, 90, 1.2], [64, 93, 1], [80, 89, 1.2], [96, 92, 1]]);
      b.path([[10, 30, 1], [19, 29, 1.4]]);
      b.path([[14, 44, 1], [24, 43, 1.4]]);
    },
  }),
  13: reuse(13, "The Ouroboros", {
    theme: "We are often our own worst enemy: the serpent eating its tail (head on the body line, tapering tail)",
    draw: (b) => {
      const at = (r: number, deg: number): [number, number] => {
        const a = (deg * Math.PI) / 180;
        return [50 + r * Math.cos(a), 50 + r * Math.sin(a)];
      };
      // Body runs clockwise from the neck (-62°) round to the tail tip (258°).
      const outer: [number, number, number][] = [];
      const inner: [number, number, number][] = [];
      for (let i = 0; i <= 12; i++) {
        const deg = -62 + i * 25;
        const taper = Math.max(0, (deg - 170) / 70);
        outer.push([...at(36 - taper * 3, deg), 1.8]);
        inner.push([...at(28 + taper * 3, deg), 1.2]);
      }
      const tip: [number, number, number] = [...at(32, 262), 1.6];
      const body = b.pts([...outer, tip, ...inner.reverse()]);
      b.line(...body);
      // Head, centred on the body line, jaws round the tail.
      const neckOut = body[0];
      const neckIn = body[body.length - 1];
      b.line(neckOut, b.star(...at(37, -74), 1.6), b.star(...at(33, -92), 2.2), b.star(...at(27, -74), 1.6), neckIn);
      b.star(...at(32, -76), 2.6);
    },
  }),
};
