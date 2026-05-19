import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Card } from "../Cards/Card";
import HomeButton from "../Home/HomeButton";
import { createDeck, shuffle, type PlayingCard } from "../Games/card-utils";

type AccordionState = {
  line: PlayingCard[];
  ended: boolean;
  won: boolean;
};

function setup(): AccordionState {
  return {
    line: shuffle(createDeck({ faceUp: true })),
    ended: false,
    won: false,
  };
}

function canMerge(source: PlayingCard, target: PlayingCard) {
  return source.rank === target.rank || source.suit === target.suit;
}

function hasAnyMove(line: PlayingCard[]) {
  for (let i = 0; i < line.length; i += 1) {
    const oneLeft = i - 1;
    const threeLeft = i - 3;
    if (oneLeft >= 0 && canMerge(line[i], line[oneLeft])) return true;
    if (threeLeft >= 0 && canMerge(line[i], line[threeLeft])) return true;
  }
  return false;
}

export default function Accordion() {
  const [game, setGame] = useState<AccordionState>(setup);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [message, setMessage] = useState(
    "Select a card, then tap a valid target 1 or 3 positions to the left.",
  );

  const moveCount = useMemo(() => 52 - game.line.length, [game.line.length]);

  function reset() {
    setGame(setup());
    setSelectedIndex(null);
    setMessage(
      "Select a card, then tap a valid target 1 or 3 positions to the left.",
    );
  }

  function onCardPress(index: number) {
    setGame((prev) => {
      if (prev.ended) return prev;

      if (selectedIndex === null) {
        setSelectedIndex(index);
        return prev;
      }

      if (selectedIndex === index) {
        setSelectedIndex(null);
        return prev;
      }

      const source = selectedIndex;
      const target = index;
      const validDistance = source - target === 1 || source - target === 3;
      if (!validDistance) {
        setSelectedIndex(index);
        return prev;
      }

      const srcCard = prev.line[source];
      const targetCard = prev.line[target];
      if (!srcCard || !targetCard || !canMerge(srcCard, targetCard)) {
        setSelectedIndex(index);
        return prev;
      }

      const line = [...prev.line];
      line[target] = srcCard;
      line.splice(source, 1);

      const won = line.length === 1;
      const ended = won || !hasAnyMove(line);
      setSelectedIndex(null);
      setMessage("Move completed.");

      return {
        ...prev,
        line,
        ended,
        won,
      };
    });
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <HomeButton />

      <View style={styles.headerRow}>
        <Text style={styles.title}>Accordion</Text>
        <Pressable style={styles.button} onPress={reset}>
          <Text style={styles.buttonText}>New Game</Text>
        </Pressable>
      </View>

      <Text style={styles.metaText}>Cards remaining: {game.line.length}</Text>
      <Text style={styles.metaText}>Moves made: {moveCount}</Text>
      <Text style={styles.metaText}>Message: {message}</Text>

      <View style={styles.lineWrap}>
        {game.line.map((card, idx) => {
          const isSelected = selectedIndex === idx;
          return (
            <Pressable
              key={card.id}
              onPress={() => onCardPress(idx)}
              disabled={game.ended}
              style={[
                styles.cardPressable,
                isSelected ? styles.cardSelected : null,
              ]}
            >
              <Card suit={card.suit} rank={card.rank} widthRatio={12.5} />
              <Text style={styles.smallText}>{idx + 1}</Text>
            </Pressable>
          );
        })}
      </View>

      {game.ended ? (
        <Text style={game.won ? styles.winText : styles.loseText}>
          {game.won
            ? "You compressed the deck to one card."
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
  buttonText: {
    color: "#fff",
    fontFamily: "Outfit_500Medium",
  },
  metaText: {
    color: "#334155",
    fontFamily: "Outfit_400Regular",
  },
  lineWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  cardPressable: {
    borderRadius: 8,
    alignItems: "center",
    padding: 2,
  },
  cardSelected: {
    backgroundColor: "rgba(37,99,235,0.16)",
  },
  smallText: {
    fontSize: 11,
    color: "#334155",
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
