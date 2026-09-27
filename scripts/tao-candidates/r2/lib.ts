import type { Builder, Candidate } from "../types.ts";
import c1 from "../cand/c01.ts";
import c2 from "../cand/c02.ts";
import c3 from "../cand/c03.ts";
import c4 from "../cand/c04.ts";
import c5 from "../cand/c05.ts";
import c6 from "../cand/c06.ts";
import c7 from "../cand/c07.ts";
import c8 from "../cand/c08.ts";

export type P = [number, number, number];
export const g = (points: [number, number, number?][], mag: number): P[] =>
  points.map(([x, y, m]) => [x, y, m ?? mag]);

export const R1: Record<number, Candidate[]> = { ...c1, ...c2, ...c3, ...c4, ...c5, ...c6, ...c7, ...c8 };

/** A round-one figure, optionally renamed or given the key line of another chapter. */
export function reuse(ch: number, name: string, over: Partial<Candidate> = {}): Candidate {
  const found = R1[ch]?.find((c) => c.name === name);
  if (!found) throw new Error(`no round-one figure ${ch} ${name}`);
  return { ...found, ...over };
}

/** I Ching lines, top to bottom: "1" solid (yang), "0" broken (yin). */
export function ichingLines(b: Builder, pattern: string, top: number, step: number, x0 = 22, x1 = 78) {
  const mid = (x0 + x1) / 2;
  [...pattern].forEach((bit, i) => {
    const y = top + i * step;
    if (bit === "1") b.path([[x0, y, 2], [mid, y, 1.4], [x1, y, 2]]);
    else {
      b.path([[x0, y, 2], [mid - 7, y, 1.4]]);
      b.path([[mid + 7, y, 1.4], [x1, y, 2]]);
    }
  });
}

/** A trigram inside a faint ring, like a medallion on the bagua. */
export function trigram(b: Builder, pattern: string) {
  ichingLines(b, pattern, 32, 18, 26, 74);
  b.close(b.ring(50, 50, 44, 12, 1));
}
