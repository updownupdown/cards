import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import HomeButton from "../Home/HomeButton";
import { Card } from "../Cards/Card";
import { createDeck, shuffle, type PlayingCard } from "../Games/card-utils";

type AcesUpState = {
  stock: PlayingCard[];
  piles: PlayingCard[][];
  discard: PlayingCard[];
  ended: boolean;
  won: boolean;
};

function rankValueAcesHigh(card: PlayingCard) {
  if (card.rank === "A") return 14;
  if (card.rank === "K") return 13;
  if (card.rank === "Q") return 12;
  if (card.rank === "J") return 11;
  return Number(card.rank);
}

function topCard(pile: PlayingCard[]) {
  if (pile.length === 0) return null;
  return pile[pile.length - 1];
}

function setup(): AcesUpState {
  const deck = shuffle(createDeck({ faceUp: true }));
  const piles: PlayingCard[][] = [[], [], [], []];

  for (let i = 0; i < 4; i += 1) {
    const card = deck.shift();
    if (card) piles[i].push(card);
  }

  return {
    stock: deck,
    piles,
    discard: [],
    ended: false,
    won: false,
  };
}

function getDiscardablePileIndexes(piles: PlayingCard[][]) {
  const tops = piles.map((pile) => topCard(pile));
  const discardable = new Set<number>();

  for (let i = 0; i < tops.length; i += 1) {
    const card = tops[i];
    if (!card) continue;

    for (let j = 0; j < tops.length; j += 1) {
      if (i === j) continue;
      const other = tops[j];
      if (!other) continue;
      if (
        other.suit === card.suit &&
        rankValueAcesHigh(other) > rankValueAcesHigh(card)
      ) {
        discardable.add(i);
      }
    }
  }

  return discardable;
}

function hasRelocateMove(piles: PlayingCard[][]) {
  const hasEmpty = piles.some((pile) => pile.length === 0);
  const nonEmptyCount = piles.filter((pile) => pile.length > 0).length;
  return hasEmpty && nonEmptyCount > 1;
}

function evaluateEndState(stock: PlayingCard[], piles: PlayingCard[][]) {
  if (stock.length > 0) return { ended: false, won: false };

  const discardable = getDiscardablePileIndexes(piles);
  const canRelocate = hasRelocateMove(piles);
  if (discardable.size > 0 || canRelocate) {
    return { ended: false, won: false };
  }

  const remainingCards = piles.flat();
  const won =
    remainingCards.length === 4 &&
    remainingCards.every((card) => card.rank === "A");
  return { ended: true, won };
}

