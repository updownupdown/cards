import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Card, type CardSuit } from "../Cards/Card";
import HomeButton from "../Home/HomeButton";
import {
  RANK_VALUE,
  createDeck,
  shuffle,
  type PlayingCard,
} from "../Games/card-utils";

type Kingdom = {
  id: number;
  ruler: PlayingCard; // K or Q
  requiredWins: number;
  visited: boolean;
  won: boolean;
};

type VisitState = {
  kingdomId: number;
  trump: CardSuit;
  requiredWins: number;
  wins: number;
  debatesLeft: number;
  hand: PlayingCard[];
  rulerCard: PlayingCard | null;
};

type EmissaryState = {
  kingdoms: Kingdom[];
  draw: PlayingCard[];
  discard: PlayingCard[];
  visit: VisitState | null;
  ended: boolean;
  won: boolean;
};

type DrawResult = {
  drawn: PlayingCard[];
  draw: PlayingCard[];
  discard: PlayingCard[];
};

function isFace(card: PlayingCard) {
  return card.rank === "J" || card.rank === "Q" || card.rank === "K";
}

function compareCard(
  a: PlayingCard,
  b: PlayingCard,
  leadSuit: CardSuit,
  trump: CardSuit,
) {
  const aTrump = a.suit === trump;
  const bTrump = b.suit === trump;
  if (aTrump && !bTrump) return 1;
  if (!aTrump && bTrump) return -1;

  const aLead = a.suit === leadSuit;
  const bLead = b.suit === leadSuit;
  if (aLead && !bLead) return 1;
  if (!aLead && bLead) return -1;

  return RANK_VALUE[a.rank] - RANK_VALUE[b.rank];
}

function setup(): EmissaryState {
  const deck = shuffle(createDeck({ faceUp: true }));
  const rulers = shuffle(
    deck.filter((c) => c.rank === "K" || c.rank === "Q").slice(0, 8),
  );

  // Deck for debates: remove 9/10 placeholders and face cards.
  const draw = shuffle(
    deck.filter((c) => !isFace(c) && c.rank !== "9" && c.rank !== "10"),
  );

  const kingdoms: Kingdom[] = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    ruler: rulers[i],
    requiredWins: i + 1,
    visited: false,
    won: false,
  }));

  return {
    kingdoms,
    draw,
    discard: [],
    visit: null,
    ended: false,
    won: false,
  };
}

function drawN(from: PlayingCard[], n: number) {
  const src = [...from];
  const out: PlayingCard[] = [];
  while (out.length < n && src.length > 0) {
    const c = src.shift();
    if (c) out.push(c);
  }
  return { drawn: out, rest: src };
}

function drawWithRecycle(
  drawPile: PlayingCard[],
  discardPile: PlayingCard[],
  n: number,
): DrawResult {
  let draw = [...drawPile];
  let discard = [...discardPile];
  const drawn: PlayingCard[] = [];

  while (drawn.length < n) {
    if (draw.length === 0) {
      if (discard.length === 0) break;
      draw = shuffle(discard);
      discard = [];
    }

    const next = draw.shift();
    if (!next) break;
    drawn.push(next);
  }

  return { drawn, draw, discard };
}

