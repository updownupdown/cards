import { useStateManager } from "@/hooks/useStateManager";
import { useAutoComplete } from "@/hooks/useAutoComplete";
import { delay, DOUBLE_TAP_MS } from "@/utils/utils";
import { useEffect, useMemo, useState } from "react";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import {
  cardDims,
  createDeck,
  flipAllToBack,
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
type GameState = {
  columns: PlayingCard[][];
  foundations: PlayingCard[][];
  ended: boolean;
  won: boolean;
};

export type BeleagueredCastleGameState = GameState;

export type CastleGameState = GameState;

type CastleBoardProps = {
  columnCount: number;
  createState: () => GameState;
  deal: (state: GameState) => void;
  canStack: (card: PlayingCard, destTop: PlayingCard | undefined) => boolean;
  winMessage: string;
};

const gameStateInitial: GameState = {
  columns: [],
  foundations: Array.from({ length: 4 }, () => []),
  ended: false,
  won: false,
};

function canStackDown(card: PlayingCard, destTop: PlayingCard | undefined) {
  if (!destTop) return true; // empty column takes anything
  return rankValue(card) === rankValue(destTop) - 1;
}

function canPlaceFoundation(
  card: PlayingCard,
  foundationTop: PlayingCard | undefined,
) {
  if (!foundationTop) return card.rank === "A";
  return (
    card.suit === foundationTop.suit &&
    rankValue(card) === rankValue(foundationTop) + 1
  );
}

function createBeleagueredCastleState(): GameState {
  const deck = shuffle(createDeck({ faceUp: true }));
  const foundations: PlayingCard[][] = SUITS.map((suit) => {
    const index = deck.findIndex(
      (card) => card.rank === "A" && card.suit === suit,
    );
    const [ace] = deck.splice(index, 1);
    return ace ? [flipToFace(ace)] : [];
  });
  const columns: PlayingCard[][] = Array.from({ length: 8 }, () => []);
  deck.forEach((card, index) => columns[index % 8].push(flipToFace(card)));
  return { columns, foundations, ended: false, won: false };
}

function dealBeleagueredCastle(state: GameState) {
  const cards = state.foundations[0].splice(0);
  state.columns = Array.from({ length: 8 }, () => []);
  state.foundations = Array.from({ length: 4 }, () => []);

  const tableauCards = cards.filter((card) => card.rank !== "A");
  cards.forEach((card) => {
    if (card.rank === "A") {
      state.foundations[SUITS.indexOf(card.suit)].push(flipToFace(card));
    }
  });
  tableauCards.forEach((card, index) => {
    state.columns[index % 8].push(flipToFace(card));
  });
}

function anyLegalMove(state: GameState, canStack = canStackDown) {
  for (let c = 0; c < state.columns.length; c += 1) {
    const card = top(state.columns[c]);
    if (!card) continue;

    if (state.foundations.some((f) => canPlaceFoundation(card, top(f)))) {
      return true;
    }
    for (let d = 0; d < state.columns.length; d += 1) {
      if (d === c) continue;
      const destTop = top(state.columns[d]);
      // Ignore empty-to-empty shuffling as a "move" to avoid false positives.
      if (state.columns[d].length === 0) {
        if (state.columns[c].length > 1) return true;
        continue;
      }
      if (canStack(card, destTop)) return true;
    }
  }
  return false;
}

function evaluateEnd(
  state: GameState,
  isSettingUp = false,
  canStack = canStackDown,
) {
  if (isSettingUp) return { ended: false, won: false };

  if (state.foundations.every((f) => f.length === 13)) {
    return { ended: true, won: true };
  }
  if (!anyLegalMove(state, canStack)) return { ended: true, won: false };
  return { ended: false, won: false };
}

export const beleagueredCastleRules = {
  canStackDown,
  canPlaceFoundation,
  anyLegalMove,
  evaluateEnd,
  createBeleagueredCastleState,
  dealBeleagueredCastle,
};

// ========== Main Component ========== //
export function CastleBoard({
  columnCount,
  createState,
  deal,
  canStack,
  winMessage,
}: CastleBoardProps) {
  const [selectedCol, setSelectedCol] = useState<number | undefined>(undefined);
  const [lastTap, setLastTap] = useState<{ key: string; at: number } | null>(
    null,
  );

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
      const currentCards = [...game.columns.flat(), ...game.foundations.flat()];
      const isInitialDeal = currentCards.length === 0;
      const initialState = isInitialDeal ? createState() : undefined;
      const cards = isInitialDeal
        ? [...initialState!.columns.flat(), ...initialState!.foundations.flat()]
        : shuffle(currentCards);

      setGame((draft) => {
        draft.columns = Array.from({ length: columnCount }, () => []);
        draft.foundations = [
          flipAllToBack(cards),
          ...Array.from({ length: 3 }, () => [] as PlayingCard[]),
        ];
        draft.ended = false;
        draft.won = false;
      });
      await delay();
      setGame((draft) => deal(draft));
    },
    gameStateInitial,
    resetNonGameStates: () => setSelectedCol(undefined),
  });

  const { isAutoCompleting } = useAutoComplete({
    game,
    setGame,
    isSettingUp,
    won: game.won,
    isBlocked: game.ended,
    getSources: (state) => state.columns,
    getFoundations: (state) => state.foundations,
    canPlaceOnFoundation: canPlaceFoundation,
    onStart: () => setSelectedCol(undefined),
  });

  useEffect(() => {
    const { ended, won } = evaluateEnd(game, isSettingUp, canStack);
    if (ended !== game.ended || won !== game.won) {
      setGame((draft) => {
        draft.ended = ended;
        draft.won = won;
      });
    }
  }, [canStack, game, isSettingUp, setGame]);

  const foundationTotal = useMemo(
    () => game.foundations.reduce((sum, f) => sum + f.length, 0),
    [game.foundations],
  );

  function moveToColumn(from: number, to: number) {
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const card = draft.columns[from].pop();
      if (card) draft.columns[to].push(card);
    });
    setSelectedCol(undefined);
  }

  function moveToFoundation(from: number, f: number) {
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const card = draft.columns[from].pop();
      if (card) draft.foundations[f].push(card);
    });
    setSelectedCol(undefined);
  }

  function onColumnPress(index: number) {
    if (game.ended) return;

    const now = Date.now();
    const tapKey = `col-${index}`;
    if (lastTap?.key === tapKey && now - lastTap.at < DOUBLE_TAP_MS) {
      setLastTap(null);
      const card = top(game.columns[index]);
      const foundationIndex = game.foundations.findIndex((foundation) =>
        card ? canPlaceFoundation(card, top(foundation)) : false,
      );
      if (foundationIndex >= 0) moveToFoundation(index, foundationIndex);
      return;
    }

    setLastTap({ key: tapKey, at: now });

    if (selectedCol === undefined) {
      if (game.columns[index].length > 0) setSelectedCol(index);
      return;
    }
    if (selectedCol === index) {
      setSelectedCol(undefined);
      return;
    }

    const card = top(game.columns[selectedCol]);
    if (card && canStack(card, top(game.columns[index]))) {
      moveToColumn(selectedCol, index);
    } else if (game.columns[index].length > 0) {
      setSelectedCol(index);
    } else {
      setSelectedCol(undefined);
    }
  }

  function onFoundationPress(f: number) {
    if (game.ended || selectedCol === undefined) return;
    const card = top(game.columns[selectedCol]);
    if (card && canPlaceFoundation(card, top(game.foundations[f]))) {
      moveToFoundation(selectedCol, f);
    }
  }

  const selectedCard =
    selectedCol !== undefined ? top(game.columns[selectedCol]) : undefined;

  // ========== Card Mapping ========== //
  const zones: MapZone[] = useMemo(() => {
    const foundationZones: MapZone[] = game.foundations.map((pile, i) => ({
      id: `foundation-${i}`,
      name: "foundation",
      pileIndex: i,
      cards: pile,
      col: 3,
      row: i,
      baseZIndex: 40,
      fan: { maxVisible: 3 },
      placeholder: {},
    }));

    const colWidth = 3;

    const columnZones: MapZone[] = game.columns.map((pile, i) => ({
      id: `col-${i}`,
      name: "col",
      pileIndex: i,
      cards: pile,
      col: i < columnCount / 2 ? 0 : 4,
      row: i % (columnCount / 2),
      width: colWidth,
      baseZIndex: 10 + i,
      fan: {
        direction: "right",
        offset:
          pile.length > 1
            ? Math.min(
                cardDims.tableauOffsetHorizontal,
                (colWidth - 1) / (pile.length - 2),
              )
            : 0,
        center: false,
      },
      placeholder: {},
    }));

    return [...foundationZones, ...columnZones];
  }, [game]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (!mappedCard.topOfZone) return {};

    if (
      mappedCard.zoneName === "foundation" &&
      mappedCard.pileIndex !== undefined
    ) {
      const canDrop =
        !!selectedCard &&
        canPlaceFoundation(
          selectedCard,
          top(game.foundations[mappedCard.pileIndex]),
        );
      return {
        isDisabled: game.ended || selectedCol === undefined,
        selectColor: canDrop ? "green" : "none",
        onPress: () => onFoundationPress(mappedCard.pileIndex!),
      };
    }

    if (mappedCard.zoneName === "col" && mappedCard.pileIndex !== undefined) {
      const index = mappedCard.pileIndex;
      const isSelected = selectedCol === index;
      const canDrop =
        !!selectedCard &&
        selectedCol !== index &&
        canStack(selectedCard, top(game.columns[index]));
      return {
        isSelected,
        selectColor: canDrop ? "green" : "blue",
        isDisabled: game.ended,
        onPress: () => onColumnPress(index),
      };
    }

    return {};
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name === "col" && zone.pileIndex !== undefined) {
      const index = zone.pileIndex;
      const isEmpty = game.columns[index].length === 0;
      return {
        onPress: () => onColumnPress(index),
        isDisabled: game.ended || selectedCol === undefined || !isEmpty,
        // selectColor: "green",
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
    gap: 0.14,
  });

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      reset={reset}
      isLoaded={isLoaded}
      score={foundationTotal}
      winLoseMessage={game.won ? winMessage : i18n.t("cards:noMovesRemain")}
      canUndo={canUndo}
      undo={undo}
      autoCompleting={isAutoCompleting}
    >
      {cardMap}
    </GameWrapper>
  );
}

export default function BeleagueredCastle() {
  return (
    <CastleBoard
      columnCount={8}
      createState={createBeleagueredCastleState}
      deal={dealBeleagueredCastle}
      canStack={canStackDown}
      winMessage={i18n.t("games:beleagueredCastle.theCastleFalls")}
    />
  );
}
