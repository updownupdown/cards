import { GAME_DOT_DEFINITIONS } from "./campaign-map.generated";

/**
 * The force field round the centre of the Odyssey map, in map units: the
 * games inside it (about two fifths of them, 46 of 118 when it was set) can
 * be played in the Odyssey by everyone; those beyond it need the full Odyssey
 * (see src/data/odyssey-field.ts). It sits in the widest gap between game
 * dots at that distance, so no dot lies on its edge, and every game inside
 * can be reached from Klondike without leaving it; odyssey-field.test.ts
 * holds both.
 *
 * Kept apart from campaign-map.ts, which imports much of the app, so that
 * the unlock (read at startup with dev mode) and the components the games
 * import can use it.
 */
export const FIELD_RADIUS = 0.45;

export function isBeyondField(gameDot: { x: number; y: number }) {
  return Math.hypot(gameDot.x, gameDot.y) >= FIELD_RADIUS;
}

const BEYOND_FIELD = new Set(
  GAME_DOT_DEFINITIONS.filter(isBeyondField).map((gameDot) => gameDot.path),
);

/** Whether the game at this path is a game dot beyond the force field. */
export function isPathBeyondField(path: string) {
  return BEYOND_FIELD.has(path);
}
