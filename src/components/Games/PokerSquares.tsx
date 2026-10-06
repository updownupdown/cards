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
  top,
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
const GRID_SIZE = 5;
const TARGET_SCORE = 200;

const AMERICAN_POINTS = [0, 2, 5, 10, 15, 20, 25, 50, 75, 100];

type GameState = {
  deck: PlayingCard[];
  grid: (PlayingCard | null)[];
  score: number;
  scoresReady: boolean;
  isTransitioning: boolean;
  ended: boolean;
  won: boolean;
};

export type PokerSquaresGameState = GameState;

const gameStateInitial: GameState = {
  deck: [],
  grid: Array.from({ length: GRID_SIZE * GRID_SIZE }, () => null),
  score: 0,
  scoresReady: false,
  isTransitioning: false,
  ended: false,
  won: false,
};

function cardValue(card: PlayingCard) {
  return rankValue(card, 14);
}

function handCategory(hand: PlayingCard[]) {
  if (hand.length !== GRID_SIZE) return 0;

  const values = hand.map(cardValue).sort((a, b) => b - a);
  const uniqueValues = [...new Set(values)];
  const isFlush = hand.every((card) => card.suit === hand[0].suit);
  const isWheel =
    uniqueValues.length === 5 &&
    uniqueValues[0] === 14 &&
    uniqueValues[1] === 5 &&
    uniqueValues[2] === 4 &&
    uniqueValues[3] === 3 &&
    uniqueValues[4] === 2;
  const isStraight =
    uniqueValues.length === 5 && (values[0] - values[4] === 4 || isWheel);
  const counts = Object.values(
    values.reduce<Record<number, number>>((result, value) => {
      result[value] = (result[value] ?? 0) + 1;
      return result;
    }, {}),
  ).sort((a, b) => b - a);

  if (isFlush && isStraight) {
    return values[0] === 14 && !isWheel ? 9 : 8;
  }
  if (counts[0] === 4) return 7;
  if (counts[0] === 3 && counts[1] === 2) return 6;
  if (isFlush) return 5;
  if (isStraight) return 4;
  if (counts[0] === 3) return 3;
  if (counts[0] === 2 && counts[1] === 2) return 2;
  if (counts[0] === 2) return 1;
  return 0;
}

function handCategoryName(category: number) {
  return [
    i18n.t("games:pokerSquares.noHand"),
    i18n.t("games:pocketPoker.hands.onePair"),
    i18n.t("games:pocketPoker.hands.twoPair"),
    "x3",
    i18n.t("games:pocketPoker.hands.straight"),
    i18n.t("games:pocketPoker.hands.flush"),
    i18n.t("games:pocketPoker.hands.fullHouse"),
    "x4",
    i18n.t("games:pocketPoker.hands.straightFlush"),
    i18n.t("cards:royalFlush"),
  ][category];
}

type LineScore = {
  category: number;
  score: number;
};

function getLineScores(grid: (PlayingCard | null)[]) {
  const scoreHand = (hand: (PlayingCard | null)[]): LineScore => {
    const category = handCategory(
      hand.filter((card): card is PlayingCard => card !== null),
    );
    return { category, score: AMERICAN_POINTS[category] };
  };

  const rows = Array.from({ length: GRID_SIZE }, (_, row) =>
    scoreHand(grid.slice(row * GRID_SIZE, (row + 1) * GRID_SIZE)),
  );
  const columns = Array.from({ length: GRID_SIZE }, (_, col) =>
    scoreHand(
      Array.from(
        { length: GRID_SIZE },
        (_, row) => grid[row * GRID_SIZE + col],
      ),
    ),
  );

  return { rows, columns };
}

function scoreGrid(grid: (PlayingCard | null)[]) {
  const lineScores = getLineScores(grid);
  return [...lineScores.rows, ...lineScores.columns].reduce(
    (total, line) => total + line.score,
    0,
  );
}

function revealDeckTop(deck: PlayingCard[]) {
  const topIndex = deck.length - 1;
  const card = deck[topIndex];
  if (card) deck[topIndex] = flipToFace(card);
}

function gatherCards(state: GameState) {
  const cards = [
    ...state.grid.filter((card): card is PlayingCard => card !== null),
    ...state.deck,
  ];
  return shuffle((cards.length === 52 ? cards : createDeck()).map(flipToBack));
}

function placeCardOnGrid(state: GameState, index: number) {
  if (
    state.ended ||
    state.isTransitioning ||
    state.grid[index] ||
    !top(state.deck)
  ) {
    return false;
  }

  const card = state.deck.pop();
  if (!card || state.grid[index]) return false;

  state.grid[index] = flipToFace(card);
  revealDeckTop(state.deck);
  if (state.grid.every((cell) => cell !== null)) {
    state.score = scoreGrid(state.grid);
    state.scoresReady = true;
  }
  return true;
}

// —— Hints ——

type LineAim = "sets" | "flush" | "straight";

