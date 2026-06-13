import { useGameLoading } from "@/hooks/useGameLoading";
import { useLayoutManager } from "@/hooks/useLayoutManager";
import { useUndoHistory } from "@/hooks/useUndoHistory";
import { cardStyles } from "@/styles/cardStyles";
import { useState } from "react";
import { CardAnimationParams, useAnimations } from "../Animations/Animations";
import { CardGrid, CardSelectColor, CardSizes } from "../Cards/Card";
import { createDeck, shuffle, type PlayingCard } from "../Cards/card-utils";
import { CardButton } from "../Cards/CardButton";
import { GameWrapper } from "../common/GameWrapper";

const cardsPerRow = 6;

type AccordionState = {
  line: PlayingCard[];
  ended: boolean;
  won: boolean;
};

type GameSnapshot = {
  game: AccordionState;
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
  const { isLoaded, showIntro, setShowIntro } = useGameLoading();
  const { animateCards, isAnimating, animatingCardIds } = useAnimations();

  const { getLayout, setRef } = useLayoutManager(["card"]);

  const [game, setGame] = useState<AccordionState>(setup);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const { saveUndoState, undo, canUndo, clearHistory } =
    useUndoHistory<GameSnapshot>();
  const handleUndo = () => {
    const previousState = undo();
    if (previousState) {
      setGame(previousState.game);
    }
  };

  function reset() {
    clearHistory();
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
    saveUndoState(structuredClone({ game }));

    const positions = game.line.map((_, i) => getLayout("card", i));
    const srcPos = positions[source];
    const tgtPos = positions[target];

    if (srcPos && tgtPos) {
      await animateCards([
        {
          card: srcCard,
          cardSize: "small",
          from: { ...srcPos, zIndex: 100 },
          to: { ...tgtPos, zIndex: 100 },
          cardsPerRow,
        },
      ]);
    }

    const anims: CardAnimationParams[] = [];
    const shiftingIndices = new Set([source, target]);

    for (let i = source + 1; i < game.line.length; i++) {
      const fromPos = positions[i];
      const toPos = positions[i - 1];
      const card = game.line[i];
      if (fromPos && toPos) {
        shiftingIndices.add(i);
        anims.push({
          card,
          cardSize: "small" as CardSizes,
          cardsPerRow,
          from: { ...fromPos, zIndex: 50 },
          to: { ...toPos, zIndex: 50 },
          duration: 150,
          delay: (i - source - 1) * 20,
        });
      }
    }

    if (anims.length > 0) {
      await animateCards(anims);
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
      return canMerge(game.line[idx], game.line[selectedIndex])
        ? "green"
        : "purple";
    } else {
      // Other cards
      return "none";
    }
  }

  return (
    <GameWrapper
      showIntro={showIntro}
      setShowIntro={setShowIntro}
      ended={game.ended}
      won={game.won}
      reset={reset}
      isLoaded={isLoaded}
      winLoseMessage={
        game.won
          ? "You compressed the deck to one card."
          : "No legal moves remain."
      }
      canUndo={canUndo}
      handleUndo={handleUndo}
    >
      <CardGrid cardsPerRow={cardsPerRow}>
        {game.line.map((card, idx) => {
          const selectedColor = selectColor(idx) as CardSelectColor;

          return (
            <CardButton
              key={card.id}
              ref={setRef("card", idx)}
              onPress={() => onCardPress(idx)}
              disabled={game.ended}
              isSelected={selectedIndex === idx}
              selectColor={isAnimating ? "none" : selectedColor}
              forceOverlay={!isAnimating}
              card={card}
              cardsPerRow={cardsPerRow}
              cardSize="small"
              style={[
                animatingCardIds.includes(card.id) && cardStyles.animHide,
              ]}
            />
          );
        })}
      </CardGrid>
    </GameWrapper>
  );
}
