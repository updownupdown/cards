import { useGameColors } from "@/hooks/useGameColors";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useStateManager } from "@/hooks/useStateManager";
import { flexStyles } from "@/styles/flexStyles";
import { rgba } from "@/styles/styles";
import { delay } from "@/utils/utils";
import { useMemo } from "react";
import { View } from "react-native";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import {
  createDeck,
  flipAllToBack,
  flipAllToFace,
  flipToFace,
  isRed as isRedSuit,
  shuffle,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { Text } from "../common/Text";

import { i18n } from "@/i18n";
import { cardTarget, makeHint } from "@/hints/hint";
import { useHint } from "@/hints/hint-store";

// Mosaic: a nonogram in cards. Twenty-five cards lie face down in a
// square. The clues beside each row and above each column give the runs
// of red cards in it, in order. Turn up every red card; a black one
// turned up is a slip, and three slips lose. Every deal has exactly one
// answer, so it can always be worked out.

type GameState = {
  stock: PlayingCard[];
  /** The square, row by row. */
  grid: PlayingCard[];
  slips: number;
};

export type MosaicGameState = GameState;

const SIZE = 5;
const SLIPS = 3;
const DEAL_ATTEMPTS = 400;

// —— Clues ———————————————————————————————————————————————————

function isRed(card: PlayingCard) {
  return isRedSuit(card.suit);
}

/** The runs of red in a line of cards, e.g. [2, 1]. */
function runs(line: boolean[]) {
  const result: number[] = [];
  let run = 0;
  for (const red of line) {
    if (red) run += 1;
    else if (run > 0) {
      result.push(run);
      run = 0;
    }
  }
  if (run > 0) result.push(run);
  return result;
}

function clues(grid: PlayingCard[]) {
  const reds = grid.map(isRed);
  return {
    rows: Array.from({ length: SIZE }, (_, row) =>
      runs(reds.slice(row * SIZE, row * SIZE + SIZE)),
    ),
    cols: Array.from({ length: SIZE }, (_, col) =>
      runs(Array.from({ length: SIZE }, (_, row) => reds[row * SIZE + col])),
    ),
  };
}

function sameRuns(a: number[], b: number[]) {
  return a.length === b.length && a.every((run, index) => run === b[index]);
}

/** Every line of five that has the given runs. */
function linesWithRuns(wanted: number[]) {
  const lines: boolean[][] = [];
  for (let bits = 0; bits < 1 << SIZE; bits += 1) {
    const line = Array.from(
      { length: SIZE },
      (_, index) => !!(bits & (1 << index)),
    );
    if (sameRuns(runs(line), wanted)) lines.push(line);
  }
  return lines;
}

/**
 * How many squares fit the clues, counting up to `limit`. Rows are tried
 * in turn, and columns checked as far as they're filled.
 */
function countSolutions(rowClues: number[][], colClues: number[][], limit = 2) {
  const options = rowClues.map(linesWithRuns);
  const square: boolean[][] = [];
  let found = 0;
  const colsFit = () => {
    for (let col = 0; col < SIZE; col += 1) {
      const line = square.map((row) => row[col]);
      const partial = runs(line);
      const wanted = colClues[col];
      // The runs so far must be a prefix of the clue; the last one may
      // still be growing if the line ends in red.
      if (partial.length > wanted.length) return false;
      for (let index = 0; index < partial.length; index += 1) {
        const last = index === partial.length - 1 && line[line.length - 1];
        if (
          last
            ? partial[index] > wanted[index]
            : partial[index] !== wanted[index]
        ) {
          return false;
        }
      }
      // What's left must still fit in the rows to come.
      const remaining = wanted.slice(partial.length);
      const lastGrowing = partial.length > 0 && line[line.length - 1];
      const need =
        remaining.reduce((sum, run) => sum + run, 0) +
        Math.max(0, remaining.length - 1) +
        (lastGrowing
          ? wanted[partial.length - 1] -
            partial[partial.length - 1] +
            (remaining.length > 0 ? 1 : 0)
          : 0);
      if (need > SIZE - line.length) return false;
    }
    return true;
  };
  const place = (row: number) => {
    if (found >= limit) return;
    if (row === SIZE) {
      found += 1;
      return;
    }
    for (const line of options[row]) {
      square.push(line);
      if (colsFit()) place(row + 1);
      square.pop();
      if (found >= limit) return;
    }
  };
  place(0);
  return found;
}

function hasOneSolution(grid: PlayingCard[]) {
  const { rows, cols } = clues(grid);
  return countSolutions(rows, cols) === 1;
}

// —— Moves ————————————————————————————————————————————————————

function allCards(state: GameState) {
  return [...state.stock, ...state.grid];
}

function gather(draft: GameState) {
  draft.stock = flipAllToBack(shuffle(allCards(draft)));
  draft.grid = [];
  draft.slips = 0;
}

/** Deals a square whose clues have one answer, trying until one turns up. */
function deal(draft: GameState, random: () => number = Math.random) {
  let cards = draft.stock;
  for (let attempt = 0; attempt < DEAL_ATTEMPTS; attempt += 1) {
    cards = shuffle(cards, random);
    const grid = cards.slice(0, SIZE * SIZE);
    const reds = grid.filter(isRed).length;
    if (reds < 6 || reds > 19) continue;
    if (hasOneSolution(grid)) break;
  }
  draft.grid = flipAllToBack(cards.slice(0, SIZE * SIZE));
  draft.stock = flipAllToBack(cards.slice(SIZE * SIZE));
  draft.slips = 0;
}

function turnUp(draft: GameState, cardId: string) {
  const index = draft.grid.findIndex((card) => card.id === cardId);
  if (index === -1 || draft.grid[index].faceUp) return;
  draft.grid[index] = flipToFace(draft.grid[index]);
  if (!isRed(draft.grid[index])) draft.slips += 1;
}

function isWon(state: GameState) {
  return (
    state.grid.length > 0 &&
    state.grid.every((card) => !isRed(card) || card.faceUp)
  );
}

function isLost(state: GameState) {
  return state.slips >= SLIPS;
}

/** Turns the rest up when the game ends. */
function reveal(draft: GameState) {
  draft.grid = flipAllToFace(draft.grid);
}

// —— Hints ————————————————————————————————————————————————————

/** A red card still face down: the first in reading order. */
function nextRed(state: GameState) {
  return state.grid.find((card) => isRed(card) && !card.faceUp) ?? null;
}

function findMosaicHint(state: GameState) {
  if (isWon(state) || isLost(state)) return null;
  const card = nextRed(state);
  return card ? makeHint("tapCard", cardTarget(card)) : null;
}

export const mosaicRules = {
  SIZE,
  SLIPS,
  runs,
  clues,
  countSolutions,
  hasOneSolution,
  gather,
  deal,
  turnUp,
  isWon,
  isLost,
  reveal,
  nextRed,
  findHint: findMosaicHint,
};

// —— Component ————————————————————————————————————————————————

const gameStateInitial: GameState = {
  stock: createDeck(),
  grid: [],
  slips: 0,
};

const CLUE_WIDTH = 1.1;
const CLUE_HEIGHT = 1;

export default function Mosaic() {
  const { spacing } = useResponsiveMetrics();
  const { colorPale } = useGameColors();

  const {
    isSettingUp,
    isLoaded,
    game,
    setGame,
    reset,
    undo,
    canUndo,
    clearUndoHistory,
  } = useStateManager<GameState>({
    gameStateInitial,
    resetAndSetup: async () => {
      setGame(gather);
      await delay();
      setGame((draft) => deal(draft));
    },
  });

  const won = !isSettingUp && isWon(game);
  const lost = !isSettingUp && !won && isLost(game);
  const ended = won || lost;
  const allUp = game.grid.every((card) => card.faceUp);

  useHint(() => findMosaicHint(game), {
    game,
    enabled: !isSettingUp && !ended,
  });

  const { rows, cols } = useMemo(() => clues(game.grid), [game.grid]);

  function onCardPress(cardId: string) {
    if (ended) return;
    // A card turned up can't be turned back: there's no undo.
    clearUndoHistory();
    setGame((draft) => {
      turnUp(draft, cardId);
      if (isWon(draft) || isLost(draft)) reveal(draft);
    });
  }

  const zones: MapZone[] = useMemo(() => {
    const cells: MapZone[] = game.grid.map((card, index) => ({
      id: `cell-${index}`,
      name: "cell",
      pileIndex: index,
      cards: [card],
      col: CLUE_WIDTH + (index % SIZE),
      row: CLUE_HEIGHT + Math.floor(index / SIZE),
      baseZIndex: 10,
    }));
    const rowClues: MapZone[] = Array.from({ length: SIZE }, (_, row) => ({
      id: `row-clue-${row}`,
      col: 0,
      row: CLUE_HEIGHT + row,
      width: CLUE_WIDTH,
      height: 1,
    }));
    const colClues: MapZone[] = Array.from({ length: SIZE }, (_, col) => ({
      id: `col-clue-${col}`,
      col: CLUE_WIDTH + col,
      row: 0,
      width: 1,
      height: CLUE_HEIGHT,
    }));
    return [
      ...cells,
      ...rowClues,
      ...colClues,
      {
        id: "hud",
        col: 0,
        row: CLUE_HEIGHT + SIZE + 0.15,
        width: CLUE_WIDTH + SIZE,
        height: 0.6,
      },
    ];
  }, [game.grid]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    const card = mappedCard.card;
    return {
      onPress: () => onCardPress(card.id),
      isDisabled: ended || card.faceUp,
    };
  };

  const { cardMap, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper,
    cardSize: "small",
    gap: 0.08,
  });

  const clueColor = rgba(colorPale, allUp ? 0.5 : 0.9);

  return (
    <GameWrapper
      outcome={won ? "won" : lost ? "lost" : "playing"}
      score={won ? SLIPS - game.slips : 0}
      winLoseMessage={
        won
          ? i18n.t("games:mosaic.won", { count: game.slips })
          : lost
            ? i18n.t("games:mosaic.lost", { count: SLIPS })
            : undefined
      }
      reset={reset}
      isLoaded={isLoaded}
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}

      {rows.map((clue, row) => (
        <View
          key={`row-${row}`}
          style={[
            getZoneStylesById(`row-clue-${row}`),
            flexStyles.rowCentered,
            {
              justifyContent: "flex-end",
              paddingRight: spacing(6),
              gap: spacing(5),
            },
          ]}
        >
          {(clue.length > 0 ? clue : [0]).map((run, index) => (
            <Text key={index} size="sm" weight={500} color={clueColor}>
              {run}
            </Text>
          ))}
        </View>
      ))}
      {cols.map((clue, col) => (
        <View
          key={`col-${col}`}
          style={[
            getZoneStylesById(`col-clue-${col}`),
            flexStyles.colCentered,
            { justifyContent: "flex-end", paddingBottom: spacing(4) },
          ]}
        >
          {(clue.length > 0 ? clue : [0]).map((run, index) => (
            <Text key={index} size="sm" weight={500} color={clueColor}>
              {run}
            </Text>
          ))}
        </View>
      ))}

      <View style={[getZoneStylesById("hud"), flexStyles.rowCentered]}>
        <Text size="xs" weight={300} color={rgba(colorPale, 0.7)}>
          {i18n.t("games:mosaic.slips", { slips: game.slips, total: SLIPS })}
        </Text>
      </View>
    </GameWrapper>
  );
}
