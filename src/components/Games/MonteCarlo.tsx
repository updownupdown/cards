import { useGameLoading } from "@/hooks/useGameLoading";
import { flexStyles } from "@/styles/flexStyles";
import { useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { Button } from "../Button/Button";
import { useCardSize } from "../Cards/Card";
import { createDeck, shuffle, type PlayingCard } from "../Cards/card-utils";
import { CardButton } from "../Cards/CardButton";
import { Deck } from "../Cards/Deck";
import { GameWrapper } from "../common/GameWrapper";
import { CardAnimationParams, useAnimations } from "../Animations/Animations";
import { cardStyles } from "@/styles/cardStyles";

const cardsPerRow = 6;

type Cell = PlayingCard | null;

type MonteCarloState = {
  grid: Cell[][];
  stock: PlayingCard[];
  removed: number;
  ended: boolean;
  won: boolean;
};

function setup(): MonteCarloState {
  const deck = shuffle(createDeck({ faceUp: true }));
  const grid: Cell[][] = Array.from({ length: 5 }, () =>
    Array.from({ length: 5 }, () => null),
  );

  for (let r = 0; r < 5; r += 1) {
    for (let c = 0; c < 5; c += 1) {
      const card = deck.shift();
      grid[r][c] = card ?? null;
    }
  }

  return {
    grid,
    stock: deck,
    removed: 0,
    ended: false,
    won: false,
  };
}

function isAdjacent(
  a: { row: number; col: number },
  b: { row: number; col: number },
) {
  const rowDelta = Math.abs(a.row - b.row);
  const colDelta = Math.abs(a.col - b.col);
  if (rowDelta === 0 && colDelta === 0) return false;
  return rowDelta <= 1 && colDelta <= 1;
}

function countCards(grid: Cell[][]) {
  let total = 0;
  for (const row of grid) {
    for (const cell of row) {
      if (cell?.faceUp) total += 1;
    }
  }
  return total;
}

function countFaceDownCardsInGrid(grid: Cell[][]) {
  let total = 0;
  for (const row of grid) {
    for (const cell of row) {
      if (cell && !cell.faceUp) total++;
    }
  }
  return total;
}

function hasFaceDownCards(grid: Cell[][]) {
  return countFaceDownCardsInGrid(grid) !== 0;
}

function hasPair(grid: Cell[][]) {
  for (let r = 0; r < 5; r += 1) {
    for (let c = 0; c < 5; c += 1) {
      const base = grid[r][c];
      if (!base) continue;

      for (let rr = Math.max(0, r - 1); rr <= Math.min(4, r + 1); rr += 1) {
        for (let cc = Math.max(0, c - 1); cc <= Math.min(4, c + 1); cc += 1) {
          if (rr === r && cc === c) continue;
          const other = grid[rr][cc];
          if (other && other.rank === base.rank) return true;
        }
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

function compactGrid(grid: Cell[][]) {
  const flat: PlayingCard[] = [];

  for (let r = 0; r < 5; r += 1) {
    for (let c = 0; c < 5; c += 1) {
      const card = grid[r][c];
      if (card?.faceUp) flat.push(card);
    }
  }

  const next: Cell[][] = Array.from({ length: 5 }, () =>
    Array.from({ length: 5 }, () => null),
  );

  let idx = 0;

  for (let r = 0; r < 5; r += 1) {
    for (let c = 0; c < 5; c += 1) {
      next[r][c] = flat[idx] ?? null;
      idx += 1;
    }
  }

  return next;
}

type SelectedCard = { row: number; col: number };

export default function MonteCarlo() {
  const isLoaded = useGameLoading();
  const { animateCards, measureRef, isAnimating, setIsAnimating } =
    useAnimations();

  const [game, setGame] = useState<MonteCarloState>(setup);
  const [selected, setSelected] = useState<
    { row: number; col: number }[] | null
  >(null);

  function reset() {
    setGame(setup());
    setSelected(null);
  }

  function selectCell(row: number, col: number) {
    setGame((prev) => {
      if (prev.ended) return prev;

      const card = prev.grid[row][col];
      if (!card) {
        setSelected(null);
        return prev;
      } else if (!selected) {
        setSelected([{ row, col }]);
        return prev;
      } else if (selected[0].row === row && selected[0].col === col) {
        setSelected(null);
        return prev;
      }

      const other = prev.grid[selected[0].row][selected[0].col];

      if (!other) {
        setSelected(null);
        return prev;
      } else if (
        !isAdjacent(selected[0], { row, col }) ||
        other.rank !== card.rank
      ) {
        setSelected([{ row, col }]);
        return prev;
      }

      setSelected((s) => {
        const selectedPair = [{ row, col }];
        const prevCard = s?.[0];

        if (prevCard) {
          selectedPair.push(prevCard);
        }

        return selectedPair;
      });

      return prev;
    });
  }

  async function flipCards(selected: SelectedCard[]) {
    const anims: CardAnimationParams[] = [];

    for (let i = 0; i < 2; i += 1) {
      const row = selected[i].row;
      const col = selected[i].col;
      const card = game.grid[row][col];

      if (!card) continue;
      const cardEl = tableauRefs.current[row][col];
      if (!cardEl) continue;
      let cardPos = await measureRef({ current: cardEl });
      if (cardPos) {
        anims.push({
          id: `anim-${row}-${col}`,
          cardInfo: {
            rank: card.rank,
            suit: card.suit,
            cardsPerRow: cardsPerRow,
            cardSize: "small",
          },
          flip: "toBack",
          from: cardPos,
          to: cardPos,
          duration: 350,
        });
      }
    }

    setIsAnimating(true);
    if (anims.length > 0) {
      await animateCards(anims);
    }

    setGame((prev) => {
      if (!selected) return prev;

      const card1 = prev.grid[selected[0].row][selected[0].col];
      const card2 = prev.grid[selected[1].row][selected[1].col];

      if (!selected || !card1 || !card2) return prev;

      const grid = prev.grid.map((line) => [...line]);
      grid[selected[0].row][selected[0].col] = { ...card1, faceUp: false };
      grid[selected[1].row][selected[1].col] = { ...card2, faceUp: false };

      const next = { ...prev, grid };
      const end = evaluateEnd(next);

      setSelected(null);

      return { ...next, ...end };
    });

    setIsAnimating(false);
  }

  function consolidateAndDeal() {
    setGame((prev) => {
      if (prev.ended) return prev;

      const removedCards = countFaceDownCardsInGrid(prev.grid);

      let grid = compactGrid(prev.grid);
      const stock = [...prev.stock];

      for (let r = 0; r < 5; r += 1) {
        for (let c = 0; c < 5; c += 1) {
          if (!grid[r][c] && stock.length > 0) {
            const next = stock.shift();
            grid[r][c] = next ?? null;
          }
        }
      }

      const next = {
        ...prev,
        grid,
        stock,
        removed: prev.removed + removedCards,
      };
      const end = evaluateEnd(next);
      return { ...next, ...end };
    });

    setSelected(null);
  }

  const { height } = useCardSize(cardsPerRow);
  const cardMarginPerc = 0.2;
  const CardsGap = useMemo(() => height * cardMarginPerc, [height]);

  const hasFaceDownCard = useMemo(() => {
    return hasFaceDownCards(game.grid);
  }, [game.grid]);

  const tableauRefs = useRef<(View | null)[][]>([[], [], [], [], []]);

  useEffect(() => {
    if (selected?.length === 2) {
      flipCards(selected);
    }
  }, [selected]);

  return (
    <GameWrapper
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
          backCount={game.stock.length}
          iconName="draw"
          showCount
          countPosition="left"
          cardsPerRow={cardsPerRow}
          limitFan
          fan="horizontalRight"
        />

        <Deck
          backCount={game.removed}
          iconName="delete"
          showCount
          countPosition="right"
          cardsPerRow={cardsPerRow}
          limitFan
          fan="horizontalLeft"
        />
      </View>

      <View style={[flexStyles.rowCentered, { gap: CardsGap }]}>
        {game.grid.map((row, r) => {
          return (
            <View
              key={`row-${r}`}
              style={[flexStyles.colCentered, { gap: CardsGap }]}
            >
              {row.map((cell, c) => {
                const isSelected = !!selected?.find(
                  (sel) => sel.row === r && sel.col === c,
                );

                return (
                  <CardButton
                    ref={(el) => {
                      tableauRefs.current[r][c] = el;
                    }}
                    key={`mc-${r}-${c}`}
                    onPress={() => selectCell(r, c)}
                    disabled={
                      isAnimating || !cell?.suit || !cell?.rank || game.ended
                    }
                    suit={cell?.faceUp ? cell.suit : undefined}
                    rank={cell?.faceUp ? cell.rank : undefined}
                    cardsPerRow={cardsPerRow}
                    isSelected={isSelected}
                    cardSize="small"
                    selectColor={isSelected ? "green" : "none"}
                    style={[
                      ((isAnimating && isSelected) || cell === null) &&
                        cardStyles.animHide,
                    ]}
                  />
                );
              })}
            </View>
          );
        })}
      </View>

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
