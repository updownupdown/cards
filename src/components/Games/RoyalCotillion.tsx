import { useStateManager } from "@/hooks/useStateManager";
import { delay } from "@/utils/utils";
import { useEffect, useMemo } from "react";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import {
  cardDims,
  createDeck,
  flipToBack,
  flipToFace,
  rankValue,
  shuffle,
  SUITS,
  top,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";

import { i18n } from "@/i18n";
const leftCols = 4;
const leftDepth = 3;
const rightCols = 4;
const rightSize = rightCols * 4;
const rightCol = leftCols + 0.4;
const tableauRow = 1.2;
const rightRowStep = 1.1;
// Bottom row for the stock and waste, leaving room for their labels above.
const stockRow = tableauRow + 3 * rightRowStep + 1.55;

type Source =
  | { zone: "left"; pile: number }
  | { zone: "right"; index: number }
  | { zone: "waste" };

type GameState = {
  left: PlayingCard[][];
  right: (PlayingCard | null)[];
  stock: PlayingCard[];
  waste: PlayingCard[];
  /** 0-3 start from Aces, 4-7 from Twos, one of each suit. */
  foundations: PlayingCard[][];
  ended: boolean;
  won: boolean;
};

export type RoyalCotillionGameState = GameState;

const gameStateInitial: GameState = {
  left: Array.from({ length: leftCols }, () => []),
  right: Array(rightSize).fill(null),
  stock: shuffle(createDeck({ deckCount: 2 })).map(flipToBack),
  waste: [],
  foundations: Array.from({ length: 8 }, () => []),
  ended: false,
  won: false,
};

/** Rank two above, wrapping King to Two and Queen to Ace. */
function nextRankValue(value: number) {
  return ((value + 1) % 13) + 1;
}

function foundationFor(state: GameState, card: PlayingCard) {
  return state.foundations.findIndex((pile) => {
    const pileTop = top(pile);
    return (
      !!pileTop &&
      pile.length < 13 &&
      pileTop.suit === card.suit &&
      rankValue(card) === nextRankValue(rankValue(pileTop))
    );
  });
}

function sourceCard(state: GameState, source: Source) {
  if (source.zone === "left") return top(state.left[source.pile]);
  if (source.zone === "right") return state.right[source.index] ?? undefined;
  return top(state.waste);
}

function evaluateEnd(state: GameState, isSettingUp = false) {
  const playing = { ended: false, won: false };
  if (isSettingUp) return playing;

  const placed = state.foundations.reduce((sum, pile) => sum + pile.length, 0);
  if (placed === 104) return { ended: true, won: true };
  if (state.stock.length > 0) return playing;
  if (state.waste.length > 0 && state.right.some((card) => !card))
    return playing;

  const exposed = [...state.left.map(top), ...state.right, top(state.waste)];
  if (exposed.some((card) => card && foundationFor(state, card) >= 0))
    return playing;
  return { ended: true, won: false };
}

export const royalCotillionRules = {
  nextRankValue,
  foundationFor,
  evaluateEnd,
};

export default function RoyalCotillion() {
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
          ...draft.left.flat(),
          ...draft.right.filter((card): card is PlayingCard => !!card),
          ...draft.stock,
          ...draft.waste,
          ...draft.foundations.flat(),
        ];
        draft.stock = shuffle(cards).map(flipToBack);
        draft.left = Array.from({ length: leftCols }, () => []);
        draft.right = Array(rightSize).fill(null);
        draft.waste = [];
        draft.foundations = Array.from({ length: 8 }, () => []);
        draft.ended = false;
        draft.won = false;
      });

      await delay();

      setGame((draft) => {
        const deck = [...draft.stock];
        const seed = (rank: "A" | "2", offset: number) => {
          SUITS.forEach((suit, i) => {
            const index = deck.findIndex(
              (card) => card.rank === rank && card.suit === suit,
            );
            draft.foundations[offset + i] = [
              flipToFace(deck.splice(index, 1)[0]),
            ];
          });
        };
        seed("A", 0);
        seed("2", 4);

        draft.left = Array.from({ length: leftCols }, () =>
          deck.splice(deck.length - leftDepth).map(flipToFace),
        );
        draft.right = deck.splice(deck.length - rightSize).map(flipToFace);
        draft.stock = deck;
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

  function playToFoundation(source: Source) {
    const card = sourceCard(game, source);
    if (game.ended || !card) return;
    const target = foundationFor(game, card);
    if (target < 0) return;

    saveUndoState(structuredClone(game));
    setGame((draft) => {
      let moved: PlayingCard | null | undefined;
      if (source.zone === "left") moved = draft.left[source.pile].pop();
      else if (source.zone === "waste") moved = draft.waste.pop();
      else {
        moved = draft.right[source.index];
        draft.right[source.index] = null;
      }
      if (moved) draft.foundations[target].push(moved);
    });
  }

  function fillRightGap(index: number) {
    if (game.ended || game.right[index]) return;
    if (game.waste.length === 0 && game.stock.length === 0) return;

    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const card = draft.waste.pop() ?? draft.stock.pop();
      if (card) draft.right[index] = flipToFace(card);
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

  const zones: MapZone[] = useMemo(() => {
    const foundationZones: MapZone[] = game.foundations.map((pile, i) => ({
      id: `foundation-${i}`,
      name: "foundation",
      pileIndex: i,
      cards: pile,
      col: i < 4 ? i : rightCol + i - 4,
      row: 0,
      fan: { maxVisible: 3 },
      placeholder: {},
    }));

    const leftZones: MapZone[] = game.left.map((pile, i) => ({
      id: `left-${i}`,
      name: "left",
      pileIndex: i,
      cards: pile,
      col: i,
      row: tableauRow,
      fan: { direction: "down", offset: cardDims.tableauOffset },
      placeholder: {},
    }));

    const rightZones: MapZone[] = game.right.map((card, i) => ({
      id: `right-${i}`,
      name: "right",
      pileIndex: i,
      cards: card ? [card] : [],
      col: rightCol + (i % rightCols),
      row: tableauRow + Math.floor(i / rightCols) * rightRowStep,
      placeholder: {},
    }));

    return [
      ...foundationZones,
      ...leftZones,
      ...rightZones,
      {
        id: "waste",
        name: "waste",
        cards: game.waste,
        col: rightCol + rightCols - 2.25,
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
        col: rightCol + rightCols - 1,
        row: stockRow,
        fan: { maxVisible: 3 },
        placeholder: {
          text: i18n.t("cards:stock"),
          infoPos: "above",
          showCount: true,
        },
      },
    ];
  }, [game]);

  const canFillGap =
    !game.ended && (game.waste.length > 0 || game.stock.length > 0);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (!mappedCard.topOfZone) return {};
    const index = mappedCard.pileIndex ?? 0;
    if (mappedCard.zoneName === "left") {
      return {
        isDisabled: game.ended,
        onPress: () => playToFoundation({ zone: "left", pile: index }),
      };
    }
    if (mappedCard.zoneName === "right") {
      return {
        isDisabled: game.ended,
        onPress: () => playToFoundation({ zone: "right", index }),
      };
    }
    if (mappedCard.zoneName === "waste") {
      return {
        isDisabled: game.ended,
        onPress: () => playToFoundation({ zone: "waste" }),
      };
    }
    if (mappedCard.zoneName === "stock") {
      return { isDisabled: game.ended, onPress: drawStock };
    }
    return {};
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name === "right" && zone.pileIndex !== undefined) {
      const index = zone.pileIndex;
      return {
        onPress: () => fillRightGap(index),
        isDisabled: !canFillGap || !!game.right[index],
        isSelected: canFillGap && !game.right[index],
        selectColor: "green",
      };
    }
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
    cardSize: "tableau",
    fixedRows: stockRow + 1,
    gap: 0.14,
  });

  const placed = game.foundations.reduce((sum, pile) => sum + pile.length, 0);

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      reset={reset}
      isLoaded={isLoaded}
      score={placed}
      winLoseMessage={
        game.won
          ? i18n.t("games:royalCotillion.theLastDanceIsDone")
          : i18n.t("cards:noMovesRemain")
      }
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}
    </GameWrapper>
  );
}
