import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Card } from "../Cards/Card";
import InfoModal from "../Modals/InfoModal";
import {
  CardRank,
  RANK_VALUE,
  createDeck,
  shuffle,
  type PlayingCard,
} from "../Cards/card-utils";
import { textStyles } from "@/styles/textStyles";

type CalculationState = {
  foundations: PlayingCard[][];
  stock: PlayingCard[];
  waste: PlayingCard[];
  ended: boolean;
  won: boolean;
};

const START_RANKS: CardRank[] = ["A", "2", "3", "4"];
const STEPS = [1, 2, 3, 4];

function nextRankValue(current: number, step: number) {
  const zeroBased = (current - 1 + step) % 13;
  return zeroBased + 1;
}

function setup(): CalculationState {
  const deck = shuffle(createDeck({ faceUp: true }));
  const foundations: PlayingCard[][] = [[], [], [], []];

  for (let i = 0; i < START_RANKS.length; i += 1) {
    const rank = START_RANKS[i];
    const idx = deck.findIndex((card) => card.rank === rank);
    if (idx >= 0) {
      foundations[i].push(deck.splice(idx, 1)[0]);
    }
  }

  return {
    foundations,
    stock: deck,
    waste: [],
    ended: false,
    won: false,
  };
}

function canPlayToFoundation(
  card: PlayingCard,
  foundation: PlayingCard[],
  step: number,
) {
  if (foundation.length === 0) return false;
  const top = foundation[foundation.length - 1];
  const expected = nextRankValue(RANK_VALUE[top.rank], step);
  return RANK_VALUE[card.rank] === expected;
}

function anyFoundationPlayable(
  card: PlayingCard,
  foundations: PlayingCard[][],
) {
  for (let i = 0; i < foundations.length; i += 1) {
    if (canPlayToFoundation(card, foundations[i], STEPS[i])) return true;
  }
  return false;
}

function evaluate(next: CalculationState) {
  const total = next.foundations.reduce((sum, pile) => sum + pile.length, 0);
  if (total === 52) return { ...next, ended: true, won: true };

  const wasteTop = next.waste[next.waste.length - 1] ?? null;
  const canPlayWaste = wasteTop
    ? anyFoundationPlayable(wasteTop, next.foundations)
    : false;

  if (next.stock.length === 0 && !canPlayWaste) {
    return { ...next, ended: true, won: false };
  }

  return next;
}

export default function Calculation() {
  const [game, setGame] = useState<CalculationState>(setup);
  const [message, setMessage] = useState(
    "Build foundations by step: +1, +2, +3, +4 (wrapping after King).",
  );

  const wasteTop = game.waste[game.waste.length - 1] ?? null;
  const foundationsCount = useMemo(
    () => game.foundations.reduce((sum, pile) => sum + pile.length, 0),
    [game.foundations],
  );

  function reset() {
    setGame(setup());
    setMessage(
      "Build foundations by step: +1, +2, +3, +4 (wrapping after King).",
    );
  }

  function draw() {
    setGame((prev) => {
      if (prev.ended || prev.stock.length === 0) return prev;
      const stock = [...prev.stock];
      const card = stock.shift();
      if (!card) return prev;

      const waste = [...prev.waste, card];
      return evaluate({ ...prev, stock, waste });
    });

    setMessage("Drew to waste.");
  }

  function playWasteToFoundation(foundationIndex: number) {
    setGame((prev) => {
      if (prev.ended) return prev;
      const top = prev.waste[prev.waste.length - 1];
      if (!top) return prev;

      const foundations = prev.foundations.map((pile) => [...pile]);
      const foundation = foundations[foundationIndex];
      if (!foundation) return prev;
      if (!canPlayToFoundation(top, foundation, STEPS[foundationIndex]))
        return prev;

      const waste = prev.waste.slice(0, -1);
      foundation.push(top);

      return evaluate({ ...prev, foundations, waste });
    });

    setMessage("Moved waste to foundation.");
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <InfoModal ended={game.ended} won={game.won} />

      <View style={styles.headerRow}>
        <Text style={styles.title}>Calculation</Text>
        <Pressable style={styles.button} onPress={reset}>
          <Text style={styles.buttonText}>New Game</Text>
        </Pressable>
      </View>

      <Text style={textStyles.default}>Stock: {game.stock.length}</Text>
      <Text style={textStyles.default}>Waste: {game.waste.length}</Text>
      <Text style={textStyles.default}>
        On foundations: {foundationsCount}/52
      </Text>
      <Text style={textStyles.default}>Message: {message}</Text>

      <View style={styles.foundationRow}>
        {game.foundations.map((foundation, i) => {
          const top = foundation[foundation.length - 1] ?? null;
          return (
            <Pressable
              key={`calc-found-${i}`}
              style={styles.foundationCol}
              onPress={() => playWasteToFoundation(i)}
              disabled={game.ended || !wasteTop}
            >
              <Text style={styles.smallText}>+{STEPS[i]}</Text>
              <Text style={styles.smallText}>Count: {foundation.length}</Text>
              {top ? (
                <Card suit={top.suit} rank={top.rank} widthPerc={20} />
              ) : (
                <View style={styles.emptySlot} />
              )}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.bottomRow}>
        <View style={styles.zone}>
          <Text style={styles.smallText}>Waste top</Text>
          {wasteTop ? (
            <Card suit={wasteTop.suit} rank={wasteTop.rank} widthPerc={20} />
          ) : (
            <View style={styles.emptySlot} />
          )}
        </View>

        <View style={styles.zone}>
          <Pressable
            style={[
              styles.button,
              game.stock.length > 0 ? styles.drawEnabled : styles.drawDisabled,
            ]}
            onPress={draw}
            disabled={game.stock.length === 0 || game.ended}
          >
            <Text style={styles.buttonText}>Draw</Text>
          </Pressable>
        </View>
      </View>

      {game.ended ? (
        <Text style={game.won ? styles.winText : styles.loseText}>
          {game.won
            ? "All 52 cards are on the foundations."
            : "No legal moves remain."}
        </Text>
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
    color: "#1f2937",
    fontFamily: "Outfit_600SemiBold",
  },
  button: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#1d4ed8",
  },
  drawEnabled: {
    backgroundColor: "#0f766e",
  },
  drawDisabled: {
    backgroundColor: "#94a3b8",
  },
  buttonText: {
    color: "#fff",
    fontFamily: "Outfit_500Medium",
  },
  metaText: {
    color: "#334155",
    fontFamily: "Outfit_400Regular",
  },
  foundationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
  },
  foundationCol: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.2)",
    borderRadius: 8,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  smallText: {
    fontSize: 11,
    color: "#334155",
  },
  emptySlot: {
    width: 80,
    height: 116,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.2)",
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  zone: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  winText: {
    color: "#065f46",
    fontFamily: "Outfit_600SemiBold",
  },
  loseText: {
    color: "#991b1b",
    fontFamily: "Outfit_600SemiBold",
  },
});
