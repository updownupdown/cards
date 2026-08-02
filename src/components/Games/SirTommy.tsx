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

/** Flip the stock top card and promote everything that can climb the foundations. */
function advance(draft: GameState) {
  let changed = true;
  while (changed) {
    changed = false;

    const stockTop = top(draft.stock);
    if (stockTop && !stockTop.faceUp) {
      draft.stock[draft.stock.length - 1] = flipToFace(stockTop);
      changed = true;
    }

    const playableStockTop = top(draft.stock);
    if (playableStockTop) {
      const f = foundationFor(draft, playableStockTop);
      if (f !== -1) {
        const moved = draft.stock.pop();
        if (moved) draft.foundations[f].push(flipToFace(moved));
        changed = true;
      }
    }

    for (let i = 0; i < draft.waste.length; i += 1) {
      const t = top(draft.waste[i]);
      if (!t) continue;
      const f = foundationFor(draft, t);
      if (f !== -1) {
        const moved = draft.waste[i].pop();
        if (moved) draft.foundations[f].push(moved);
        changed = true;
      }
    }
  }
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
    advance(draft);
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
  advance,
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

  function placeOnWaste(index: number) {
    if (game.ended || !top(game.stock)) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const moved = draft.stock.pop();
      if (!moved) return;
      draft.waste[index].push(flipToFace(moved));
      advance(draft);
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
      col: i,
      row: 0,
      baseZIndex: 40,
      fan: { maxVisible: 1 },
      placeholder: {},
    }));

    const wasteZones: MapZone[] = game.waste.map((pile, i) => ({
      id: `waste-${i}`,
      name: "waste",
      pileIndex: i,
      cards: pile,
      col: i,
      row: 1.6,
      baseZIndex: 10 + i,
      fan: { direction: "down", offset: cardDims.tableauOffset, center: false },
      placeholder: {},
    }));

    return [
      ...foundationZones,
      {
        id: "stock",
        name: "stock",
        cards: game.stock,
        col: 4,
        row: 0,
        fan: { maxVisible: 3 },
        baseZIndex: 60,
        placeholder: { text: "Stock", infoPos: "below", showCount: true },
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
        selectColor: "green",
      };
    }
    return {};
  };

  const { cardMap } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper,
    cardSize: "small",
    fixedRows: 6,
  });

  return (
    <GameWrapper
      ended={game.ended}
      won={game.won}
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
