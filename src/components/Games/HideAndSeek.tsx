import { useMemo, useState } from "react";
import { GameMenus } from "../common/GameMenus";
import { useGameLoading } from "@/hooks/useGameLoading";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Card } from "../Cards/Card";
import { createDeck, shuffle, type PlayingCard } from "../Cards/card-utils";
import { textStyles } from "@/styles/textStyles";
import { GameWrapper } from "../common/GameWrapper";

type GuessSlot = {
  id: string;
  row: number;
  col: number;
  card: PlayingCard | null;
};

type GameState = {
  playmates: PlayingCard[]; // 12 cards in row-major 3x4
  revealed: boolean[];
  slots: GuessSlot[];
  deck: PlayingCard[];
  discard: PlayingCard[];
  scorePile: PlayingCard[];
  ended: boolean;
};

function isFace(card: PlayingCard) {
  return card.rank === "J" || card.rank === "Q" || card.rank === "K";
}

function buildSlots() {
  const slots: GuessSlot[] = [];
  for (let r = 0; r < 3; r += 1) {
    slots.push({ id: `l-${r}`, row: r, col: -1, card: null });
    slots.push({ id: `r-${r}`, row: r, col: 4, card: null });
  }
  for (let c = 0; c < 4; c += 1) {
    slots.push({ id: `t-${c}`, row: -1, col: c, card: null });
    slots.push({ id: `b-${c}`, row: 3, col: c, card: null });
  }
  // Two extra flexible perimeter spots to make 14 as described.
  slots.push({ id: "x-0", row: 1, col: -2, card: null });
  slots.push({ id: "x-1", row: 1, col: 5, card: null });
  return slots;
}

function shuffleInPlace<T>(arr: T[]) {
  const next = [...arr];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function dealPlaymates(faceCards: PlayingCard[]) {
  const jacks = shuffleInPlace(faceCards.filter((c) => c.rank === "J"));
  const queens = shuffleInPlace(faceCards.filter((c) => c.rank === "Q"));
  const kings = shuffleInPlace(faceCards.filter((c) => c.rank === "K"));

  // Find a partition of 4 columns where each column has J/Q/K with distinct suits.
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const cols: Array<[PlayingCard, PlayingCard, PlayingCard]> = [];
    const qPool = shuffleInPlace(queens);
    const kPool = shuffleInPlace(kings);

    let ok = true;
    for (let c = 0; c < 4; c += 1) {
      const j = jacks[c];
      const q = qPool[c];
      const k = kPool[c];
      const suitSet = new Set([j.suit, q.suit, k.suit]);
      if (suitSet.size !== 3) {
        ok = false;
        break;
      }
      cols.push([j, q, k]);
    }

    if (!ok) continue;

    const shuffledColumns = shuffleInPlace(cols).map((col) =>
      shuffleInPlace(col),
    );
    const rows = 3;
    const out: PlayingCard[] = [];
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < 4; c += 1) {
        out.push(shuffledColumns[c][r]);
      }
    }
    return out;
  }

  return shuffleInPlace(faceCards).slice(0, 12);
}

function setup(): GameState {
  const deck = shuffle(createDeck({ faceUp: true }));
  const faces = dealPlaymates(deck.filter(isFace));
  const others = shuffle(deck.filter((c) => !isFace(c)));

  return {
    playmates: faces.slice(0, 12),
    revealed: Array.from({ length: 12 }, () => false),
    slots: buildSlots(),
    deck: others,
    discard: [],
    scorePile: [],
    ended: false,
  };
}

function playmatePos(index: number) {
  return { row: Math.floor(index / 4), col: index % 4 };
}