export default function TheEmissary() {
  const [game, setGame] = useState<EmissaryState>(setup);
  const [message, setMessage] = useState(
    "Choose an unvisited kingdom, then play debates to hit the exact required wins.",
  );

  const kingdomsWon = useMemo(
    () => game.kingdoms.filter((k) => k.won).length,
    [game.kingdoms],
  );

  function reset() {
    setGame(setup());
    setMessage(
      "Choose an unvisited kingdom, then play debates to hit the exact required wins.",
    );
  }

  function startKingdom(kingdomId: number) {
    setGame((prev) => {
      if (prev.ended || prev.visit) return prev;

      const k = prev.kingdoms.find((x) => x.id === kingdomId);
      if (!k || k.visited) return prev;

      const firstDeal = drawWithRecycle(prev.draw, prev.discard, 8);
      const secondDeal = drawWithRecycle(firstDeal.draw, firstDeal.discard, 1);
      const hand = firstDeal.drawn;
      const rulerArr = secondDeal.drawn;
      const rulerCard = rulerArr[0] ?? null;
      if (!rulerCard || hand.length === 0) {
        return { ...prev, ended: true, won: false };
      }

      return {
        ...prev,
        draw: secondDeal.draw,
        discard: secondDeal.discard,
        visit: {
          kingdomId,
          trump: k.ruler.suit,
          requiredWins: k.requiredWins,
          wins: 0,
          debatesLeft: 8,
          hand,
          rulerCard,
        },
      };
    });

    setMessage(
      "Debates started. Follow suit if possible; trump is ruler suit.",
    );
  }

  function playDebate(handCardId: string) {
    setGame((prev) => {
      if (prev.ended || !prev.visit || !prev.visit.rulerCard) return prev;

      const visit = { ...prev.visit, hand: [...prev.visit.hand] };
      const idx = visit.hand.findIndex((c) => c.id === handCardId);
      if (idx < 0) return prev;

      const chosen = visit.hand[idx];
      const leadSuit = visit.rulerCard.suit;

      const canFollow = visit.hand.some((c) => c.suit === leadSuit);
      if (canFollow && chosen.suit !== leadSuit) {
        return prev;
      }

      visit.hand.splice(idx, 1);

      const outcome = compareCard(
        chosen,
        visit.rulerCard,
        leadSuit,
        visit.trump,
      );
      if (outcome > 0) visit.wins += 1;

      visit.debatesLeft -= 1;

      const discard = [...prev.discard, chosen, visit.rulerCard];

      if (visit.debatesLeft <= 0 || visit.hand.length === 0) {
        const kingdoms = prev.kingdoms.map((k) => ({ ...k }));
        const current = kingdoms.find((k) => k.id === visit.kingdomId);
        if (!current) return prev;

        const success = visit.wins === visit.requiredWins;
        current.visited = true;
        current.won = success;

        if (!success) {
          return {
            ...prev,
            kingdoms,
            discard,
            visit: null,
            ended: true,
            won: false,
          };
        }

        const allVisited = kingdoms.every((k) => k.visited);
        if (allVisited) {
          return {
            ...prev,
            kingdoms,
            discard,
            visit: null,
            ended: true,
            won: true,
          };
        }

        return {
          ...prev,
          kingdoms,
          discard,
          visit: null,
        };
      }

      const nextDeal = drawWithRecycle(prev.draw, discard, 1);
      const nextRuler = nextDeal.drawn[0] ?? null;
      if (!nextRuler) {
        return {
          ...prev,
          draw: nextDeal.draw,
          discard: nextDeal.discard,
          visit: null,
          ended: true,
          won: false,
        };
      }

      visit.rulerCard = nextRuler;

      return {
        ...prev,
        draw: nextDeal.draw,
        discard: nextDeal.discard,
        visit,
      };
    });

    setMessage("Debate resolved.");
  }

  const score = kingdomsWon * 2;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <HomeButton />

      <View style={styles.headerRow}>
        <Text style={styles.title}>The Emissary</Text>
        <Pressable style={styles.button} onPress={reset}>
          <Text style={styles.buttonText}>New Game</Text>
        </Pressable>
      </View>

      <Text style={styles.metaText}>Kingdoms won: {kingdomsWon}/8</Text>
      <Text style={styles.metaText}>Score: {score}/16</Text>
      <Text style={styles.metaText}>Message: {message}</Text>

      {!game.visit ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choose Kingdom</Text>
          <View style={styles.kingdomRow}>
            {game.kingdoms.map((k) => (
              <Pressable
                key={`kingdom-${k.id}`}
                onPress={() => startKingdom(k.id)}
                style={[
                  styles.kingdomBtn,
                  k.visited
                    ? k.won
                      ? styles.kingdomWon
                      : styles.kingdomLost
                    : null,
                ]}
              >
                <Text style={styles.kingdomText}>K#{k.id + 1}</Text>
                <Text style={styles.smallText}>Need: {k.requiredWins}</Text>
                <Card suit={k.ruler.suit} rank={k.ruler.rank} widthRatio={18} />
              </Pressable>
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Visiting K#{game.visit.kingdomId + 1} | Trump: {game.visit.trump}
          </Text>
          <Text style={styles.metaText}>
            Wins: {game.visit.wins} / Need exact {game.visit.requiredWins}
          </Text>
          <Text style={styles.metaText}>
            Debates left: {game.visit.debatesLeft}
          </Text>

          <Text style={styles.smallText}>Ruler topic card</Text>
          {game.visit.rulerCard ? (
            <Card
              suit={game.visit.rulerCard.suit}
              rank={game.visit.rulerCard.rank}
              widthRatio={11}
            />
          ) : null}

          <Text style={styles.smallText}>Your hand (tap to play)</Text>
          <View style={styles.handWrap}>
            {game.visit.hand.map((card) => (
              <Pressable key={card.id} onPress={() => playDebate(card.id)}>
                <Card suit={card.suit} rank={card.rank} widthRatio={13} />
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {game.ended ? (
        <Text style={game.won ? styles.winText : styles.loseText}>
          {game.won
            ? `You won all eight kingdoms. Final score: ${score}`
            : "A kingdom ended without exact required debate wins."}
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
  kingdomRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  kingdomBtn: {
    width: "23%",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.2)",
    borderRadius: 8,
    padding: 4,
    gap: 4,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  kingdomWon: {
    borderColor: "#047857",
    backgroundColor: "rgba(16,185,129,0.14)",
  },
  kingdomLost: {
    borderColor: "#b91c1c",
    backgroundColor: "rgba(239,68,68,0.14)",
  },
  kingdomText: {
    fontSize: 11,
    color: "#0f172a",
    fontFamily: "Outfit_600SemiBold",
  },
  smallText: {
    fontSize: 11,
    color: "#475569",
  },
  handWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
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
