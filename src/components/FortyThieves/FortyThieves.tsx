import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Card, type CardSuit } from "../Cards/Card";
import MenuButton from "../Home/HomeButton";
import {
  RANK_VALUE,
  createDeck,
  shuffle,
  type PlayingCard,
} from "../Games/card-utils";

type FoundationPile = {
  suit: CardSuit | null;
  cards: PlayingCard[];
};

type FortyState = {
  foundations: FoundationPile[];
  tableau: PlayingCard[][];
  stock: PlayingCard[];
  waste: PlayingCard[];
  ended: boolean;
  won: boolean;
};

function setup(): FortyState {
  const deck = shuffle(createDeck({ faceUp: true, deckCount: 2 }));
  const tableau: PlayingCard[][] = Array.from({ length: 10 }, () => []);

  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 10; col += 1) {
      const card = deck.shift();
      if (card) tableau[col].push(card);
    }
  }

  return {
    foundations: Array.from({ length: 8 }, () => ({ suit: null, cards: [] })),
    tableau,
    stock: deck,
    waste: [],
    ended: false,
    won: false,
  };
}

function canPlaceFoundation(card: PlayingCard, pile: FoundationPile) {
  if (pile.cards.length === 0) return card.rank === "A";
  const top = pile.cards[pile.cards.length - 1];
  return (
    pile.suit === card.suit &&
    RANK_VALUE[card.rank] === RANK_VALUE[top.rank] + 1
  );
}

function canPlaceTableau(card: PlayingCard, targetTop: PlayingCard | null) {
  if (!targetTop) return card.rank === "K";
  return (
    card.suit === targetTop.suit &&
    RANK_VALUE[targetTop.rank] === RANK_VALUE[card.rank] + 1
  );
}

function foundationsCount(foundations: FoundationPile[]) {
  return foundations.reduce((sum, p) => sum + p.cards.length, 0);
}

function hasAnyLegalMove(state: FortyState) {
  const wasteTop = state.waste[state.waste.length - 1] ?? null;
  if (wasteTop) {
    for (const foundation of state.foundations) {
      if (canPlaceFoundation(wasteTop, foundation)) return true;
    }
    for (const col of state.tableau) {
      const top = col[col.length - 1] ?? null;
      if (canPlaceTableau(wasteTop, top)) return true;
    }
  }

  for (let i = 0; i < state.tableau.length; i += 1) {
    const card = state.tableau[i][state.tableau[i].length - 1] ?? null;
    if (!card) continue;

    for (const foundation of state.foundations) {
      if (canPlaceFoundation(card, foundation)) return true;
    }
    for (let j = 0; j < state.tableau.length; j += 1) {
      if (i === j) continue;
      const targetTop = state.tableau[j][state.tableau[j].length - 1] ?? null;
      if (canPlaceTableau(card, targetTop)) return true;
    }
  }

  return state.stock.length > 0;
}

