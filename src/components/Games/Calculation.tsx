import { useGameLoading } from "@/hooks/useGameLoading";
import { flexStyles } from "@/styles/flexStyles";
import { textStyles } from "@/styles/textStyles";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "../Button/Button";
import { Card } from "../Cards/Card";
import {
  CardRank,
  RANK_VALUE,
  createDeck,
  shuffle,
  type PlayingCard,
} from "../Cards/card-utils";
import { Deck } from "../Cards/Deck";
import { GameWrapper } from "../common/GameWrapper";
import { Colors } from "@/styles/styles";
import { cardStyles } from "@/styles/cardStyles";

const cardsPerRow = 4;

type CalculationState = {
  foundations: PlayingCard[][];
  stock: PlayingCard[];
  waste: PlayingCard[];
  ended: boolean;
  won: boolean;
};

const START_RANKS: CardRank[] = ["A", "2", "3", "4"];
const STEPS = [1, 2, 3, 4];

function nextRankValue(current: number, step: number) {
  const zeroBased = (current - 1 + step) % 13;
  return zeroBased + 1;
}

function setup(): CalculationState {
  const deck = shuffle(createDeck({ faceUp: true }));
  const foundations: PlayingCard[][] = [[], [], [], []];

  for (let i = 0; i < START_RANKS.length; i += 1) {
    const rank = START_RANKS[i];
    const idx = deck.findIndex((card) => card.rank === rank);
    if (idx >= 0) {
      foundations[i].push(deck.splice(idx, 1)[0]);
    }
  }

  return {
    foundations,
    stock: deck,
    waste: [],
    ended: false,
    won: false,
  };
}

function canPlayToFoundation(
  card: PlayingCard,
  foundation: PlayingCard[],
  step: number,
) {
  if (foundation.length === 0) return false;
  const top = foundation[foundation.length - 1];
  const expected = nextRankValue(RANK_VALUE[top.rank], step);
  return RANK_VALUE[card.rank] === expected;
}

function anyFoundationPlayable(
  card: PlayingCard,
  foundations: PlayingCard[][],
) {
  for (let i = 0; i < foundations.length; i += 1) {
    if (canPlayToFoundation(card, foundations[i], STEPS[i])) return true;
  }
  return false;
}

function evaluate(next: CalculationState) {
  const total = next.foundations.reduce((sum, pile) => sum + pile.length, 0);
  if (total === 52) return { ...next, ended: true, won: true };

  const wasteTop = next.waste[next.waste.length - 1] ?? null;
  const canPlayWaste = wasteTop
    ? anyFoundationPlayable(wasteTop, next.foundations)
    : false;

  if (next.stock.length === 0 && !canPlayWaste) {
    return { ...next, ended: true, won: false };
  }

  return next;
}

export default function Calculation() {
  const isLoaded = useGameLoading();

  const [game, setGame] = useState<CalculationState>(setup);

  const wasteTop = game.waste[game.waste.length - 1] ?? null;

  function reset() {
    setGame(setup());
  }

  function draw() {
    setGame((prev) => {
      if (prev.ended || prev.stock.length === 0) return prev;
      const stock = [...prev.stock];
      const card = stock.shift();
      if (!card) return prev;

      const waste = [...prev.waste, card];
      return evaluate({ ...prev, stock, waste });
    });
  }

  function playWasteToFoundation(foundationIndex: number) {
    setGame((prev) => {
      if (prev.ended) return prev;
      const top = prev.waste[prev.waste.length - 1];
      if (!top) return prev;

      const foundations = prev.foundations.map((pile) => [...pile]);
      const foundation = foundations[foundationIndex];
      if (!foundation) return prev;
      if (!canPlayToFoundation(top, foundation, STEPS[foundationIndex]))
        return prev;

      const waste = prev.waste.slice(0, -1);
      foundation.push(top);

      return evaluate({ ...prev, foundations, waste });
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
          ? "All 52 cards are on the foundations."
          : "No legal moves remain."
      }
    >
      <View
        style={[
          flexStyles.rowCentered,
          flexStyles.fullWidth,
          flexStyles.justifyEvenly,
          flexStyles.flex1,
        ]}
      >
        <Deck
          backCount={game.stock.length}
          showCount
          countPosition="left"
          iconName="draw"
          limitFan
          fan="horizontalLeft"
          cardsPerRow={cardsPerRow}
        />

        <Deck
          showCount
          countPosition="right"
          iconName="delete"
          limitFan
          fan="horizontalLeft"
          cards={game.waste}
          cardsPerRow={cardsPerRow}
        />
      </View>

      <View style={[flexStyles.rowCentered, flexStyles.fullWidth]}>
        {game.foundations.map((foundation, i) => {
          return (
            <Pressable
              key={`calc-found-${i}`}
              style={[
                cardStyles.colUpwards,
                flexStyles.gap10,
                flexStyles.fullHeight,
              ]}
              onPress={() => playWasteToFoundation(i)}
              disabled={game.ended || !wasteTop}
            >
              <Deck
                cards={foundation}
                cardsPerRow={cardsPerRow}
                fan="verticalUp"
                limitFan
                showCount
                countPosition="below"
              />

              <Text style={textStyles.h3}>+{STEPS[i]}</Text>
            </Pressable>
          );
        })}
      </View>

      <View
        style={[
          flexStyles.rowCentered,
          flexStyles.fullWidth,
          flexStyles.spaceBetween,
        ]}
      >
        <View style={styles.zone}>
          <Button
            onPress={draw}
            disabled={game.stock.length === 0 || game.ended}
            text="Draw"
            size="large"
            fullWidth
          />
        </View>
      </View>
    </GameWrapper>
  );
}

const styles = StyleSheet.create({
  emptySlot: {
    width: 80,
    height: 116,
    borderWidth: 1,
    borderColor: Colors.K700,
    borderRadius: 8,
    backgroundColor: Colors.K900,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  zone: {
    flex: 1,
    alignItems: "center",
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
