import { type PlayingCard, RANK_VALUE } from "@/components/Cards/card-utils";
import { useEffect, useRef, useState } from "react";
import { setAutoCompleteOffer } from "./auto-complete-offer";
import { useGlobalSettings } from "./useGlobalSettings";

// Auto-complete for Klondike-style games: once every remaining card can go to
// the foundations one top card at a time, the game can play those moves
// itself. The autoComplete setting decides when: "always" right away,
// "ask" once the player asks from a panel under the header (see
// auto-complete-offer), and "never" not at all. Moves are applied STAGGER_MS
// apart, so the cards fly in overlapping, staggered animations rather than one
// after another.

const START_DELAY_MS = 350;
const STAGGER_MS = 50;

export type AutoCompleteMove = { source: number; foundation: number };

export function getAutoCompleteSourcesWithCells(
  sourcePiles: PlayingCard[][],
  cells: (PlayingCard | null)[],
): PlayingCard[][] {
  return [...sourcePiles, ...cells.map((card) => (card ? [card] : []))];
}

export function applyAutoCompleteMoveWithCells(
  sourcePiles: PlayingCard[][],
  cells: (PlayingCard | null)[],
  foundations: PlayingCard[][],
  move: AutoCompleteMove,
) {
  const sourcePileCount = sourcePiles.length;
  const card =
    move.source < sourcePileCount
      ? sourcePiles[move.source].pop()
      : cells[move.source - sourcePileCount];

  if (!card) return;
  if (move.source >= sourcePileCount) {
    cells[move.source - sourcePileCount] = null;
  }
  foundations[move.foundation].push(card);
}

type CanPlaceOnFoundation = (
  card: PlayingCard,
  foundationTop?: PlayingCard,
) => boolean;

function top<T>(pile: T[]) {
  return pile[pile.length - 1];
}

function rankValue(card: PlayingCard) {
  return RANK_VALUE[card.rank as keyof typeof RANK_VALUE] ?? Infinity;
}

/** The lowest-ranked top card that can go to a foundation right now. */
function findMove(
  sources: PlayingCard[][],
  foundations: PlayingCard[][],
  canPlaceOnFoundation: CanPlaceOnFoundation,
): AutoCompleteMove | null {
  let best: AutoCompleteMove | null = null;
  let bestRank = Infinity;

  sources.forEach((pile, source) => {
    const card = top(pile);
    if (!card?.faceUp) return;

    const rank = rankValue(card);
    if (rank >= bestRank) return;

    const foundation = foundations.findIndex((pile) =>
      canPlaceOnFoundation(card, top(pile)),
    );
    if (foundation >= 0) {
      best = { source, foundation };
      bestRank = rank;
    }
  });

  return best;
}

/**
 * The sequence of foundation moves that clears every source pile, or null if
 * the sources can't all be cleared that way (auto-complete isn't possible).
 */
export function planAutoComplete(
  sources: PlayingCard[][],
  foundations: PlayingCard[][],
  canPlaceOnFoundation: CanPlaceOnFoundation,
): AutoCompleteMove[] | null {
  const remaining = sources.map((pile) => [...pile]);
  const built = foundations.map((pile) => [...pile]);
  const moves: AutoCompleteMove[] = [];

  for (;;) {
    const move = findMove(remaining, built, canPlaceOnFoundation);
    if (!move) break;
    built[move.foundation].push(remaining[move.source].pop()!);
    moves.push(move);
  }

  const cleared = remaining.every((pile) => pile.length === 0);
  return cleared && moves.length > 0 ? moves : null;
}

