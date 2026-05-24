import { useMemo, useState } from "react";
import { GameMenus } from "../common/GameMenus";
import { useGameLoading } from "@/hooks/useGameLoading";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Card } from "../Cards/Card";
import {
  CardSuit,
  RANK_VALUE,
  createDeck,
  shuffle,
  type PlayingCard,
} from "../Cards/card-utils";
import { textStyles } from "@/styles/textStyles";

type LoopRank = PlayingCard["rank"] | "Joker";

type LoopCard = {
  id: string;
  suit: CardSuit;
  rank: LoopRank;
  faceUp: boolean;
};

type LoopState = {
  deck: LoopCard[];
  notes: number[];
  scorePile: LoopCard[];
  ended: boolean;
  won: boolean;
};

function isFace(card: LoopCard) {
  return card.rank === "J" || card.rank === "Q" || card.rank === "K";
}

function isNumber(card: LoopCard) {
  return (
    typeof card.rank === "string" &&
    ["2", "3", "4", "5", "6", "7", "8", "9", "10"].includes(card.rank)
  );
}

function isAce(card: LoopCard) {
  return card.rank === "A";
}

function isJoker(card: LoopCard) {
  return card.rank === "Joker";
}

function rankValue(card: LoopCard) {
  if (card.rank === "Joker") return 0;
  return RANK_VALUE[card.rank];
}

function setup(): LoopState {
  const base: LoopCard[] = createDeck({ faceUp: false }).map((card) => ({
    ...card,
    rank: card.rank as LoopRank,
    faceUp: false,
  }));

  const withJoker: LoopCard[] = [
    ...base,
    { id: "joker-loop", suit: "spades", rank: "Joker", faceUp: false },
  ];

  const deck = shuffle(withJoker);

  return {
    deck,
    notes: [],
    scorePile: [],
    ended: false,
    won: false,
  };
}

function rotate(deck: LoopCard[], amount: number) {
  if (deck.length === 0) return deck;
  const n = Math.max(0, amount % deck.length);
  return [...deck.slice(n), ...deck.slice(0, n)];
}

function countAces(score: LoopCard[]) {
  return score.filter(isAce).length;
}

function resolveLanding(state: LoopState): LoopState {
  if (state.deck.length === 0) return { ...state, ended: true, won: false };

  const top = state.deck[0];
  const deck = [...state.deck];
  const scorePile = [...state.scorePile];

  if (top.faceUp && isFace(top)) {
    return { ...state, deck, scorePile, ended: true, won: false };
  }

  if (top.faceUp && isJoker(top)) {
    if (countAces(scorePile) >= 4) {
      return { ...state, deck, scorePile, ended: true, won: true };
    }
    return { ...state, deck, scorePile };
  }

  if (top.faceUp && (isAce(top) || isNumber(top))) {
    scorePile.push(top);
    deck.shift();
    if (deck.length === 0) {
      return { ...state, deck, scorePile, ended: true, won: false };
    }
  }

  return { ...state, deck, scorePile };
}

