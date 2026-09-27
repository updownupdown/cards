#!/bin/bash
# Temporary: builds the constellation review gallery. Delete this folder once
# the picked constellations are merged into src/data/tao-constellations.ts.
# Usage: scripts/tao-candidates/setup.sh  -> writes gallery.html next to it
set -e
cd "$(dirname "$0")"
cp ../../src/components/Collectibles/TaoText.ts TaoText.ts
sed -e 's#^import { TAO_CHAPTERS } from "@/components/Campaign/TaoChapters";#import { tao as TAO_CHAPTERS } from "./TaoText.ts";#' \
  -e 's/^function createBuilder/export function createBuilder/' \
  -e 's/^type Builder = /export type Builder = /' \
  ../../src/data/tao-constellations.ts > current.ts
# Candidates may name a shared star by its coordinates; reuse it.
python3 - <<'PY'
s = open("current.ts").read()
old = "  const star = (x: number, y: number, mag = 1.8) => {\n    stars.push"
new = "  const star = (x: number, y: number, mag = 1.8) => {\n    const existing = stars.findIndex((s) => Math.abs(s.x - x) < 0.01 && Math.abs(s.y - y) < 0.01);\n    if (existing >= 0) return existing;\n    stars.push"
open("current.ts", "w").write(s.replace(old, new))
PY
node --experimental-strip-types --no-warnings gen.ts
python3 -c "t=open('template.html').read(); d=open('data.json').read(); open('gallery.html','w').write(t.replace('__DATA__', d.replace('</','<\\\\/')))"
rm -f sheet.html
# Round two: picks plus two new figures per chapter -> gallery2.html
node --experimental-strip-types --no-warnings gen2.ts
python3 -c "t=open('template2.html').read(); d=open('data2.json').read(); open('gallery2.html','w').write(t.replace('__DATA__', d.replace('</','<\\\\/')))"
rm -f sheet2.html
# Round three: round-two picks plus two organic versions -> gallery3.html
node --experimental-strip-types --no-warnings gen3.ts
python3 -c "t=open('template3.html').read(); d=open('data3.json').read(); open('gallery3.html','w').write(t.replace('__DATA__', d.replace('</','<\\\\/')))"
rm -f sheet3.html
