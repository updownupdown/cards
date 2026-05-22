import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Card } from "../Cards/Card";
import InfoModal from "../Modals/InfoModal";
import {
  RANK_VALUE,
  SUITS,
  createDeck,
  shuffle,
  type PlayingCard,
} from "../Cards/card-utils";
import { textStyles } from "@/styles/textStyles";

type SkywayState = {
  grid: PlayingCard[][];
  deck: PlayingCard[];
  discard: PlayingCard[];
  market: PlayingCard[][];
  round: 1 | 2 | 3;
  markers: PlayingCard[];
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
  const faces = full.filter(isFace);
  const numbers = full.filter((card) => !isFace(card));

  const markers = faces.slice(0, 3);
  const base: SkywayState = {
    grid: Array.from({ length: 9 }, () => []),
    deck: numbers,
    discard: [],
    market: [[], [], []],
    round: 1,
    markers,
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

function longestSuitPath(grid: PlayingCard[][], suit: (typeof SUITS)[number]) {
  const valuesByCell = grid.map((stack) =>
    stack
      .filter((card) => card.suit === suit)
      .map((card) => RANK_VALUE[card.rank])
      .sort((a, b) => a - b),
  );

  const memo = new Map<string, number>();

  const dfs = (
    cell: number,
    usedMask: number,
    currentValue: number,
  ): number => {
    const key = `${cell}|${usedMask}|${currentValue}`;
    const cached = memo.get(key);
    if (cached !== undefined) return cached;

    let best = 1;
    for (const nextCell of ADJACENT[cell]) {
      if ((usedMask & (1 << nextCell)) !== 0) continue;

      for (const nextValue of valuesByCell[nextCell]) {
        if (nextValue <= currentValue) continue;
        const candidate =
          1 + dfs(nextCell, usedMask | (1 << nextCell), nextValue);
        if (candidate > best) best = candidate;
      }
    }

    memo.set(key, best);
    return best;
  };

  let globalBest = 0;
  valuesByCell.forEach((values, cellIndex) => {
    values.forEach((value) => {
      globalBest = Math.max(globalBest, dfs(cellIndex, 1 << cellIndex, value));
    });
  });

  return globalBest;
}

function computeScore(grid: PlayingCard[][]): ScoreBySuit {
  return {
    clubs: longestSuitPath(grid, "clubs"),
    diamonds: longestSuitPath(grid, "diamonds"),
    hearts: longestSuitPath(grid, "hearts"),
    spades: longestSuitPath(grid, "spades"),
  };
}

export default function Skyway() {
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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <InfoModal ended={game.ended} won={won} />

      <View style={styles.headerRow}>
        <Text style={styles.title}>Skyway</Text>
        <Pressable style={styles.button} onPress={reset}>
          <Text style={styles.buttonText}>New Game</Text>
        </Pressable>
      </View>

      <Text style={textStyles.default}>Round {game.round} / 3</Text>
      <Text style={textStyles.default}>
        Traffic markers:{" "}
        {game.markers.map((c) => `${c.rank}${c.suit[0]}`).join(" ")}
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Market (choose one blueprint)</Text>
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
              {pile.map((card, i) => (
                <View
                  key={card.id}
                  style={{ marginTop: i === 0 ? 0 : -48, zIndex: i + 1 }}
                >
                  <Card suit={card.suit} rank={card.rank} widthPerc={20} />
                </View>
              ))}
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          3x3 Interchange (place selected blueprint)
        </Text>
        <View style={styles.grid}>
          {game.grid.map((stack, index) => (
            <Pressable
              key={`cell-${index}`}
              style={[
                styles.gridCell,
                selectedMarket !== null ? styles.dropReady : null,
              ]}
              onPress={() => draftToCell(index)}
            >
              {stack.length === 0 ? (
                <Text style={styles.cellHint}>Empty</Text>
              ) : null}
              {stack.map((card, i) => (
                <View
                  key={card.id}
                  style={{
                    position: "absolute",
                    left: 6 + i * 8,
                    top: 8 + i * 10,
                    zIndex: i + 1,
                  }}
                >
                  <Card suit={card.suit} rank={card.rank} widthPerc={20} />
                </View>
              ))}
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Suit Paths</Text>
        {SUITS.map((suit) => (
          <Text key={suit} style={textStyles.default}>
            {suit}: {score[suit]}
          </Text>
        ))}
        <Text style={textStyles.default}>Total score: {totalScore}</Text>
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
    </ScrollView>
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
    fontFamily: "Outfit_600SemiBold",
    color: "#1f2937",
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#1d4ed8",
  },
  buttonText: {
    color: "#fff",
    fontFamily: "Outfit_500Medium",
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontFamily: "Outfit_600SemiBold",
    color: "#111827",
  },
  metaText: {
    color: "#334155",
    fontFamily: "Outfit_400Regular",
  },
  marketRow: {
    flexDirection: "row",
    gap: 10,
  },
  marketPile: {
    flex: 1,
    minHeight: 120,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.2)",
    backgroundColor: "rgba(255,255,255,0.4)",
    padding: 6,
    alignItems: "center",
  },
  selectedPile: {
    borderWidth: 2,
    borderColor: "#2563eb",
    backgroundColor: "rgba(37,99,235,0.08)",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  gridCell: {
    width: "31%",
    aspectRatio: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.2)",
    backgroundColor: "rgba(255,255,255,0.35)",
    position: "relative",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  dropReady: {
    borderColor: "#0f766e",
  },
  cellHint: {
    color: "#64748b",
    fontSize: 11,
  },
  resultBox: {
    marginTop: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.2)",
    backgroundColor: "rgba(16,185,129,0.12)",
    padding: 10,
    gap: 4,
  },
  resultTitle: {
    fontFamily: "Outfit_600SemiBold",
    color: "#065f46",
  },
});
