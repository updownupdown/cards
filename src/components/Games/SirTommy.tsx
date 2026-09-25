import { useStateManager } from "@/hooks/useStateManager";
import { delay, DOUBLE_TAP_MS } from "@/utils/utils";
import { useEffect, useMemo, useRef } from "react";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import {
  cardDims,
  createDeck,
  flipAllToBack,
  flipToFace,
  rankValue,
  shuffle,
  top,
  zoneFanOffset,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";

import { i18n } from "@/i18n";
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
  stock: createDeck(),
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

function moveWasteToFoundation(draft: GameState, wasteIndex: number) {
  const waste = draft.waste[wasteIndex];
  const card = top(waste);
  if (!card) return false;

  const foundationIndex = foundationFor(draft, card);
  if (foundationIndex === -1) return false;

  const moved = waste.pop();
  if (moved) draft.foundations[foundationIndex].push(moved);
  return true;
}

function moveStockToFoundation(draft: GameState) {
  const card = top(draft.stock);
  if (!card) return false;

  const foundationIndex = foundationFor(draft, card);
  if (foundationIndex === -1) return false;

  const moved = draft.stock.pop();
  if (moved) draft.foundations[foundationIndex].push(flipToFace(moved));
  revealStockTop(draft.stock);
  return true;
}

function revealStockTop(stock: PlayingCard[]) {
  const stockTop = top(stock);
  if (!stockTop || stockTop.faceUp) return;
  stock[stock.length - 1] = flipToFace(stockTop);
}

async function resetAndSetup(
  setGame: (updater: (draft: GameState) => void) => void,
) {
  // Gather every card into the stock, face down, then turn up its top card.
  setGame((draft) => {
    draft.stock = shuffle(
      flipAllToBack([
        ...draft.stock,
        ...draft.waste.flat(),
        ...draft.foundations.flat(),
      ]),
    );
    draft.waste = Array.from({ length: wasteCount }, () => []);
    draft.foundations = Array.from({ length: 4 }, () => []);
    draft.ended = false;
    draft.won = false;
  });

  await delay();

  setGame((draft) => {
    revealStockTop(draft.stock);
  });
}

function evaluateEnd(state: GameState, isSettingUp = false) {
  if (isSettingUp) return { ended: false, won: false };

  if (state.foundations.every((f) => f.length === 13)) {
    return { ended: true, won: true };
  }
  const hasFoundationMove = state.waste.some((waste) => {
    const card = top(waste);
    return card ? foundationFor(state, card) !== -1 : false;
  });
  if (state.stock.length === 0 && !hasFoundationMove) {
    return { ended: true, won: false };
  }
  return { ended: false, won: false };
}

export const sirTommyRules = {
  foundationFor,
  moveWasteToFoundation,
  moveStockToFoundation,
  revealStockTop,
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
  const pendingWasteTapRef = useRef<{
    index: number;
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);
  const pendingStockTapRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSingleTapAtRef = useRef(0);

  useEffect(() => {
    const { ended, won } = evaluateEnd(game, isSettingUp);
    if (ended !== game.ended || won !== game.won) {
      setGame((draft) => {
        draft.ended = ended;
        draft.won = won;
      });
    }
  }, [game, isSettingUp, setGame]);

  useEffect(
    () => () => {
      const pendingTap = pendingWasteTapRef.current;
      if (pendingTap) clearTimeout(pendingTap.timer);
      if (pendingStockTapRef.current) {
        clearTimeout(pendingStockTapRef.current);
      }
    },
    [],
  );

  function placeOnWaste(index: number) {
    if (game.ended || !top(game.stock)) return;
    const now = Date.now();
    if (now - lastSingleTapAtRef.current < DOUBLE_TAP_MS) return;

    lastSingleTapAtRef.current = now;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const moved = draft.stock.pop();
      if (!moved) return;
      draft.waste[index].push(flipToFace(moved));
      revealStockTop(draft.stock);
    });
  }

  function onWasteCardPress(index: number, isTopCard: boolean) {
    if (!isTopCard) {
      placeOnWaste(index);
      return;
    }

    const pendingTap = pendingWasteTapRef.current;
    const card = top(game.waste[index]);
    if (!card || foundationFor(game, card) === -1) {
      if (pendingTap) {
        clearTimeout(pendingTap.timer);
        pendingWasteTapRef.current = null;
        placeOnWaste(pendingTap.index);
      }
      placeOnWaste(index);
      return;
    }

    if (pendingTap?.index === index) {
      clearTimeout(pendingTap.timer);
      pendingWasteTapRef.current = null;
      saveUndoState(structuredClone(game));
      setGame((draft) => {
        moveWasteToFoundation(draft, index);
      });
      return;
    }

    if (pendingTap) {
      clearTimeout(pendingTap.timer);
      placeOnWaste(pendingTap.index);
    }

    pendingWasteTapRef.current = {
      index,
      timer: setTimeout(() => {
        pendingWasteTapRef.current = null;
        placeOnWaste(index);
      }, DOUBLE_TAP_MS),
    };
  }

  function onStockCardPress() {
    const card = top(game.stock);
    if (game.ended || !card || foundationFor(game, card) === -1) return;

    if (pendingStockTapRef.current) {
      clearTimeout(pendingStockTapRef.current);
      pendingStockTapRef.current = null;
      saveUndoState(structuredClone(game));
      setGame((draft) => {
        moveStockToFoundation(draft);
      });
      return;
    }

    pendingStockTapRef.current = setTimeout(() => {
      pendingStockTapRef.current = null;
    }, DOUBLE_TAP_MS);
  }

  // ========== Card Mapping ========== //
  const zones: MapZone[] = useMemo(() => {
    const foundationZones: MapZone[] = game.foundations.map((pile, i) => ({
      id: `foundation-${i}`,
      name: "foundation",
      pileIndex: i,
      cards: pile,
      col: i + 1.2,
      row: 0,
      baseZIndex: 40,
      fan: { maxVisible: 3 },
      placeholder: { iconName: "ace" },
    }));

    const wasteZones: MapZone[] = game.waste.map((pile, i) => ({
      id: `waste-${i}`,
      name: "waste",
      pileIndex: i,
      cards: pile,
      col: i + 1.2,
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
        baseZIndex: 100,
        placeholder: {
          text: i18n.t("cards:stock"),
          infoPos: "below",
          showCount: true,
        },
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
        isDisabled: game.ended,
        selectColor: hasPlayableStock ? "green" : "none",
        onPress: () => onWasteCardPress(index, mappedCard.topOfZone),
      };
    }
    if (mappedCard.zoneName === "stock" && mappedCard.topOfZone) {
      return {
        isDisabled: game.ended,
        onPress: onStockCardPress,
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
    gap: 0.14,
  });

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      reset={reset}
      isLoaded={isLoaded}
      winLoseMessage={
        game.won
          ? i18n.t("games:sirTommy.allFourSuitsHome")
          : i18n.t("games:sirTommy.theStockIsSpent")
      }
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}
    </GameWrapper>
  );
}
