import type { PlayingCard } from "@/components/Cards/card-utils";

/**
 * A hint shows the player one good move, the way a teacher would point at the
 * board: "this card... goes here". Games describe it with what they already
 * have, card ids and card-map zone ids (piles, empty slots, and the zones
 * their buttons sit in), and the card map draws the highlights.
 */
export type HintTarget = { card: string } | { zone: string };

/** Messages shown with a hint, from the "game:hint" translations. */
export type HintMessageKey =
  | "toFoundation"
  | "moveCard"
  | "moveCards"
  | "toCell"
  | "draw"
  | "redeal"
  | "dealRow"
  | "toWaste"
  | "removeCard"
  | "removeCards"
  | "swapCards"
  | "tapCard"
  | "press";

export type HintMessage = {
  key: HintMessageKey;
  /** Interpolated into the message, e.g. { label: "Draw" } for "press". */
  values?: Record<string, string | number>;
  /**
   * Words for a move whose point isn't plain from the board ("Set up a
   * zombie kill"), already translated. The UFO always says a note; the
   * plain messages above stay unsaid (see SHOW_HINT_TEXT in HintUfo).
   */
  note?: string;
};

export type Hint = {
  /**
   * Highlights, lit one step after another: the card to move, then where it
   * goes. Targets within a step light together (e.g. a pair to remove).
   */
  steps: HintTarget[][];
  message: HintMessage;
};

export function cardTarget(card: PlayingCard | string): HintTarget {
  return { card: typeof card === "string" ? card : card.id };
}

export function zoneTarget(zoneId: string): HintTarget {
  return { zone: zoneId };
}

/**
 * Builds a hint. Each step is one target or several lit together:
 * makeHint("moveCard", [cardTarget(card)], [zoneTarget("tableau-2")]).
 */
export function makeHint(
  message: HintMessageKey | HintMessage,
  ...steps: (HintTarget | HintTarget[])[]
): Hint {
  return {
    message: typeof message === "string" ? { key: message } : message,
    steps: steps
      .map((step) => (Array.isArray(step) ? step : [step]))
      .filter((step) => step.length > 0),
  };
}

/** The same hint, with words for the UFO to say (see HintMessage.note). */
export function withNote<H extends Hint | null>(hint: H, note: string): H {
  return (hint && { ...hint, message: { ...hint.message, note } }) as H;
}

/** "Press <button>": a button the game places in a card-map zone. */
export function pressHint(zoneId: string, label: string): Hint {
  return makeHint({ key: "press", values: { label } }, zoneTarget(zoneId));
}

/**
 * Names for arrow buttons that show only an icon, so a "press" hint can name
 * them (and screen readers read them).
 */
export const ARROW_LABELS = { back: "←", forward: "→" } as const;
