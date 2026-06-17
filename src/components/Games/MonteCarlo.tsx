import { useGameLoading } from "@/hooks/useGameLoading";
import { cardStyles } from "@/styles/cardStyles";
import { flexStyles } from "@/styles/flexStyles";
import { useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { CardAnimationParams, useAnimations } from "../Animations/Animations";
import { Button } from "../Button/Button";
import { CardGrid } from "../Cards/CardOLD";
import { createDeck, shuffle, type PlayingCard } from "../Cards/card-utils";
import { CardButton } from "../Cards/CardButtonOLD";
import { Deck } from "../Cards/Deck";
import { GameWrapper } from "../common/GameWrapper";
import { useLayoutManager } from "@/hooks/useLayoutManager";

const cardsPerRow = 6;
const gridWidth = 5;
const animationDuration = 250;
const animationDelay = 80;

type MonteCarloState = {
  grid: (PlayingCard | null)[];
  stock: PlayingCard[];
  removed: number;
  ended: boolean;
  won: boolean;
};

function setup(): MonteCarloState {
  const deck = shuffle(createDeck({ faceUp: true }));
  const grid: (PlayingCard | null)[] = Array(25).fill(null);

  for (let i = 0; i < 25; i += 1) {
    grid[i] = deck.shift() ?? null;
  }

  return {
    grid,
    stock: deck,
    removed: 0,
    ended: false,
    won: false,
  };
}

function isAdjacent(indexA: number, indexB: number) {
  const rowA = Math.floor(indexA / 5);
  const colA = indexA % 5;
  const rowB = Math.floor(indexB / 5);
  const colB = indexB % 5;
  const rowDelta = Math.abs(rowA - rowB);
  const colDelta = Math.abs(colA - colB);
  if (rowDelta === 0 && colDelta === 0) return false;
  return rowDelta <= 1 && colDelta <= 1;
}

function countCards(grid: (PlayingCard | null)[]) {
  let total = 0;
  for (const cell of grid) {
    if (cell?.faceUp) total += 1;
  }
  return total;
}

function countFaceDownCardsInGrid(grid: (PlayingCard | null)[]) {
  let total = 0;
  for (const cell of grid) {
    if (cell && !cell.faceUp) total++;
  }
  return total;
}

function hasFaceDownCards(grid: (PlayingCard | null)[]) {
  return countFaceDownCardsInGrid(grid) !== 0;
}

function hasPair(grid: (PlayingCard | null)[]) {
  for (let i = 0; i < 25; i += 1) {
    const base = grid[i];
    if (!base) continue;

    for (let j = 0; j < 25; j += 1) {
      if (i === j) continue;
      const other = grid[j];
      if (other && other.rank === base.rank && isAdjacent(i, j)) {
        return true;
      }
    }
  }

  return false;
}

function evaluateEnd(state: MonteCarloState) {
  const cardsInPlay = countCards(state.grid) + state.stock.length;
  if (cardsInPlay === 0) return { ended: true, won: true };
  if (hasPair(state.grid)) return { ended: false, won: false };
  if (state.stock.length > 0) return { ended: false, won: false };
  return { ended: true, won: false };
}

export default function MonteCarlo() {
  const { isLoaded, showIntro, setShowIntro } = useGameLoading();
  const { animateCards, isAnimating, animatingCardIds } = useAnimations();

  const [game, setGame] = useState<MonteCarloState>(setup);
  const [selected, setSelected] = useState<number[] | null>(null);

  const { getLayout, setRef } = useLayoutManager([
    "tableauRefs",
    "stockDeckRef",
    "discardDeckRef",
  ]);

  function reset() {
    setGame(setup());
    setSelected(null);
  }

  function selectCell(index: number) {
    setGame((prev) => {
      if (prev.ended) return prev;

      const card = prev.grid[index];
      if (!card) {
        setSelected(null);
        return prev;
      } else if (!selected) {
        setSelected([index]);
        return prev;
      } else if (selected[0] === index) {
        setSelected(null);
        return prev;
      }

      const other = prev.grid[selected[0]];

      if (!other) {
        setSelected(null);
        return prev;
      } else if (!isAdjacent(selected[0], index) || other.rank !== card.rank) {
        setSelected([index]);
        return prev;
      }

      setSelected((s) => {
        const selectedPair = [index];
        const prevCardIndex = s?.[0];

        if (prevCardIndex !== undefined) {
          selectedPair.push(prevCardIndex);
        }

        return selectedPair;
      });

      return prev;
    });
  }

  async function flipCards(selectedIndices: number[]) {
    const anims: CardAnimationParams[] = [];

    for (let i = 0; i < 2; i += 1) {
      const index = selectedIndices[i];
      const card = game.grid[index];

      if (!card) continue;
      let cardPos = getLayout("tableauRefs", index);
      if (cardPos) {
        anims.push({
          card,
          cardsPerRow,
          cardSize: "small",
          flip: "toBack",
          from: cardPos,
          to: cardPos,
        });
      }
    }

    if (anims.length > 0) {
      await animateCards(anims);
    }

    setGame((prev) => {
      if (!selected) return prev;

      const card1 = prev.grid[selected[0]];
      const card2 = prev.grid[selected[1]];

      if (!selected || !card1 || !card2) return prev;

      const grid = [...prev.grid];
      grid[selected[0]] = { ...card1, faceUp: false };
      grid[selected[1]] = { ...card2, faceUp: false };

      const next = { ...prev, grid };
      const end = evaluateEnd(next);

      setSelected(null);

      return { ...next, ...end };
    });
  }

  async function consolidateAndDeal() {
    if (game.ended || isAnimating) return;

    // Prepare animations
    const removedCards = countFaceDownCardsInGrid(game.grid);
    const discardDeckPos = getLayout("discardDeckRef");
    const stockDeckPos = getLayout("stockDeckRef");

    const anims: CardAnimationParams[] = [];
    let delayCount = 0;

    // Animate flipped cards to discard
    for (let i = 0; i < 25; i++) {
      const card = game.grid[i];
      if (card && !card.faceUp) {
        const pos = getLayout("tableauRefs", i);
        if (pos && discardDeckPos) {
          anims.push({
            card,
            cardSize: "small",
            cardsPerRow,
            from: { ...pos, zIndex: 80 },
            to: { ...discardDeckPos, zIndex: 80 },
            duration: animationDuration,
            delay: delayCount * animationDelay,
          });
          delayCount++;
        }
      }
    }

    let tgtIdx = 0;
    const nextGrid: (PlayingCard | null)[] = Array(25).fill(null);

    // Animate moving cards to their new locations
    for (let i = 0; i < 25; i++) {
      const card = game.grid[i];
      if (card && card.faceUp) {
        if (i !== tgtIdx) {
          const fromPos = getLayout("tableauRefs", i);
          const toPos = getLayout("tableauRefs", tgtIdx);
          if (fromPos && toPos) {
            anims.push({
              card,
              cardSize: "small",
              cardsPerRow,
              from: { ...fromPos, zIndex: 50 },
              to: { ...toPos, zIndex: 50 },
              duration: animationDuration,
              delay: delayCount * animationDelay,
            });
            delayCount++;
          }
        }
        nextGrid[tgtIdx] = card;
        tgtIdx++;
      }
    }

    const stockCards = [...game.stock];

    for (let i = tgtIdx; i < 25; i++) {
      if (stockCards.length > 0) {
        const nextCard = stockCards.shift()!;
        nextGrid[i] = nextCard;
        const toPos = getLayout("tableauRefs", i);
        if (stockDeckPos && toPos) {
          anims.push({
            card: nextCard,
            cardSize: "small",
            cardsPerRow,
            from: { ...stockDeckPos, zIndex: 60 },
            to: { ...toPos, zIndex: 60 },
            duration: animationDuration,
            delay: delayCount * animationDelay,
            flip: "toFace",
          });
          delayCount++;
        }
      }
    }

    if (anims.length > 0) {
      await animateCards(anims);
    }

    setGame((prev) => {
      const next = {
        ...prev,
        grid: nextGrid,
        stock: stockCards,
        removed: prev.removed + removedCards,
      };

      const end = evaluateEnd(next);
      return { ...next, ...end };
    });

    setSelected(null);
  }

  const hasFaceDownCard = useMemo(() => {
    return hasFaceDownCards(game.grid);
  }, [game.grid]);

  useEffect(() => {
    if (selected?.length === 2) {
      flipCards(selected);
    }
  }, [selected]);

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
          ? "You cleared all cards!"
          : "No adjacent pairs, and stock is empty."
      }
    >
      <View
        style={[
          flexStyles.rowCentered,
          flexStyles.fullWidth,
          flexStyles.justifyEvenly,
        ]}
      >
        <Deck
          refTop={setRef("stockDeckRef")}
          backCount={game.stock.length}
          iconName="draw"
          showCount
          countPosition="left"
          cardsPerRow={cardsPerRow}
          limitFan
          fan="horizontalRight"
        />

        <Deck
          refNext={setRef("discardDeckRef")}
          backCount={game.removed}
          iconName="delete"
          showCount
          countPosition="right"
          cardsPerRow={cardsPerRow}
          limitFan
          fan="horizontalLeft"
        />
      </View>

      <CardGrid
        cardsPerRow={cardsPerRow}
        targetGridCols={gridWidth}
        style={[{ marginHorizontal: "auto" }]}
      >
        {game.grid.map((cell, index) => {
          const isSelected = !!selected?.includes(index);

          return (
            <CardButton
              ref={setRef("tableauRefs", index)}
              key={`mc-${index}`}
              onPress={() => selectCell(index)}
              disabled={isAnimating || !cell?.suit || !cell?.rank || game.ended}
              card={cell}
              cardsPerRow={cardsPerRow}
              isSelected={isSelected}
              cardSize="small"
              selectColor={isSelected ? "green" : "none"}
              style={[
                ((isAnimating && isSelected) ||
                  cell === null ||
                  animatingCardIds.includes(cell.id)) &&
                  cardStyles.animHide,
              ]}
            />
          );
        })}
      </CardGrid>

      <Button
        onPress={consolidateAndDeal}
        disabled={game.ended || isAnimating || !hasFaceDownCard}
        text="Consolidate"
        fullWidth
        size="large"
      />
    </GameWrapper>
  );
}
