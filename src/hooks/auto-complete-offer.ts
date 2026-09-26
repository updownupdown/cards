import { useSyncExternalStore } from "react";

/**
 * The open game's offer to finish itself by stacking the rest of its cards on
 * the foundations, shown as a panel under the header while the
 * autoComplete setting is "ask". Set by useAutoComplete, shown by
 * GameWrapper. Only one game is ever open, so one offer is enough.
 */
export type AutoCompleteOffer = {
  /** Stacks the cards. */
  start: () => void;
  /** Closes the panel until the next deal. */
  dismiss: () => void;
};

let currentOffer: AutoCompleteOffer | null = null;
const listeners = new Set<() => void>();

export function setAutoCompleteOffer(offer: AutoCompleteOffer | null) {
  if (offer === currentOffer) return;
  currentOffer = offer;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getAutoCompleteOffer() {
  return currentOffer;
}

export function useAutoCompleteOffer() {
  return useSyncExternalStore(
    subscribe,
    () => currentOffer,
    () => currentOffer,
  );
}
