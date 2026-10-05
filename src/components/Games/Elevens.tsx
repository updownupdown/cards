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
import { useStateManager } from "@/hooks/useStateManager";
import { delay } from "@/utils/utils";

import { i18n } from "@/i18n";

type GameState = {
  grid: (PlayingCard | null)[];
  stock: PlayingCard[];
  discard: PlayingCard[];
};

export type ElevensGameState = GameState;

const GRID_COLS = 3;
const GRID_SIZE = 9;
const PAIR_TOTAL = 11;
const FACE_RANKS = ["J", "Q", "K"];

function createInitialState(): GameState {
  return {
    grid: Array.from({ length: GRID_SIZE }, () => null),
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
  for (let i = 0; i < GRID_SIZE; i += 1) {
    for (let j = i + 1; j < GRID_SIZE; j += 1) {
      const a = grid[i];
      const b = grid[j];
      if (a && b && isRemovableSet([a, b])) sets.push([i, j]);
      for (let k = j + 1; k < GRID_SIZE; k += 1) {
        const c = grid[k];
        if (a && b && c && isRemovableSet([a, b, c])) sets.push([i, j, k]);
      }
    }
  }
  return sets;
}

/** Fills every empty grid space from the top of the stock. */
function refillGrid(draft: GameState) {
  for (let i = 0; i < GRID_SIZE; i += 1) {
    if (draft.grid[i] !== null) continue;
    const next = draft.stock.pop();
    if (!next) return;
    draft.grid[i] = { ...next, faceUp: true };
  }
}

const MIN_PLAYABLE_MOVES = 4;
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

/** A deal is playable if it allows at least four moves in a row. */
function isPlayableDeal(draft: GameState) {
  return canPlayMoves(draft.grid, draft.stock, MIN_PLAYABLE_MOVES);
}

async function resetAndSetup(
  setGame: (updater: (draft: GameState) => void) => void,
) {
  setGame((draft) => {
    draft.stock = flipAllToBack([
      ...draft.grid.filter((card): card is PlayingCard => card !== null),
      ...draft.stock,
      ...draft.discard,
    ]);
    draft.grid = Array.from({ length: GRID_SIZE }, () => null);
    draft.discard = [];
  });

  await delay();

  setGame((draft) => {
    const cards = draft.stock;
    // Only keep deals that allow at least four moves in a row.
    for (let attempt = 0; attempt < DEAL_ATTEMPTS; attempt += 1) {
      draft.stock = shuffle(cards);
      draft.grid = Array.from({ length: GRID_SIZE }, () => null);
      refillGrid(draft);
      if (isPlayableDeal(draft)) return;
    }
  });
}

export const elevensRules = {
  isRemovableSet,
  isPartialSet,
  hasAvailableMove,
  createInitialState,
  gridSize: GRID_SIZE,
};

export default function Elevens() {
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
      await resetAndSetup(setGame);
    },
  });

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
      col: index % GRID_COLS,
      row: Math.floor(index / GRID_COLS),
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
        col: 2,
        row: 3.3,
        baseZIndex: 50,
        fan: { maxVisible: 3 },
        placeholder: { text: i18n.t("cards:discard"), infoPos: "left" },
      },
    ];
  }, [game]);

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
    fixedCols: GRID_COLS,
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