export default function LootTheLoop() {
  const isLoaded = useGameLoading();

  const [game, setGame] = useState<LoopState>(setup);
  const [message, setMessage] = useState(
    "Use Look Around to reveal information, then Explore to traverse the loop.",
  );

  const top = game.deck[0] ?? null;
  const second = game.deck[1] ?? null;
  const aceCount = useMemo(() => countAces(game.scorePile), [game.scorePile]);

  function reset() {
    setGame(setup());
    setMessage(
      "Use Look Around to reveal information, then Explore to traverse the loop.",
    );
  }

  function lookAround() {
    setGame((prev) => {
      if (prev.ended || prev.deck.length === 0) return prev;
      if (prev.deck[0].faceUp) return prev;

      const deck = [...prev.deck];
      deck[0] = { ...deck[0], faceUp: true };
      return { ...prev, deck };
    });
    setMessage("Top card revealed.");
  }

  function markPath() {
    setGame((prev) => {
      if (prev.ended || prev.notes.length >= 3 || prev.deck.length === 0)
        return prev;
      const t = prev.deck[0];
      if (!t.faceUp || !isNumber(t)) return prev;

      const notes = [...prev.notes, rankValue(t)];
      const deck = rotate(prev.deck, 1);
      return { ...prev, notes, deck };
    });
    setMessage("Path marked and loop advanced by one.");
  }

  function explore(usingSecond: boolean) {
    setGame((prev) => {
      if (prev.ended || prev.deck.length === 0) return prev;

      const card = usingSecond ? prev.deck[1] : prev.deck[0];
      if (!card || !card.faceUp || !isNumber(card)) return prev;

      const moved = rotate(prev.deck, rankValue(card));
      return resolveLanding({ ...prev, deck: moved });
    });

    setMessage("Exploration resolved.");
  }

  function returnToMarked(index: number) {
    setGame((prev) => {
      if (prev.ended || index < 0 || index >= prev.notes.length) return prev;
      const amount = prev.notes[index];
      const notes = prev.notes.filter((_, i) => i !== index);
      const moved = rotate(prev.deck, amount);
      return resolveLanding({ ...prev, notes, deck: moved });
    });

    setMessage("Returned to a marked path.");
  }

  const canLookAround = !!top && !top.faceUp;
  const canExploreTop = !!top && top.faceUp && isNumber(top);
  const canExploreSecond = !!second && second.faceUp && isNumber(second);
  const canMark = !!top && top.faceUp && isNumber(top) && game.notes.length < 3;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <GameMenus ended={game.ended} won={game.won} reset={reset} isLoaded={isLoaded} />

      

      <Text style={textStyles.default}>Deck size: {game.deck.length}</Text>
      <Text style={textStyles.default}>
        Notes: {game.notes.join(", ") || "none"}
      </Text>
      <Text style={textStyles.default}>
        Looted cards: {game.scorePile.length}
      </Text>
      <Text style={textStyles.default}>Jewels (Aces): {aceCount}/4</Text>
      <Text style={textStyles.default}>Message: {message}</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top of loop</Text>
        <View style={styles.topRow}>
          {top ? (
            <Card
              suit={top.suit}
              rank={top.rank === "Joker" ? "Joker" : top.rank}
              isBack={!top.faceUp}
              cardsPerRow={5}
            />
          ) : null}
          {second ? (
            <Card
              suit={second.suit}
              rank={second.rank === "Joker" ? "Joker" : second.rank}
              isBack={!second.faceUp}
              cardsPerRow={5}
            />
          ) : null}
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={[styles.actionBtn, canLookAround ? null : styles.disabledBtn]}
          onPress={lookAround}
        >
          <Text style={styles.actionText}>Look Around</Text>
        </Pressable>

        <Pressable
          style={[styles.actionBtn, canExploreTop ? null : styles.disabledBtn]}
          onPress={() => explore(false)}
        >
          <Text style={styles.actionText}>Explore (Top)</Text>
        </Pressable>

        <Pressable
          style={[
            styles.actionBtn,
            canExploreSecond ? null : styles.disabledBtn,
          ]}
          onPress={() => explore(true)}
        >
          <Text style={styles.actionText}>Explore (Second)</Text>
        </Pressable>

        <Pressable
          style={[styles.actionBtn, canMark ? null : styles.disabledBtn]}
          onPress={markPath}
        >
          <Text style={styles.actionText}>Mark a Path</Text>
        </Pressable>
      </View>

      {game.notes.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Return to Marked Path</Text>
          <View style={styles.notesRow}>
            {game.notes.map((value, idx) => (
              <Pressable
                key={`note-${idx}-${value}`}
                style={styles.noteBtn}
                onPress={() => returnToMarked(idx)}
              >
                <Text style={styles.noteText}>{value}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {game.ended ? (
        <Text style={game.won ? styles.winText : styles.loseText}>
          {game.won
            ? "You escaped with all four jewels."
            : "You were trapped or hit a revealed trap."}
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
  topRow: {
    flexDirection: "row",
    gap: 8,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  actionBtn: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: "#0f766e",
  },
  disabledBtn: {
    opacity: 0.5,
  },
  actionText: {
    color: "#fff",
    fontFamily: "Outfit_500Medium",
  },
  notesRow: {
    flexDirection: "row",
    gap: 8,
  },
  noteBtn: {
    minWidth: 36,
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#334155",
  },
  noteText: {
    color: "#fff",
    fontFamily: "Outfit_600SemiBold",
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
