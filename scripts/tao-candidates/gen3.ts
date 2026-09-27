// Round three: each chapter's round-two pick, plus two looser versions of the
// same figure with no horizontal or vertical lines.
// Usage: node --experimental-strip-types gen3.ts [from] [to]
import { writeFileSync } from "node:fs";
import type { Constellation, ConstellationStar } from "./current.ts";
import { tao } from "./TaoText.ts";
import { chapters as round2 } from "./gen2.ts";
import { svg } from "./gen.ts";

export const PICKS2: Record<number, number> = {
  1: 1, 2: 2, 3: 2, 4: 1, 5: 3, 6: 1, 7: 1, 8: 1, 9: 1, 10: 3, 11: 1, 12: 1, 13: 1, 14: 1, 15: 1, 16: 1, 17: 1, 18: 1, 19: 1, 20: 2,
  21: 1, 22: 1, 23: 1, 24: 1, 25: 2, 26: 1, 27: 1, 28: 1, 29: 3, 30: 1, 31: 1, 32: 3, 33: 1, 34: 1, 35: 1, 36: 1, 37: 1, 38: 1, 39: 1, 40: 1,
  41: 1, 42: 2, 43: 1, 44: 1, 45: 2, 46: 1, 47: 2, 48: 2, 49: 1, 50: 1, 51: 2, 52: 1, 53: 1, 54: 1, 55: 1, 56: 3, 57: 2, 58: 1, 59: 1, 60: 2,
  61: 3, 62: 2, 63: 1, 64: 1, 65: 1, 66: 1, 67: 1, 68: 1, 69: 1, 70: 1, 71: 2, 72: 1, 73: 1, 74: 1, 75: 1, 76: 1, 77: 1, 78: 3, 79: 1, 80: 1, 81: 1,
};

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

type Style = { tilt: number; warp: number; jitter: number; thin: number; magSpread: number };
export const STYLES: Record<"organic" | "wild", Style> = {
  organic: { tilt: 5, warp: 2.2, jitter: 1.4, thin: 0, magSpread: 0.2 },
  wild: { tilt: 7, warp: 3, jitter: 2.2, thin: 0.4, magSpread: 0.4 },
};

const MIN_ANGLE = 4; // degrees away from horizontal or vertical

