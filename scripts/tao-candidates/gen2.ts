// Round two: each chapter's pick (with fixes) plus two new figures.
// Usage: node --experimental-strip-types gen2.ts [from] [to]
import { readdirSync, writeFileSync } from "node:fs";
import { createBuilder, TAO_CONSTELLATIONS, type Constellation } from "./current.ts";
import { tao } from "./TaoText.ts";
import type { Candidate } from "./types.ts";
import { R1 } from "./r2/lib.ts";
import { PICKS, FIXED } from "./r2/picks.ts";
import { svg } from "./gen.ts";

const alts: Record<number, Candidate[]> = {};
for (const file of readdirSync(new URL("./r2", import.meta.url)).sort()) {
  if (!/^[a-z]\.ts$/.test(file)) continue;
  Object.assign(alts, (await import(`./r2/${file}`)).default);
}
const errors: string[] = [];
const lines = (ch: number) => tao[ch - 1].text.split("\n").map((l) => l.trim()).filter(Boolean);
function check(c: Constellation, label: string) {
  const n = c.stars.length;
  if (n < 10 || n > 40) errors.push(`${label}: ${n} stars`);
  c.stars.forEach((s, i) => { if (!(s.x >= 0 && s.x <= 100 && s.y >= 0 && s.y <= 100)) errors.push(`${label}: star ${i} out (${s.x.toFixed(1)},${s.y.toFixed(1)})`); });
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (Math.hypot(c.stars[i].x - c.stars[j].x, c.stars[i].y - c.stars[j].y) < 2) errors.push(`${label}: overlap (${c.stars[i].x.toFixed(1)},${c.stars[i].y.toFixed(1)})`);
  for (const st of c.strokes) { if (st.length < 2) errors.push(`${label}: short stroke`); st.forEach((id, i) => { if (i && id === st[i - 1]) errors.push(`${label}: repeat`); }); }
  for (const p of c.keyPhrases) if (!lines(c.chapter).some((l) => l.includes(p))) errors.push(`${label}: key not found: ${p}`);
}
const build = (ch: number, cand: Candidate) => { const b = createBuilder(); cand.draw(b); return b.build(ch, cand.name, "B", cand.keyPhrases, cand.nebulaShare ?? 0.25); };

type Entry = { id: string; label: string; name: string; theme: string; key: string[]; c: Constellation; src: string };
const chapters: { n: number; e: Entry[] }[] = [];
for (let ch = 1; ch <= 81; ch++) {
  const pick = PICKS[ch];
  let first: Entry;
  if (FIXED[ch]) {
    const f = FIXED[ch];
    first = { id: "1", label: "Your pick, changed", name: f.name, theme: f.theme, key: f.keyPhrases, c: build(ch, f), src: `r1:${pick}` };
  } else if (pick === "current") {
    const cur = TAO_CONSTELLATIONS[ch - 1];
    first = { id: "1", label: "Your pick (current)", name: cur.name, theme: "The figure the game uses now", key: cur.keyPhrases, c: cur, src: "current" };
  } else {
    const f = R1[ch][pick - 1];
    first = { id: "1", label: "Your pick", name: f.name, theme: f.theme, key: f.keyPhrases, c: build(ch, f), src: `r1:${pick}` };
  }
  const e = [first];
  (alts[ch] ?? []).forEach((a, i) => {
    const c = build(ch, a);
    check(c, `ch${ch} #${i + 2} ${a.name}`);
    e.push({ id: String(i + 2), label: "New option", name: a.name, theme: a.theme, key: a.keyPhrases, c, src: `r2:${i}` });
  });
  if (FIXED[ch]) check(first.c, `ch${ch} fixed`);
  chapters.push({ n: ch, e });
}
const r1 = (v: number) => Math.round(v * 10) / 10;
writeFileSync(new URL("./data2.json", import.meta.url), JSON.stringify(chapters.map(({ n, e }) => ({
  n, text: tao[n - 1].text,
  e: e.map((x) => ({ id: x.id, label: x.label, name: x.name, theme: x.theme, key: x.key, s: x.c.stars.map((st) => [r1(st.x), r1(st.y), r1(st.mag)]), k: x.c.strokes, b: x.c.nebulae.map((p) => p.map(([a, bb]) => [r1(a), r1(bb)])) })),
}))));
const from = Number(process.argv[2] ?? 1), to = Number(process.argv[3] ?? from + 9);
const rows = chapters.filter((x) => x.n >= from && x.n <= to).map(({ n, e }) => `<div class="row"><div class="ch">${n}</div>${e.map((x) => `<div class="cell">${svg(x.c)}<div>${x.id}. ${x.name}</div></div>`).join("")}</div>`).join("");
writeFileSync(new URL("./sheet2.html", import.meta.url), `<!doctype html><html><head><style>body{background:#050a18;color:#cde;font:13px sans-serif;margin:8px}.row{display:flex;gap:6px;margin-bottom:6px}.ch{width:26px;font-size:18px}.cell{width:210px;text-align:center}.cell svg{width:200px;height:200px;background:#0b1430}</style></head><body><svg width="0" height="0"><filter id="blur"><feGaussianBlur stdDeviation="3"/></filter></svg>${rows}</body></html>`);
console.log(errors.length ? errors.join("\n") : "OK", `\n${Object.values(alts).flat().length} new`);
