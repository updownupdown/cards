import { useStateManager } from "@/hooks/useStateManager";
import { delay } from "@/utils/utils";
import { useEffect, useMemo, useState } from "react";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import {
  cardDims,
  createDeck,
  flipToFace,
  rankValue,
  shuffle,
  SUITS,
  top,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";

const columnCount = 8;

type GameState = {
  columns: PlayingCard[][];
  foundations: PlayingCard[][];
  ended: boolean;
  won: boolean;
};

const gameStateInitial: GameState = {
  columns: Array.from({ length: columnCount }, () => []),
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

async function resetAndSetup(
  setGame: (updater: (draft: GameState) => void) => void,
) {
  setGame((draft) => {
    const deck = shuffle(createDeck({ faceUp: true }));

    // Pull the aces out to seed the foundations.
    const foundations: PlayingCard[][] = SUITS.map((suit) => {
      const index = deck.findIndex(
        (card) => card.rank === "A" && card.suit === suit,
      );
      const [ace] = deck.splice(index, 1);
      return ace ? [flipToFace(ace)] : [];
    });

    const columns: PlayingCard[][] = Array.from(
      { length: columnCount },
      () => [],
    );
    deck.forEach((card, i) => columns[i % columnCount].push(flipToFace(card)));

    draft.foundations = foundations;
    draft.columns = columns;
    draft.ended = false;
    draft.won = false;
  });

  await delay();
}

function anyLegalMove(state: GameState) {
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
      if (canStackDown(card, destTop)) return true;
    }
  }
  return false;
}

function evaluateEnd(state: GameState) {
  if (state.foundations.every((f) => f.length === 13)) {
    return { ended: true, won: true };
  }
  if (!anyLegalMove(state)) return { ended: true, won: false };
  return { ended: false, won: false };
}

// ========== Main Component ========== //
export default function BeleagueredCastle() {
  const [selectedCol, setSelectedCol] = useState<number | undefined>(undefined);

  const { isLoaded, game, setGame, undo, canUndo, saveUndoState, reset } =
    useStateManager({
      resetAndSetup: async () => {
        await resetAndSetup(setGame);
      },
      gameStateInitial,
      resetNonGameStates: () => setSelectedCol(undefined),
    });

  useEffect(() => {
    const { ended, won } = evaluateEnd(game);
    if (ended !== game.ended || won !== game.won) {
      setGame((draft) => {
        draft.ended = ended;
        draft.won = won;
      });
    }
  }, [game]);

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

    if (selectedCol === undefined) {
      if (game.columns[index].length > 0) setSelectedCol(index);
      return;
    }
    if (selectedCol === index) {
      setSelectedCol(undefined);
      return;
    }

    const card = top(game.columns[selectedCol]);
    if (card && canStackDown(card, top(game.columns[index]))) {
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
      col: 2 + i,
      row: 0,
      baseZIndex: 40,
      fan: { maxVisible: 1 },
      placeholder: {},
    }));

    const columnZones: MapZone[] = game.columns.map((pile, i) => ({
      id: `col-${i}`,
      name: "col",
      pileIndex: i,
      cards: pile,
      col: i,
      row: 1.5,
      baseZIndex: 10 + i,
      fan: { direction: "down", offset: cardDims.tableauOffset, center: false },
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
        canStackDown(selectedCard, top(game.columns[index]));
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
    cardSize: "tableau",
    fixedRows: 6,
  });

  return (
    <GameWrapper
      ended={game.ended}
      won={game.won}
      reset={reset}
      isLoaded={isLoaded}
      score={foundationTotal}
      winLoseMessage={game.won ? "The castle falls!" : "No moves remain."}
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}
    </GameWrapper>
  );
}
