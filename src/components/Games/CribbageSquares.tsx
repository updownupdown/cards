import { useFade } from "@/hooks/useFade";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useStateManager } from "@/hooks/useStateManager";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, rgba } from "@/styles/styles";
import { delay } from "@/utils/utils";
import { useMemo } from "react";
import { Animated } from "react-native";
import { Button } from "../Button/Button";
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
import { useGameColors } from "@/hooks/useGameColors";

import { i18n } from "@/i18n";
import { useHint } from "@/hints/hint-store";
import { makeHint, pressHint, withNote, zoneTarget } from "@/hints/hint";
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
  isTransitioning: boolean;
  ended: boolean;
  won: boolean;
};

export type CribbageSquaresGameState = GameState;

const gameStateInitial: GameState = {
  grid: Array.from({ length: GRID_CELLS }, () => null),
  stock: [],
  current: null,
  starter: null,
  score: 0,
  scoresReady: false,
  isTransitioning: false,
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

function gatherCards(state: GameState) {
  const cards = [
    ...state.grid.filter((card): card is PlayingCard => card !== null),
    ...state.stock,
    ...(state.current ? [state.current] : []),
    ...(state.starter ? [state.starter] : []),
  ];
  return shuffle((cards.length === 52 ? cards : createDeck()).map(flipToBack));
}

// —— Hints ——

type LineAim = "fifteens" | "pairs" | "runs" | "flush";

// What a flush in the making is worth, by cards of one suit so far.
const FLUSH_ODDS = [0, 0, 1, 2, 4];

function lineCells(index: number) {
  return index < GRID_SIZE
    ? Array.from({ length: GRID_SIZE }, (_, col) => index * GRID_SIZE + col)
    : Array.from(
        { length: GRID_SIZE },
        (_, row) => row * GRID_SIZE + (index - GRID_SIZE),
      );
}

/**
 * What a row or column's cards are worth so far, the starter still to come:
 * the fifteens, pairs and runs they make, a flush in the making, and ranks
 * one apart that a run may join.
 */
function lineParts(cards: PlayingCard[]): Record<LineAim, number> {
  const ranks = [...new Set(cards.map((card) => rankValue(card)))];
  const neighbours = ranks.filter((rank) => ranks.includes(rank + 1)).length;
  // Sets of cards that the starter (still face down) may make fifteen with:
  // by the share of the deck that has the value missing.
  let starterFifteens = 0;
  for (let mask = 1; mask < 1 << cards.length; mask += 1) {
    let total = 0;
    cards.forEach((card, index) => {
      if (mask & (1 << index)) total += cribbageValue(card);
    });
    const missing = 15 - total;
    if (missing >= 1 && missing <= 10) {
      starterFifteens += (2 * (missing === 10 ? 16 : 4)) / 52;
    }
  }
  return {
    fifteens: countFifteens(cards) + starterFifteens,
    pairs: countPairs(cards),
    runs: countRuns(cards) + neighbours * 0.5,
    flush:
      cards.length > 0 && cards.every((card) => card.suit === cards[0].suit)
        ? FLUSH_ODDS[cards.length]
        : 0,
  };
}

function lineValue(cards: PlayingCard[]) {
  const parts = lineParts(cards);
  return parts.fifteens + parts.pairs + parts.runs + parts.flush;
}

function lineCards(grid: (PlayingCard | null)[], line: number) {
  return lineCells(line).flatMap((cell) => (grid[cell] ? [grid[cell]!] : []));
}

function gridValue(grid: (PlayingCard | null)[]) {
  let total = 0;
  for (let line = 0; line < GRID_SIZE * 2; line += 1) {
    total += lineValue(lineCards(grid, line));
  }
  return total;
}

/**
 * The legal space where the grid gains most; the note names what the card
 * mostly adds (fifteens, pairs, a run or a flush) where it adds anything.
 */
function bestPlacement(state: GameState) {
  const card = state.current;
  if (!card) return null;
  let best: { cell: number; value: number } | null = null;
  for (const cell of getLegalCells(state.grid)) {
    const grid = [...state.grid];
    grid[cell] = card;
    const value = gridValue(grid);
    if (!best || value > best.value) best = { cell, value };
  }
  if (!best) return null;
  const { cell } = best as { cell: number; value: number };
  const gains: Record<LineAim, number> = {
    fifteens: 0,
    pairs: 0,
    runs: 0,
    flush: 0,
  };
  for (const line of [
    Math.floor(cell / GRID_SIZE),
    GRID_SIZE + (cell % GRID_SIZE),
  ]) {
    const before = lineParts(lineCards(state.grid, line));
    const after = lineParts([...lineCards(state.grid, line), card]);
    (Object.keys(gains) as LineAim[]).forEach((aim) => {
      gains[aim] += after[aim] - before[aim];
    });
  }
  const [aim, gain] = (Object.entries(gains) as [LineAim, number][]).reduce(
    (top, entry) => (entry[1] > top[1] ? entry : top),
  );
  return { cell, aim: gain >= 1 ? aim : null };
}

function findCribbageSquaresHint(state: GameState) {
  if (state.ended || state.isTransitioning) return null;
  if (state.scoresReady) return pressHint("end-game", i18n.t("cards:endGame"));
  const placement = bestPlacement(state);
  if (!placement) return null;
  const hint = makeHint("moveCard", zoneTarget(`grid-${placement.cell}`));
  return placement.aim
    ? withNote(hint, i18n.t(`games:cribbageSquares.hint.${placement.aim}`))
    : hint;
}

export const cribbageSquaresRules = {
  findHint: findCribbageSquaresHint,
  bestPlacement,
  countFifteens,
  countPairs,
  countRuns,
  scoreHand,
  scoreDeal,
  getLineScores,
  getLegalCells,
  gatherCards,
  gridSize: GRID_SIZE,
  targetScore: TARGET_SCORE,
};

async function resetAndSetup(
  setGame: (updater: (draft: GameState) => void) => void,
) {
  setGame((draft) => {
    draft.stock = gatherCards(draft);
    draft.grid = Array.from({ length: GRID_CELLS }, () => null);
    draft.current = null;
    draft.starter = null;
    draft.score = 0;
    draft.scoresReady = false;
    draft.isTransitioning = true;
    draft.ended = false;
    draft.won = false;
  });

  await delay();

  setGame((draft) => {
    const next = draft.stock.pop();
    draft.current = next ? flipToFace(next) : null;
    draft.isTransitioning = false;
  });
}

export default function CribbageSquares() {
  const { colorPale } = useGameColors();
  const { spacing } = useResponsiveMetrics();
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
  const scoreFade = useFade(game.scoresReady, 1000);

  useHint(() => findCribbageSquaresHint(game), { game });

  function placeCard(index: number) {
    if (
      game.ended ||
      game.isTransitioning ||
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
      rowOffset: 1.2,
    }).map((position, index) => ({
      id: `grid-${index}`,
      name: "grid",
      pileIndex: index,
      cards: game.grid[index] ? [game.grid[index]!] : [],
      col: position.c + 1,
      row: position.r + 1,
      baseZIndex: 10,
      placeholder: {},
    }));

    const current = game.current;
    const starter = game.starter;

    return [
      {
        id: "current",
        name: "current",
        cards: current ? [...game.stock, current] : game.stock,
        col: 0,
        row: 0,
        baseZIndex: 40,
        placeholder: { text: i18n.t("cards:stock"), infoPos: "right" },
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
        col: 0,
        row: row + 2.2,
        baseZIndex: 10,
        placeholder: {
          hideBackground: !lineScores,
          hideShadow: !lineScores,
        },
      })),
      ...Array.from({ length: GRID_SIZE }, (_, col) => ({
        id: `column-score-${col}`,
        name: "column-score",
        col: col + 1,
        row: 1.2,
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
        col: 0,
        row: 1.2,
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
      isDisabled:
        game.ended || game.isTransitioning || !legalCells.includes(index),
    };
  };

  const { cardMap, getZoneStylesById } = useCardMap({
    game,
    zones,
    zoneMapper,
    cardMapper,
    cardSize: "small",
    gap: 0.12,
  });

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      reset={reset}
      isLoaded={isLoaded}
      score={game.score}
      winLoseMessage={
        game.won
          ? i18n.t("games:cribbageSquares.youScoredPoints", {
              score: game.score,
            })
          : i18n.t("games:cribbageSquares.youScoredReachToWin", {
              score: game.score,
              TARGET_SCORE,
            })
      }
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}

      {scoreFade.isRendered && (
        <Animated.View
          style={[
            flexStyles.colCentered,
            flexStyles.fullWidth,
            getZoneStylesById("end-game"),
            { gap: spacing(10), opacity: scoreFade.opacity },
          ]}
        >
          <Text size="lg" weight={500} color={colorPale}>
            {i18n.t("cards:scorePts", { score: game.score })}
          </Text>
          <Button
            text={i18n.t("cards:endGame")}
            onPress={endGame}
            size="sm"
            fullWidth
            theme={Colors.buttonRed}
          />
        </Animated.View>
      )}

      {scoreFade.isRendered &&
        scoreLabels.map(({ id, score }) => (
          <Animated.View
            key={id}
            style={[
              getZoneStylesById(id),
              {
                alignItems: "center",
                justifyContent: "center",
                zIndex: 20,
                opacity: scoreFade.opacity,
              },
            ]}
          >
            <Text
              size="xxxl"
              weight={500}
              color={rgba(colorPale, score > 0 ? 1 : 0.3)}
            >
              {score}
            </Text>
          </Animated.View>
        ))}
    </GameWrapper>
  );
}
