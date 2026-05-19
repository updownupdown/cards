import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Card } from "../Cards/Card";
import HomeButton from "../Home/HomeButton";
import {
  RANK_VALUE,
  createDeck,
  isRed,
  shuffle,
  type PlayingCard,
} from "../Games/card-utils";

type SandwichState = {
  deck: PlayingCard[];
  hand: PlayingCard[];
  discard: PlayingCard[];
  wonByDeckingOut: boolean;
  ended: boolean;
};

function initState(): SandwichState {
  const deck = shuffle(createDeck({ faceUp: true }));
  return {
    hand: deck.slice(0, 8),
    deck: deck.slice(8),
    discard: [],
    wonByDeckingOut: false,
    ended: false,
  };
}

function mod13(value: number) {
  const n = value % 13;
  return n < 0 ? n + 13 : n;
}

function isValidSandwich(cards: PlayingCard[]) {
  if (cards.length !== 3) return false;

  const vals = cards.map((card) => RANK_VALUE[card.rank]);
  const perms = [
    [0, 1, 2],
    [0, 2, 1],
    [1, 0, 2],
    [1, 2, 0],
    [2, 0, 1],
    [2, 1, 0],
  ];

  return perms.some(([a, b, c]) => {
    const step1 = mod13(vals[b] - vals[a]);
    const step2 = mod13(vals[c] - vals[b]);
    return step1 === step2;
  });
}

function hasAnyValidSandwich(hand: PlayingCard[]) {
  for (let i = 0; i < hand.length; i += 1) {
    for (let j = i + 1; j < hand.length; j += 1) {
      for (let k = j + 1; k < hand.length; k += 1) {
        if (isValidSandwich([hand[i], hand[j], hand[k]])) {
          return true;
        }
      }
    }
  }
  return false;
}

function replacementCount(cards: PlayingCard[]) {
  const [a, b, c] = cards;
  const sameSuit = a.suit === b.suit && b.suit === c.suit;
  if (sameSuit) return 4;

  const sameColor =
    isRed(a.suit) === isRed(b.suit) && isRed(b.suit) === isRed(c.suit);
  if (sameColor) return 3;

  return 2;
}

export default function TheSandwichGuy() {
  const [game, setGame] = useState<SandwichState>(initState);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [message, setMessage] = useState(
    "Pick three cards to make a sandwich.",
  );

  const selectedCards = useMemo(
    () => game.hand.filter((card) => selectedIds.includes(card.id)),
    [game.hand, selectedIds],
  );

  const score = game.hand.length;

  function reset() {
    setGame(initState());
    setSelectedIds([]);
    setMessage("Pick three cards to make a sandwich.");
  }

  function toggleSelect(id: string) {
    if (game.ended) return;
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((entry) => entry !== id);
      }
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  }

  function endIfLocked(next: SandwichState) {
    if (hasAnyValidSandwich(next.hand)) return next;

    if (next.wonByDeckingOut) {
      return { ...next, ended: true };
    }

    return { ...next, ended: true };
  }

  function commitSandwich() {
    if (selectedCards.length !== 3) return;
    if (!isValidSandwich(selectedCards)) {
      setMessage(
        "Not a valid sandwich. Choose cards with equal step difference.",
      );
      return;
    }

    setGame((prev) => {
      if (prev.ended) return prev;

      const replacement = replacementCount(selectedCards);
      const hand = prev.hand.filter((card) => !selectedIds.includes(card.id));
      const discard = [...prev.discard, ...selectedCards];
      const deck = [...prev.deck];

      for (let i = 0; i < replacement; i += 1) {
        if (hand.length >= 8) break;
        const drawn = deck.shift();
        if (!drawn) break;
        hand.push(drawn);
      }

      const wonByDeckingOut = prev.wonByDeckingOut || deck.length === 0;
      const next = {
        ...prev,
        hand,
        deck,
        discard,
        wonByDeckingOut,
      };

      return endIfLocked(next);
    });

    setSelectedIds([]);
    setMessage("Sandwich served.");
  }

  const won = game.ended && game.wonByDeckingOut;
  const lost = game.ended && !game.wonByDeckingOut;

  return (
    <View style={styles.container}>
      <HomeButton />

      <View style={styles.headerRow}>
        <Text style={styles.title}>The Sandwich Guy</Text>
        <Pressable style={styles.button} onPress={reset}>
          <Text style={styles.buttonText}>New Game</Text>
        </Pressable>
      </View>

      <Text style={styles.metaText}>Deck: {game.deck.length}</Text>
      <Text style={styles.metaText}>Hand: {game.hand.length} / 8</Text>
      <Text style={styles.metaText}>Message: {message}</Text>

      <View style={styles.handWrap}>
        {game.hand.map((card) => {
          const selected = selectedIds.includes(card.id);
          return (
            <Pressable
              key={card.id}
              onPress={() => toggleSelect(card.id)}
              style={[styles.cardWrap, selected ? styles.selectedCard : null]}
            >
              <Card suit={card.suit} rank={card.rank} widthRatio={10} />
            </Pressable>
          );
        })}
      </View>

      <Pressable
        style={[
          styles.commitButton,
          selectedCards.length === 3 ? null : styles.commitButtonDisabled,
        ]}
        onPress={commitSandwich}
      >
        <Text style={styles.commitText}>Discard Selected Sandwich</Text>
      </Pressable>

      {won ? (
        <Text style={styles.winText}>
          You won by drawing out the deck. Final score (lower is better):{" "}
          {score}
        </Text>
      ) : null}

      {lost ? (
        <Text style={styles.loseText}>
          No valid sandwich available. You lose.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    paddingTop: 56,
    paddingHorizontal: 10,
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
  metaText: {
    color: "#334155",
    fontFamily: "Outfit_400Regular",
  },
  handWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    alignItems: "flex-start",
  },
  cardWrap: {
    borderRadius: 8,
  },
  selectedCard: {
    transform: [{ translateY: -4 }],
    backgroundColor: "rgba(37,99,235,0.15)",
  },
  commitButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#0f766e",
  },
  commitButtonDisabled: {
    opacity: 0.55,
  },
  commitText: {
    color: "#fff",
    fontFamily: "Outfit_500Medium",
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
