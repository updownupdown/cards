import { useEffect, useRef, useSyncExternalStore } from "react";
import type { Hint } from "./hint";

/**
 * The open game's hint finder and the hint on screen. A game registers its
 * finder with useHint; the header's Hint button asks it for a hint
 * (requestHint), and the card map draws the hint (useActiveHint). Only one
 * game is ever open, so one finder is enough, as for the auto-complete offer.
 */

type HintFinder = () => Hint | null;

export type ActiveHint = {
  hint: Hint;
  /** New for every press, so pressing again replays the highlights. */
  id: number;
};

let finder: HintFinder | null = null;
let activeHint: ActiveHint | null = null;
let nextHintId = 1;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Clears the hint on screen (all of them, or only `id` if it's still up). */
export function clearActiveHint(id?: number) {
  if (!activeHint || (id !== undefined && activeHint.id !== id)) return;
  activeHint = null;
  notify();
}

/**
 * Finds a hint for the game on screen and shows it. Returns it, or null when
 * the game has no hint for this position (or no hints at all).
 */
export function requestHint(): Hint | null {
  let hint: Hint | null = null;
  try {
    hint = finder?.() ?? null;
  } catch (error) {
    // A hint is a nicety: a bug in one must never break the game.
    if (__DEV__) console.warn("Hint finder failed", error);
  }
  if (hint && hint.steps.length === 0) hint = null;
  activeHint = hint ? { hint, id: nextHintId++ } : null;
  notify();
  return hint;
}

export function hasHintFinder() {
  return finder !== null;
}

/** Whether the game on screen has hints. */
export function useHasHintFinder() {
  return useSyncExternalStore(subscribe, hasHintFinder, hasHintFinder);
}

export function getActiveHint() {
  return activeHint;
}

/** The hint on screen, if any. */
export function useActiveHint() {
  return useSyncExternalStore(subscribe, getActiveHint, getActiveHint);
}

/**
 * Gives the game's hints to the Hint button. `findHint` reads the game as it
 * is when the button is pressed, so nothing runs on ordinary moves. Return
 * null when there's no move worth showing. The hint on screen goes away as
 * soon as `game` changes (a move, undo or a new deal).
 */
export function useHint(
  findHint: () => Hint | null,
  { game, enabled = true }: { game: unknown; enabled?: boolean },
) {
  const findHintRef = useRef(findHint);
  findHintRef.current = findHint;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    const ownFinder: HintFinder = () =>
      enabledRef.current ? findHintRef.current() : null;
    finder = ownFinder;
    notify();
    return () => {
      if (finder !== ownFinder) return;
      finder = null;
      activeHint = null;
      notify();
    };
  }, []);

  useEffect(() => {
    clearActiveHint();
  }, [game]);
}
