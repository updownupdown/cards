import { useStateManager } from "@/hooks/useStateManager";
import { DOUBLE_TAP_MS } from "@/utils/utils";
import { useEffect, useMemo, useState } from "react";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import {
  cardDims,
  createDeck,
  rankValue,
  shuffle,
  SUITS,
  top,
  type CardSuit,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";

import { i18n } from "@/i18n";
const cardSize = "tableau";
const COLUMN_SIZES = [3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4];

export type BisleyGameState = {
  columns: PlayingCard[][];
  ascending: PlayingCard[][];
  descending: PlayingCard[][];
  ended: boolean;
  won: boolean;
};

type FoundationDirection = "ascending" | "descending";
type FoundationTarget = {
  direction: FoundationDirection;
  suitIndex: number;
};

function canBuildTableau(card: PlayingCard, destination?: PlayingCard) {
  return (
    !!destination &&
    card.suit === destination.suit &&
    Math.abs(rankValue(card) - rankValue(destination)) === 1
  );
}

function canBuildFoundation(
  card: PlayingCard,
  destination: PlayingCard | undefined,
  direction: FoundationDirection,
  suit: CardSuit,
) {
  if (card.suit !== suit) return false;
  if (!destination)
    return direction === "ascending" ? card.rank === "A" : card.rank === "K";
  const step = direction === "ascending" ? 1 : -1;
  return rankValue(card) === rankValue(destination) + step;
}

function createInitialState(): BisleyGameState {
  const deck = shuffle(createDeck({ faceUp: true }));
  const ascending = SUITS.map((suit) => {
    const index = deck.findIndex(
      (card) => card.suit === suit && card.rank === "A",
    );
    const [ace] = deck.splice(index, 1);
    return ace ? [ace] : [];
  });
  let offset = 0;
  const columns = COLUMN_SIZES.map((size) => {
    const cards = deck.slice(offset, offset + size);
    offset += size;
    return cards;
  });
  return {
    columns,
    ascending,
    descending: Array.from({ length: 4 }, () => [] as PlayingCard[]),
    ended: false,
    won: false,
  };
}

function hasMove(state: BisleyGameState) {
  return state.columns.some((pile, sourceIndex) => {
    const card = top(pile);
    if (!card) return false;
    const suitIndex = SUITS.indexOf(card.suit);
    if (
      canBuildFoundation(
        card,
        top(state.ascending[suitIndex]),
        "ascending",
        card.suit,
      ) ||
      canBuildFoundation(
        card,
        top(state.descending[suitIndex]),
        "descending",
        card.suit,
      )
    )
      return true;
    return state.columns.some(
      (destination, destinationIndex) =>
        sourceIndex !== destinationIndex &&
        canBuildTableau(card, top(destination)),
    );
  });
}

export const bisleyRules = {
  canBuildFoundation,
  canBuildTableau,
  createInitialState,
  hasMove,
};

export default function Bisley() {
  const [selectedColumn, setSelectedColumn] = useState<number | null>(null);
  const [lastTap, setLastTap] = useState<{ column: number; at: number } | null>(
    null,
  );
  const { isLoaded, game, setGame, reset, undo, canUndo, saveUndoState } =
    useStateManager<BisleyGameState>({
      gameStateInitial: createInitialState(),
      resetNonGameStates: () => setSelectedColumn(null),
      resetAndSetup: async () => {
        setGame(createInitialState());
      },
    });

  useEffect(() => {
    const won = game.columns.every((pile) => pile.length === 0);
    const ended = won || !hasMove(game);
    if (won !== game.won || ended !== game.ended) {
      setGame((draft) => {
        draft.won = won;
        draft.ended = ended;
      });
    }
  }, [game, setGame]);

  const selectedCard =
    selectedColumn === null ? undefined : top(game.columns[selectedColumn]);

  function moveToColumn(destination: number) {
    if (
      selectedColumn === null ||
      selectedColumn === destination ||
      !selectedCard ||
      !canBuildTableau(selectedCard, top(game.columns[destination]))
    )
      return false;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const card = draft.columns[selectedColumn].pop();
      if (card) draft.columns[destination].push(card);
    });
    setSelectedColumn(null);
    return true;
  }

  function moveToFoundation(target: FoundationTarget, source = selectedColumn) {
    if (source === null) return false;
    const card = top(game.columns[source]);
    if (!card) return false;
    const piles = game[target.direction];
    if (
      !canBuildFoundation(
        card,
        top(piles[target.suitIndex]),
        target.direction,
        SUITS[target.suitIndex],
      )
    )
      return false;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const moving = draft.columns[source].pop();
      if (moving) draft[target.direction][target.suitIndex].push(moving);
    });
    setSelectedColumn(null);
    return true;
  }

  function autoFoundation(column: number) {
    const card = top(game.columns[column]);
    if (!card) return false;
    const suitIndex = SUITS.indexOf(card.suit);
    return (
      moveToFoundation({ direction: "ascending", suitIndex }, column) ||
      moveToFoundation({ direction: "descending", suitIndex }, column)
    );
  }

  function onColumnPress(column: number) {
    if (game.ended || game.columns[column].length === 0) return;
    const now = Date.now();
    if (lastTap?.column === column && now - lastTap.at < DOUBLE_TAP_MS) {
      setLastTap(null);
      if (autoFoundation(column)) return;
    } else setLastTap({ column, at: now });
    if (selectedColumn === null) return setSelectedColumn(column);
    if (selectedColumn === column) return setSelectedColumn(null);
    if (!moveToColumn(column)) setSelectedColumn(column);
  }

  const zones: MapZone[] = useMemo(() => {
    const foundations = (["ascending", "descending"] as const).flatMap(
      (direction, row) =>
        game[direction].map(
          (pile, suitIndex) =>
            ({
              id: `${direction}-${suitIndex}`,
              name: direction,
              pileIndex: suitIndex,
              cards: pile,
              col: 2 + suitIndex + row * 5,
              row: 0,
              fan: { maxVisible: 1 },
              placeholder: {},
            }) as MapZone,
        ),
    );
    const columns = game.columns.map((pile, index) => ({
      id: `column-${index}`,
      name: "column",
      pileIndex: index,
      cards: pile,
      col: index,
      row: 1.2,
      fan: { direction: "down" as const, offset: cardDims.tableauOffset },
      placeholder: { hideBackground: pile.length === 0 },
    }));
    return [...foundations, ...columns];
  }, [game]);

  const cardMapper = (card: MappedCard): AnimatedCardMapping | undefined => {
    if (card.zoneName !== "column" || card.pileIndex === undefined) return {};
    return {
      isDisabled: game.ended || !card.topOfZone,
      isSelected: card.topOfZone && selectedColumn === card.pileIndex,
      selectColor: "blue",
      onPress: () => onColumnPress(card.pileIndex!),
    };
  };
  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (
      (zone.name === "ascending" || zone.name === "descending") &&
      zone.pileIndex !== undefined
    )
      return {
        onPress: () =>
          moveToFoundation({
            direction: zone.name as FoundationDirection,
            suitIndex: zone.pileIndex!,
          }),
        isDisabled: selectedColumn === null,
      };
    if (zone.name === "column" && zone.pileIndex !== undefined)
      return {
        onPress: () => moveToColumn(zone.pileIndex!),
        isDisabled:
          selectedColumn === null || game.columns[zone.pileIndex].length === 0,
      };
    return {};
  };
  const { cardMap } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper,
    cardSize,
    fixedCols: 13,
    fixedRows: 5,
    gap: 0.08,
  });
  const score = 52 - game.columns.reduce((sum, pile) => sum + pile.length, 0);
  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      reset={() => void reset()}
      isLoaded={isLoaded}
      score={score}
      canUndo={canUndo}
      undo={undo}
      winLoseMessage={
        game.won
          ? i18n.t("games:bisley.theFoundationsMeet")
          : i18n.t("cards:noMovesRemain")
      }
      showDeviceRotateHint
    >
      {cardMap}
    </GameWrapper>
  );
}
