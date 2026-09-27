// Builds the quote picker: the 208 quotes in QuotesText.ts (IDs 1-208) plus
// the candidates in candidates.mjs (IDs 209 on), written into index.html.
//
//   node scripts/quote-picker/build.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { candidates } from "./candidates.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");

function readCurrentQuotes() {
  const source = readFileSync(
    join(root, "src/components/Collectibles/QuotesText.ts"),
    "utf8",
  );
  const start = source.indexOf("[", source.indexOf("export const quotes"));
  const end = source.lastIndexOf("] as const");
  return vm.runInNewContext(source.slice(start, end + 1));
}

function readPortraitNames() {
  const source = readFileSync(
    join(root, "src/data/quote-authors.generated.ts"),
    "utf8",
  );
  return new Set([...source.matchAll(/name: "([^"]+)"/g)].map((m) => m[1]));
}

// Pairs of current quotes that say nearly the same thing.
const SIMILAR = [
  [62, 185],
  [63, 186],
  [75, 177],
  [77, 179],
  [78, 180],
  [92, 199],
  [121, 197],
];

const current = readCurrentQuotes();
if (current.length !== 208) {
  throw new Error(`Expected 208 current quotes, found ${current.length}.`);
}
const withPortrait = readPortraitNames();

const all = [...current, ...candidates].map((quote, index) => ({
  id: index + 1,
  author: quote.author,
  text: quote.text,
  source: quote.source,
  isNew: index >= current.length,
  newAuthor: !withPortrait.has(quote.author),
  similar: [],
}));
for (const [a, b] of SIMILAR) {
  all[a - 1].similar.push(b);
  all[b - 1].similar.push(a);
}

const texts = new Map();
for (const quote of all) {
  const key = quote.text.toLowerCase().replace(/[^a-z]/g, "");
  if (texts.has(key)) {
    throw new Error(`Quote ${quote.id} repeats quote ${texts.get(key)}.`);
  }
  texts.set(key, quote.id);
}

const template = readFileSync(join(here, "template.html"), "utf8");
const data = JSON.stringify(all).replace(/</g, "\\u003c");
writeFileSync(join(here, "index.html"), template.replace("__QUOTES__", data));
console.log(
  `Wrote index.html: ${all.length} quotes, ${new Set(all.map((q) => q.author)).size} authors.`,
);
