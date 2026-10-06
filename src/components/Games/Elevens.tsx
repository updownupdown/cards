import { useMemo, useState } from "react";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import {
  createDeck,
  flipAllToBack,
  RANK_VALUE,
  shuffle,
  type PlayingCard,
} from "../Cards/card-utils";
import { GameWrapper } from "../common/GameWrapper";
import { useGameSettingValue } from "@/hooks/useGameSettingValue";
import { useStateManager } from "@/hooks/useStateManager";
import { delay } from "@/utils/utils";

import { i18n } from "@/i18n";
import { useHint } from "@/hints/hint-store";
import { cardTarget, makeHint } from "@/hints/hint";

type GameState = {
  grid: (PlayingCard | null)[];
  stock: PlayingCard[];
  discard: PlayingCard[];
};

export type ElevensGameState = GameState;

const GRID_ROWS = 3;
const GRID_COLS_BY_DIFFICULTY = { easy: 5, medium: 4, hard: 3 } as const;
type ElevensDifficulty = keyof typeof GRID_COLS_BY_DIFFICULTY;
const GRID_SIZE = GRID_ROWS * GRID_COLS_BY_DIFFICULTY.hard;
const PAIR_TOTAL = 11;
const FACE_RANKS = ["J", "Q", "K"];

function createInitialState(gridSize = GRID_SIZE): GameState {
  return {
    grid: Array.from({ length: gridSize }, () => null),
    stock: createDeck({ faceUp: false }),
    discard: [],
  };
}

const gameStateInitial = createInitialState();

function isFaceRank(card: PlayingCard) {
  return FACE_RANKS.includes(card.rank);
}

/** Two cards totalling 11, or exactly one each of Jack, Queen and King. */
function isRemovableSet(cards: PlayingCard[]) {
  if (cards.length === 2) {
    return (
      !cards.some(isFaceRank) &&
      RANK_VALUE[cards[0].rank] + RANK_VALUE[cards[1].rank] === PAIR_TOTAL
    );
  }
  if (cards.length === 3) {
    return FACE_RANKS.every((rank) => cards.some((c) => c.rank === rank));
  }
  return false;
}

/** Whether the selection could still grow into a removable set. */
function isPartialSet(cards: PlayingCard[]) {
  if (cards.length === 1) return true;
  if (cards.length === 2) {
    return cards.every(isFaceRank) && cards[0].rank !== cards[1].rank;
  }
  return false;
}

function hasAvailableMove(grid: (PlayingCard | null)[]) {
  const cards = grid.filter((card): card is PlayingCard => card !== null);
  for (let i = 0; i < cards.length; i += 1) {
    for (let j = i + 1; j < cards.length; j += 1) {
      if (isRemovableSet([cards[i], cards[j]])) return true;
    }
  }
  const faces = FACE_RANKS.map((rank) => cards.some((c) => c.rank === rank));
  return faces.every(Boolean);
}

/** Index sets of the grid that could be removed right now. */
function removableSets(grid: (PlayingCard | null)[]) {
  const sets: number[][] = [];
  const size = grid.length;
  for (let i = 0; i < size; i += 1) {
    for (let j = i + 1; j < size; j += 1) {
      const a = grid[i];
      const b = grid[j];
      if (a && b && isRemovableSet([a, b])) sets.push([i, j]);
      for (let k = j + 1; k < size; k += 1) {
        const c = grid[k];
        if (a && b && c && isRemovableSet([a, b, c])) sets.push([i, j, k]);
      }
    }
  }
  return sets;
}

/** Fills every empty grid space from the top of the stock. */
function refillGrid(draft: GameState) {
  for (let i = 0; i < draft.grid.length; i += 1) {
    if (draft.grid[i] !== null) continue;
    const next = draft.stock.pop();
    if (!next) return;
    draft.grid[i] = { ...next, faceUp: true };
  }
}

const FILTERED_PLAYABLE_MOVES = 3;
// Even unfiltered deals must not lose on the spot.
const UNFILTERED_PLAYABLE_MOVES = 1;
const DEAL_ATTEMPTS = 100;

/** Whether at least `moves` consecutive moves can be made from this position. */
function canPlayMoves(
  grid: (PlayingCard | null)[],
  stock: PlayingCard[],
  moves: number,
): boolean {
  if (moves === 0) return true;
  return removableSets(grid).some((set) => {
    const next: GameState = {
      grid: grid.map((card, index) => (set.includes(index) ? null : card)),
      stock: [...stock],
      discard: [],
    };
    refillGrid(next);
    const cleared =
      next.stock.length === 0 && next.grid.every((card) => card === null);
    return cleared || canPlayMoves(next.grid, next.stock, moves - 1);
  });
}

/** A deal is playable if it allows at least the required moves in a row. */
function isPlayableDeal(draft: GameState, eliminateBadDeals: boolean) {
  return canPlayMoves(
    draft.grid,
    draft.stock,
    eliminateBadDeals ? FILTERED_PLAYABLE_MOVES : UNFILTERED_PLAYABLE_MOVES,
  );
}

