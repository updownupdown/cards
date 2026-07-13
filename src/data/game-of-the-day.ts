/**
 * Deterministically picks a "Game of the Day" from the provided list of game
 * paths using only the calendar date. The same date always yields the same
 * pick, and consecutive days produce a well-distributed spread of games.
 */
export function getGameOfTheDayPath(
  paths: string[],
  date: Date = new Date(),
): string | null {
  if (paths.length === 0) {
    return null;
  }

  const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

  // Simple, stable string hash (djb2-ish) folded into a positive integer.
  let hash = 5381;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 33 + key.charCodeAt(index)) >>> 0;
  }

  return paths[hash % paths.length];
}
