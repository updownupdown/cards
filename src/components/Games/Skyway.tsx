import { useGameLoading } from "@/hooks/useGameLoading";
import { layoutStyles } from "@/styles/layoutStyles";
import { textStyles } from "@/styles/textStyles";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Line } from "react-native-svg";
import { Deck } from "../Cards/Deck";
import {
  RANK_VALUE,
  SUITS,
  createDeck,
  shuffle,
  type PlayingCard,
} from "../Cards/card-utils";
import { GameMenus } from "../common/GameMenus";
import { Icon } from "@/icons";
import { flexStyles, transitionStyles } from "@/styles/flexStyles";
import { Colors, FontWeight, MaxContentHeight, rgba } from "@/styles/styles";
import { GameWrapper } from "../common/GameWrapper";

const cardsPerRow = 6;
const svgCellSize = MaxContentHeight;
const svgGridSize = svgCellSize * 3;

// Map grid index to (x, y) center in SVG overlay
function getCellCenter(idx: number) {
  const cx = svgCellSize / 2 + (idx % 3) * svgCellSize;
  const cy = svgCellSize / 2 + Math.floor(idx / 3) * svgCellSize;

  return { cx, cy };
}

// Shared color mapping for suit paths and icons
const SUIT_PATH_COLORS: Record<string, string> = {
  diamonds: Colors.suitsColoredDiamonds,
  hearts: Colors.suitsColoredHearts,
  spades: Colors.suitsColoredSpades,
  clubs: Colors.suitsColoredClubs,
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

  return (
    <GameWrapper
      ended={game.ended}
      won={won}
      reset={reset}
      isLoaded={isLoaded}
      winLoseMessage={
        won
          ? "All four suits reached at least a 5-card path."
          : "5 cards for each suit path needed to win."
      }
    >
      {/* Paths info */}
      <View style={styles.gameInfo}>
        <Text
          style={[
            textStyles.default,
            { color: Colors.K700, fontFamily: FontWeight[400] },
          ]}
        >
          Longest paths
          <br />
          (Total: {totalScore})
        </Text>
        <View
          style={[
            flexStyles.rowCentered,
            flexStyles.justifyEvenly,
            flexStyles.flex1,
          ]}
        >
          {SUITS.map((suit) => (
            <View key={suit} style={[flexStyles.rowCentered, flexStyles.gap6]}>
              <Icon name={suit} color={SUIT_PATH_COLORS[suit]} size={24} />
              <Text
                style={[
                  textStyles.default,
                  {
                    color: SUIT_PATH_COLORS[suit],
                    fontSize: 18,
                    fontFamily: FontWeight[600],
                  },
                ]}
              >
                {score[suit]}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Market */}
      <View
        style={[flexStyles.colCentered, flexStyles.fullWidth, flexStyles.gap8]}
      >
        <Text style={textStyles.default}>Market (Round {game.round} of 3)</Text>
        <View
          style={[
            flexStyles.rowCentered,
            flexStyles.fullWidth,
            flexStyles.gap8,
          ]}
        >
          {game.market.map((pile, index) => (
            <Pressable
              key={`market-${index}`}
              style={[
                styles.marketPile,
                selectedMarket === index && styles.marketPileSelected,
              ]}
              onPress={() => {
                if (selectedMarket === index) {
                  setSelectedMarket(null);
                } else {
                  setSelectedMarket(index);
                }
              }}
            >
              <Deck
                cards={pile}
                largeFan="extra-wide"
                fan="horizontalLeft"
                cardsPerRow={cardsPerRow}
                cardSize="small-colored"
              />
            </Pressable>
          ))}
        </View>
      </View>

      {/* Grid and paths */}
      <View style={styles.gridAndPathsWrap}>
        {/* Paths */}
        <Svg
          style={[
            {
              position: "absolute",
              zIndex: 1,
              left: 0,
              top: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
            },
          ]}
          width={svgGridSize}
          height={svgGridSize}
          viewBox={`0 0 ${svgGridSize} ${svgGridSize}`}
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
                  const { cx: x1, cy: y1 } = getCellCenter(prev);
                  const { cx: x2, cy: y2 } = getCellCenter(cell);
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
                      strokeWidth={20}
                      strokeLinecap="round"
                    />
                  );
                })
              : null;
          })}
        </Svg>

        {/* Grid  */}
        {game.grid.map((stack, index) => (
          <View key={`cell-${index}`} style={styles.gridCellWrap}>
            <Pressable
              key={`cell-${index}`}
              style={[
                styles.gridCell,
                selectedMarket !== null && styles.gridCellDropReady,
              ]}
              onPress={() => draftToCell(index)}
            >
              <Deck
                cards={stack}
                cardsPerRow={cardsPerRow}
                largeFan="extra-wide"
                fan="horizontalLeft"
                cardSize="small-colored"
                invisibleWhenEmpty
              />
            </Pressable>
          </View>
        ))}
      </View>
    </GameWrapper>
  );
}

const styles = StyleSheet.create({
  // Game Info
  gameInfo: {
    ...flexStyles.rowCentered,
    ...flexStyles.fullWidth,
    ...flexStyles.gap12,
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },

  // Market
  marketPile: {
    ...flexStyles.rowCentered,
    ...transitionStyles.sec05,
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: `${rgba(Colors.accentBlue, 0.1)}`,
    boxShadow: `inset 0 0 0 2px ${rgba(Colors.accentBlue, 0.6)}`,
    padding: 6,
    alignItems: "center",
  },
  marketPileSelected: {
    backgroundColor: `${rgba(Colors.accentGreen, 0.2)}`,
    boxShadow: `inset 0 0 0 3px ${rgba(Colors.accentGreen, 1)}`,
  },

  // Grid and Paths wrap
  gridAndPathsWrap: {
    ...flexStyles.rowCentered,
    ...flexStyles.fullWidth,
    position: "relative",
    flexWrap: "wrap",
    aspectRatio: 1,
    borderRadius: 16,
    padding: 4,
    backgroundColor: rgba(Colors.black, 0.2),
  },

  // Grid
  gridCellWrap: {
    ...flexStyles.rowCentered,
    position: "relative",
    width: "33.33%",
    zIndex: 2,
    padding: 2,
  },
  gridCell: {
    ...flexStyles.rowCentered,
    ...flexStyles.fullWidth,
    ...transitionStyles.sec05,
    position: "relative",
    zIndex: 2,
    aspectRatio: 1,
    borderRadius: 12,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",

    // backgroundColor: rgba(Colors.black, 0.2),
    boxShadow: `inset 0 0 0 2px ${rgba(Colors.K100, 0.1)}`,
  },
  gridCellDropReady: {
    boxShadow: `inset 0 0 0 2px ${rgba(Colors.accentGreen, 0.4)}`,
  },
});