// How much of a flush or straight a line with this many cards is worth:
// the further along, the likelier it gets there.
const FLUSH_ODDS = [0, 0.175, 0.25, 0.35, 0.5];
const STRAIGHT_ODDS = [0, 0.1, 0.15, 0.3, 0.5];

function lineCells(index: number) {
  return index < GRID_SIZE
    ? Array.from({ length: GRID_SIZE }, (_, col) => index * GRID_SIZE + col)
    : Array.from(
        { length: GRID_SIZE },
        (_, row) => row * GRID_SIZE + (index - GRID_SIZE),
      );
}

/**
 * What a row or column is worth so far: a full line its points; a partial
 * one the hand its ranks make, or what its flush or straight draw may come
 * to. Returns the value and what the line is best aiming for.
 */
function lineValue(cards: PlayingCard[]): { value: number; aim: LineAim } {
  if (cards.length === GRID_SIZE) {
    return { value: AMERICAN_POINTS[handCategory(cards)], aim: "sets" };
  }
  if (cards.length === 0) return { value: 0, aim: "sets" };
  const counts = Object.values(
    cards.reduce<Record<string, number>>((result, card) => {
      result[card.rank] = (result[card.rank] ?? 0) + 1;
      return result;
    }, {}),
  ).sort((a, b) => b - a);
  const free = GRID_SIZE - cards.length;
  const setsCategory =
    counts[0] === 4
      ? 7
      : counts[0] === 3 && counts[1] === 2
        ? 6
        : counts[0] === 3
          ? 3
          : counts[0] === 2 && counts[1] === 2
            ? 2
            : counts[0] === 2
              ? 1
              : 0;
  // Room left to improve a set is worth something too.
  const sets =
    AMERICAN_POINTS[setsCategory] + (setsCategory > 0 ? free * 3 : 0);

  const flush = cards.every((card) => card.suit === cards[0].suit)
    ? 20 * FLUSH_ODDS[cards.length]
    : 0;

  const values = cards.map(cardValue);
  const lowValues = values.map((v) => (v === 14 ? 1 : v));
  const distinct = new Set(values).size === values.length;
  const spans = [values, lowValues].map(
    (vs) => Math.max(...vs) - Math.min(...vs),
  );
  const straight =
    distinct && Math.min(...spans) < GRID_SIZE
      ? 15 * STRAIGHT_ODDS[cards.length]
      : 0;

  const best = Math.max(sets, flush, straight);
  return {
    value: best,
    aim:
      best === flush && flush > 0
        ? "flush"
        : best === straight && straight > 0
          ? "straight"
          : "sets",
  };
}

function gridValue(grid: (PlayingCard | null)[]) {
  let total = 0;
  for (let line = 0; line < GRID_SIZE * 2; line += 1) {
    total += lineValue(
      lineCells(line).flatMap((cell) => (grid[cell] ? [grid[cell]!] : [])),
    ).value;
  }
  return total;
}

/**
 * Places the card where the grid gains most, scoring partial rows and
 * columns by the hands they're building. The note says what the card is
 * for: the line that gains most, and what it aims at.
 */
function bestPlacement(state: GameState) {
  const card = top(state.deck);
  if (!card) return null;
  const before = gridValue(state.grid);
  let best: { cell: number; value: number } | null = null;
  state.grid.forEach((placed, cell) => {
    if (placed) return;
    const grid = [...state.grid];
    grid[cell] = card;
    const value = gridValue(grid) - before;
    if (!best || value > best.value) best = { cell, value };
  });
  if (!best) return null;
  const { cell, value } = best as { cell: number; value: number };
  const lines = [Math.floor(cell / GRID_SIZE), GRID_SIZE + (cell % GRID_SIZE)];
  const gains = lines.map((line) => {
    const cells = lineCells(line);
    const without = cells.flatMap((c) =>
      state.grid[c] ? [state.grid[c]!] : [],
    );
    return {
      gain: lineValue([...without, card]).value - lineValue(without).value,
      aim: lineValue([...without, card]).aim,
    };
  });
  const main = gains[0].gain >= gains[1].gain ? gains[0] : gains[1];
  return {
    cell,
    aim: value <= 0 || main.gain <= 0 ? ("park" as const) : main.aim,
  };
}

function findPokerSquaresHint(state: GameState) {
  if (state.ended || state.isTransitioning) return null;
  if (state.scoresReady) return pressHint("end-game", i18n.t("cards:endGame"));
  const placement = bestPlacement(state);
  if (!placement) return null;
  return withNote(
    makeHint("moveCard", zoneTarget(`grid-${placement.cell}`)),
    i18n.t(`games:pokerSquares.hint.${placement.aim}`),
  );
}

export const pokerSquaresRules = {
  findHint: findPokerSquaresHint,
  bestPlacement,
  cardValue,
  handCategory,
  handCategoryName,
  getLineScores,
  scoreGrid,
  gatherCards,
  revealDeckTop,
  placeCard: placeCardOnGrid,
  gridSize: GRID_SIZE,
  targetScore: TARGET_SCORE,
  americanPoints: AMERICAN_POINTS,
};