async function resetAndSetup(
  setGame: (updater: (draft: GameState) => void) => void,
  gridSize: number,
  eliminateBadDeals: boolean,
) {
  setGame((draft) => {
    draft.stock = flipAllToBack([
      ...draft.grid.filter((card): card is PlayingCard => card !== null),
      ...draft.stock,
      ...draft.discard,
    ]);
    draft.grid = Array.from({ length: gridSize }, () => null);
    draft.discard = [];
  });

  await delay();

  setGame((draft) => {
    const cards = draft.stock;
    // Only keep deals that allow enough moves in a row.
    for (let attempt = 0; attempt < DEAL_ATTEMPTS; attempt += 1) {
      draft.stock = shuffle(cards);
      draft.grid = Array.from({ length: gridSize }, () => null);
      refillGrid(draft);
      if (isPlayableDeal(draft, eliminateBadDeals)) return;
    }
  });
}

/**
 * Jack, Queen and King go together whenever they can (only a full set of
 * them ever clears a face card); otherwise a pair totalling eleven. The
 * stock's cards are unknown, so there's nothing to look ahead into.
 */
function findElevensHint(state: GameState) {
  const sets = removableSets(state.grid);
  const best = sets.find((set) => set.length === 3) ?? sets[0];
  return best
    ? makeHint(
        "removeCards",
        ...best.map((index) => cardTarget(state.grid[index]!)),
      )
    : null;
}

export const elevensRules = {
  findHint: findElevensHint,
  isRemovableSet,
  isPartialSet,
  hasAvailableMove,
  createInitialState,
  gridSize: GRID_SIZE,
};

export default function Elevens() {
  const difficulty = useGameSettingValue(
    "elevensDifficulty",
  ) as ElevensDifficulty;
  const eliminateBadDeals = useGameSettingValue("elevensEliminateBadDeals");
  const settingGridSize = GRID_ROWS * GRID_COLS_BY_DIFFICULTY[difficulty];
  const [selected, setSelected] = useState<number[]>([]);

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
    resetNonGameStates: () => {
      setSelected([]);
    },
    resetAndSetup: async () => {
      await resetAndSetup(setGame, settingGridSize, eliminateBadDeals);
    },
  });

  // A saved game keeps the grid it was dealt with until the next game starts.
  const gridCols = Math.max(1, Math.round(game.grid.length / GRID_ROWS));

  const won =
    !isSettingUp &&
    game.stock.length === 0 &&
    game.grid.every((card) => card === null);
  const lost =
    !isSettingUp &&
    !won &&
    !hasAvailableMove(game.grid) &&
    game.grid.some((card) => card !== null);
  const ended = !isSettingUp && (won || lost);

  useHint(() => findElevensHint(game), {
    game,
    enabled: !isSettingUp && !ended,
  });

  function onGridPress(index: number) {
    if (ended || !game.grid[index]) return;

    if (selected.includes(index)) {
      setSelected(selected.filter((i) => i !== index));
      return;
    }

    const candidate = [...selected, index];
    const cards = candidate.map((i) => game.grid[i] as PlayingCard);

    if (isRemovableSet(cards)) {
      saveUndoState(structuredClone(game));
      setGame((draft) => {
        for (const i of candidate) {
          const removed = draft.grid[i];
          if (removed) {
            draft.discard.push({ ...removed, faceUp: false });
            draft.grid[i] = null;
          }
        }
        refillGrid(draft);
      });
      setSelected([]);
    } else if (isPartialSet(cards)) {
      setSelected(candidate);
    } else {
      setSelected([index]);
    }
  }

  const zones: MapZone[] = useMemo(() => {
    const gridZones: MapZone[] = game.grid.map((card, index) => ({
      id: `grid-${index}`,
      name: "grid",
      pileIndex: index,
      cards: card ? [card] : [],
      col: index % gridCols,
      row: Math.floor(index / gridCols),
      baseZIndex: 20,
      placeholder: { text: "" },
    }));

    return [
      ...gridZones,
      {
        id: "stock",
        name: "stock",
        cards: game.stock,
        col: 0,
        row: 3.3,
        baseZIndex: 50,
        fan: { maxVisible: 3 },
        placeholder: { text: i18n.t("cards:stock"), infoPos: "right" },
      },
      {
        id: "discard",
        name: "discard",
        cards: game.discard,
        col: gridCols - 1,
        row: 3.3,
        baseZIndex: 50,
        fan: { maxVisible: 3 },
        placeholder: { text: i18n.t("cards:discard"), infoPos: "left" },
      },
    ];
  }, [game, gridCols]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (mappedCard.zoneName === "grid" && mappedCard.pileIndex !== undefined) {
      const index = mappedCard.pileIndex;
      return {
        onPress: () => onGridPress(index),
        isDisabled: ended,
        selectColor: "blue",
        isSelected: selected.includes(index),
      };
    }
  };

  const zoneMapper = (): CardMapBGMapping | undefined => undefined;

  const { cardMap } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper,
    cardSize: "small",
    fixedCols: gridCols,
    gap: 0.1,
  });

  return (
    <GameWrapper
      outcome={!ended ? "playing" : won ? "won" : "lost"}
      winLoseMessage={
        won
          ? i18n.t("cards:youWon")
          : lost
            ? i18n.t("games:elevens.noMorePairsOrFaceTriplets")
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
