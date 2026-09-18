import { useStateManager } from "@/hooks/useStateManager";
import { delay } from "@/utils/utils";
import { useEffect, useMemo } from "react";
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

function evaluateEnd(state: GameState, isSettingUp = false) {
  const playing = { ended: false, won: false };
  if (isSettingUp) return playing;
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

export const queensAudienceRules = { findAvailable, playFor, evaluateEnd };

export default function QueensAudience() {
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
    const { ended, won } = evaluateEnd(game, isSettingUp);
    if (ended !== game.ended || won !== game.won) {
      setGame((draft) => {
        draft.ended = ended;
        draft.won = won;
      });
    }
  }, [game, isSettingUp, setGame]);

  function onCardPress(location: Location) {
    if (game.ended) return;
    const play = playFor(game, location);
    if (!play) return;

    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const cards = play.locations.map((entry) =>
        entry.zone === "frame" ? draft.frame[entry.index] : top(draft.waste),
      );
      const emptied: number[] = [];
      play.locations.forEach((entry) => {
        if (entry.zone === "frame") {
          draft.frame[entry.index] = null;
          emptied.push(entry.index);
        } else {
          draft.waste.pop();
        }
      });
      cards.forEach((card) => {
        if (card) draft[play.pile][play.suit].push(card);
      });
      // Gaps in the antechamber refill from the waste, then the stock.
      emptied.forEach((index) => {
        const refill = draft.waste.pop() ?? draft.stock.pop();
        draft.frame[index] = refill ? flipToFace(refill) : null;
      });
    });
  }

  function drawStock() {
    if (game.ended || game.stock.length === 0) return;
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
        col: 4 * colStep - 1.25,
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

  const placed =
    game.royals.reduce((sum, pile) => sum + pile.length, 0) +
    game.foundations.reduce((sum, pile) => sum + pile.length, 0);

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      reset={reset}
      isLoaded={isLoaded}
      score={placed}
      winLoseMessage={
        game.won
          ? i18n.t("games:queensAudience.theQueensCourtIsComplete")
          : i18n.t("cards:noMovesRemain")
      }
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}
    </GameWrapper>
  );
}
