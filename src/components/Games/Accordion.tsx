import { useGameLoading } from "@/hooks/useGameLoading";
import { flexStyles } from "@/styles/flexStyles";
import { textStyles } from "@/styles/textStyles";
import { useMemo, useState } from "react";
import { Text, View, ViewStyle } from "react-native";
import { CardSelectColor } from "../Cards/Card";
import { createDeck, shuffle, type PlayingCard } from "../Cards/card-utils";
import { CardButton } from "../Cards/CardButton";
import { GameWrapper } from "../common/GameWrapper";

type AccordionState = {
  line: PlayingCard[];
  ended: boolean;
  won: boolean;
};

function setup(): AccordionState {
  return {
    line: shuffle(createDeck({ faceUp: true })),
    ended: false,
    won: false,
  };
}

function canMerge(source: PlayingCard, target: PlayingCard) {
  return source.rank === target.rank || source.suit === target.suit;
}

function hasAnyMove(line: PlayingCard[]) {
  for (let i = 0; i < line.length; i += 1) {
    const oneLeft = i - 1;
    const threeLeft = i - 3;
    if (oneLeft >= 0 && canMerge(line[i], line[oneLeft])) return true;
    if (threeLeft >= 0 && canMerge(line[i], line[threeLeft])) return true;
  }
  return false;
}

export default function Accordion() {
  const isLoaded = useGameLoading();

  const [game, setGame] = useState<AccordionState>(setup);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const moveCount = useMemo(() => 52 - game.line.length, [game.line.length]);

  function reset() {
    setGame(setup());
    setSelectedIndex(null);
  }

  function onCardPress(index: number) {
    setGame((prev) => {
      if (prev.ended) return prev;

      if (selectedIndex === null) {
        setSelectedIndex(index);
        return prev;
      }

      if (selectedIndex === index) {
        setSelectedIndex(null);
        return prev;
      }

      const source = selectedIndex;
      const target = index;
      const validDistance = source - target === 1 || source - target === 3;
      if (!validDistance) {
        setSelectedIndex(index);
        return prev;
      }

      const srcCard = prev.line[source];
      const targetCard = prev.line[target];
      if (!srcCard || !targetCard || !canMerge(srcCard, targetCard)) {
        setSelectedIndex(index);
        return prev;
      }

      const line = [...prev.line];
      line[target] = srcCard;
      line.splice(source, 1);

      const won = line.length === 1;
      const ended = won || !hasAnyMove(line);
      setSelectedIndex(null);

      return {
        ...prev,
        line,
        ended,
        won,
      };
    });
  }

  function selectColor(idx: number): string {
    if (selectedIndex === idx) {
      // Current card
      return "green";
    } else if (
      selectedIndex &&
      (idx === selectedIndex - 3 ||
        (selectedIndex && idx === selectedIndex - 1))
    ) {
      // Card 1 or 3 to the left
      return game.line[idx].suit === game.line[selectedIndex].suit
        ? "green"
        : "orange";
    } else {
      // Other cards
      return "none";
    }
  }

  return (
    <GameWrapper
      ended={game.ended}
      won={game.won}
      reset={reset}
      isLoaded={isLoaded}
      winLoseMessage={
        game.won
          ? "You compressed the deck to one card."
          : "No legal moves remain."
      }
    >
      <View
        style={[
          {
            ...flexStyles.rowCentered,
            ...flexStyles.fullWidth,
            flexWrap: "wrap",
            padding: 10,
            gap: 12,
          },
        ]}
      >
        {game.line.map((card, idx) => {
          const selectedColor = selectColor(idx) as CardSelectColor;

          return (
            <CardButton
              key={card.id}
              onPress={() => onCardPress(idx)}
              disabled={game.ended}
              isSelected={selectedIndex === idx}
              selectColor={selectedColor}
              suit={card.suit}
              rank={card.rank}
              cardsPerRow={8}
              cardSize="small-colored"
            />
          );
        })}
      </View>
    </GameWrapper>
  );
}
