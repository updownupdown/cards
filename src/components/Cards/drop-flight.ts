// Hand-off between useDragDrop and AnimatedCard for a successful drop: how far
// the dropped cards were dragged from their original spot at release. Cards
// that land with animDuration 0 (games mark just-dropped cards that way) start
// their move from there, so they fly from under the finger to the target
// instead of reappearing at their old spot and jumping.

type Offset = { x: number; y: number };

const dropOffsets = new Map<string, Offset>();

export function setDropOffsets(cardIds: string[], offset: Offset) {
  dropOffsets.clear();
  cardIds.forEach((cardId) => dropOffsets.set(cardId, offset));
}

export function getDropOffset(cardId: string): Offset | undefined {
  return dropOffsets.get(cardId);
}

export function clearDropOffsets() {
  dropOffsets.clear();
}
