import { useStateManager } from "@/hooks/useStateManager";
import { delay } from "@/utils/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import {
  createDeck,
  flipToBack,
  flipToFace,
  rankValue,
  shuffle,
  SUITS,
  top,
  type CardRank,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";

import { i18n } from "@/i18n";
import { useHint } from "@/hints/hint-store";
import { cardTarget, makeHint, zoneTarget } from "@/hints/hint";
const colStep = 1.15;
const rowStep = 1.1;
// The antechamber is the outer ring of a 5x5 grid, as [col, row].
const frameCells: [number, number][] = [
  [0, 0],
  [1, 0],
  [2, 0],
  [3, 0],
  [4, 0],
  [4, 1],
  [4, 2],
  [4, 3],
  [4, 4],
  [3, 4],
  [2, 4],
  [1, 4],
  [0, 4],
  [0, 3],
  [0, 2],
  [0, 1],
];
// Inside the audience chamber, one foundation and one royal couple per suit.
const foundationCells: [number, number][] = [
  [1, 1],
  [3, 1],
  [1, 3],
  [3, 3],
];
const royalCells: [number, number][] = [
  [2, 1],
  [1, 2],
  [3, 2],
  [2, 3],
];
// Bottom row for the stock and waste, leaving room for their labels above.
const stockRow = 4 * rowStep + 1.35;
const foundationSize = 11;
// Cards move one at a time, this far apart, so a royal couple or a run of
// refills flies in as overlapping animations instead of arriving all at once.
const playerStaggerMs = 200;
const autoCompleteStaggerMs = 100;
// Let the move that emptied the stock settle before the game finishes itself.
const autoCompleteStartMs = 500;

type Location = { zone: "frame"; index: number } | { zone: "waste" };

type GameState = {
  frame: (PlayingCard | null)[];
  stock: PlayingCard[];
  waste: PlayingCard[];
  /** A King with its Queen on top, by suit. */
  royals: PlayingCard[][];
  /** An Ace with its Jack on top, then built down by suit to the Two. */
  foundations: PlayingCard[][];
  ended: boolean;
  won: boolean;
};

export type QueensAudienceGameState = GameState;

const gameStateInitial: GameState = {
  frame: frameCells.map(() => null),
  stock: shuffle(createDeck()).map(flipToBack),
  waste: [],
  royals: SUITS.map(() => []),
  foundations: SUITS.map(() => []),
  ended: false,
  won: false,
};

const cellPosition = ([col, row]: [number, number]) => ({
  col: col * colStep,
  row: row * rowStep,
});

function cardAt(state: GameState, location: Location) {
  return location.zone === "frame"
    ? (state.frame[location.index] ?? undefined)
    : top(state.waste);
}

/** Where an available card of this rank and suit is, if anywhere. */
function findAvailable(
  state: GameState,
  rank: CardRank,
  suit: PlayingCard["suit"],
): Location | null {
  const index = state.frame.findIndex(
    (card) => card?.rank === rank && card.suit === suit,
  );
  if (index >= 0) return { zone: "frame", index };
  const wasteTop = top(state.waste);
  return wasteTop?.rank === rank && wasteTop.suit === suit
    ? { zone: "waste" }
    : null;
}

type Play = {
  pile: "royals" | "foundations";
  suit: number;
  /** In the order they go onto the pile. */
  locations: Location[];
};

/** What playing this card does: it may bring its partner along with it. */
function playFor(state: GameState, location: Location): Play | null {
  const card = cardAt(state, location);
  if (!card) return null;
  const suit = SUITS.indexOf(card.suit);

  const pair = (
    pile: Play["pile"],
    lower: CardRank,
    upper: CardRank,
  ): Play | null => {
    if (state[pile][suit].length > 0) return null;
    const partnerRank = card.rank === lower ? upper : lower;
    const partner = findAvailable(state, partnerRank, card.suit);
    if (!partner) return null;
    return {
      pile,
      suit,
      locations:
        card.rank === lower ? [location, partner] : [partner, location],
    };
  };

  if (card.rank === "K" || card.rank === "Q") return pair("royals", "K", "Q");
  if (card.rank === "A" || card.rank === "J")
    return pair("foundations", "A", "J");

  const pileTop = top(state.foundations[suit]);
  return pileTop && rankValue(pileTop) === rankValue(card) + 1
    ? { pile: "foundations", suit, locations: [location] }
    : null;
}

function availableLocations(state: GameState): Location[] {
  return [
    ...state.frame.flatMap((card, index) =>
      card ? [{ zone: "frame", index } as Location] : [],
    ),
    ...(state.waste.length > 0 ? [{ zone: "waste" } as Location] : []),
  ];
}

/** Move one card of a play onto its pile, leaving the gap it opens unfilled. */
function takeCardForPlay(state: GameState, play: Play, from: Location) {
  const card =
    from.zone === "frame" ? state.frame[from.index] : top(state.waste);
  if (!card) return;
  if (from.zone === "frame") state.frame[from.index] = null;
  else state.waste.pop();
  state[play.pile][play.suit].push(card);
}

