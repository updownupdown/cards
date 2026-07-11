import { useMemo, useState } from "react";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import {
  createDeck,
  RANK_VALUE,
  flipAllToBack,
  shuffle,
  type PlayingCard,
} from "../Cards/card-utils";
import { GameWrapper } from "../common/GameWrapper";
import { useStateManager } from "@/hooks/useStateManager";
import { delay } from "@/utils/utils";

type PyramidCard = PlayingCard & {
  row: number;
  col: number;
};

type Selection = { zone: "pyramid"; index: number } | { zone: "waste" } | null;

type GameState = {
  pyramid: (PyramidCard | null)[];
  waste: PlayingCard[];
  discard: PlayingCard[];
  stockCount: number;
};

const PYRAMID_ROWS = 7;
const PYRAMID_SIZE = 28;
const PYRAMID_BASE_COL = 3;
const PYRAMID_BASE_ROW = 0.8;
const PYRAMID_ROW_STEP = 0.5;

const PYRAMID_POSITIONS: { row: number; col: number }[] = [];
for (let row = 0; row < PYRAMID_ROWS; row += 1) {
  for (let col = 0; col <= row; col += 1) {
    PYRAMID_POSITIONS.push({ row, col });
  }
}

function isCardExposed(card: PyramidCard, pyramid: (PyramidCard | null)[]) {
  if (card.row === PYRAMID_ROWS - 1) return true;

  const leftCoveredBy = pyramid.find(
    (candidate) =>
      candidate && candidate.row === card.row + 1 && candidate.col === card.col,
  );

  const rightCoveredBy = pyramid.find(
    (candidate) =>
      candidate &&
      candidate.row === card.row + 1 &&
      candidate.col === card.col + 1,
  );

  return !leftCoveredBy && !rightCoveredBy;
}

function createInitialState(): GameState {
  return {
    pyramid: [],
    waste: [],
    discard: createDeck({ faceUp: false }),
    stockCount: 0,
  };
}

const gameStateInitial = createInitialState();

async function resetAndSetup(
  setGame: (updater: (draft: GameState) => void) => void,
) {
  setGame((draft) => {
    const allCards = flipAllToBack([
      ...draft.pyramid.filter((card): card is PyramidCard => card !== null),
      ...draft.waste,
      ...draft.discard,
    ]);

    draft.pyramid = [];
    draft.waste = [];
    draft.discard = allCards;
    draft.stockCount = 0;
  });

  await delay();

  setGame((draft) => {
    const shuffled = shuffle(draft.discard);
    const pyramid: (PyramidCard | null)[] = [];

    for (let row = 0; row < PYRAMID_ROWS; row += 1) {
      for (let col = 0; col <= row; col += 1) {
        const base = shuffled.pop();
        pyramid.push(base ? { ...base, row, col, faceUp: true } : null);
      }
    }

    draft.pyramid = pyramid;
    draft.waste = [];
    draft.discard = shuffled;
    draft.stockCount = shuffled.length;
  });
}

function cardValue(card: PlayingCard) {
  return RANK_VALUE[card.rank];
}

function hasAvailableMove(snapshot: GameState) {
  type ExposedSelection = Exclude<Selection, null>;

  const exposedSelections: ExposedSelection[] = snapshot.pyramid
    .map((card, index) => ({ card, index }))
    .filter(({ card }) => !!card && isCardExposed(card, snapshot.pyramid))
    .map(({ index }) => ({ zone: "pyramid", index }) as const);

  if (snapshot.waste.length > 0) {
    exposedSelections.push({ zone: "waste" });
  }

  // Any exposed king can always be removed.
  if (
    exposedSelections.some((selection) => {
      if (selection.zone === "waste") {
        return snapshot.waste[snapshot.waste.length - 1]?.rank === "K";
      }

      return snapshot.pyramid[selection.index]?.rank === "K";
    })
  ) {
    return true;
  }

  // Any exposed pair summing to 13 is a valid move.
  for (let i = 0; i < exposedSelections.length; i += 1) {
    for (let j = i + 1; j < exposedSelections.length; j += 1) {
      const first = exposedSelections[i];
      const second = exposedSelections[j];

      if (first.zone === "waste" && second.zone === "waste") {
        continue;
      }

      const firstCard =
        first.zone === "waste"
          ? snapshot.waste[snapshot.waste.length - 1]
          : snapshot.pyramid[first.index];
      const secondCard =
        second.zone === "waste"
          ? snapshot.waste[snapshot.waste.length - 1]
          : snapshot.pyramid[second.index];

      if (!firstCard || !secondCard) continue;
      if (cardValue(firstCard) + cardValue(secondCard) === 13) {
        return true;
      }
    }
  }

  return false;
}