export default function HideAndSeek() {
  const isLoaded = useGameLoading();

  const [game, setGame] = useState<GameState>(setup);
  const [message, setMessage] = useState(
    "Place guesses, reveal playmates, and withdraw bad guesses when needed.",
  );

  const allRevealed = useMemo(
    () => game.revealed.every(Boolean),
    [game.revealed],
  );

  function reset() {
    setGame(setup());
    setMessage(
      "Place guesses, reveal playmates, and withdraw bad guesses when needed.",
    );
  }

  function placeGuess(slotId: string) {
    setGame((prev) => {
      if (prev.ended) return prev;
      const slotIndex = prev.slots.findIndex((s) => s.id === slotId);
      if (slotIndex < 0 || prev.slots[slotIndex].card) return prev;
      if (prev.deck.length === 0) return prev;

      const deck = [...prev.deck];
      const card = deck.shift() ?? null;
      if (!card) return prev;

      const slots = prev.slots.map((s) => ({ ...s }));
      slots[slotIndex].card = card;
      return { ...prev, deck, slots };
    });

    setMessage("Guess placed.");
  }

  function revealPlaymate(index: number) {
    setGame((prev) => {
      if (prev.ended || prev.revealed[index]) return prev;

      const revealed = [...prev.revealed];
      revealed[index] = true;

      const pos = playmatePos(index);
      const targetSuit = prev.playmates[index].suit;

      const slots = prev.slots.map((s) => ({ ...s }));
      const scorePile = [...prev.scorePile];
      let scoredThisReveal = 0;

      slots.forEach((slot) => {
        if (!slot.card) return;
        if (scoredThisReveal >= 4) return;

        // Flexible side slots still align by row.
        const rowMatch = slot.row === pos.row;
        const colMatch = slot.col === pos.col;
        if ((rowMatch || colMatch) && slot.card.suit === targetSuit) {
          scorePile.push(slot.card);
          slot.card = null;
          scoredThisReveal += 1;
        }
      });

      const ended = revealed.every(Boolean);
      return {
        ...prev,
        revealed,
        slots,
        scorePile,
        ended,
      };
    });

    setMessage("Playmate revealed and matching guesses scored.");
  }

  function withdrawGuess(slotId: string) {
    setGame((prev) => {
      if (prev.ended) return prev;
      const slotIndex = prev.slots.findIndex((s) => s.id === slotId);
      if (slotIndex < 0 || !prev.slots[slotIndex].card) return prev;
      if (prev.deck.length === 0) return prev;

      const topDeck = prev.deck[0];
      const guess = prev.slots[slotIndex].card;
      if (!guess || topDeck.suit !== guess.suit) return prev;

      const deck = [...prev.deck];
      const slots = prev.slots.map((s) => ({ ...s }));
      const discard = [...prev.discard];

      const payment = deck.shift();
      if (!payment) return prev;

      discard.push(payment);
      discard.push(guess);
      slots[slotIndex].card = null;

      return { ...prev, deck, slots, discard };
    });

    setMessage("Guess withdrawn by matching suit payment.");
  }

  const score = game.scorePile.length;
  const won = allRevealed && score >= 20;

  return (
    <GameWrapper ended={game.ended} won={won} reset={reset} isLoaded={isLoaded}>
      <Text style={textStyles.default}>
        Deck: {game.deck.length}
        <br />
        Score pile: {score}
        <br />
        Message: {message}
      </Text>

      <View style={styles.section}>
        <Text style={textStyles.default}>Playground (3x4)</Text>
        <View style={styles.grid}>
          {game.playmates.map((card, idx) => (
            <Pressable
              key={card.id}
              style={styles.playmateCell}
              onPress={() => revealPlaymate(idx)}
            >
              <Card
                suit={card.suit}
                rank={card.rank}
                isBack={!game.revealed[idx]}
                cardsPerRow={5}
              />
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Perimeter Guess Slots</Text>
        <View style={styles.slotsWrap}>
          {game.slots.map((slot) => (
            <View key={slot.id} style={styles.slotCol}>
              <Pressable
                onPress={() => placeGuess(slot.id)}
                style={styles.slotBtn}
              >
                {slot.card ? (
                  <Card
                    suit={slot.card.suit}
                    rank={slot.card.rank}
                    cardsPerRow={5}
                  />
                ) : (
                  <Text style={styles.slotHint}>Place</Text>
                )}
              </Pressable>
              <Pressable
                onPress={() => withdrawGuess(slot.id)}
                style={styles.withdrawBtn}
              >
                <Text style={styles.withdrawText}>Withdraw</Text>
              </Pressable>
            </View>
          ))}
        </View>
      </View>

      {game.ended ? (
        <Text style={won ? styles.winText : styles.loseText}>
          {won
            ? `You won with ${score} points.`
            : `Game ended with ${score} points. Need 20+ to win.`}
        </Text>
      ) : null}
    </GameWrapper>
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
  metaText: {
    color: "#334155",
    fontFamily: "Outfit_400Regular",
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontFamily: "Outfit_600SemiBold",
    color: "#111827",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  playmateCell: {
    width: "23%",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.2)",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  slotsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  slotCol: {
    width: "23%",
    gap: 4,
  },
  slotBtn: {
    minHeight: 72,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.2)",
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
  },
  slotHint: {
    color: "#64748b",
    fontSize: 11,
  },
  withdrawBtn: {
    borderRadius: 6,
    backgroundColor: "#475569",
    paddingVertical: 6,
    alignItems: "center",
  },
  withdrawText: {
    color: "#fff",
    fontSize: 11,
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
