import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Card } from "../Cards/Card";
import HomeButton from "../Home/HomeButton";
import {
  RANK_VALUE,
  createDeck,
  shuffle,
  type PlayingCard,
} from "../Games/card-utils";

type GolfState = {
  tableau: PlayingCard[][];
  stock: PlayingCard[];
  waste: PlayingCard[];
  ended: boolean;
  won: boolean;
};

function value(card: PlayingCard) {
  return RANK_VALUE[card.rank];
}

function canPlayOnWaste(card: PlayingCard, wasteTop: PlayingCard | null) {
  if (!wasteTop) return true;
  const a = value(card);
  const b = value(wasteTop);
  const diff = Math.abs(a - b);
  return diff === 1;
}

function setup(): GolfState {
  const deck = shuffle(createDeck({ faceUp: true }));
  const tableau: PlayingCard[][] = [[], [], [], [], [], [], []];

  for (let row = 0; row < 5; row += 1) {
    for (let col = 0; col < 7; col += 1) {
      const card = deck.shift();
      if (card) tableau[col].push(card);
    }
  }

  const firstWaste = deck.shift();

  return {
    tableau,
    stock: deck,
    waste: firstWaste ? [firstWaste] : [],
    ended: false,
    won: false,
  };
}

function hasAnyMove(state: GolfState) {
  const wasteTop = state.waste[state.waste.length - 1] ?? null;
  return state.tableau.some((col) => {
    const top = col[col.length - 1] ?? null;
    return top ? canPlayOnWaste(top, wasteTop) : false;
  });
}

function evaluateEnd(state: GolfState) {
  const tableauCount = state.tableau.reduce((sum, col) => sum + col.length, 0);
  if (tableauCount === 0) return { ended: true, won: true };
  if (state.stock.length > 0) return { ended: false, won: false };
  if (hasAnyMove(state)) return { ended: false, won: false };
  return { ended: true, won: false };
}

export default function Golf() {
  const [game, setGame] = useState<GolfState>(setup);
  const [message, setMessage] = useState(
    "Tap a tableau card one rank above/below waste top. Draw from stock when blocked.",
  );

  const tableauCount = useMemo(
    () => game.tableau.reduce((sum, col) => sum + col.length, 0),
    [game.tableau],
  );

  function reset() {
    setGame(setup());
    setMessage(
      "Tap a tableau card one rank above/below waste top. Draw from stock when blocked.",
    );
  }

  function playCard(colIndex: number, cardIndex: number) {
    setGame((prev) => {
      if (prev.ended) return prev;
      const tableau = prev.tableau.map((col) => [...col]);
      const col = tableau[colIndex];
      const card = col?.[cardIndex];
      if (!card) return prev;
      if (cardIndex !== col.length - 1) return prev;

      const wasteTop = prev.waste[prev.waste.length - 1] ?? null;
      if (!canPlayOnWaste(card, wasteTop)) return prev;

      col.splice(cardIndex, 1);
      const waste = [...prev.waste, card];

      const next = { ...prev, tableau, waste };
      const end = evaluateEnd(next);
      return { ...next, ...end };
    });

    setMessage("Played to waste.");
  }

  function drawFromStock() {
    setGame((prev) => {
      if (prev.ended || prev.stock.length === 0) return prev;
      const stock = [...prev.stock];
      const nextCard = stock.shift();
      if (!nextCard) return prev;

      const waste = [...prev.waste, nextCard];
      const next = { ...prev, stock, waste };
      const end = evaluateEnd(next);
      return { ...next, ...end };
    });

    setMessage("Drew from stock.");
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <HomeButton ended={game.ended} won={game.won} />

      <View style={styles.headerRow}>
        <Text style={styles.title}>Golf Solitaire</Text>
        <Pressable onPress={reset} style={styles.button}>
          <Text style={styles.buttonText}>New Game</Text>
        </Pressable>
      </View>

      <Text style={styles.metaText}>Tableau cards: {tableauCount}</Text>
      <Text style={styles.metaText}>Stock: {game.stock.length}</Text>
      <Text style={styles.metaText}>Message: {message}</Text>

      <View style={styles.tableauWrap}>
        {game.tableau.map((col, colIndex) => (
          <View key={`g-col-${colIndex}`} style={styles.col}>
            {col.map((card, cardIndex) => (
              <Pressable
                key={card.id}
                onPress={() => playCard(colIndex, cardIndex)}
                disabled={game.ended || cardIndex !== col.length - 1}
                style={styles.cardPressable}
              >
                <Card suit={card.suit} rank={card.rank} widthRatio={11.5} />
              </Pressable>
            ))}
          </View>
        ))}
      </View>

      <View style={styles.bottomRow}>
        <View style={styles.zone}>
          <Text style={styles.smallText}>Waste</Text>
          {game.waste.length > 0 ? (
            <Card
              suit={game.waste[game.waste.length - 1].suit}
              rank={game.waste[game.waste.length - 1].rank}
              widthRatio={9.5}
            />
          ) : (
            <View style={styles.emptySlot} />
          )}
        </View>

        <View style={styles.zone}>
          <Text style={styles.smallText}>Stock</Text>
          <Pressable
            onPress={drawFromStock}
            disabled={game.stock.length === 0 || game.ended}
            style={[
              styles.drawButton,
              game.stock.length > 0 && !game.ended
                ? styles.drawEnabled
                : styles.drawDisabled,
            ]}
          >
            <Text style={styles.buttonText}>Draw</Text>
          </Pressable>
        </View>
      </View>

      {game.ended ? (
        <Text style={game.won ? styles.winText : styles.loseText}>
          {game.won ? "You cleared the tableau." : "No more playable cards."}
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
  tableauWrap: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
  },
  col: {
    flex: 1,
    gap: 4,
    alignItems: "center",
  },
  cardPressable: {
    borderRadius: 8,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  zone: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  smallText: {
    fontSize: 12,
    color: "#334155",
  },
  drawButton: {
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  drawEnabled: {
    backgroundColor: "#0f766e",
  },
  drawDisabled: {
    backgroundColor: "#94a3b8",
  },
  emptySlot: {
    width: 88,
    height: 128,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.2)",
    backgroundColor: "rgba(255,255,255,0.2)",
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
