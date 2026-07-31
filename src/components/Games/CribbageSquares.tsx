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
import { Text } from "../common/Text";
import { View } from "react-native";
import { Button } from "../Button/Button";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, rgba } from "@/styles/styles";

const GRID_SIZE = 4;
const GRID_CELLS = GRID_SIZE * GRID_SIZE;
const TARGET_SCORE = 61;

type GameState = {
  grid: (PlayingCard | null)[];
  stock: PlayingCard[];
  current: PlayingCard | null;
  starter: PlayingCard | null;
  score: number;
  scoresReady: boolean;
  ended: boolean;
  won: boolean;
};

const gameStateInitial: GameState = {
  grid: Array.from({ length: GRID_CELLS }, () => null),
  stock: [],
  current: null,
  starter: null,
  score: 0,
  scoresReady: false,
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

function getLineScores(grid: (PlayingCard | null)[], starter: PlayingCard) {
  const rows = Array.from({ length: GRID_SIZE }, (_, row) =>
    scoreHand(
      grid.slice(row * GRID_SIZE, (row + 1) * GRID_SIZE) as PlayingCard[],
      starter,
    ),
  );
  const columns = Array.from({ length: GRID_SIZE }, (_, col) => {
    const line = Array.from({ length: GRID_SIZE }, (_, row) => {
      return grid[row * GRID_SIZE + col]!;
    });
    return scoreHand(line, starter);
  });

  return { rows, columns };
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
    ).slice(0, GRID_CELLS + 1);
    draft.grid = Array.from({ length: GRID_CELLS }, () => null);
    draft.current = null;
    draft.starter = null;
    draft.score = 0;
    draft.scoresReady = false;
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
  const lineScores = useMemo(
    () => (game.starter ? getLineScores(game.grid, game.starter) : null),
    [game.grid, game.starter],
  );
  const scoreLabels = useMemo(
    () =>
      lineScores
        ? [
            ...lineScores.rows.map((score, index) => ({
              id: `row-score-${index}`,
              score,
            })),
            ...lineScores.columns.map((score, index) => ({
              id: `column-score-${index}`,
              score,
            })),
          ]
        : [],
    [lineScores],
  );

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
        draft.scoresReady = true;
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

    const current = game.current;
    const starter = game.starter;

    return [
      {
        id: "current",
        name: "current",
        cards: current ? [...game.stock, current] : [],
        col: 0,
        row: 0,
        baseZIndex: 40,
        placeholder: { text: "Deal", infoPos: "right" },
        fan: { maxVisible: 3 },
      },
      {
        id: "end-game",
        name: "end-game",
        col: 1.75,
        row: 0,
        width: 3.25,
        baseZIndex: 40,
      },
      ...gridZones,
      ...Array.from({ length: GRID_SIZE }, (_, row) => ({
        id: `row-score-${row}`,
        name: "row-score",
        col: GRID_SIZE,
        row: row + 1.45,
        baseZIndex: 10,
        placeholder: {
          hideBackground: !lineScores,
          hideShadow: !lineScores,
        },
      })),
      ...Array.from({ length: GRID_SIZE }, (_, col) => ({
        id: `column-score-${col}`,
        name: "column-score",
        col,
        row: GRID_SIZE + 1.45,
        baseZIndex: 10,
        placeholder: {
          hideBackground: !lineScores,
          hideShadow: !lineScores,
        },
      })),
      {
        id: "starter",
        name: "starter",
        cards: starter ? [starter] : [],
        col: GRID_SIZE,
        row: GRID_SIZE + 1.45,
        baseZIndex: 10,
        placeholder: { hideBackground: !starter, hideShadow: !starter },
      },
    ];
  }, [game, lineScores]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (mappedCard.zoneName === "grid") return { isDisabled: true };
    return {};
  };

  function endGame() {
    if (!game.scoresReady) return;
    setGame((draft) => {
      draft.ended = true;
      draft.won = draft.score >= TARGET_SCORE;
    });
  }

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name !== "grid" || zone.pileIndex === undefined) return {};
    const index = zone.pileIndex;
    return {
      onPress: () => placeCard(index),
      isDisabled: game.ended || !legalCells.includes(index),
    };
  };

  const { cardMap, getZoneStylesById } = useCardMap({
    game,
    zones,
    zoneMapper,
    cardMapper,
    cardSize: "small",
    gap: 0.12,
    fixedCols: GRID_SIZE + 1,
    fixedRows: 7.2,
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

      {game.scoresReady && (
        <View
          style={[
            flexStyles.colCentered,
            flexStyles.fullWidth,
            getZoneStylesById("end-game"),
          ]}
        >
          <Button
            text={`End Game (${game.score} pts)`}
            onPress={endGame}
            size="md"
            taller
            lineHeight={1.1}
            fullWidth
          />
        </View>
      )}

      {game.scoresReady &&
        scoreLabels.map(({ id, score }) => (
          <View
            key={id}
            pointerEvents="none"
            style={[
              getZoneStylesById(id),
              {
                alignItems: "center",
                justifyContent: "center",
                zIndex: 20,
              },
            ]}
          >
            <Text
              size="xxxl"
              weight={500}
              color={rgba(Colors.white, score > 0 ? 1 : 0.3)}
            >
              {score}
            </Text>
          </View>
        ))}
    </GameWrapper>
  );
}
