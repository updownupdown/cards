import { useGameLoading } from "@/hooks/useGameLoading";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Line } from "react-native-svg";
import { GameMenus } from "../common/GameMenus";
import { layoutStyles } from "@/styles/layoutStyles";
import { textStyles } from "@/styles/textStyles";
import { Deck } from "../Cards/Deck";
import {
  RANK_VALUE,
  SUITS,
  createDeck,
  shuffle,
  type PlayingCard,
} from "../Cards/card-utils";

import { Icon } from "@/icons";
import { flexStyles, transition02s } from "@/styles/flexStyles";
import { Colors, FontWeight, rgba } from "@/styles/styles";
import { cardStyles } from "@/styles/cardStyles";

// Shared color mapping for suit paths and icons
const SUIT_PATH_COLORS: Record<string, string> = {
  diamonds: Colors.accentGreen,
  hearts: Colors.accentBlue,
  spades: Colors.accentRed,
  clubs: Colors.favoriteStar,
};

type SkywayState = {
  grid: PlayingCard[][];
  deck: PlayingCard[];
  discard: PlayingCard[];
  market: PlayingCard[][];
  round: 1 | 2 | 3;
  finalTurnAfterPlacement: boolean;
  ended: boolean;
};

type ScoreBySuit = Record<(typeof SUITS)[number], number>;

const ADJACENT: number[][] = [
  [1, 3],
  [0, 2, 4],
  [1, 5],
  [0, 4, 6],
  [1, 3, 5, 7],
  [2, 4, 8],
  [3, 7],
  [4, 6, 8],
  [5, 7],
];

function isFace(card: PlayingCard) {
  return card.rank === "J" || card.rank === "Q" || card.rank === "K";
}

function initState(): SkywayState {
  const full = shuffle(createDeck({ faceUp: true }));
  const numbers = full.filter((card) => !isFace(card));

  const base: SkywayState = {
    grid: Array.from({ length: 9 }, () => []),
    deck: numbers,
    discard: [],
    market: [[], [], []],
    round: 1,
    finalTurnAfterPlacement: false,
    ended: false,
  };

  return prepareMarket(base);
}

function prepareMarket(prev: SkywayState): SkywayState {
  if (prev.ended) return prev;

  let deck = [...prev.deck];
  let discard = [...prev.discard];
  let round = prev.round;
  let finalTurnAfterPlacement = prev.finalTurnAfterPlacement;

  const market: PlayingCard[][] = [[], [], []];
  const wanted = [2, 2, 1];

  const drawOne = (): PlayingCard | null => {
    if (deck.length === 0) {
      if (discard.length === 0) return null;

      if (round < 3) {
        round = (round + 1) as 1 | 2 | 3;
        deck = shuffle(discard);
        discard = [];
      } else if (!finalTurnAfterPlacement) {
        deck = shuffle(discard);
        discard = [];
        finalTurnAfterPlacement = true;
      } else {
        return null;
      }
    }

    return deck.shift() ?? null;
  };

  for (let pileIndex = 0; pileIndex < 3; pileIndex += 1) {
    for (let i = 0; i < wanted[pileIndex]; i += 1) {
      const card = drawOne();
      if (!card) {
        return {
          ...prev,
          market,
          deck,
          discard,
          round,
          finalTurnAfterPlacement,
          ended: true,
        };
      }
      market[pileIndex].push(card);
    }
  }

  return {
    ...prev,
    market,
    deck,
    discard,
    round,
    finalTurnAfterPlacement,
  };
}

// Utility to find the actual longest path for a suit
function findLongestSuitPath(
  grid: PlayingCard[][],
  suit: (typeof SUITS)[number],
) {
  const valuesByCell = grid.map((stack) =>
    stack
      .filter((card) => card.suit === suit)
      .map((card) => RANK_VALUE[card.rank])
      .sort((a, b) => a - b),
  );

  const memo = new Map<string, { len: number; path: number[] }>();

  function dfs(
    cell: number,
    usedMask: number,
    currentValue: number,
    path: number[],
  ): { len: number; path: number[] } {
    const key = `${cell}|${usedMask}|${currentValue}`;
    if (memo.has(key)) return memo.get(key)!;
    let best = { len: 1, path: [...path, cell] };
    for (const nextCell of ADJACENT[cell]) {
      if ((usedMask & (1 << nextCell)) !== 0) continue;
      for (const nextValue of valuesByCell[nextCell]) {
        if (nextValue <= currentValue) continue;
        const candidate = dfs(nextCell, usedMask | (1 << nextCell), nextValue, [
          ...path,
          cell,
        ]);
        if (candidate.len + 1 > best.len)
          best = { len: candidate.len + 1, path: [...candidate.path] };
      }
    }
    memo.set(key, best);
    return best;
  }

  let globalBest: { len: number; path: number[] } = { len: 0, path: [] };
  valuesByCell.forEach((values, cellIndex) => {
    values.forEach((value) => {
      const res = dfs(cellIndex, 1 << cellIndex, value, []);
      if (res.len > globalBest.len) globalBest = res;
    });
  });
  return globalBest.path;
}