async function resetAndSetup(
  setGame: (updater: (draft: GameState) => void) => void,
) {
  setGame((draft) => {
    draft.deck = gatherCards(draft);
    draft.grid = Array.from({ length: GRID_SIZE * GRID_SIZE }, () => null);
    draft.score = 0;
    draft.scoresReady = false;
    draft.isTransitioning = true;
    draft.ended = false;
    draft.won = false;
  });

  await delay();

  setGame((draft) => {
    revealDeckTop(draft.deck);
    draft.isTransitioning = false;
  });
}

export default function PokerSquares() {
  const { colorPale } = useGameColors();
  const { spacing } = useResponsiveMetrics();
  const { isLoaded, game, setGame, undo, canUndo, saveUndoState, reset } =
    useStateManager({
      resetAndSetup: async () => {
        await resetAndSetup(setGame);
      },
      gameStateInitial,
    });

  const lineScores = useMemo(
    () => (game.scoresReady ? getLineScores(game.grid) : null),
    [game.grid, game.scoresReady],
  );
  const scoreLabels = useMemo(
    () =>
      lineScores
        ? [
            ...lineScores.rows.map((line, index) => ({
              id: `row-score-${index}`,
              line,
            })),
            ...lineScores.columns.map((line, index) => ({
              id: `column-score-${index}`,
              line,
            })),
          ]
        : [],
    [lineScores],
  );
  const scoreFade = useFade(game.scoresReady, 1000);

  useHint(() => findPokerSquaresHint(game), { game });

  function placeCard(index: number) {
    if (
      game.ended ||
      game.isTransitioning ||
      game.grid[index] ||
      !top(game.deck)
    ) {
      return;
    }

    saveUndoState(structuredClone(game));
    setGame((draft) => {
      placeCardOnGrid(draft, index);
    });
  }

  const zones: MapZone[] = useMemo(() => {
    const gridZones = getGridColRows({
      cols: GRID_SIZE,
      rows: GRID_SIZE,
      rowOffset: 1.3,
    }).map((position, index) => ({
      id: `grid-${index}`,
      name: "grid",
      pileIndex: index,
      cards: game.grid[index] ? [game.grid[index]!] : undefined,
      col: position.c + 1,
      row: position.r + 1,
      baseZIndex: 10,
      placeholder: {},
    }));

    return [
      {
        id: "deck",
        name: "deck",
        cards: game.deck,
        col: 0,
        row: 0,
        fan: { maxVisible: 3 },
        baseZIndex: 50,
        placeholder: { text: i18n.t("cards:stock"), infoPos: "right" },
      },
      {
        id: "end-game",
        name: "end-game",
        col: 2,
        row: 0,
        width: GRID_SIZE - 1,
        baseZIndex: 40,
      },
      ...Array.from({ length: GRID_SIZE }, (_, row) => ({
        id: `row-score-${row}`,
        name: "row-score",
        col: 0,
        row: row + 1 + 1.3,
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
        row: 1.3,
        baseZIndex: 10,
        placeholder: {
          hideBackground: !lineScores,
          hideShadow: !lineScores,
        },
      })),
      ...gridZones,
    ];
  }, [game, lineScores]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (mappedCard.zoneName === "grid") {
      return {
        isDisabled: game.ended,
      };
    }
    return {};
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name === "grid" && zone.pileIndex !== undefined) {
      const index = zone.pileIndex;
      const isEmpty = game.grid[index] === null;
      return {
        onPress: () => placeCard(index),
        isDisabled:
          game.ended || game.isTransitioning || !isEmpty || !top(game.deck),
      };
    }
    return {};
  };

  function endGame() {
    if (!game.scoresReady) return;
    setGame((draft) => {
      draft.ended = true;
      draft.won = draft.score >= TARGET_SCORE;
    });
  }

  const { cardMap, getZoneStylesById } = useCardMap({
    game,
    zones,
    zoneMapper,
    cardMapper,
    cardSize: "small",
    gap: 0.1,
  });

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      score={game.score}
      reset={reset}
      isLoaded={isLoaded}
      winLoseMessage={
        game.won
          ? i18n.t("games:pokerSquares.greatHandYouScored", {
              score: game.score,
            })
          : i18n.t("games:pokerSquares.youScoredTryForNext", {
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
        scoreLabels.map(({ id, line }) => (
          <Animated.View
            key={id}
            style={[
              getZoneStylesById(id),
              flexStyles.colCentered,
              {
                padding: spacing(8),
                gap: spacing(2),
                opacity: scoreFade.opacity,
              },
            ]}
          >
            <Text
              size="xxs"
              weight={400}
              color={rgba(Colors.white, line.score > 0 ? 1 : 0.5)}
              lineHeight={1}
              style={{ textAlign: "center" }}
            >
              {handCategoryName(line.category)}
            </Text>
            <Text
              size="xxl"
              weight={500}
              color={rgba(colorPale, line.score > 0 ? 1 : 0.3)}
              style={{ textAlign: "center" }}
            >
              {line.score}
            </Text>
          </Animated.View>
        ))}
    </GameWrapper>
  );
}
