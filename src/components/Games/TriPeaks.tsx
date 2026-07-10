import { useStateManager } from "@/hooks/useStateManager";
import { useNavigation } from "expo-router";
import { useEffect, useMemo } from "react";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import {
  createDeck,
  flipAllToBack,
  flipToFace,
  type PlayingCard,
  RANK_VALUE,
  shuffle,
} from "../Cards/card-utils";
import { GameWrapper } from "../common/GameWrapper";
import { delay } from "@/utils/utils";

const ROW_LAYOUT: readonly (readonly number[])[] = [
  [1.5, 4.5, 7.5],
  [1, 2, 4, 5, 7, 8],
  [0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5, 8.5],
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
] as const;

const CARDS_PER_ROW = [3, 6, 9, 10] as const;

const TABLEAU_ROW_BASE = 1.2;
const TABLEAU_ROW_STEP = 0.43;

const NUM_ROWS = 4;

const CARD_LAYOUT_POS: { col: number; row: number }[] = [];
const CARD_COL_ROWS: { col: number; row: number }[] = [];

for (let row = 0; row < NUM_ROWS; row++) {
  for (let col = 0; col < CARDS_PER_ROW[row]; col++) {
    CARD_LAYOUT_POS.push({
      col: ROW_LAYOUT[row][col],
      row: TABLEAU_ROW_BASE + row * TABLEAU_ROW_STEP,
    });
    CARD_COL_ROWS.push({
      col,
      row,
    });
  }
}

const TABLEAU_CARD_COUNT = CARDS_PER_ROW.reduce((sum, count) => sum + count, 0);

type TableauCard = PlayingCard & {
  row: number;
  col: number;
  removed: boolean;
  blockers: number[];
};

type GameState = {
  tableau: TableauCard[];
  draw: PlayingCard[];
  waste: PlayingCard[];
};

function isAdjacentRank(a: PlayingCard, b: PlayingCard) {
  if (
    (a.rank === "A" && b.rank === "K") ||
    (a.rank === "K" && b.rank === "A")
  ) {
    return true;
  }

  return Math.abs(RANK_VALUE[a.rank] - RANK_VALUE[b.rank]) === 1;
}

function tableauIndex(row: number, col: number) {
  const rowOffsets = [0, 3, 9, 18] as const;
  return rowOffsets[row] + col;
}

function blockersFor(row: number, col: number) {
  if (row === 3) return [];

  if (row === 2) {
    return [tableauIndex(3, col), tableauIndex(3, col + 1)];
  }

  if (row === 1) {
    if (col < 2) return [tableauIndex(2, col), tableauIndex(2, col + 1)];
    if (col < 4) {
      const local = col - 2;
      return [tableauIndex(2, 3 + local), tableauIndex(2, 4 + local)];
    }
    const local = col - 4;
    return [tableauIndex(2, 6 + local), tableauIndex(2, 7 + local)];
  }

  if (col === 0) return [tableauIndex(1, 0), tableauIndex(1, 1)];
  if (col === 1) return [tableauIndex(1, 2), tableauIndex(1, 3)];
  return [tableauIndex(1, 4), tableauIndex(1, 5)];
}

function isExposed(card: TableauCard, tableau: TableauCard[]) {
  if (card.removed) return false;

  return card.blockers.every((index) => tableau[index]?.removed);
}

function revealExposedCards(tableau: TableauCard[]) {
  tableau.forEach((card, index) => {
    if (card.removed || card.faceUp) return;
    if (!isExposed(card, tableau)) return;

    tableau[index] = { ...card, faceUp: true };
  });
}

function canMoveToWaste(index: number, snapshot: GameState) {
  const card = snapshot.tableau[index];
  const wasteTop = snapshot.waste[snapshot.waste.length - 1];

  if (!card || card.removed || !card.faceUp || !wasteTop) {
    return false;
  }

  if (!isExposed(card, snapshot.tableau)) {
    return false;
  }

  return isAdjacentRank(card, wasteTop);
}

function hasAvailableMoves(snapshot: GameState) {
  return snapshot.tableau.some((card, index) => {
    if (card.removed || !card.faceUp) return false;
    if (!isExposed(card, snapshot.tableau)) return false;
    return canMoveToWaste(index, snapshot);
  });
}

function createInitialState(): GameState {
  const waste = shuffle(createDeck());
  const tableau: TableauCard[] = [];

  return {
    tableau,
    draw: [],
    waste,
  };
}

const gameStateInitial = createInitialState();