function computeScore(grid: PlayingCard[][]): ScoreBySuit {
  return {
    clubs: findLongestSuitPath(grid, "clubs").length,
    diamonds: findLongestSuitPath(grid, "diamonds").length,
    hearts: findLongestSuitPath(grid, "hearts").length,
    spades: findLongestSuitPath(grid, "spades").length,
  };
}

export default function Skyway() {
  const isLoaded = useGameLoading();

  const [game, setGame] = useState<SkywayState>(initState);
  const [selectedMarket, setSelectedMarket] = useState<number | null>(null);

  const score = useMemo(() => computeScore(game.grid), [game.grid]);
  const totalScore = score.clubs + score.diamonds + score.hearts + score.spades;
  const won = SUITS.every((suit) => score[suit] >= 5);

  function reset() {
    setSelectedMarket(null);
    setGame(initState());
  }

  function draftToCell(cellIndex: number) {
    if (selectedMarket === null || game.ended) return;

    setGame((prev) => {
      if (prev.ended) return prev;
      const drafted = prev.market[selectedMarket];
      if (!drafted || drafted.length === 0) return prev;

      const grid = prev.grid.map((stack) => [...stack]);
      const discard = [...prev.discard];

      const old = grid[cellIndex];
      const nextStack = [...old, ...drafted];

      while (nextStack.length > 3) {
        const removed = nextStack.shift();
        if (removed) discard.push(removed);
      }

      grid[cellIndex] = nextStack;

      prev.market.forEach((pile, i) => {
        if (i !== selectedMarket) {
          discard.push(...pile);
        }
      });

      const next = prepareMarket({
        ...prev,
        grid,
        discard,
        market: [[], [], []],
      });

      if (prev.finalTurnAfterPlacement) {
        return { ...next, ended: true };
      }

      return next;
    });

    setSelectedMarket(null);
  }

  // Find the actual cell-to-cell path for each suit
  const suitPaths = useMemo(() => {
    const paths: Record<string, number[]> = {};
    for (const suit of SUITS) {
      paths[suit] = findLongestSuitPath(game.grid, suit);
    }
    return paths;
  }, [game.grid]);

  // Map grid index to (x, y) center in SVG overlay
  function getCellCenter(
    idx: number,
    gridLayout: { x: number; y: number; width: number; height: number }[],
  ) {
    const { x, y, width, height } = gridLayout[idx];
    return { cx: x + width / 2, cy: y + height / 2 };
  }

  // State to store grid cell layouts
  const [gridLayout, setGridLayout] = useState<
    { x: number; y: number; width: number; height: number }[]
  >([]);

  return (
    <>
      <GameMenus
        ended={game.ended}
        won={won}
        reset={reset}
        isLoaded={isLoaded}
      />

      <View style={layoutStyles.gameArea}>
        <View
          style={[
            flexStyles.colCentered,
            flexStyles.fullWidth,
            flexStyles.gap12,
          ]}
        >
          <Text style={textStyles.default}>
            Market (Round {game.round} of 3)
          </Text>
          <View style={styles.marketRow}>
            {game.market.map((pile, index) => (
              <Pressable
                key={`market-${index}`}
                style={[
                  styles.marketPile,
                  selectedMarket === index ? styles.selectedPile : null,
                ]}
                onPress={() => setSelectedMarket(index)}
              >
                <Deck cards={pile} largeFan="all" cardsPerRow={5} />
              </Pressable>
            ))}
          </View>
        </View>

        <View style={[flexStyles.colCentered, flexStyles.fullWidth]}>
          <View style={styles.grid}>
            {/* SVG overlay for suit paths */}
            {gridLayout.length === 9 && (
              <Svg
                style={{
                  position: "absolute",
                  zIndex: 1,
                  left: 0,
                  top: 0,
                  width: "100%",
                  height: "100%",
                  pointerEvents: "none",
                }}
              >
                {SUITS.map((suit, suitIdx) => {
                  const color = SUIT_PATH_COLORS[suit];
                  const path = suitPaths[suit];
                  // Draw lines between consecutive cells in the path
                  return path.length > 1
                    ? path.slice(1).map((cell, i) => {
                        const prev = path[i];
                        // Offset lines for multiple suits between same cells
                        const offset = (suitIdx - 1.5) * 6; // space out lines
                        const { cx: x1, cy: y1 } = getCellCenter(
                          prev,
                          gridLayout,
                        );
                        const { cx: x2, cy: y2 } = getCellCenter(
                          cell,
                          gridLayout,
                        );
                        // Perpendicular offset
                        const dx = y2 - y1;
                        const dy = x1 - x2;
                        const mag = Math.sqrt(dx * dx + dy * dy) || 1;
                        const ox = (dx / mag) * offset;
                        const oy = (dy / mag) * offset;
                        return (
                          <Line
                            key={`${suit}-${prev}-${cell}`}
                            x1={x1 + ox}
                            y1={y1 + oy}
                            x2={x2 + ox}
                            y2={y2 + oy}
                            stroke={color}
                            strokeWidth={3}
                            strokeLinecap="round"
                          />
                        );
                      })
                    : null;
                })}
              </Svg>
            )}
            {/* Render grid cells and capture layout */}
            {game.grid.map((stack, index) => (
              <Pressable
                key={`cell-${index}`}
                style={[
                  styles.gridCell,
                  selectedMarket !== null ? styles.dropReady : null,
                  {
                    position: "relative",
                    zIndex: 2,
                  },
                ]}
                onPress={() => draftToCell(index)}
                onLayout={(e) => {
                  setGridLayout((prev) => {
                    const next = [...prev];
                    next[index] = e.nativeEvent.layout;
                    return next.length === 9
                      ? next
                      : Array(9)
                          .fill({ x: 0, y: 0, width: 0, height: 0 })
                          .map((v, i) => next[i] || v);
                  });
                }}
              >
                <Deck cards={stack} cardsPerRow={5} largeFan="all" />
                {stack.length === 0 ? (
                  <Text style={styles.cellHint}>Empty</Text>
                ) : null}
              </Pressable>
            ))}
          </View>
        </View>

        <View
          style={[
            flexStyles.colCentered,
            flexStyles.fullWidth,
            flexStyles.gap12,
          ]}
        >
          <Text style={textStyles.default}>
            Longest paths - total score: {totalScore}
          </Text>
          <View
            style={[
              flexStyles.rowCentered,
              flexStyles.fullWidth,
              flexStyles.justifyEvenly,
            ]}
          >
            {SUITS.map((suit) => (
              <View
                key={suit}
                style={[flexStyles.rowCentered, flexStyles.gap8]}
              >
                <Icon name={suit} color={SUIT_PATH_COLORS[suit]} size={32} />
                <Text
                  style={[
                    textStyles.default,
                    { color: SUIT_PATH_COLORS[suit] },
                  ]}
                >
                  {score[suit]}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {game.ended ? (
          <View style={styles.resultBox}>
            <Text style={styles.resultTitle}>
              {won ? "You won!" : "Game over"}
            </Text>
            <Text style={textStyles.default}>
              {won
                ? "All four suits reached at least a 5-card increasing path."
                : "You need at least 5 cards for each suit path to win."}
            </Text>
          </View>
        ) : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 56,
    paddingHorizontal: 10,
    paddingBottom: 24,
    gap: 10,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontFamily: FontWeight[400],
    color: Colors.K800,
  },
  section: {
    gap: 8,
  },
  marketRow: {
    ...flexStyles.rowCentered,
    ...flexStyles.fullWidth,
    ...flexStyles.gap20,
  },
  marketPile: {
    ...flexStyles.rowCentered,
    ...transition02s,
    flex: 1,
    minHeight: 120,
    borderRadius: 12,
    backgroundColor: rgba(Colors.K100, 0.1),
    boxShadow: `inset 0 0 0 2px ${rgba(Colors.accentBlue, 0.3)}`,
    padding: 6,
    alignItems: "center",
  },
  selectedPile: {
    boxShadow: `inset 0 0 0 5px ${rgba(Colors.accentBlue, 1)}`,
    backgroundColor: rgba(Colors.accentBlue, 0.1),
  },
  grid: {
    ...flexStyles.rowCentered,
    ...flexStyles.fullWidth,
    flexWrap: "wrap",
    gap: 8,
  },
  gridCell: {
    ...transition02s,
    width: "31%",
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: rgba(Colors.K100, 0.2),
    backgroundColor: rgba(Colors.K100, 0.1),
    position: "relative",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  dropReady: {
    boxShadow: `inset 0 0 0 2px ${rgba(Colors.accentBlue, 0.3)}`,
  },
  cellHint: {
    color: Colors.K400,
    fontSize: 11,
  },
  resultBox: {
    marginTop: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.K400,
    backgroundColor: Colors.K800,
    padding: 10,
    gap: 4,
  },
  resultTitle: {
    fontFamily: FontWeight[400],
    color: Colors.accentBlue,
  },
});
