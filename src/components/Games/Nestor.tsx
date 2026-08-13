import { useStateManager } from "@/hooks/useStateManager";
import { delay } from "@/utils/utils";
import { useEffect, useMemo, useState } from "react";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import {
  cardDims,
  createDeck,
  flipAllToBack,
  flipToFace,
  shuffle,
  top,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";

const columnCount = 8;
const columnHeight = 6;

type Selection = { zone: "col" | "reserve"; index: number } | undefined;

type GameState = {
  columns: PlayingCard[][];
  reserve: PlayingCard[];
  discard: PlayingCard[];
  ended: boolean;
  won: boolean;
};

export type NestorGameState = GameState;
export type NestorSelection = Selection;

const gameStateInitial: GameState = {
  columns: Array.from({ length: columnCount }, () => []),
  reserve: [],
  discard: flipAllToBack(shuffle(createDeck())),
  ended: false,
  won: false,
};

function dealNestor(deckCards: PlayingCard[]): GameState {
  const columns: PlayingCard[][] = Array.from(
    { length: columnCount },
    () => [],
  );
  const remaining = shuffle(deckCards);

  for (let row = 0; row < columnHeight; row += 1) {
    const rowCards: PlayingCard[] = [];
    const usedRanks = new Set<PlayingCard["rank"]>();

    while (rowCards.length < columnCount) {
      const cardIndex = remaining.findIndex(
        (card) => !usedRanks.has(card.rank),
      );
      const [card] = remaining.splice(cardIndex, 1);
      rowCards.push(flipToFace(card));
      usedRanks.add(card.rank);
    }

    shuffle(rowCards).forEach((card, column) => {
      columns[column].push(card);
    });
  }

  const reserve = shuffle(remaining).map(flipToFace);

  return {
    columns,
    reserve,
    discard: [],
    ended: false,
    won: false,
  };
}

function prepareDiscard(state: GameState) {
  return shuffle(
    flipAllToBack([
      ...state.columns.flat(),
      ...state.reserve,
      ...state.discard,
    ]),
  );
}

function setupFromDiscard(draft: GameState) {
  const next = dealNestor(draft.discard);
  draft.columns = next.columns;
  draft.reserve = next.reserve;
  draft.discard = next.discard;
  draft.ended = next.ended;
  draft.won = next.won;
}

async function resetAndSetup(
  setGame: (updater: (draft: GameState) => void) => void,
) {
  setGame((draft) => {
    draft.discard = prepareDiscard(draft);
    draft.columns = Array.from({ length: columnCount }, () => []);
    draft.reserve = [];
    draft.ended = false;
    draft.won = false;
  });

  await delay();
  setGame((draft) => setupFromDiscard(draft));
}

function exposedCard(state: GameState, sel: Selection) {
  if (!sel) return undefined;
  return sel.zone === "reserve"
    ? state.reserve[sel.index]
    : top(state.columns[sel.index]);
}

function evaluateEnd(state: GameState, isSettingUp = false) {
  if (isSettingUp) return { ended: false, won: false };

  const cardsLeft =
    state.columns.reduce((sum, col) => sum + col.length, 0) +
    state.reserve.length;
  if (cardsLeft === 0) return { ended: true, won: true };

  const exposed: PlayingCard[] = [];
  state.columns.forEach((col) => {
    const card = top(col);
    if (card) exposed.push(card);
  });
  exposed.push(...state.reserve);

  const rankCounts = new Map<string, number>();
  for (const card of exposed) {
    rankCounts.set(card.rank, (rankCounts.get(card.rank) ?? 0) + 1);
  }
  const anyPair = [...rankCounts.values()].some((count) => count >= 2);
  if (!anyPair) return { ended: true, won: false };
  return { ended: false, won: false };
}

export const nestorRules = {
  dealNestor,
  prepareDiscard,
  exposedCard,
  evaluateEnd,
  columnCount,
  columnHeight,
};

// ========== Main Component ========== //
export default function Nestor() {
  const [selected, setSelected] = useState<Selection>(undefined);

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
    resetNonGameStates: () => setSelected(undefined),
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

  function sameSelection(a: Selection, b: Selection) {
    return !!a && !!b && a.zone === b.zone && a.index === b.index;
  }

  function removePair(
    a: Exclude<Selection, undefined>,
    b: Exclude<Selection, undefined>,
  ) {
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const cards = [a, b]
        .map((sel) => exposedCard(draft, sel))
        .filter((card): card is PlayingCard => card !== undefined);

      [a, b]
        .filter((sel) => sel.zone === "reserve")
        .sort((first, second) => second.index - first.index)
        .forEach((sel) => draft.reserve.splice(sel.index, 1));
      [a, b]
        .filter((sel) => sel.zone === "col")
        .forEach((sel) => draft.columns[sel.index].pop());

      draft.discard.push(...flipAllToBack(cards));
    });
    setSelected(undefined);
  }

  function onCardPress(sel: Exclude<Selection, undefined>) {
    if (game.ended) return;

    if (!selected) {
      setSelected(sel);
      return;
    }

    if (sameSelection(selected, sel)) {
      setSelected(undefined);
      return;
    }

    const firstCard = exposedCard(game, selected);
    const secondCard = exposedCard(game, sel);
    if (firstCard && secondCard && firstCard.rank === secondCard.rank) {
      removePair(selected, sel);
    } else {
      setSelected(sel);
    }
  }

  // ========== Card Mapping ========== //
  const zones: MapZone[] = useMemo(() => {
    const discardZone: MapZone = {
      id: "discard",
      name: "discard",
      cards: game.discard,
      col: 0,
      row: 0,
      fan: { maxVisible: 2 },
      baseZIndex: 60,
      placeholder: { text: "Discard", infoPos: "right", showCount: true },
    };

    const columnZones: MapZone[] = game.columns.map((pile, i) => ({
      id: `col-${i}`,
      name: "col",
      pileIndex: i,
      cards: pile,
      col: i,
      row: 1.2,
      baseZIndex: 10 + i,
      fan: {
        direction: "down",
        offset: cardDims.tableauOffset,
        center: false,
        showCount: false,
      },
      placeholder: {},
    }));

    const reserveZones: MapZone[] = game.reserve.map((card, i) => ({
      id: `reserve-${i}`,
      name: "reserve",
      pileIndex: i,
      cards: [card],
      col: 4 + i,
      row: 0,
      baseZIndex: 60 + i,
    }));

    return [discardZone, ...reserveZones, ...columnZones];
  }, [game]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (!mappedCard.topOfZone) return {};

    let sel: Selection;
    if (mappedCard.zoneName === "col" && mappedCard.pileIndex !== undefined) {
      sel = { zone: "col", index: mappedCard.pileIndex };
    } else if (
      mappedCard.zoneName === "reserve" &&
      mappedCard.pileIndex !== undefined
    ) {
      sel = { zone: "reserve", index: mappedCard.pileIndex };
    } else {
      return {};
    }

    const isSelected = sameSelection(selected, sel);
    return {
      isSelected,
      selectColor: "blue",
      isDisabled: game.ended,
      onPress: () => onCardPress(sel!),
    };
  };

  const { cardMap } = useCardMap({
    game,
    zones,
    cardMapper,
    cardSize: "tableau",
    fixedRows: 4,
    gap: 0.12,
  });

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      reset={reset}
      isLoaded={isLoaded}
      winLoseMessage={game.won ? "Board cleared!" : "No matching pair remains."}
      canUndo={canUndo}
      undo={undo}
      showDeviceRotateHint
    >
      {cardMap}
    </GameWrapper>
  );
}
