import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Card } from "../Cards/Card";
import HomeButton from "../Home/HomeButton";
import {
  RANK_VALUE,
  createDeck,
  shuffle,
  type PlayingCard,
} from "../Games/card-utils";

type BobaState = {
  deck: PlayingCard[];
  queues: PlayingCard[][];
  discard: PlayingCard[];
  discardByRank: Record<PlayingCard["rank"], number>;
  ended: boolean;
  won: boolean;
};

function createDiscardCount(): Record<PlayingCard["rank"], number> {
  return {
    A: 0,
    "2": 0,
    "3": 0,
    "4": 0,
    "5": 0,
    "6": 0,
    "7": 0,
    "8": 0,
    "9": 0,
    "10": 0,
    J: 0,
    Q: 0,
    K: 0,
  };
}

function setup(): BobaState {
  const deck = shuffle(createDeck({ faceUp: true }));
  return {
    queues: [[deck[0]], [deck[1]], [deck[2]], [deck[3]]],
    deck: deck.slice(4),
    discard: [],
    discardByRank: createDiscardCount(),
    ended: false,
    won: false,
  };
}

function value(card: PlayingCard) {
  return RANK_VALUE[card.rank];
}

function totalInQueues(queues: PlayingCard[][]) {
  return queues.reduce((sum, q) => sum + q.length, 0);
}

export default function FirstBobaTeaShopInLondon() {
  const [game, setGame] = useState<BobaState>(setup);
  const [message, setMessage] = useState(
    "Choose a queue first, then draw and resolve the customer.",
  );

  const score = useMemo(() => totalInQueues(game.queues), [game.queues]);

  function reset() {
    setGame(setup());
    setMessage("Choose a queue first, then draw and resolve the customer.");
  }

  function placeIntoQueue(queueIndex: number) {
    setGame((prev) => {
      if (prev.ended) return prev;
      if (prev.deck.length === 0) {
        return { ...prev, ended: true, won: true };
      }

      const deck = [...prev.deck];
      const drawn = deck.shift();
      if (!drawn) {
        return { ...prev, ended: true, won: true };
      }

      const queues = prev.queues.map((q) => [...q]);
      const discard = [...prev.discard];
      const discardByRank = { ...prev.discardByRank };

      const target = queues[queueIndex];

      // Queues are maintained bottom-low to top-high; if new customer is lower,
      // impatient higher cards at the top leave the line.
      while (
        target.length > 0 &&
        value(target[target.length - 1]) > value(drawn)
      ) {
        const removed = target.pop();
        if (!removed) break;
        discard.push(removed);
        discardByRank[removed.rank] += 1;
        if (discardByRank[removed.rank] >= 4) {
          return {
            ...prev,
            deck,
            queues,
            discard,
            discardByRank,
            ended: true,
            won: false,
          };
        }
      }

      target.push(drawn);

      if (deck.length === 0) {
        return {
          ...prev,
          deck,
          queues,
          discard,
          discardByRank,
          ended: true,
          won: true,
        };
      }

      return {
        ...prev,
        deck,
        queues,
        discard,
        discardByRank,
      };
    });

    setMessage("Queue resolved.");
  }

  return (
    <View style={styles.container}>
      <HomeButton ended={game.ended} won={game.won} />

      <View style={styles.headerRow}>
        <Text style={styles.title}>The First Boba Tea Shop in London</Text>
        <Pressable style={styles.button} onPress={reset}>
          <Text style={styles.buttonText}>New Game</Text>
        </Pressable>
      </View>

      <Text style={styles.metaText}>Deck: {game.deck.length}</Text>
      <Text style={styles.metaText}>Discard: {game.discard.length}</Text>
      <Text style={styles.metaText}>Message: {message}</Text>

      <View style={styles.queuesRow}>
        {game.queues.map((queue, index) => (
          <Pressable
            key={`queue-${index}`}
            style={styles.queue}
            onPress={() => placeIntoQueue(index)}
          >
            <Text style={styles.queueTitle}>Q{index + 1}</Text>
            {queue.map((card, i) => (
              <View
                key={card.id}
                style={{ marginTop: i === 0 ? 0 : -44, zIndex: i + 1 }}
              >
                <Card suit={card.suit} rank={card.rank} widthRatio={12} />
              </View>
            ))}
          </Pressable>
        ))}
      </View>

      <View style={styles.rankGrid}>
        {(Object.keys(game.discardByRank) as Array<PlayingCard["rank"]>).map(
          (rank) => (
            <Text key={rank} style={styles.rankText}>
              {rank}: {game.discardByRank[rank]}
            </Text>
          ),
        )}
      </View>

      {game.ended ? (
        <Text style={game.won ? styles.winText : styles.loseText}>
          {game.won
            ? `You won. Score is cards still in queues: ${score}`
            : "You lost: discarded the fourth card of a rank."}
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
    fontSize: 20,
    fontFamily: "Outfit_600SemiBold",
    color: "#1f2937",
    maxWidth: "70%",
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
  queuesRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
  },
  queue: {
    flex: 1,
    minHeight: 160,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.25)",
    backgroundColor: "rgba(255,255,255,0.35)",
    padding: 6,
    alignItems: "center",
  },
  queueTitle: {
    fontFamily: "Outfit_600SemiBold",
    color: "#0f172a",
    marginBottom: 4,
  },
  rankGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  rankText: {
    color: "#475569",
    fontSize: 12,
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
