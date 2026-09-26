/**
 * Spending a Mercy Skip sends the player back to the map, where the UFO drops
 * by to acknowledge it. The game sets this on its way out; the Campaign tab
 * clears it once the visit has begun.
 */
let pendingVisit = false;

export function requestMercySkipVisit() {
  pendingVisit = true;
}

export function isMercySkipVisitOwed() {
  return pendingVisit;
}

export function clearMercySkipVisit() {
  pendingVisit = false;
}
