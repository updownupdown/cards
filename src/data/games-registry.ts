import { GameDefinition, GameMenuInfo } from "./games-data";

/**
 * Auto-discovered game registry.
 *
 * Every `src/data/games/<slug>.ts` file that exports a `GameDefinition`
 * (an object with a string `path`) is picked up automatically
 */

function extractDefinition(
  mod: Record<string, unknown>,
): GameDefinition | null {
  for (const value of Object.values(mod)) {
    if (
      value &&
      typeof value === "object" &&
      typeof (value as GameDefinition).path === "string"
    ) {
      return value as GameDefinition;
    }
  }
  return null;
}

// Relative path (not the `@/` alias) so Metro's require.context resolves it.
const gameContext = require.context("./games", false, /\.ts$/);

export const GAME_DEFINITIONS: GameDefinition[] = gameContext
  .keys()
  .filter((key) => key !== "./index.ts")
  .map((key) => extractDefinition(gameContext(key) as Record<string, unknown>))
  .filter((game): game is GameDefinition => game !== null);

export const GAMES_DATA: Record<string, GameMenuInfo> = Object.fromEntries(
  GAME_DEFINITIONS.map((game) => [game.path, game]),
);
