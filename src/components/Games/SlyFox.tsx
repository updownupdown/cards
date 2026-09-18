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
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";

import { i18n } from "@/i18n";
const reserveCount = 20;
const reserveCols = 5;
const dealSize = 20;
const reserveCol = 1.2;
const rowStep = 1.1;
const kingCol = reserveCol + reserveCols + 0.2;
// Bottom row for the stock, leaving room for its label above.
const stockRow = 3 * rowStep + 1 + 0.25;

/**
 * "opening": reserve gaps refill from the stock.
 * "dealing": each stock card must be placed on a reserve pile (or played up).
 * "play": reserve cards go up; gaps stay empty until the next deal.
 */
type Phase = "opening" | "dealing" | "play";

type GameState = {
  stock: PlayingCard[];
  reserves: PlayingCard[][];
  /** 0-3 build up from the Aces by suit; 4-7 down from the Kings. */
  foundations: PlayingCard[][];
  phase: Phase;
  /** Cards still to place on the reserves in the current deal. */
  toPlace: number;
  ended: boolean;
  won: boolean;
};

export type SlyFoxGameState = GameState;

const gameStateInitial: GameState = {
  stock: shuffle(createDeck({ deckCount: 2 })).map(flipToBack),
  reserves: Array.from({ length: reserveCount }, () => []),
  foundations: Array.from({ length: 8 }, () => []),
  phase: "opening",
  toPlace: 0,
  ended: false,
  won: false,
};

function foundationFor(state: GameState, card: PlayingCard) {
  return state.foundations.findIndex((pile, index) => {
    const pileTop = top(pile);
    return (
      !!pileTop &&
      pileTop.suit === card.suit &&
      rankValue(card) === rankValue(pileTop) + (index < 4 ? 1 : -1)
    );
  });
}

function evaluateEnd(state: GameState, isSettingUp = false) {
  const playing = { ended: false, won: false };
  if (isSettingUp) return playing;

  const placed = state.foundations.reduce((sum, pile) => sum + pile.length, 0);
  if (placed === 104) return { ended: true, won: true };
  if (state.phase === "dealing" || state.stock.length > 0) return playing;

  const hasMove = state.reserves.some((pile) => {
    const card = top(pile);
    return !!card && foundationFor(state, card) >= 0;
  });
  return hasMove ? playing : { ended: true, won: false };
}

/** Ends the deal once every card is placed, hiding the next stock card again. */
function settleDeal(draft: GameState) {
  const stockTop = top(draft.stock);
  if (draft.toPlace > 0 && stockTop) {
    draft.stock[draft.stock.length - 1] = flipToFace(stockTop);
    return;
  }
  draft.phase = "play";
  draft.toPlace = 0;
  if (stockTop) draft.stock[draft.stock.length - 1] = flipToBack(stockTop);
}

export const slyFoxRules = { foundationFor, evaluateEnd };

