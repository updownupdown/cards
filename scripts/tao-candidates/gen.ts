// Builds the constellation gallery (all chapters) and preview sheets.
// Usage: node --experimental-strip-types gen.ts [from] [to]
import { readdirSync, writeFileSync } from "node:fs";
import { createBuilder, TAO_CONSTELLATIONS, type Constellation } from "./current.ts";
import { tao } from "./TaoText.ts";
import type { Candidate } from "./types.ts";

const candidates: Record<number, Candidate[]> = {};
for (const file of readdirSync(new URL("./cand", import.meta.url)).sort()) {
  if (!file.endsWith(".ts")) continue;
  const mod = await import(`./cand/${file}`);
  Object.assign(candidates, mod.default);
}

const errors: string[] = [];
function lines(chapter: number) {
  return tao[chapter - 1].text.split("\n").map((l) => l.trim()).filter(Boolean);
}
function check(c: Constellation, label: string) {
  const n = c.stars.length;
  if (n < 10 || n > 40) errors.push(`${label}: ${n} stars`);
  c.stars.forEach((s, i) => {
    if (!(s.x >= 0 && s.x <= 100 && s.y >= 0 && s.y <= 100)) errors.push(`${label}: star ${i} out of range (${s.x.toFixed(1)},${s.y.toFixed(1)})`);
  });
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    if (Math.hypot(c.stars[i].x - c.stars[j].x, c.stars[i].y - c.stars[j].y) < 2) errors.push(`${label}: stars ${i},${j} overlap (${c.stars[i].x.toFixed(1)},${c.stars[i].y.toFixed(1)}) (${c.stars[j].x.toFixed(1)},${c.stars[j].y.toFixed(1)})`);
  }
  for (const stroke of c.strokes) {
    if (stroke.length < 2) errors.push(`${label}: short stroke`);
    stroke.forEach((id, i) => {
      if (id >= n || id < 0) errors.push(`${label}: bad id`);
      if (i > 0 && id === stroke[i - 1]) errors.push(`${label}: repeated id`);
    });
  }
  const ls = lines(c.chapter);
  for (const p of c.keyPhrases) if (!ls.some((l) => l.includes(p))) errors.push(`${label}: key phrase not found: ${p}`);
}

type Entry = { id: string; name: string; theme: string; key: string[]; c: Constellation; current?: boolean; confidence?: string };
const chapters: { chapter: number; entries: Entry[] }[] = [];
for (let ch = 1; ch <= 81; ch++) {
  const cur = TAO_CONSTELLATIONS[ch - 1];
  const entries: Entry[] = [{ id: "current", name: cur.name, theme: "The figure the game uses now", key: cur.keyPhrases, c: cur, current: true, confidence: cur.confidence }];
  (candidates[ch] ?? []).forEach((cand, i) => {
    const b = createBuilder();
    cand.draw(b);
    const c = b.build(ch, cand.name, "B", cand.keyPhrases, cand.nebulaShare ?? 0.25);
    check(c, `ch${ch} #${i + 1} ${cand.name}`);
    entries.push({ id: String(i + 1), name: cand.name, theme: cand.theme, key: cand.keyPhrases, c });
  });
  chapters.push({ chapter: ch, entries });
}

const r1 = (v: number) => Math.round(v * 10) / 10;
export function svg(c: Constellation, size = 200) {
  const s = size / 100;
  const gap = Math.max(1.5, size * 0.014);
  const rad = (mag: number) => 0.9 * (0.5 + mag * 0.7) * Math.max(1, size / 300);
  let d = "";
  for (const stroke of c.strokes) {
    for (let i = 1; i < stroke.length; i++) {
      const a = c.stars[stroke[i - 1]], b = c.stars[stroke[i]];
      const dx = (b.x - a.x) * s, dy = (b.y - a.y) * s, len = Math.hypot(dx, dy);
      if (len <= gap * 2 + 2) continue;
      const ux = dx / len, uy = dy / len;
      d += `M${r1(a.x * s + ux * gap)} ${r1(a.y * s + uy * gap)}L${r1(b.x * s - ux * gap)} ${r1(b.y * s - uy * gap)}`;
    }
  }
  const neb = c.nebulae.map((p) => `<polygon points="${p.map(([x, y]) => `${r1(x * s)},${r1(y * s)}`).join(" ")}" fill="#7fb0ff" fill-opacity="0.13" filter="url(#blur)"/>`).join("");
  const glows = c.stars.map((st) => `<circle cx="${r1(st.x * s)}" cy="${r1(st.y * s)}" r="${r1(rad(st.mag) * 2.6)}"/>`).join("");
  const stars = c.stars.map((st) => `<circle cx="${r1(st.x * s)}" cy="${r1(st.y * s)}" r="${r1(rad(st.mag))}"/>`).join("");
  return `<svg viewBox="-6 -6 ${size + 12} ${size + 12}" xmlns="http://www.w3.org/2000/svg">${neb}<path d="${d}" stroke="#bedcff" stroke-opacity="0.5" stroke-width="1" stroke-linecap="round" fill="none"/><g fill="#9cc9ff" fill-opacity="0.18">${glows}</g><g fill="#fff">${stars}</g></svg>`;
}

writeFileSync(new URL("./data.json", import.meta.url), JSON.stringify(chapters.map(({ chapter, entries }) => ({
  n: chapter,
  text: tao[chapter - 1].text,
  e: entries.map((e) => ({
    id: e.id, name: e.name, theme: e.theme, key: e.key, conf: e.confidence,
    s: e.c.stars.map((st) => [r1(st.x), r1(st.y), r1(st.mag)]),
    k: e.c.strokes,
    b: e.c.nebulae.map((p) => p.map(([x, y]) => [r1(x), r1(y)])),
  })),
}))));

// Preview sheet for review.
const from = Number(process.argv[2] ?? 1), to = Number(process.argv[3] ?? from + 9);
const rows = chapters.filter((x) => x.chapter >= from && x.chapter <= to).map(({ chapter, entries }) =>
  `<div class="row"><div class="ch">${chapter}</div>${entries.map((e) => `<div class="cell${e.current ? " cur" : ""}">${svg(e.c)}<div>${e.id}. ${e.name}</div></div>`).join("")}</div>`).join("");
writeFileSync(new URL("./sheet.html", import.meta.url), `<!doctype html><html><head><style>body{background:#050a18;color:#cde;font:13px sans-serif;margin:8px}.row{display:flex;gap:6px;margin-bottom:6px}.ch{width:26px;font-size:18px}.cell{width:210px;text-align:center}.cell svg{width:200px;height:200px;background:#0b1430}.cur svg{background:#1a1020}</style></head><body><svg width="0" height="0"><filter id="blur"><feGaussianBlur stdDeviation="3"/></filter></svg>${rows}</body></html>`);

console.log(errors.length ? errors.join("\n") : "OK", `\n${Object.values(candidates).flat().length} candidates`);