/**
 * Once the stock and waste are gone, every card left has exactly one place to
 * go and playing one never blocks another, so the rest of the game is forced.
 * These are the plays that see it out, or null if there is nothing to play.
 */
function planFinish(state: GameState): Play[] | null {
  if (state.stock.length > 0 || state.waste.length > 0) return null;

  const sim: GameState = {
    ...state,
    frame: [...state.frame],
    stock: [],
    waste: [],
    royals: state.royals.map((pile) => [...pile]),
    foundations: state.foundations.map((pile) => [...pile]),
  };
  const plays: Play[] = [];

  for (;;) {
    const play = availableLocations(sim)
      .map((location) => playFor(sim, location))
      .find((candidate): candidate is Play => !!candidate);
    if (!play) break;
    play.locations.forEach((from) => takeCardForPlay(sim, play, from));
    plays.push(play);
  }

  return plays.length > 0 ? plays : null;
}

function evaluateEnd(state: GameState, isPaused = false) {
  const playing = { ended: false, won: false };
  if (isPaused) return playing;
  if (
    state.royals.every((pile) => pile.length === 2) &&
    state.foundations.every((pile) => pile.length === foundationSize)
  ) {
    return { ended: true, won: true };
  }
  if (state.stock.length > 0) return playing;
  const hasMove = availableLocations(state).some(
    (location) => !!playFor(state, location),
  );
  return hasMove ? playing : { ended: true, won: false };
}

/**
 * Any card that can go up, the frame's before the waste's (its gap takes the
 * next card); a pair goes up together. Draws when nothing plays.
 */
function findQueensAudienceHint(state: GameState) {
  for (const location of [
    ...availableLocations(state).filter((at) => at.zone === "frame"),
    ...availableLocations(state).filter((at) => at.zone === "waste"),
  ]) {
    const play = playFor(state, location);
    if (play) {
      const pile = `${play.pile === "royals" ? "royal" : "foundation"}-${play.suit}`;
      return makeHint(
        "toFoundation",
        cardTarget(cardAt(state, location)!),
        zoneTarget(pile),
      );
    }
  }
  return state.stock.length > 0 ? makeHint("draw", zoneTarget("stock")) : null;
}

export const queensAudienceRules = {
  findHint: findQueensAudienceHint,
  findAvailable,
  playFor,
  planFinish,
  evaluateEnd,
};