function offAxis(a: ConstellationStar, b: ConstellationStar) {
  const deg = Math.abs((Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI) % 90;
  return Math.min(deg, 90 - deg);
}

/** Stars used only as the middle of one nearly straight run: safe to drop. */
function thinnable(c: Constellation) {
  const uses = new Map<number, number>();
  for (const st of c.strokes) st.forEach((id) => uses.set(id, (uses.get(id) ?? 0) + 1));
  const out: number[] = [];
  for (const st of c.strokes) {
    for (let i = 1; i < st.length - 1; i++) {
      const id = st[i];
      if (uses.get(id) !== 1) continue;
      const a = c.stars[st[i - 1]], m = c.stars[id], b = c.stars[st[i + 1]];
      const turn = Math.abs(Math.atan2(b.y - m.y, b.x - m.x) - Math.atan2(m.y - a.y, m.x - a.x));
      const t = Math.min(turn, 2 * Math.PI - turn);
      if (t < 0.35 && m.mag <= 2) out.push(id);
    }
  }
  return out;
}

export function loosen(c: Constellation, style: Style, seed: number): Constellation {
  const r = rng(seed);
  let stars = c.stars.map((s) => ({ ...s }));
  let strokes = c.strokes.map((s) => [...s]);

  // Thin some stars off straight runs (never below 12 stars).
  if (style.thin > 0) {
    const drop = new Set<number>();
    for (const id of thinnable(c)) if (r() < style.thin && stars.length - drop.size > 12) drop.add(id);
    const map = new Map<number, number>();
    stars = stars.filter((_, i) => { if (drop.has(i)) return false; map.set(i, map.size); return true; });
    strokes = strokes.map((st) => st.filter((id) => !drop.has(id)).map((id) => map.get(id)!)).filter((st) => st.length >= 2);
  }

  const cx = stars.reduce((s, p) => s + p.x, 0) / stars.length;
  const cy = stars.reduce((s, p) => s + p.y, 0) / stars.length;
  const tilt = ((r() < 0.5 ? -1 : 1) * (style.tilt * (0.6 + 0.4 * r())) * Math.PI) / 180;
  const ph = [r() * 6.28, r() * 6.28, r() * 6.28, r() * 6.28];
  const f = 0.045 + r() * 0.03;
  const move = (x: number, y: number): [number, number] => {
    const dx = x - cx, dy = y - cy;
    let nx = cx + dx * Math.cos(tilt) - dy * Math.sin(tilt);
    let ny = cy + dx * Math.sin(tilt) + dy * Math.cos(tilt);
    nx += style.warp * (Math.sin(f * y + ph[0]) + 0.5 * Math.sin(2.3 * f * x + ph[1]));
    ny += style.warp * (Math.sin(f * x + ph[2]) + 0.5 * Math.sin(2.3 * f * y + ph[3]));
    return [nx, ny];
  };
  stars = stars.map((s) => {
    const [x, y] = move(s.x, s.y);
    const mag = Math.max(0.7, Math.min(3, s.mag + (r() - 0.5) * 2 * style.magSpread));
    return { x: x + (r() - 0.5) * 2 * style.jitter, y: y + (r() - 0.5) * 2 * style.jitter, mag };
  });
  let nebulae = c.nebulae.map((p) => p.map(([x, y]) => move(x, y)));

  // Nudge any segment still close to horizontal or vertical.
  for (let pass = 0; pass < 30; pass++) {
    let changed = false;
    for (const st of strokes) {
      for (let i = 1; i < st.length; i++) {
        const a = stars[st[i - 1]], b = stars[st[i]];
        if (offAxis(a, b) >= MIN_ANGLE) continue;
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        const push = Math.tan(((MIN_ANGLE + 2 + r() * 3) * Math.PI) / 180) * len * 0.5;
        const px = -(b.y - a.y) / len, py = (b.x - a.x) / len;
        const sgn = r() < 0.5 ? -1 : 1;
        b.x += px * push * sgn; b.y += py * push * sgn;
        a.x -= px * push * sgn * 0.3; a.y -= py * push * sgn * 0.3;
        changed = true;
      }
    }
    if (!changed) break;
  }

  // Fit back inside the frame.
  const xs = stars.map((s) => s.x), ys = stars.map((s) => s.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const k = Math.min(1, 94 / Math.max(maxX - minX, maxY - minY));
  const ox = 50 - ((minX + maxX) / 2) * k, oy = 50 - ((minY + maxY) / 2) * k;
  const fit = (x: number, y: number): [number, number] => [x * k + ox, y * k + oy];
  stars = stars.map((s) => { const [x, y] = fit(s.x, s.y); return { ...s, x, y }; });
  nebulae = nebulae.map((p) => p.map(([x, y]) => fit(x, y)));
  const rd = (v: number) => Math.round(v * 10) / 10;
  return { ...c, stars: stars.map((s) => ({ x: rd(s.x), y: rd(s.y), mag: rd(s.mag) })), strokes, nebulae: nebulae.map((p) => p.map(([x, y]) => [rd(x), rd(y)] as [number, number])) };
}

const errors: string[] = [];
function check(c: Constellation, label: string) {
  const n = c.stars.length;
  if (n < 10 || n > 40) errors.push(`${label}: ${n} stars`);
  c.stars.forEach((s) => { if (!(s.x >= 0 && s.x <= 100 && s.y >= 0 && s.y <= 100)) errors.push(`${label}: out of frame`); });
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (Math.hypot(c.stars[i].x - c.stars[j].x, c.stars[i].y - c.stars[j].y) < 1.5) errors.push(`${label}: overlap`);
  for (const st of c.strokes) for (let i = 1; i < st.length; i++) if (offAxis(c.stars[st[i - 1]], c.stars[st[i]]) < MIN_ANGLE - 0.5) errors.push(`${label}: straight segment`);
}

type Entry = { id: string; label: string; name: string; theme: string; key: string[]; c: Constellation };
export const chapters3: { n: number; e: Entry[] }[] = [];
for (const { n, e } of round2) {
  const pick = e.find((x) => x.id === String(PICKS2[n]))!;
  const base: Entry = { id: "1", label: "Your pick", name: pick.name, theme: pick.theme, key: pick.key, c: pick.c };
  const entries = [base];
  (["organic", "wild"] as const).forEach((style, i) => {
    let c = loosen(pick.c, STYLES[style], n * 97 + i * 13 + 5);
    // Retry a few seeds if a star lands on another one.
    const bad = (c: Constellation) => c.stars.some((a, ai) => c.stars.some((b, bi) => bi > ai && Math.hypot(a.x - b.x, a.y - b.y) < 1.5)) || c.strokes.some((st) => st.some((id, j) => j > 0 && offAxis(c.stars[st[j - 1]], c.stars[id]) < MIN_ANGLE - 0.5));
    for (let t = 1; t < 12 && bad(c); t++) {
      c = loosen(pick.c, STYLES[style], n * 97 + i * 13 + 5 + t * 1000);
    }
    check(c, `ch${n} ${style}`);
    entries.push({ id: String(i + 2), label: style === "organic" ? "Organic" : "Organic, looser", name: pick.name, theme: style === "organic" ? "A slight tilt and bend, no straight lines" : "Looser and sparser: some stars on straight runs dropped", key: pick.key, c });
  });
  chapters3.push({ n, e: entries });
}

const r1 = (v: number) => Math.round(v * 10) / 10;
writeFileSync(new URL("./data3.json", import.meta.url), JSON.stringify(chapters3.map(({ n, e }) => ({
  n, text: tao[n - 1].text,
  e: e.map((x) => ({ id: x.id, label: x.label, name: x.name, theme: x.theme, key: x.key, s: x.c.stars.map((st) => [r1(st.x), r1(st.y), r1(st.mag)]), k: x.c.strokes, b: x.c.nebulae.map((p) => p.map(([a, b]) => [r1(a), r1(b)])) })),
}))));
writeFileSync(new URL("./round3.json", import.meta.url), JSON.stringify(chapters3.map(({ n, e }) => ({ n, e: e.map((x) => ({ id: x.id, name: x.name, key: x.key, c: x.c })) }))));
const from = Number(process.argv[2] ?? 1), to = Number(process.argv[3] ?? from + 9);
const rows = chapters3.filter((x) => x.n >= from && x.n <= to).map(({ n, e }) => `<div class="row"><div class="ch">${n}</div>${e.map((x) => `<div class="cell">${svg(x.c)}<div>${x.id}. ${x.name}</div></div>`).join("")}</div>`).join("");
writeFileSync(new URL("./sheet3.html", import.meta.url), `<!doctype html><html><head><style>body{background:#050a18;color:#cde;font:13px sans-serif;margin:8px}.row{display:flex;gap:6px;margin-bottom:6px}.ch{width:26px;font-size:18px}.cell{width:210px;text-align:center}.cell svg{width:200px;height:200px;background:#0b1430}</style></head><body><svg width="0" height="0"><filter id="blur"><feGaussianBlur stdDeviation="3"/></filter></svg>${rows}</body></html>`);
console.log("ROUND3", errors.length ? errors.join("\n") : "OK");
