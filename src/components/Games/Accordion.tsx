import { useGameLoading } from "@/hooks/useGameLoading";
import { flexStyles } from "@/styles/flexStyles";
import { useRef, useState } from "react";
import { View } from "react-native";
import { useAnimations } from "../Animations/Animations";
import {
  CardGrid,
  CardSelectColor,
  CardSizes,
  useCardSize,
} from "../Cards/Card";
import { createDeck, shuffle, type PlayingCard } from "../Cards/card-utils";
import { CardButton } from "../Cards/CardButton";
import { GameWrapper } from "../common/GameWrapper";

const cardsPerRow = 6;
const gridCols = 6;
const gridGap = 10;

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
  const { gridWidth } = useCardSize(cardsPerRow, gridCols);
  const isLoaded = useGameLoading();
  const { animateCards, measureRef, isAnimating } = useAnimations();
  const cardRefs = useRef<(View | null)[]>([]);
  const [hiddenIndices, setHiddenIndices] = useState<Set<number>>(new Set());

  const [game, setGame] = useState<AccordionState>(setup);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  function reset() {
    setGame(setup());
    setSelectedIndex(null);
  }

  function onCardPress(index: number) {
    if (isAnimating || game.ended) return;

    if (selectedIndex === null) {
      setSelectedIndex(index);
      return;
    }

    if (selectedIndex === index) {
      setSelectedIndex(null);
      return;
    }

    const source = selectedIndex;
    const target = index;
    const validDistance = source - target === 1 || source - target === 3;
    if (!validDistance) {
      setSelectedIndex(index);
      return;
    }

    const srcCard = game.line[source];
    const targetCard = game.line[target];
    if (!srcCard || !targetCard || !canMerge(srcCard, targetCard)) {
      setSelectedIndex(index);
      return;
    }

    performMergeAnimation(source, target, srcCard);
  }

  async function performMergeAnimation(
    source: number,
    target: number,
    srcCard: PlayingCard,
  ) {
    const positions = await Promise.all(
      game.line.map((_, i) => {
        const el = cardRefs.current[i];
        return el ? measureRef({ current: el }) : Promise.resolve(null);
      }),
    );

    const srcPos = positions[source];
    const tgtPos = positions[target];

    if (srcPos && tgtPos) {
      setHiddenIndices(new Set([source]));

      await animateCards([
        {
          card: srcCard,
          cardSize: "small-colored",
          from: { ...srcPos, zIndex: 100 },
          to: { ...tgtPos, zIndex: 100 },
          duration: 150,
          cardsPerRow,
        },
      ]);
    }

    const shiftAnims = [];
    const shiftingIndices = new Set([source, target]);

    for (let i = source + 1; i < game.line.length; i++) {
      const fromPos = positions[i];
      const toPos = positions[i - 1];
      const card = game.line[i];
      if (fromPos && toPos) {
        shiftingIndices.add(i);
        shiftAnims.push({
          id: `shift-${i}-${Date.now()}`,
          card,
          cardSize: "small-colored" as CardSizes,
          cardsPerRow,
          from: { ...fromPos, zIndex: 50 },
          to: { ...toPos, zIndex: 50 },
          duration: 150,
          delay: (i - source - 1) * 20,
        });
      }
    }

    setHiddenIndices(shiftingIndices);

    if (shiftAnims.length > 0) {
      await animateCards(shiftAnims);
    }

    const line = [...game.line];
    line[target] = srcCard;
    line.splice(source, 1);

    const won = line.length === 1;
    const ended = won || !hasAnyMove(line);

    setGame((prev) => ({
      ...prev,
      line,
      ended,
      won,
    }));

    setSelectedIndex(null);
    setHiddenIndices(new Set());
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
        : "purple";
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
      <CardGrid
        cardsPerRow={cardsPerRow}
        // style={[
        //   {
        //     ...flexStyles.rowCentered,
        //     width: gridWidth,
        //     flexWrap: "wrap",
        //     justifyContent: "flex-start",
        //     marginHorizontal: "auto",
        //     gap: gridGap,
        //   },
        // ]}
      >
        {game.line.map((card, idx) => {
          const selectedColor = selectColor(idx) as CardSelectColor;

          return (
            <CardButton
              key={card.id}
              ref={(el) => {
                cardRefs.current[idx] = el;
              }}
              style={[{ opacity: hiddenIndices.has(idx) ? 0 : 1 }]}
              onPress={() => onCardPress(idx)}
              disabled={game.ended}
              isSelected={selectedIndex === idx}
              selectColor={isAnimating ? "none" : selectedColor}
              forceOverlay={!isAnimating && selectedColor !== "none"}
              card={card}
              cardsPerRow={cardsPerRow}
              cardSize="small-colored"
            />
          );
        })}
      </CardGrid>
    </GameWrapper>
  );
}