async function resetAndSetup(
  setGame: (updater: (draft: GameState) => void) => void,
) {
  // Group all cards to discard pile, delay, then reset the game state
  setGame((draft) => {
    const allCards = flipAllToBack([
      ...draft.tableau,
      ...draft.draw,
      ...draft.waste,
    ]);

    draft.tableau = [];
    draft.draw = [];
    draft.waste = allCards;
  });

  await delay();

  setGame((draft) => {
    draft.waste = shuffle(draft.waste);
    draft.tableau = [];

    for (let i = 0; i < TABLEAU_CARD_COUNT; i += 1) {
      const card = draft.waste.pop();
      if (!card) continue;

      const isLastRow = i >= TABLEAU_CARD_COUNT - CARDS_PER_ROW[NUM_ROWS - 1];

      draft.tableau.push({
        ...card,
        row: CARD_COL_ROWS[i].row,
        col: CARD_COL_ROWS[i].col,
        removed: false,
        faceUp: isLastRow,
        blockers: blockersFor(CARD_COL_ROWS[i].row, CARD_COL_ROWS[i].col),
      });
    }

    draft.draw = shuffle(draft.waste);
    draft.waste = [];
  });

  await delay();

  setGame((draft) => {
    const firstWasteCard = draft.draw.pop();
    if (firstWasteCard) {
      draft.waste.push(flipToFace(firstWasteCard));
    }
  });
}

export default function TriPeaks() {
  const navigation = useNavigation();

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
    resetAndSetup: async () => {
      await resetAndSetup(setGame);
    },
  });

  const won = useMemo(
    () => !isSettingUp && game.tableau.every((card) => card.removed),
    [game.tableau, isSettingUp],
  );

  const lost = useMemo(() => {
    if (won || isSettingUp) return false;
    if (game.draw.length > 0) return false;
    return !hasAvailableMoves(game);
  }, [game, won, isSettingUp]);

  const ended = !isSettingUp && (won || lost);

  const zones: MapZone[] = useMemo(() => {
    const tableauZones: MapZone[] = Array.from({
      length: TABLEAU_CARD_COUNT,
    }).map((_, index) => {
      const card = game.tableau[index];

      return {
        id: `tableau-${index}`,
        name: "tableau",
        pileIndex: index,
        cards: !card || card.removed ? [] : [card],
        col: CARD_LAYOUT_POS[index].col,
        row: CARD_LAYOUT_POS[index].row,
        baseZIndex: 20 + CARD_COL_ROWS[index].row,
      };
    });

    return [
      {
        id: "draw",
        name: "draw",
        cards: game.draw,
        col: 3,
        row: 0,
        baseZIndex: 50,
        fan: { maxVisible: 3 },
        placeholder: { text: "Draw", infoPos: "below" },
      },
      {
        id: "waste",
        name: "waste",
        cards: game.waste,
        col: 6,
        row: 0,
        baseZIndex: 100,
        fan: { maxVisible: 3 },
        placeholder: { text: "Waste", infoPos: "below" },
      },
      ...tableauZones,
    ];
  }, [game]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (mappedCard.zoneName === "draw") {
      return {
        clickThroughCards: true,
      };
    } else if (
      mappedCard.zoneName === "tableau" &&
      mappedCard.pileIndex !== undefined
    ) {
      return {
        onPress: () => moveTableauToWaste(mappedCard.pileIndex!),
      };
    }
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name === "draw") {
      return {
        onPress: drawFromStock,
        isDisabled: game.draw.length === 0 || ended,
      };
    }
  };

  const { cardMap } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper,
    gap: 0.14,
    cardSize: "small",
  });

  useEffect(() => {
    navigation.setOptions({ gestureEnabled: false });

    return () => {
      navigation.setOptions({ gestureEnabled: true });
    };
  }, [navigation]);

  function drawFromStock() {
    if (game.draw.length === 0 || ended) {
      return;
    }

    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const drawn = draft.draw[draft.draw.length - 1];
      if (!drawn) return;

      draft.draw.pop();
      draft.waste.push({ ...drawn, faceUp: true });
    });
  }

  function moveTableauToWaste(index: number) {
    if (!canMoveToWaste(index, game) || ended) {
      return;
    }

    saveUndoState(structuredClone(game));

    setGame((draft) => {
      const card = draft.tableau[index];
      if (!card || card.removed || !card.faceUp) return;
      if (!isExposed(card, draft.tableau)) return;

      const top = draft.waste[draft.waste.length - 1];
      if (!top || !isAdjacentRank(card, top)) return;

      draft.tableau[index] = { ...card, removed: true };
      draft.waste.push({
        id: card.id,
        suit: card.suit,
        rank: card.rank,
        faceUp: true,
      });

      revealExposedCards(draft.tableau);
    });
  }

  return (
    <GameWrapper
      showIntro={showIntro}
      setShowIntro={setShowIntro}
      ended={ended}
      won={won}
      // winLoseMessage={lost ? "No moves left." : undefined}
      reset={reset}
      isLoaded={isLoaded}
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}
    </GameWrapper>
  );
}