export default function QueensAudience() {
  // Cards move one at a time, so input and the end check both wait for the
  // last of them: a half-brought-in royal couple would otherwise read as a
  // dead end. `isAutoCompleting` is only the longer unattended run, which also
  // covers the board and holds back undo. Bumping the run id cancels a run.
  const [isMoving, setIsMoving] = useState(false);
  const [isAutoCompleting, setIsAutoCompleting] = useState(false);
  const isMovingRef = useRef(false);
  const runIdRef = useRef(0);

  const cancelMoves = useCallback(() => {
    runIdRef.current += 1;
    isMovingRef.current = false;
    setIsMoving(false);
    setIsAutoCompleting(false);
  }, []);

  const {
    isLoaded,
    isSettingUp,
    game,
    setGame,
    undo,
    canUndo,
    saveUndoState,
    reset,
  } = useStateManager({
    gameStateInitial,
    resetNonGameStates: cancelMoves,
    resetAndSetup: async () => {
      setGame((draft) => {
        const cards = [
          ...draft.frame.filter((card): card is PlayingCard => !!card),
          ...draft.stock,
          ...draft.waste,
          ...draft.royals.flat(),
          ...draft.foundations.flat(),
        ];
        draft.stock = shuffle(cards).map(flipToBack);
        draft.frame = frameCells.map(() => null);
        draft.waste = [];
        draft.royals = SUITS.map(() => []);
        draft.foundations = SUITS.map(() => []);
        draft.ended = false;
        draft.won = false;
      });

      await delay();

      setGame((draft) => {
        draft.frame = frameCells.map(() => {
          const card = draft.stock.pop();
          return card ? flipToFace(card) : null;
        });
      });
    },
  });

  useEffect(() => {
    return () => {
      runIdRef.current += 1;
    };
  }, []);

  useEffect(() => {
    const { ended, won } = evaluateEnd(game, isSettingUp || isMoving);
    if (ended !== game.ended || won !== game.won) {
      setGame((draft) => {
        draft.ended = ended;
        draft.won = won;
      });
    }
  }, [game, isMoving, isSettingUp, setGame]);

  /** Play these moves one card at a time, refilling gaps as they open. */
  async function runPlays(plays: Play[], isAutoComplete = false) {
    const runId = ++runIdRef.current;
    const isCancelled = () => runIdRef.current !== runId;
    // Cards left to fill gaps with. An auto-complete run has none, so it
    // doesn't pause on gaps that nothing is going to move into.
    let refills = game.waste.length + game.stock.length;
    const currentStaggerMs = isAutoComplete
      ? autoCompleteStaggerMs
      : playerStaggerMs;

    isMovingRef.current = true;
    setIsMoving(true);
    if (isAutoComplete) setIsAutoCompleting(true);

    for (const play of plays) {
      const emptied: number[] = [];
      for (const from of play.locations) {
        if (isCancelled()) return;
        setGame((draft) => takeCardForPlay(draft, play, from));
        if (from.zone === "frame") emptied.push(from.index);
        else refills -= 1;
        await delay(currentStaggerMs);
      }
      // Gaps in the antechamber refill from the waste, then the stock.
      for (const index of emptied) {
        if (refills <= 0) break;
        if (isCancelled()) return;
        refills -= 1;
        setGame((draft) => {
          const refill = draft.waste.pop() ?? draft.stock.pop();
          draft.frame[index] = refill ? flipToFace(refill) : null;
        });
        await delay(currentStaggerMs);
      }
    }

    if (isCancelled()) return;
    isMovingRef.current = false;
    setIsMoving(false);
    setIsAutoCompleting(false);
  }

  // With nothing left to turn over, the remaining moves are forced, so the
  // game plays them out rather than making the player tap through them.
  useEffect(() => {
    if (isSettingUp || isMoving || game.ended) return;
    const plays = planFinish(game);
    if (!plays) return;

    const timer = setTimeout(
      () => void runPlays(plays, true),
      autoCompleteStartMs,
    );
    return () => clearTimeout(timer);
  }, [game, isMoving, isSettingUp]);

  useHint(() => findQueensAudienceHint(game), {
    game,
    enabled: !isSettingUp && !game.ended && !isMoving,
  });

  function onCardPress(location: Location) {
    if (game.ended || isMovingRef.current) return;
    const play = playFor(game, location);
    if (!play) return;

    saveUndoState(structuredClone(game));
    void runPlays([play]);
  }

  function drawStock() {
    if (game.ended || isMovingRef.current || game.stock.length === 0) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const card = draft.stock.pop();
      if (card) draft.waste.push(flipToFace(card));
    });
  }

  const zones: MapZone[] = useMemo(
    () => [
      ...game.frame.map((card, index) => ({
        id: `frame-${index}`,
        name: "frame",
        pileIndex: index,
        cards: card ? [card] : [],
        ...cellPosition(frameCells[index]),
        placeholder: {},
      })),
      ...game.foundations.map((pile, index) => ({
        id: `foundation-${index}`,
        name: "foundation",
        pileIndex: index,
        cards: pile,
        ...cellPosition(foundationCells[index]),
        fan: { maxVisible: 3 },
        placeholder: { iconName: SUITS[index], iconSize: 0.5 },
      })),
      ...game.royals.map((pile, index) => ({
        id: `royal-${index}`,
        name: "royal",
        pileIndex: index,
        cards: pile,
        ...cellPosition(royalCells[index]),
        fan: { maxVisible: 2 },
        placeholder: { iconName: SUITS[index], iconSize: 0.5 },
      })),
      {
        id: "waste",
        name: "waste",
        cards: game.waste,
        col: 3 * colStep,
        row: stockRow,
        fan: { maxVisible: 3 },
        placeholder: {
          text: i18n.t("cards:waste"),
          infoPos: "above",
          showCount: true,
        },
      },
      {
        id: "stock",
        name: "stock",
        cards: game.stock,
        col: 4 * colStep,
        row: stockRow,
        fan: { maxVisible: 3 },
        placeholder: {
          text: i18n.t("cards:stock"),
          infoPos: "above",
          showCount: true,
        },
      },
    ],
    [game],
  );

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (mappedCard.zoneName === "royal") {
      return { forceOverlayColor: true, selectColor: "lightGrey" };
    }
    if (!mappedCard.topOfZone) return {};
    if (mappedCard.zoneName === "frame" && mappedCard.pileIndex !== undefined) {
      const location: Location = {
        zone: "frame",
        index: mappedCard.pileIndex,
      };
      return {
        isDisabled: game.ended,
        onPress: () => onCardPress(location),
      };
    }
    if (mappedCard.zoneName === "waste") {
      return {
        isDisabled: game.ended,
        onPress: () => onCardPress({ zone: "waste" }),
      };
    }
    if (mappedCard.zoneName === "stock") {
      return { isDisabled: game.ended, onPress: drawStock };
    }
    return {};
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name === "stock") {
      return {
        onPress: drawStock,
        isDisabled: game.ended || game.stock.length === 0,
      };
    }
    return {};
  };

  const { cardMap } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper,
    cardSize: "regular",
    fixedRows: stockRow + 1,
    gap: 0.14,
  });

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      reset={reset}
      isLoaded={isLoaded}
      winLoseMessage={
        game.won
          ? i18n.t("games:queensAudience.theQueensCourtIsComplete")
          : i18n.t("cards:noMovesRemain")
      }
      canUndo={canUndo}
      undo={undo}
      autoCompleting={isAutoCompleting}
    >
      {cardMap}
    </GameWrapper>
  );
}
