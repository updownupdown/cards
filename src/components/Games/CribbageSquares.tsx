import { useStateManager } from "@/hooks/useStateManager";
import { delay } from "@/utils/utils";
import { useMemo } from "react";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import {
  createDeck,
  flipToBack,
  flipToFace,
  rankValue,
  shuffle,
  type PlayingCard,
} from "../Cards/card-utils";
import {
  getGridColRows,
  MappedCard,
  MapZone,
  useCardMap,
} from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";

const GRID_SIZE = 4;
const GRID_CELLS = GRID_SIZE * GRID_SIZE;
const TARGET_SCORE = 61;

type GameState = {
  grid: (PlayingCard | null)[];
  stock: PlayingCard[];
  current: PlayingCard | null;
  starter: PlayingCard | null;
  score: number;
  ended: boolean;
  won: boolean;
};

const gameStateInitial: GameState = {
  grid: Array.from({ length: GRID_CELLS }, () => null),
  stock: [],
  current: null,
  starter: null,
  score: 0,
  ended: false,
  won: false,
};

function cribbageValue(card: PlayingCard) {
  return Math.min(rankValue(card), 10);
}

function countFifteens(hand: PlayingCard[]) {
  let score = 0;
  for (let mask = 1; mask < 1 << hand.length; mask += 1) {
    let total = 0;
    let cardCount = 0;
    for (let i = 0; i < hand.length; i += 1) {
      if (mask & (1 << i)) {
        total += cribbageValue(hand[i]);
        cardCount += 1;
      }
    }
    if (cardCount >= 2 && total === 15) score += 2;
  }
  return score;
}

function countPairs(hand: PlayingCard[]) {
  let pairs = 0;
  for (let first = 0; first < hand.length; first += 1) {
    for (let second = first + 1; second < hand.length; second += 1) {
      if (hand[first].rank === hand[second].rank) pairs += 1;
    }
  }
  return pairs * 2;
}

function countRuns(hand: PlayingCard[]) {
  const rankCounts = new Map<number, number>();
  for (const card of hand) {
    const rank = rankValue(card);
    rankCounts.set(rank, (rankCounts.get(rank) ?? 0) + 1);
  }

  const ranks = [...rankCounts.keys()].sort((a, b) => a - b);
  let score = 0;
  let start = 0;

  while (start < ranks.length) {
    let end = start;
    while (end + 1 < ranks.length && ranks[end + 1] === ranks[end] + 1) {
      end += 1;
    }

    const runLength = end - start + 1;
    if (runLength >= 3) {
      let multiplicity = 1;
      for (let i = start; i <= end; i += 1) {
        multiplicity *= rankCounts.get(ranks[i]) ?? 0;
      }
      score += runLength * multiplicity;
    }
    start = end + 1;
  }

  return score;
}

function scoreHand(line: PlayingCard[], starter: PlayingCard) {
  const hand = [...line, starter];
  let score = countFifteens(hand) + countPairs(hand) + countRuns(hand);

  if (line.every((card) => card.suit === line[0].suit)) {
    score += 4;
    if (starter.suit === line[0].suit) score += 1;
  }

  if (line.some((card) => card.rank === "J" && card.suit === starter.suit)) {
    score += 1;
  }

  return score;
}

function scoreDeal(grid: (PlayingCard | null)[], starter: PlayingCard) {
  let score = starter.rank === "J" ? 2 : 0;

  for (let row = 0; row < GRID_SIZE; row += 1) {
    const line = grid.slice(row * GRID_SIZE, (row + 1) * GRID_SIZE);
    score += scoreHand(line as PlayingCard[], starter);
  }

  for (let col = 0; col < GRID_SIZE; col += 1) {
    const line: PlayingCard[] = [];
    for (let row = 0; row < GRID_SIZE; row += 1) {
      const card = grid[row * GRID_SIZE + col];
      if (card) line.push(card);
    }
    score += scoreHand(line, starter);
  }

  return score;
}

