/**
 * What Autopilot taps. It plays a hint the way a player would: it taps the
 * cards and places the hint lights, one after another. Most taps go through
 * the card map (a card's or a zone's onPress); these are the two other ways a
 * game takes a tap:
 *
 * - drag-and-drop games handle a tap on a card through its drag handle
 *   (useDragDrop's tap handler), registered here by card id;
 * - "Press <button>" hints name a Button by its label.
 *
 * src/__tests__/hints/game-hints.test.tsx plays every game's hints the same
 * way.
 */

type Tap = () => void;

let dragTapLookup: ((cardId: string) => Tap | undefined) | null = null;
const buttonTaps = new Map<string, Tap[]>();

/** The open game's drag handles; returns a function that unregisters it. */
export function setDragTapLookup(lookup: (cardId: string) => Tap | undefined) {
  dragTapLookup = lookup;
  return () => {
    if (dragTapLookup === lookup) dragTapLookup = null;
  };
}

export function findDragTap(cardId: string) {
  return dragTapLookup?.(cardId);
}

/** A Button on screen; returns a function that unregisters it. */
export function registerHintButton(label: string, tap: Tap) {
  const taps = buttonTaps.get(label) ?? [];
  taps.push(tap);
  buttonTaps.set(label, taps);
  return () => {
    const current = buttonTaps.get(label);
    if (!current) return;
    const index = current.indexOf(tap);
    if (index >= 0) current.splice(index, 1);
    if (current.length === 0) buttonTaps.delete(label);
  };
}

/** The Button with this label (the latest one shown, if several). */
export function findButtonTap(label: string) {
  return buttonTaps.get(label)?.at(-1);
}