export default function SlyFox() {
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
          ...draft.stock,
          ...draft.reserves.flat(),
          ...draft.foundations.flat(),
        ];
        draft.stock = shuffle(cards).map(flipToBack);
        draft.reserves = Array.from({ length: reserveCount }, () => []);
        draft.foundations = Array.from({ length: 8 }, () => []);
        draft.phase = "opening";
        draft.toPlace = 0;
        draft.ended = false;
        draft.won = false;
      });

      await delay();

      setGame((draft) => {
        const deck = [...draft.stock];
        const take = (rank: "A" | "K", suit: PlayingCard["suit"]) =>
          flipToFace(
            deck.splice(
              deck.findIndex(
                (card) => card.rank === rank && card.suit === suit,
              ),
              1,
            )[0],
          );
        SUITS.forEach((suit, index) => {
          draft.foundations[index] = [take("A", suit)];
          draft.foundations[4 + index] = [take("K", suit)];
        });
        draft.reserves = Array.from({ length: reserveCount }, () => {
          const card = deck.pop();
          return card ? [flipToFace(card)] : [];
        });
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

  function onReservePress(index: number) {
    if (game.ended) return;

    if (game.phase === "dealing") {
      if (!top(game.stock)) return;
      saveUndoState(structuredClone(game));
      setGame((draft) => {
        const card = draft.stock.pop();
        if (card) draft.reserves[index].push(flipToFace(card));
        draft.toPlace -= 1;
        settleDeal(draft);
      });
      return;
    }

    const card = top(game.reserves[index]);
    if (!card) return;
    const target = foundationFor(game, card);
    if (target < 0) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const moved = draft.reserves[index].pop();
      if (moved) draft.foundations[target].push(moved);
      if (draft.phase === "opening" && draft.reserves[index].length === 0) {
        const refill = draft.stock.pop();
        if (refill) draft.reserves[index].push(flipToFace(refill));
      }
    });
  }

  function onStockPress() {
    if (game.ended || game.stock.length === 0) return;

    if (game.phase === "dealing") {
      // A dealt card may go straight up without counting towards the deal.
      const card = top(game.stock)!;
      const target = foundationFor(game, card);
      if (target < 0) return;
      saveUndoState(structuredClone(game));
      setGame((draft) => {
        const moved = draft.stock.pop();
        if (moved) draft.foundations[target].push(flipToFace(moved));
        settleDeal(draft);
      });
      return;
    }

    saveUndoState(structuredClone(game));
    setGame((draft) => {
      draft.phase = "dealing";
      draft.toPlace = Math.min(dealSize, draft.stock.length);
      settleDeal(draft);
    });
  }

  const zones: MapZone[] = useMemo(() => {
    const foundationZones: MapZone[] = game.foundations.map((pile, i) => ({
      id: `foundation-${i}`,
      name: "foundation",
      pileIndex: i,
      cards: pile,
      col: i < 4 ? 0 : kingCol,
      row: (i % 4) * rowStep,
      fan: { maxVisible: 3 },
      placeholder: {},
    }));

    const reserveZones: MapZone[] = game.reserves.map((pile, i) => ({
      id: `reserve-${i}`,
      name: "reserve",
      pileIndex: i,
      cards: pile,
      col: reserveCol + (i % reserveCols),
      row: Math.floor(i / reserveCols) * rowStep,
      fan: { maxVisible: 3 },
      placeholder: {},
    }));

    return [
      ...foundationZones,
      ...reserveZones,
      {
        id: "stock",
        name: "stock",
        cards: game.stock,
        col: kingCol,
        row: stockRow,
        fan: { maxVisible: 3 },
        placeholder: {
          text:
            game.phase === "dealing"
              ? i18n.t("games:slyFox.place", { toPlace: game.toPlace })
              : i18n.t("cards:stock"),
          infoPos: "left",
          showCount: game.phase !== "dealing",
        },
      },
    ];
  }, [game]);

  const isDealing = game.phase === "dealing";

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (!mappedCard.topOfZone) return {};
    if (
      mappedCard.zoneName === "reserve" &&
      mappedCard.pileIndex !== undefined
    ) {
      const index = mappedCard.pileIndex;
      return {
        isDisabled: game.ended,
        selectColor: isDealing ? "green" : "none",
        onPress: () => onReservePress(index),
      };
    }
    if (mappedCard.zoneName === "stock") {
      return { isDisabled: game.ended, onPress: onStockPress };
    }
    return {};
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name === "reserve" && zone.pileIndex !== undefined) {
      const index = zone.pileIndex;
      return {
        onPress: () => onReservePress(index),
        isDisabled: game.ended || !isDealing,
        isSelected: isDealing,
        selectColor: "green",
      };
    }
    if (zone.name === "stock") {
      return {
        onPress: onStockPress,
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
          ? i18n.t("games:slyFox.outfoxedTheDeck")
          : i18n.t("cards:noMovesRemain")
      }
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}
    </GameWrapper>
  );
}