export default function Pyramid() {
  const [selected, setSelected] = useState<Selection>(null);

  const {
    isSettingUp,
    isLoaded,
    showIntro,
    setShowIntro,
    game,
    setGame,
    reset,
    undo,
    canUndo,
    saveUndoState,
  } = useStateManager<GameState>({
    gameStateInitial,
    resetNonGameStates: () => {
      setSelected(null);
    },
    resetAndSetup: async () => {
      await resetAndSetup(setGame);
    },
  });

  const removedCount = useMemo(
    () => game.pyramid.filter((card) => card === null).length,
    [game.pyramid],
  );

  const won = !isSettingUp && removedCount === PYRAMID_SIZE;
  const lost =
    !isSettingUp && !won && game.stockCount === 0 && !hasAvailableMove(game);
  const ended = !isSettingUp && (won || lost);

  function stockCards(snapshot = game) {
    if (snapshot.stockCount <= 0) return [] as PlayingCard[];
    return snapshot.discard.slice(-snapshot.stockCount);
  }

  function addCardsToDiscard(draft: GameState, cards: PlayingCard[]) {
    if (cards.length === 0) return;

    const insertIndex = draft.discard.length - draft.stockCount;
    draft.discard.splice(
      insertIndex,
      0,
      ...cards.map((card) => ({ ...card, faceUp: false })),
    );
  }

  function getSelectionCard(selection: Selection, snapshot = game) {
    if (!selection) return null;
    if (selection.zone === "waste") {
      return snapshot.waste[snapshot.waste.length - 1] ?? null;
    }
    return snapshot.pyramid[selection.index] ?? null;
  }

  function canPairSelections(
    first: Selection,
    second: Selection,
    snapshot = game,
  ) {
    if (!first || !second) return false;
    if (first.zone === second.zone && first.zone === "waste") return false;

    if (
      first.zone === "pyramid" &&
      second.zone === "pyramid" &&
      first.index === second.index
    ) {
      return false;
    }

    const firstCard = getSelectionCard(first, snapshot);
    const secondCard = getSelectionCard(second, snapshot);
    if (!firstCard || !secondCard) return false;

    if (first.zone === "pyramid") {
      const pyramidCard = snapshot.pyramid[first.index];
      if (!pyramidCard || !isCardExposed(pyramidCard, snapshot.pyramid)) {
        return false;
      }
    }

    if (second.zone === "pyramid") {
      const pyramidCard = snapshot.pyramid[second.index];
      if (!pyramidCard || !isCardExposed(pyramidCard, snapshot.pyramid)) {
        return false;
      }
    }

    return cardValue(firstCard) + cardValue(secondCard) === 13;
  }

  function drawCard() {
    if (ended || game.stockCount === 0) return;

    saveUndoState(structuredClone(game));
    setGame((draft) => {
      if (draft.stockCount === 0) return;

      const drawn = draft.discard[draft.discard.length - 1];
      if (!drawn) return;

      draft.discard.pop();
      draft.stockCount -= 1;
      draft.waste.push({ ...drawn, faceUp: true });
    });

    setSelected(null);
  }

  function removeSingleKing(selection: Selection) {
    if (!selection) return false;

    if (selection.zone === "waste") {
      const top = game.waste[game.waste.length - 1];
      if (!top || top.rank !== "K") return false;

      saveUndoState(structuredClone(game));
      setGame((draft) => {
        const removedCard = draft.waste.pop();
        if (removedCard) {
          addCardsToDiscard(draft, [removedCard]);
        }
      });
      setSelected(null);
      return true;
    }

    const card = game.pyramid[selection.index];
    if (!card || card.rank !== "K" || !isCardExposed(card, game.pyramid)) {
      return false;
    }

    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const removedCard = draft.pyramid[selection.index];
      if (!removedCard) return;
      draft.pyramid[selection.index] = null;
      addCardsToDiscard(draft, [removedCard]);
    });
    setSelected(null);
    return true;
  }

  function applyPairRemoval(first: Selection, second: Selection) {
    if (!canPairSelections(first, second)) return false;

    saveUndoState(structuredClone(game));
    setGame((draft) => {
      if (!first || !second) return;

      if (first.zone === "pyramid") {
        const removedCard = draft.pyramid[first.index];
        if (removedCard) {
          draft.pyramid[first.index] = null;
          addCardsToDiscard(draft, [removedCard]);
        }
      } else {
        const removedCard = draft.waste.pop();
        if (removedCard) {
          addCardsToDiscard(draft, [removedCard]);
        }
      }

      if (second.zone === "pyramid") {
        const removedCard = draft.pyramid[second.index];
        if (removedCard) {
          draft.pyramid[second.index] = null;
          addCardsToDiscard(draft, [removedCard]);
        }
      } else {
        const removedCard = draft.waste.pop();
        if (removedCard) {
          addCardsToDiscard(draft, [removedCard]);
        }
      }
    });

    setSelected(null);
    return true;
  }

  function onPyramidPress(index: number) {
    if (ended) return;

    const card = game.pyramid[index];
    if (!card || !isCardExposed(card, game.pyramid)) return;

    if (!selected) {
      if (!removeSingleKing({ zone: "pyramid", index })) {
        setSelected({ zone: "pyramid", index });
      }
      return;
    }

    if (selected.zone === "pyramid" && selected.index === index) {
      setSelected(null);
      return;
    }

    if (!applyPairRemoval(selected, { zone: "pyramid", index })) {
      setSelected(index === undefined ? null : { zone: "pyramid", index });
    }
  }

  function onWastePress() {
    if (ended) return;

    if (game.waste.length === 0) {
      setSelected(null);
      return;
    }

    if (!selected) {
      if (!removeSingleKing({ zone: "waste" })) {
        setSelected({ zone: "waste" });
      }
      return;
    }

    if (selected.zone === "waste") {
      setSelected(null);
      return;
    }

    if (!applyPairRemoval(selected, { zone: "waste" })) {
      setSelected(null);
    }
  }

  const zones: MapZone[] = useMemo(() => {
    const pyramidZones: MapZone[] = Array.from({
      length: PYRAMID_SIZE,
    }).map((_, index) => {
      const card = game.pyramid[index];
      const position = PYRAMID_POSITIONS[index];
      const row = position?.row ?? 0;
      const col = position?.col ?? 0;

      return {
        id: `pyramid-${index}`,
        name: "pyramid",
        pileIndex: index,
        cards: card ? [card] : [],
        col: PYRAMID_BASE_COL - row / 2 + col,
        row: PYRAMID_BASE_ROW + row * PYRAMID_ROW_STEP,
        baseZIndex: 20 + row,
      };
    });

    return [
      {
        id: "stock",
        name: "stock",
        cards: stockCards(game),
        col: 0,
        row: 0,
        baseZIndex: 50,
        fan: { maxVisible: 3 },
        placeholder: { text: "Draw", infoPos: "below", showCount: true },
      },
      {
        id: "waste",
        name: "waste",
        cards: game.waste,
        col: 1.2,
        row: 0,
        baseZIndex: 55,
        fan: { maxVisible: 3 },
        placeholder: { text: "Waste", infoPos: "below", showCount: false },
      },
      {
        id: "discard",
        name: "discard",
        cards: game.discard.slice(0, game.discard.length - game.stockCount),
        col: 6,
        row: 0,
        baseZIndex: 100,
        fan: { maxVisible: 3 },
        placeholder: { text: "Discard", infoPos: "below", showCount: true },
      },
      ...pyramidZones,
    ];
  }, [game]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (mappedCard.zoneName === "stock") {
      return {
        clickThroughCards: true,
      };
    } else if (mappedCard.zoneName === "waste" && mappedCard.topOfZone) {
      return {
        onPress: mappedCard.topOfZone ? onWastePress : undefined,
        isDisabled: ended,
        selectColor: "blue",
        isSelected: selected?.zone === "waste",
      };
    } else if (
      mappedCard.zoneName === "pyramid" &&
      mappedCard.pileIndex !== undefined
    ) {
      const index = mappedCard.pileIndex;
      const card = game.pyramid[index];
      const exposed = card ? isCardExposed(card, game.pyramid) : false;
      const isSelected =
        selected?.zone === "pyramid" && selected.index === index;

      return {
        onPress: () => onPyramidPress(index),
        isDisabled: ended || !exposed,
        selectColor: "blue",
        isSelected,
      };
    }
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name === "stock") {
      return {
        onPress: drawCard,
        isDisabled: ended || game.stockCount === 0,
      };
    }
  };

  const { cardMap } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper,
    cardSize: "small",
    fixedCols: 7,
    gap: 0.14,
    // visualizer: true,
  });

  return (
    <GameWrapper
      showIntro={showIntro}
      setShowIntro={setShowIntro}
      ended={ended}
      won={won}
      winLoseMessage={
        won
          ? "You won!"
          : lost
            ? "No more moves and the stock is empty."
            : undefined
      }
      reset={reset}
      isLoaded={isLoaded}
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}
    </GameWrapper>
  );
}
