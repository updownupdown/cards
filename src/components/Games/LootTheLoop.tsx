import { useMemo, useState } from "react";
import { GameMenus } from "../common/GameMenus";
import { useGameLoading } from "@/hooks/useGameLoading";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";

import { Card } from "../Cards/Card";
import {
  CardSuit,
  RANK_VALUE,
  createDeck,
  shuffle,
  type PlayingCard,
} from "../Cards/card-utils";
import { textStyles } from "@/styles/textStyles";
import { GameWrapper } from "../common/GameWrapper";
import { Button } from "../Button/Button";
import { CardButton } from "../Cards/CardButton";
import { flexStyles } from "@/styles/flexStyles";
import { debugStyles } from "@/styles/debugStyles";

export type LoopRank = PlayingCard["rank"] | "Joker";

type LoopCard = {
  id: string;
  suit: CardSuit;
  rank: LoopRank;
  faceUp: boolean;
};

type LoopState = {
  deck: LoopCard[];
  notes: LoopCard[];
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

  let deck: LoopCard[];
  // Ensure first two cards are not both face cards
  do {
    deck = shuffle(withJoker);
  } while (
    (isFace(deck[0]) && isFace(deck[1])) ||
    (deck[0].rank === "Joker" && deck[1].rank === "Joker")
  );

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

  const aceCount = useMemo(() => countAces(game.scorePile), [game.scorePile]);

  const [selectedCardIndex, setSelectedCardIndex] = useState<
    number | undefined
  >(undefined);

  function reset() {
    setSelectedCardIndex(undefined);
    setGame(setup());
  }

  // Look around
  function lookAround() {
    setGame((prev) => {
      if (prev.ended || prev.deck.length === 0) return prev;
      const deck = [...prev.deck];
      deck[0] = { ...deck[0], faceUp: true };
      deck[1] = { ...deck[1], faceUp: true };
      return { ...prev, deck };
    });
    setSelectedCardIndex(0);
  }

  // Mark path
  function markPath(selectedCardIndex: number) {
    const pathToMark = game.deck[selectedCardIndex];
    if (
      game.ended ||
      game.notes.length >= 3 ||
      game.deck.length === 0 ||
      !pathToMark.faceUp ||
      !isNumber(pathToMark)
    ) {
      return;
    }

    setSelectedCardIndex(undefined);

    setGame((prev) => {
      return {
        ...prev,
        notes: [...prev.notes, pathToMark],
        deck: [...prev.deck.toSpliced(selectedCardIndex, 1)],
      };
    });
  }

  // Explore
  function explore(selectedCardIndex: number) {
    setGame((prev) => {
      if (prev.ended || prev.deck.length === 0) return prev;

      const card = prev.deck[selectedCardIndex];
      if (!card || !card.faceUp || !isNumber(card)) return prev;

      const moved = rotate(prev.deck, rankValue(card));
      return resolveLanding({ ...prev, deck: moved });
    });
  }

  function returnToMarked(pathCard: LoopCard, indexOfPathCard: number) {
    setGame((prev) => {
      if (prev.ended) return prev;
      const notes = prev.notes.filter((_, i) => i !== indexOfPathCard);
      return { ...prev, notes, deck: [pathCard, ...prev.deck] };
    });
  }

  return (
    <GameWrapper
      ended={game.ended}
      won={game.won}
      reset={reset}
      isLoaded={isLoaded}
      winLoseMessage={
        game.won
          ? "You escaped with all four jewels."
          : "You were trapped or hit a revealed trap."
      }
    >
      <View
        style={[
          flexStyles.rowCentered,
          flexStyles.fullWidth,
          flexStyles.gap2,
          {
            position: "relative",
            aspectRatio: 1,
          },
        ]}
      >
        <View
          style={[
            {
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
            },
          ]}
        >
          <Text style={textStyles.default}>
            Looted cards: {game.scorePile.length}
            <br />
            Jewels (Aces): {aceCount}/4
          </Text>
        </View>

        {game.deck.map((card, index) => {
          let angle = index * 6 - 180;
          const topCardAngleIncrease = 8;

          if (index === 0) {
            angle -= topCardAngleIncrease;
          } else if (index === 1) {
            // angle -= topCardAngleIncrease;
          }

          const style: ViewStyle = {
            position: "absolute",
            transform: [{ rotate: `${angle}deg` }, { translateY: -210 }],
            zIndex: 100 - index,
          };

          const onPressFn = () => {
            if (index > 1) return undefined;

            if (!card.faceUp) {
              if (index === 0) {
                return lookAround;
              }

              return undefined;
            } else {
              return () =>
                setSelectedCardIndex(
                  selectedCardIndex === index ? undefined : index,
                );
            }
          };

          return (
            <CardButton
              key={`deck-${index}`}
              onPress={onPressFn()}
              suit={card.faceUp ? card.suit : undefined}
              rank={card.faceUp ? card.rank : undefined}
              style={[style]}
              isSelected={selectedCardIndex === index}
            />
          );
        })}
      </View>

      <View
        style={[flexStyles.rowCentered, flexStyles.fullWidth, flexStyles.gap12]}
      >
        <Button
          text="Explore"
          onPress={() => {
            if (selectedCardIndex !== undefined) {
              explore(selectedCardIndex);
            }
          }}
          disabled={
            selectedCardIndex === undefined ||
            !isNumber(game.deck[selectedCardIndex]) ||
            !game.deck[selectedCardIndex].faceUp
          }
          // size="large"
          style={[flexStyles.flex1]}
        />

        <Button
          text="Mark Path"
          onPress={() => {
            if (selectedCardIndex !== undefined) {
              markPath(selectedCardIndex);
            }
          }}
          disabled={
            selectedCardIndex === undefined ||
            !isNumber(game.deck[selectedCardIndex]) ||
            !game.deck[selectedCardIndex].faceUp ||
            game.notes.length >= 3
          }
          // size="large"
          style={[flexStyles.flex1]}
        />

        <Button
          text="Look Around"
          onPress={lookAround}
          disabled={game.ended || game.deck.length === 0 || game.deck[0].faceUp}
          // size="large"
          style={[flexStyles.flex1]}
        />
      </View>

      {game.notes.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.notesRow}>
            {game.notes.map((card, idx) => (
              <CardButton
                key={`note-${idx}-${card}`}
                onPress={() => returnToMarked(card, idx)}
                cardsPerRow={8}
                suit={card.suit}
                rank={card.rank}
              />
            ))}
          </View>
        </View>
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
