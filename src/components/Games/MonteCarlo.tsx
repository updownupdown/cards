import { useGameLoading } from "@/hooks/useGameLoading";
import { cardStyles } from "@/styles/cardStyles";
import { flexStyles } from "@/styles/flexStyles";
import { textStyles } from "@/styles/textStyles";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../Button/Button";
import { createDeck, shuffle, type PlayingCard } from "../Cards/card-utils";
import { CardButton } from "../Cards/CardButton";
import { GameWrapper } from "../common/GameWrapper";

const cardsPerRow = 5.5;

type Cell = PlayingCard | null;
type Selection = { row: number; col: number } | null;

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
      if (cell) total += 1;
    }
  }
  return total;
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
      if (card) flat.push(card);
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

export default function MonteCarlo() {
  const isLoaded = useGameLoading();

  const [game, setGame] = useState<MonteCarloState>(setup);
  const [selected, setSelected] = useState<Selection>(null);

  const cardsOnGrid = useMemo(() => countCards(game.grid), [game.grid]);
  const canConsolidate = useMemo(() => !hasPair(game.grid), [game.grid]);

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
      }

      if (!selected) {
        setSelected({ row, col });
        return prev;
      }

      if (selected.row === row && selected.col === col) {
        setSelected(null);
        return prev;
      }

      const other = prev.grid[selected.row][selected.col];
      if (!other) {
        setSelected(null);
        return prev;
      }

      if (!isAdjacent(selected, { row, col }) || other.rank !== card.rank) {
        setSelected({ row, col });
        return prev;
      }

      const grid = prev.grid.map((line) => [...line]);
      grid[selected.row][selected.col] = null;
      grid[row][col] = null;
      const next = { ...prev, grid, removed: prev.removed + 2 };
      const end = evaluateEnd(next);
      setSelected(null);
      return { ...next, ...end };
    });
  }

  function consolidateAndDeal() {
    setGame((prev) => {
      if (prev.ended) return prev;
      // if (hasPair(prev.grid)) return prev;

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

      const next = { ...prev, grid, stock };
      const end = evaluateEnd(next);
      return { ...next, ...end };
    });

    setSelected(null);
  }

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
        <Text style={textStyles.default}>
          Cards on grid: {cardsOnGrid} - Stock: {game.stock.length} - Removed:{" "}
          {game.removed}
        </Text>
      </View>

      <View style={[{ ...cardStyles.row }]}>
        {game.grid.map((row, r) => {
          return (
            <View key={`row-${r}`} style={[{ ...flexStyles.colCentered }]}>
              {row.map((cell, c) => {
                const isSelected = selected?.row === r && selected?.col === c;
                return (
                  <CardButton
                    key={`mc-${r}-${c}`}
                    onPress={() => selectCell(r, c)}
                    disabled={!cell?.suit || !cell?.rank || game.ended}
                    suit={cell?.suit}
                    rank={cell?.rank}
                    cardsPerRow={cardsPerRow}
                    isSelected={isSelected}
                    hasTopMargin={c > 0}
                  />
                );
              })}
            </View>
          );
        })}
      </View>

      <Button
        onPress={consolidateAndDeal}
        // disabled={!canConsolidate || game.ended}
        disabled={game.ended}
        text="Consolidate / Deal"
        fullWidth
        size="large"
      />
    </GameWrapper>
  );
}

const styles = StyleSheet.create({
  cell: {
    width: "18%",
    alignItems: "center",
    borderRadius: 8,
    paddingVertical: 2,
  },
});
