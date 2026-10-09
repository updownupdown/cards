import { describe, expect, test } from "@jest/globals";
import fs from "fs";
import path from "path";
import { GAME_DEFINITIONS } from "@/data/games-registry";

/**
 * A game's `source` (the game it adapts, and who designed it) is for the
 * catalog's own records and is never shown to players, so nothing outside
 * the game data may read it.
 */
const SRC = path.join(__dirname, "..");
const ALLOWED = [
  path.join(SRC, "data", "games"),
  path.join(SRC, "data", "games-data.ts"),
  __filename,
];

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}

describe("Game sources", () => {
  test("every source names the original game", () => {
    for (const game of GAME_DEFINITIONS) {
      if (!game.source) continue;
      expect(game.source.title.trim()).not.toBe("");
      if (game.source.link) {
        expect(game.source.link).toMatch(/^https:\/\//);
      }
    }
  });

  test("nothing outside the game data reads a game's source", () => {
    const readers = sourceFiles(SRC)
      .filter((file) => !ALLOWED.some((allowed) => file.startsWith(allowed)))
      .filter((file) => {
        const text = fs.readFileSync(file, "utf8");
        return (
          /\bGameSource\b/.test(text) ||
          /\.source\??\.(title|designer|year|collection|link)\b/.test(text) ||
          /\bgame\??\.source\b/.test(text)
        );
      })
      .map((file) => path.relative(SRC, file));
    expect(readers).toEqual([]);
  });
});
