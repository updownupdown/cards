/**
 * The longest run that could be moved one card at a time, through the
 * places that would hold a card along the way (a "supermove"): each free
 * cell holds one card, and each empty column other than the destination
 * doubles the count, as half the run can wait in it.
 *
 * Only places that would take any card count. A column that only takes a
 * King (Seahaven Towers, Eight Off) can't hold a run's middle, and a
 * foundation is never a stop.
 */
export function maxSupermove({
  freeCells,
  emptyColumns,
}: {
  /** Cells that are empty and take any card. */
  freeCells: number;
  /** Empty columns, not counting the destination, that take any card. */
  emptyColumns: number;
}): number {
  return (freeCells + 1) * 2 ** emptyColumns;
}

/** Counts the empty piles other than `exclude` (the destination). */
export function countEmptyPiles(
  piles: readonly (readonly unknown[])[],
  exclude?: number,
): number {
  return piles.filter((pile, index) => pile.length === 0 && index !== exclude)
    .length;
}
