import { GAME_DEFINITIONS } from "./games-registry";
import { getGameDotDefinition, CAMPAIGN_START_PATH } from "./campaign-map";

/** Campaign games the test progress has won. */
const TEST_NODE_COUNT = 16;

/**
 * The Campaign games test progress wins: a breadth-first spread out from the
 * start, so every one of them was reachable when it was won.
 */
export function getTestGameDotPaths(count = TEST_NODE_COUNT) {
  const queued = [CAMPAIGN_START_PATH];
  const visited = new Set<string>();
  const paths: string[] = [];
  while (queued.length > 0 && paths.length < count) {
    const path = queued.shift()!;
    if (visited.has(path)) continue;
    visited.add(path);
    const gameDot = getGameDotDefinition(path);
    if (!gameDot) continue;
    paths.push(path);
    gameDot.connections.forEach((connection) => {
      if (!visited.has(connection)) queued.push(connection);
    });
  }
  return paths;
}

/**
 * The games test progress has won, so the Collect tab shows every state:
 * categories in turn are complete, half done or untouched. Campaign wins are
 * always included, as a Campaign win is a win of that game too, so an
 * "untouched" category holding one ends up partly done.
 */
export function getTestWonPaths(gameDotPaths = getTestGameDotPaths()) {
  const won = new Set(gameDotPaths);
  const categories = [
    ...new Set(
      GAME_DEFINITIONS.filter((game) => !game.enabledOnLocalOnly).map(
        (game) => game.tags[0],
      ),
    ),
  ];
  categories.forEach((category, index) => {
    const games = GAME_DEFINITIONS.filter(
      (game) => !game.enabledOnLocalOnly && game.tags[0] === category,
    );
    const mode = index % 3;
    games.forEach((game, gameIndex) => {
      if (mode === 0 || (mode === 1 && gameIndex % 2 === 0)) {
        won.add(game.path);
      }
    });
  });
  return won;
}