export default function AcesUp() {
  const [game, setGame] = useState<AcesUpState>(setup);
  const [selectedPile, setSelectedPile] = useState<number | null>(null);
  const [message, setMessage] = useState(
    "Discard lower cards of same suit, move cards to empty piles, then deal when blocked.",
  );

  const discardable = useMemo(
    () => getDiscardablePileIndexes(game.piles),
    [game.piles],
  );

  const canDeal = useMemo(() => {
    if (game.ended || game.stock.length < 4) return false;
    if (discardable.size > 0) return false;
    return true;
  }, [discardable, game.ended, game.piles, game.stock.length]);

  function reset() {
    setGame(setup());
    setSelectedPile(null);
    setMessage(
      "Discard lower cards of same suit, move cards to empty piles, then deal when blocked.",
    );
  }

  function dealFour() {
    setGame((prev) => {
      if (prev.ended || prev.stock.length < 4) return prev;

      const blockedByDiscard = getDiscardablePileIndexes(prev.piles).size > 0;
      if (blockedByDiscard) return prev;

      const stock = [...prev.stock];
      const piles = prev.piles.map((pile) => [...pile]);

      for (let i = 0; i < 4; i += 1) {
        const card = stock.shift();
        if (card) piles[i].push(card);
      }

      const { ended, won } = evaluateEndState(stock, piles);
      return { ...prev, stock, piles, ended, won };
    });

    setSelectedPile(null);
    setMessage("Dealt one card to each pile.");
  }

  function discardTop(pileIndex: number) {
    setGame((prev) => {
      if (prev.ended) return prev;
      const allowed = getDiscardablePileIndexes(prev.piles);
      if (!allowed.has(pileIndex)) return prev;

      const piles = prev.piles.map((pile) => [...pile]);
      const discard = [...prev.discard];
      const card = piles[pileIndex].pop();
      if (!card) return prev;
      discard.push(card);

      const { ended, won } = evaluateEndState(prev.stock, piles);
      return { ...prev, piles, discard, ended, won };
    });

    setSelectedPile(null);
    setMessage("Discarded top card.");
  }

  function onPilePress(pileIndex: number) {
    setGame((prev) => {
      if (prev.ended) return prev;

      const piles = prev.piles.map((pile) => [...pile]);
      const clicked = piles[pileIndex];

      if (selectedPile === null) {
        if (clicked.length > 0) {
          setSelectedPile(pileIndex);
          setMessage(
            "Selected a source pile. Tap an empty pile to move its top card.",
          );
        }
        return prev;
      }

      if (selectedPile === pileIndex) {
        setSelectedPile(null);
        setMessage("Selection cleared.");
        return prev;
      }

      const source = piles[selectedPile];
      const target = piles[pileIndex];
      if (source.length === 0 || target.length !== 0) {
        setSelectedPile(null);
        return prev;
      }

      const moving = source.pop();
      if (!moving) return prev;
      target.push(moving);

      const { ended, won } = evaluateEndState(prev.stock, piles);
      setSelectedPile(null);
      setMessage("Moved top card to an empty pile.");

      return { ...prev, piles, ended, won };
    });
  }

  const remaining = game.piles.flat().length + game.stock.length;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <HomeButton />
      <View style={styles.headerRow}>
        <Text style={styles.title}>Aces Up</Text>
        <Pressable style={styles.button} onPress={reset}>
          <Text style={styles.buttonText}>New Game</Text>
        </Pressable>
      </View>

      <Text style={styles.metaText}>Stock: {game.stock.length}</Text>
      <Text style={styles.metaText}>Discarded: {game.discard.length}</Text>
      <Text style={styles.metaText}>Cards remaining: {remaining}</Text>
      <Text style={styles.metaText}>Message: {message}</Text>

      <View style={styles.pilesRow}>
        {game.piles.map((pile, idx) => {
          const top = topCard(pile);
          const isSelected = selectedPile === idx;
          const canDiscard = discardable.has(idx);

          return (
            <View key={`pile-${idx}`} style={styles.pileCol}>
              <Pressable
                onPress={() => onPilePress(idx)}
                style={[
                  styles.pileSlot,
                  isSelected ? styles.pileSelected : null,
                ]}
              >
                {top ? (
                  <Card suit={top.suit} rank={top.rank} widthRatio={8.8} />
                ) : (
                  <Text style={styles.emptyText}>Empty</Text>
                )}
              </Pressable>

              <Text style={styles.smallText}>Pile {idx + 1}</Text>
              <Text style={styles.smallText}>Count: {pile.length}</Text>

              <Pressable
                onPress={() => discardTop(idx)}
                disabled={!canDiscard}
                style={[
                  styles.discardButton,
                  canDiscard
                    ? styles.discardButtonEnabled
                    : styles.discardButtonDisabled,
                ]}
              >
                <Text style={styles.discardButtonText}>Discard Top</Text>
              </Pressable>
            </View>
          );
        })}
      </View>

      <Pressable
        style={[
          styles.button,
          canDeal ? styles.dealEnabled : styles.dealDisabled,
        ]}
        onPress={dealFour}
        disabled={!canDeal}
      >
        <Text style={styles.buttonText}>Deal 4</Text>
      </Pressable>

      {game.ended ? (
        <Text style={game.won ? styles.winText : styles.loseText}>
          {game.won
            ? "You won. Only four aces remain!"
            : "No legal moves remain with stock empty."}
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
    width: "100%",
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
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#1d4ed8",
    alignSelf: "flex-start",
  },
  buttonText: {
    color: "#fff",
    fontFamily: "Outfit_500Medium",
  },
  metaText: {
    color: "#334155",
    fontFamily: "Outfit_400Regular",
  },
  pilesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
  },
  pileCol: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  pileSlot: {
    width: "100%",
    minHeight: 120,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.2)",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.35)",
    paddingVertical: 4,
  },
  pileSelected: {
    borderColor: "#0f766e",
    backgroundColor: "rgba(15,118,110,0.15)",
  },
  emptyText: {
    color: "#64748b",
    fontSize: 11,
  },
  smallText: {
    fontSize: 11,
    color: "#334155",
  },
  discardButton: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  discardButtonEnabled: {
    backgroundColor: "#b91c1c",
  },
  discardButtonDisabled: {
    backgroundColor: "#94a3b8",
  },
  discardButtonText: {
    color: "#fff",
    fontSize: 11,
  },
  dealEnabled: {
    backgroundColor: "#0f766e",
  },
  dealDisabled: {
    backgroundColor: "#94a3b8",
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