export default function FortyThieves() {
  const [game, setGame] = useState<FortyState>(setup);
  const [message, setMessage] = useState(
    "Tap waste/tableau tops to auto-place; draw from stock to continue.",
  );

  const foundCount = useMemo(
    () => foundationsCount(game.foundations),
    [game.foundations],
  );

  function reset() {
    setGame(setup());
    setMessage(
      "Tap waste/tableau tops to auto-place; draw from stock to continue.",
    );
  }

  function evaluate(next: FortyState) {
    if (foundationsCount(next.foundations) === 104) {
      return { ...next, ended: true, won: true };
    }
    if (!hasAnyLegalMove(next)) {
      return { ...next, ended: true, won: false };
    }
    return next;
  }

  function autoPlaceFrom(
    sourceType: "waste" | "tableau",
    tableauIndex?: number,
  ) {
    setGame((prev) => {
      if (prev.ended) return prev;

      const foundations = prev.foundations.map((p) => ({
        suit: p.suit,
        cards: [...p.cards],
      }));
      const tableau = prev.tableau.map((col) => [...col]);
      const waste = [...prev.waste];

      let card: PlayingCard | null = null;
      if (sourceType === "waste") card = waste[waste.length - 1] ?? null;
      if (sourceType === "tableau" && typeof tableauIndex === "number") {
        card = tableau[tableauIndex][tableau[tableauIndex].length - 1] ?? null;
      }
      if (!card) return prev;

      for (let i = 0; i < foundations.length; i += 1) {
        const pile = foundations[i];
        if (!canPlaceFoundation(card, pile)) continue;

        if (pile.cards.length === 0) pile.suit = card.suit;
        pile.cards.push(card);
        if (sourceType === "waste") waste.pop();
        if (sourceType === "tableau" && typeof tableauIndex === "number")
          tableau[tableauIndex].pop();

        return evaluate({ ...prev, foundations, tableau, waste });
      }

      for (let i = 0; i < tableau.length; i += 1) {
        if (sourceType === "tableau" && i === tableauIndex) continue;
        const targetTop = tableau[i][tableau[i].length - 1] ?? null;
        if (!canPlaceTableau(card, targetTop)) continue;

        tableau[i].push(card);
        if (sourceType === "waste") waste.pop();
        if (sourceType === "tableau" && typeof tableauIndex === "number")
          tableau[tableauIndex].pop();

        return evaluate({ ...prev, foundations, tableau, waste });
      }

      return prev;
    });

    setMessage("Tried move.");
  }

  function draw() {
    setGame((prev) => {
      if (prev.ended || prev.stock.length === 0) return prev;
      const stock = [...prev.stock];
      const waste = [...prev.waste];
      const card = stock.shift();
      if (!card) return prev;
      waste.push(card);
      return evaluate({ ...prev, stock, waste });
    });
    setMessage("Drew from stock.");
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <MenuButton ended={game.ended} won={game.won} />
      <View style={styles.headerRow}>
        <Text style={styles.title}>Forty Thieves</Text>
        <Pressable style={styles.button} onPress={reset}>
          <Text style={styles.buttonText}>New Game</Text>
        </Pressable>
      </View>

      <Text style={styles.metaText}>Foundations: {foundCount}/104</Text>
      <Text style={styles.metaText}>Stock: {game.stock.length}</Text>
      <Text style={styles.metaText}>Waste: {game.waste.length}</Text>
      <Text style={styles.metaText}>Message: {message}</Text>

      <View style={styles.foundationsRow}>
        {game.foundations.map((pile, i) => {
          const top = pile.cards[pile.cards.length - 1] ?? null;
          return (
            <View key={`ft-found-${i}`} style={styles.foundationZone}>
              <Text style={styles.smallText}>{pile.suit ?? "-"}</Text>
              {top ? (
                <Card suit={top.suit} rank={top.rank} widthRatio={13.2} />
              ) : (
                <View style={styles.empty} />
              )}
            </View>
          );
        })}
      </View>

      <View style={styles.row}>
        <View style={styles.zone}>
          <Text style={styles.smallText}>Waste top</Text>
          <Pressable
            onPress={() => autoPlaceFrom("waste")}
            disabled={game.ended || game.waste.length === 0}
          >
            {game.waste.length > 0 ? (
              <Card
                suit={game.waste[game.waste.length - 1].suit}
                rank={game.waste[game.waste.length - 1].rank}
                widthRatio={10.6}
              />
            ) : (
              <View style={styles.empty} />
            )}
          </Pressable>
        </View>

        <View style={styles.zone}>
          <Pressable
            style={[
              styles.button,
              game.stock.length > 0 && !game.ended
                ? styles.drawButton
                : styles.drawButtonDisabled,
            ]}
            onPress={draw}
            disabled={game.stock.length === 0 || game.ended}
          >
            <Text style={styles.buttonText}>Draw</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.tableauRow}>
        {game.tableau.map((col, i) => {
          const top = col[col.length - 1] ?? null;
          return (
            <View key={`ft-col-${i}`} style={styles.zone}>
              <Text style={styles.smallText}>T{i + 1}</Text>
              <Text style={styles.smallText}>{col.length}</Text>
              <Pressable
                onPress={() => autoPlaceFrom("tableau", i)}
                disabled={game.ended || col.length === 0}
              >
                {top ? (
                  <Card suit={top.suit} rank={top.rank} widthRatio={12.7} />
                ) : (
                  <View style={styles.empty} />
                )}
              </Pressable>
            </View>
          );
        })}
      </View>

      {game.ended ? (
        <Text style={game.won ? styles.winText : styles.loseText}>
          {game.won
            ? "All cards built to foundations."
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
  drawButton: {
    backgroundColor: "#0f766e",
  },
  drawButtonDisabled: {
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
  foundationsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  foundationZone: {
    width: "23%",
    alignItems: "center",
    gap: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
  },
  tableauRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
  },
  zone: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  smallText: {
    fontSize: 11,
    color: "#334155",
  },
  empty: {
    width: 68,
    height: 96,
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
