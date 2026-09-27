// Builds the quote picker into index.html: the quotes kept so far
// (shortlist.mjs, which points into QuotesText.ts for the app's own quotes)
// and the current round's candidates (round3.mjs, IDs 701 on).
//
//   node scripts/quote-picker/build.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { CANDIDATES, FIRST_ID } from "./round3.mjs";
import { KEPT_CANDIDATES, KEPT_CURRENT_IDS } from "./shortlist.mjs";

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

const current = readCurrentQuotes();
const withPortrait = readPortraitNames();

const roundOf = (id) =>
  id <= 208 ? "In app" : id <= 500 ? "Round 1" : id < FIRST_ID ? "Round 2" : "New";

const entry = (id, quote, earlier) => ({
  id,
  author: quote.author,
  text: quote.text,
  source: quote.source,
  round: roundOf(id),
  earlier,
  newAuthor: !withPortrait.has(quote.author),
});

const all = [
  ...KEPT_CURRENT_IDS.map((id) => entry(id, current[id - 1], true)),
  ...KEPT_CANDIDATES.map((quote) => entry(quote.id, quote, true)),
  ...CANDIDATES.map((quote, i) => entry(FIRST_ID + i, quote, false)),
].sort((a, b) => a.id - b.id);

const ids = new Set();
for (const quote of all) {
  if (!quote.text) throw new Error(`Quote ${quote.id} not found.`);
  if (ids.has(quote.id)) throw new Error(`Quote ID ${quote.id} is used twice.`);
  ids.add(quote.id);
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
