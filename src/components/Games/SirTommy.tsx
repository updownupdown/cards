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
  top,
  zoneFanOffset,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";

const wasteCount = 4;

type GameState = {
  stock: PlayingCard[];
  waste: PlayingCard[][];
  foundations: PlayingCard[][];
  ended: boolean;
  won: boolean;
};

export type SirTommyGameState = GameState;

const gameStateInitial: GameState = {
  stock: [],
  waste: Array.from({ length: wasteCount }, () => []),
  foundations: Array.from({ length: 4 }, () => []),
  ended: false,
  won: false,
};

/** A foundation index that accepts this card (up by rank, any suit), else -1. */
function foundationFor(state: GameState, card: PlayingCard): number {
  if (card.rank === "A") {
    return state.foundations.findIndex((f) => f.length === 0);
  }
  return state.foundations.findIndex((f) => {
    const t = top(f);
    return t && rankValue(card) === rankValue(t) + 1;
  });
}

/** Reveal or promote one automatic card action. Returns whether anything changed. */
function advanceOne(draft: GameState) {
  const stockTop = top(draft.stock);
  if (stockTop && !stockTop.faceUp) {
    draft.stock[draft.stock.length - 1] = flipToFace(stockTop);
    return true;
  }

  if (stockTop) {
    const foundationIndex = foundationFor(draft, stockTop);
    if (foundationIndex !== -1) {
      const moved = draft.stock.pop();
      if (moved) draft.foundations[foundationIndex].push(flipToFace(moved));

      const nextStockTop = top(draft.stock);
      if (nextStockTop) {
        draft.stock[draft.stock.length - 1] = flipToFace(nextStockTop);
      }
      return true;
    }
  }

  for (let index = 0; index < draft.waste.length; index += 1) {
    const wasteTop = top(draft.waste[index]);
    if (!wasteTop) continue;
    const foundationIndex = foundationFor(draft, wasteTop);
    if (foundationIndex !== -1) {
      const moved = draft.waste[index].pop();
      if (moved) draft.foundations[foundationIndex].push(moved);
      return true;
    }
  }

  return false;
}

async function resetAndSetup(
  setGame: (updater: (draft: GameState) => void) => void,
) {
  setGame((draft) => {
    draft.stock = shuffle(createDeck()).map(flipToBack);
    draft.waste = Array.from({ length: wasteCount }, () => []);
    draft.foundations = Array.from({ length: 4 }, () => []);
    draft.ended = false;
    draft.won = false;
  });

  await delay();
}

function evaluateEnd(state: GameState, isSettingUp = false) {
  if (isSettingUp) return { ended: false, won: false };

  if (state.foundations.every((f) => f.length === 13)) {
    return { ended: true, won: true };
  }
  // State is always advanced/stable, so empty stock means no more moves remain.
  if (state.stock.length === 0) {
    return { ended: true, won: false };
  }
  return { ended: false, won: false };
}

export const sirTommyRules = {
  foundationFor,
  advanceOne,
  evaluateEnd,
  wasteCount,
};

// ========== Main Component ========== //
export default function SirTommy() {
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
    resetAndSetup: async () => {
      await resetAndSetup(setGame);
    },
    gameStateInitial,
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

  useEffect(() => {
    if (isSettingUp || game.ended) return;

    const timer = setTimeout(() => {
      setGame((draft) => {
        advanceOne(draft);
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [game, game.ended, isSettingUp, setGame]);

  function placeOnWaste(index: number) {
    if (game.ended || !top(game.stock)) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const moved = draft.stock.pop();
      if (!moved) return;
      draft.waste[index].push(flipToFace(moved));
    });
  }

  const foundationTotal = useMemo(
    () => game.foundations.reduce((sum, f) => sum + f.length, 0),
    [game.foundations],
  );

  // ========== Card Mapping ========== //
  const zones: MapZone[] = useMemo(() => {
    const foundationZones: MapZone[] = game.foundations.map((pile, i) => ({
      id: `foundation-${i}`,
      name: "foundation",
      pileIndex: i,
      cards: pile,
      col: i + 1,
      row: 0,
      baseZIndex: 40,
      fan: { maxVisible: 3 },
      placeholder: {},
    }));

    const wasteZones: MapZone[] = game.waste.map((pile, i) => ({
      id: `waste-${i}`,
      name: "waste",
      pileIndex: i,
      cards: pile,
      col: i + 1,
      row: 1.2,
      height: 1,
      baseZIndex: 10 + i,
      fan: {
        direction: "down",
        offset: zoneFanOffset(pile.length, 4.8, 0.1, cardDims.tableauOffset),
        center: false,
      },
      placeholder: {},
    }));

    return [
      ...foundationZones,
      {
        id: "stock",
        name: "stock",
        cards: game.stock,
        col: 0,
        row: 1.2,
        fan: { maxVisible: 3 },
        baseZIndex: 60,
        placeholder: { text: "Stock", infoPos: "above", showCount: true },
      },
      ...wasteZones,
    ];
  }, [game]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    const hasPlayableStock = !game.ended && !!top(game.stock);
    if (mappedCard.zoneName === "waste" && mappedCard.pileIndex !== undefined) {
      const index = mappedCard.pileIndex;
      return {
        isDisabled: !hasPlayableStock,
        selectColor: hasPlayableStock ? "green" : "none",
        onPress: () => placeOnWaste(index),
      };
    }
    return {};
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    const hasPlayableStock = !game.ended && !!top(game.stock);
    if (zone.name === "waste" && zone.pileIndex !== undefined) {
      const index = zone.pileIndex;
      return {
        onPress: () => placeOnWaste(index),
        isDisabled: !hasPlayableStock || zone.cards!.length > 0,
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
    fixedRows: 6,
  });

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      reset={reset}
      isLoaded={isLoaded}
      score={foundationTotal}
      winLoseMessage={game.won ? "All four suits home!" : "The stock is spent."}
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}
    </GameWrapper>
  );
}
