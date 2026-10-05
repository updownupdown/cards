import { useStateManager } from "@/hooks/useStateManager";
import { useMemo } from "react";
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

import { i18n } from "@/i18n";
import { useHint } from "@/hints/hint-store";
import { cardTarget, makeHint, zoneTarget } from "@/hints/hint";
import { planMove } from "@/hints/lookahead";
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
  blockers: number[];
};

export type ThreePeaksTableauCard = TableauCard;

type GameState = {
  tableau: (TableauCard | null)[];
  draw: PlayingCard[];
  waste: PlayingCard[];
};

export type ThreePeaksGameState = GameState;

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

function isExposed(card: TableauCard, tableau: (TableauCard | null)[]) {
  return card.blockers.every((index) => tableau[index] === null);
}

function revealExposedCards(tableau: (TableauCard | null)[]) {
  tableau.forEach((card, index) => {
    if (!card || card.faceUp) return;
    if (!isExposed(card, tableau)) return;

    tableau[index] = { ...card, faceUp: true };
  });
}

function canMoveToWaste(index: number, snapshot: GameState) {
  const card = snapshot.tableau[index];
  const wasteTop = snapshot.waste[snapshot.waste.length - 1];

  if (!card || !card.faceUp || !wasteTop) {
    return false;
  }

  if (!isExposed(card, snapshot.tableau)) {
    return false;
  }

  return isAdjacentRank(card, wasteTop);
}

function hasAvailableMoves(snapshot: GameState) {
  return snapshot.tableau.some((card, index) => {
    if (!card || !card.faceUp) return false;
    if (!isExposed(card, snapshot.tableau)) return false;
    return canMoveToWaste(index, snapshot);
  });
}

/**
 * The longest run onto the waste from the cards on view, preferring runs that
 * uncover face-down cards; cards it uncovers stay unknown. Draws when
 * nothing plays.
 */
function findThreePeaksHint(state: GameState) {
  const uncovered = (current: GameState) =>
    current.tableau.filter(
      (card) => card && !card.faceUp && isExposed(card, current.tableau),
    ).length;
  const move = planMove<GameState, number>(state, {
    key: (current) =>
      `peaks:${current.tableau.map((card) => (card ? 1 : 0)).join("")}:${current.waste.at(-1)?.id}`,
    moves: (current) =>
      current.tableau.flatMap((_, index) =>
        canMoveToWaste(index, current) ? [index] : [],
      ),
    apply: (current, index) => ({
      ...current,
      tableau: current.tableau.map((card, at) => (at === index ? null : card)),
      waste: [...current.waste, current.tableau[index]!],
    }),
    score: (current, depth) => depth * 100 + uncovered(current) * 60,
  });
  if (move !== null) {
    return makeHint(
      "toWaste",
      cardTarget(state.tableau[move]!),
      zoneTarget("waste"),
    );
  }
  return state.draw.length > 0 ? makeHint("draw", zoneTarget("draw")) : null;
}

export const threePeaksRules = {
  findHint: findThreePeaksHint,
  isAdjacentRank,
  tableauIndex,
  blockersFor,
  isExposed,
  revealExposedCards,
  canMoveToWaste,
  hasAvailableMoves,
};

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
      ...draft.tableau.filter((card): card is TableauCard => card !== null),
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

export default function ThreePeaks() {
  const {
    isSettingUp,
    isLoaded,
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
    () => !isSettingUp && game.tableau.every((card) => card === null),
    [game.tableau, isSettingUp],
  );

  const lost = useMemo(() => {
    if (won || isSettingUp) return false;
    if (game.draw.length > 0) return false;
    return !hasAvailableMoves(game);
  }, [game, won, isSettingUp]);

  const ended = !isSettingUp && (won || lost);

  useHint(() => findThreePeaksHint(game), {
    game,
    enabled: !isSettingUp && !ended,
  });

  const zones: MapZone[] = useMemo(() => {
    const tableauZones: MapZone[] = Array.from({
      length: TABLEAU_CARD_COUNT,
    }).map((_, index) => {
      const card = game.tableau[index];

      return {
        id: `tableau-${index}`,
        name: "tableau",
        pileIndex: index,
        cards: card ? [card] : [],
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
        col: 6,
        row: 0,
        baseZIndex: 50,
        fan: { maxVisible: 3 },
        placeholder: { text: i18n.t("cards:stock"), infoPos: "below" },
      },
      {
        id: "waste",
        name: "waste",
        cards: game.waste,
        col: 3,
        row: 0,
        baseZIndex: 100,
        fan: { maxVisible: 3 },
        placeholder: { text: i18n.t("cards:waste"), infoPos: "below" },
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
      if (!card || !card.faceUp) return;
      if (!isExposed(card, draft.tableau)) return;

      const top = draft.waste[draft.waste.length - 1];
      if (!top || !isAdjacentRank(card, top)) return;

      draft.tableau[index] = null;
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
      outcome={!ended ? "playing" : won ? "won" : "lost"}
      reset={reset}
      isLoaded={isLoaded}
      // Draw cards left over: the fewer a win needed, the better.
      score={won ? game.draw.length : undefined}
      canUndo={canUndo}
      undo={undo}
      showDeviceRotateHint="landscape"
    >
      {cardMap}
    </GameWrapper>
  );
}