function getLegalCells(grid: (PlayingCard | null)[]) {
  const occupied = grid.flatMap((card, index) => (card ? [index] : []));
  if (occupied.length === 0) {
    return Array.from({ length: GRID_CELLS }, (_, index) => index);
  }

  return grid.flatMap((card, index) => {
    if (card) return [];
    const row = Math.floor(index / GRID_SIZE);
    const col = index % GRID_SIZE;
    const touches = occupied.some((occupiedIndex) => {
      const occupiedRow = Math.floor(occupiedIndex / GRID_SIZE);
      const occupiedCol = occupiedIndex % GRID_SIZE;
      return (
        Math.abs(row - occupiedRow) <= 1 && Math.abs(col - occupiedCol) <= 1
      );
    });
    return touches ? [index] : [];
  });
}

async function resetAndSetup(
  setGame: (updater: (draft: GameState) => void) => void,
) {
  setGame((draft) => {
    const allCards = [
      ...draft.grid.filter((card): card is PlayingCard => card !== null),
      ...draft.stock,
      ...(draft.current ? [draft.current] : []),
      ...(draft.starter ? [draft.starter] : []),
    ];
    draft.stock = shuffle(
      (allCards.length === 52 ? allCards : createDeck()).map(flipToBack),
    );
    draft.grid = Array.from({ length: GRID_CELLS }, () => null);
    draft.current = null;
    draft.starter = null;
    draft.score = 0;
    draft.ended = false;
    draft.won = false;
  });

  await delay();

  setGame((draft) => {
    const next = draft.stock.pop();
    draft.current = next ? flipToFace(next) : null;
  });
}

export default function CribbageSquares() {
  const { isLoaded, game, setGame, undo, canUndo, saveUndoState, reset } =
    useStateManager({
      resetAndSetup: async () => {
        await resetAndSetup(setGame);
      },
      gameStateInitial,
    });

  const legalCells = useMemo(() => getLegalCells(game.grid), [game.grid]);

  function placeCard(index: number) {
    if (
      game.ended ||
      !game.current ||
      game.grid[index] !== null ||
      !legalCells.includes(index)
    ) {
      return;
    }

    saveUndoState(structuredClone(game));
    setGame((draft) => {
      if (!draft.current || draft.grid[index] !== null) return;

      draft.grid[index] = flipToFace(draft.current);
      const next = draft.stock.pop();
      const placedCount = draft.grid.filter((card) => card !== null).length;

      if (placedCount === GRID_CELLS) {
        draft.current = null;
        draft.starter = next ? flipToFace(next) : null;
        if (draft.starter) {
          draft.score = scoreDeal(draft.grid, draft.starter);
        }
        draft.ended = true;
        draft.won = draft.score >= TARGET_SCORE;
      } else {
        draft.current = next ? flipToFace(next) : null;
      }
    });
  }

  const zones: MapZone[] = useMemo(() => {
    const gridZones = getGridColRows({
      cols: GRID_SIZE,
      rows: GRID_SIZE,
      rowOffset: 1.45,
    }).map((position, index) => ({
      id: `grid-${index}`,
      name: "grid",
      pileIndex: index,
      cards: game.grid[index] ? [game.grid[index]!] : [],
      col: position.c,
      row: position.r,
      baseZIndex: 10,
      placeholder: {},
    }));

    return [
      {
        id: "current",
        name: "current",
        cards: game.current ? [game.current] : [],
        col: 0,
        row: 0,
        baseZIndex: 40,
        placeholder: { text: "Deal", infoPos: "right" },
      },
      {
        id: "starter",
        name: "starter",
        cards: game.starter ? [game.starter] : [],
        col: 3,
        row: 0,
        baseZIndex: 40,
        placeholder: { text: "Starter", infoPos: "left" },
      },
      ...gridZones,
    ];
  }, [game]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (mappedCard.zoneName === "grid") return { isDisabled: true };
    return {};
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name !== "grid" || zone.pileIndex === undefined) return {};
    const index = zone.pileIndex;
    return {
      onPress: () => placeCard(index),
      isDisabled: game.ended || !legalCells.includes(index),
    };
  };

  const { cardMap } = useCardMap({
    game,
    zones,
    zoneMapper,
    cardMapper,
    cardSize: "small",
    gap: 0.12,
    fixedCols: GRID_SIZE,
    fixedRows: 6.2,
  });

  return (
    <GameWrapper
      ended={game.ended}
      won={game.won}
      reset={reset}
      isLoaded={isLoaded}
      score={game.score}
      winLoseMessage={
        game.won
          ? `You scored ${game.score} points!`
          : `You scored ${game.score}. Reach ${TARGET_SCORE} to win.`
      }
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}
    </GameWrapper>
  );
}