type Options<T> = {
  game: T;
  setGame: (recipe: (draft: T) => void) => void;
  isSettingUp: boolean;
  won: boolean;
  /** True while something else owns the board, e.g. a card is being dragged. */
  isBlocked?: boolean;
  /**
   * The piles cards can be auto-moved from, or null when the game isn't in a
   * state where auto-complete applies (e.g. face-down cards or a stock left).
   * Must return the state's own arrays: it's also called on the Immer draft.
   */
  getSources: (state: T) => PlayingCard[][] | null;
  /** The foundation piles (the state's own arrays). */
  getFoundations: (state: T) => PlayingCard[][];
  canPlaceOnFoundation: CanPlaceOnFoundation;
  /** Override how a planned move mutates state when sources aren't arrays. */
  applyMove?: (draft: T, move: AutoCompleteMove) => void;
  /** Called once when auto-complete starts (e.g. clear the selection). */
  onStart?: () => void;
};

export function useAutoComplete<T>(options: Options<T>) {
  const { game, isSettingUp, won, isBlocked = false } = options;
  const { settings, isLoading: isSettingsLoading } = useGlobalSettings();
  const mode = settings.autoComplete;
  const [isAutoCompleting, setIsAutoCompleting] = useState(false);
  // The panel is showing. It stays until closed or used, even if the setting
  // is changed from it meanwhile.
  const [isOfferOpen, setIsOfferOpen] = useState(false);
  // The panel was closed: nothing is stacked for the player until the next
  // deal.
  const [isOfferDismissed, setIsOfferDismissed] = useState(false);
  const optionsRef = useRef(options);
  optionsRef.current = options;
  // Bumped to cancel a run in progress (new deal, reset or unmount).
  const runIdRef = useRef(0);

  useEffect(() => {
    if (!isSettingUp) return;
    runIdRef.current += 1;
    setIsAutoCompleting(false);
    setIsOfferOpen(false);
    setIsOfferDismissed(false);
  }, [isSettingUp]);

  useEffect(() => {
    return () => {
      runIdRef.current += 1;
      setAutoCompleteOffer(null);
    };
  }, []);

  const run = async (moves: AutoCompleteMove[]) => {
    const runId = ++runIdRef.current;
    setIsAutoCompleting(true);
    optionsRef.current.onStart?.();

    for (const move of moves) {
      if (runIdRef.current !== runId) return;

      optionsRef.current.setGame((draft) => {
        const current = optionsRef.current;
        if (current.applyMove) {
          current.applyMove(draft, move);
          return;
        }
        const card = current.getSources(draft)?.[move.source]?.pop();
        if (card) {
          current.getFoundations(draft)[move.foundation].push({
            ...card,
            faceUp: true,
          });
        }
      });

      await new Promise((resolve) => setTimeout(resolve, STAGGER_MS));
    }

    if (runIdRef.current === runId) setIsAutoCompleting(false);
  };

  useEffect(() => {
    if (
      isAutoCompleting ||
      isSettingUp ||
      won ||
      isBlocked ||
      isSettingsLoading ||
      isOfferDismissed ||
      (mode === "never" && !isOfferOpen)
    ) {
      return;
    }

    const { getSources, getFoundations, canPlaceOnFoundation } =
      optionsRef.current;
    const sources = getSources(game);
    const moves = sources
      ? planAutoComplete(sources, getFoundations(game), canPlaceOnFoundation)
      : null;
    if (!moves) {
      // An undo can take the game back out of its end state.
      if (isOfferOpen) setIsOfferOpen(false);
      return;
    }

    if (isOfferOpen || mode === "ask") {
      if (!isOfferOpen) setIsOfferOpen(true);
      setAutoCompleteOffer({
        start: () => {
          setAutoCompleteOffer(null);
          setIsOfferOpen(false);
          void run(moves);
        },
        dismiss: () => {
          setAutoCompleteOffer(null);
          setIsOfferOpen(false);
          setIsOfferDismissed(true);
        },
      });
      return () => setAutoCompleteOffer(null);
    }

    // Let the move that made it possible finish animating first.
    const timer = setTimeout(() => void run(moves), START_DELAY_MS);
    return () => clearTimeout(timer);
  }, [
    game,
    isAutoCompleting,
    isBlocked,
    isOfferDismissed,
    isOfferOpen,
    isSettingUp,
    isSettingsLoading,
    mode,
    won,
  ]);

  return { isAutoCompleting };
}
