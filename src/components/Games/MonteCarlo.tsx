import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Card } from "../Cards/Card";
import InfoModal from "../Modals/InfoModal";
import { createDeck, shuffle, type PlayingCard } from "../Cards/card-utils";
import { GameHeader } from "../common/GameHeader";
import { flexStyles, layoutStyles } from "@/styles/layoutStyles";
import { textStyles } from "@/styles/textStyles";

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
  const [game, setGame] = useState<MonteCarloState>(setup);
  const [selected, setSelected] = useState<Selection>(null);
  const [message, setMessage] = useState(
    "Remove adjacent pairs of equal rank. Consolidate/deal when useful.",
  );

  const cardsOnGrid = useMemo(() => countCards(game.grid), [game.grid]);
  const canConsolidate = useMemo(() => !hasPair(game.grid), [game.grid]);

  function reset() {
    setGame(setup());
    setSelected(null);
    setMessage(
      "Remove adjacent pairs of equal rank. Consolidate/deal when useful.",
    );
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

    setMessage("Selection updated.");
  }

  function consolidateAndDeal() {
    setGame((prev) => {
      if (prev.ended) return prev;
      if (hasPair(prev.grid)) return prev;

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
    setMessage("Consolidated grid and dealt into empty spaces.");
  }

  return (
    <>
      <GameHeader
        gameTitle="Monte Carlo"
        ended={game.ended}
        won={game.won}
        reset={reset}
      />

      <View style={layoutStyles.gameArea}>
        <View
          style={[
            flexStyles.rowCentered,
            flexStyles.fullWidth,
            flexStyles.justifyEvenly,
          ]}
        >
          <Text style={textStyles.default}>Cards on grid: {cardsOnGrid}</Text>
          <Text style={textStyles.default}>Stock: {game.stock.length}</Text>
          <Text style={textStyles.default}>Removed: {game.removed}</Text>
        </View>

        <Text style={textStyles.default}>Message: {message}</Text>

        <View style={styles.grid}>
          {game.grid.map((row, r) =>
            row.map((cell, c) => {
              const isSelected = selected?.row === r && selected?.col === c;
              return (
                <Pressable
                  key={`mc-${r}-${c}`}
                  style={[styles.cell, isSelected ? styles.selectedCell : null]}
                  onPress={() => selectCell(r, c)}
                  disabled={game.ended}
                >
                  {cell ? (
                    <Card suit={cell.suit} rank={cell.rank} widthPerc={15} />
                  ) : (
                    <Card isPlaceholder widthPerc={15} />
                  )}
                </Pressable>
              );
            }),
          )}
        </View>

        <Pressable
          style={[
            styles.button,
            styles.dealButton,
            canConsolidate ? styles.dealEnabled : styles.dealDisabled,
          ]}
          onPress={consolidateAndDeal}
          disabled={!canConsolidate || game.ended}
        >
          <Text style={styles.buttonText}>Consolidate / Deal</Text>
        </Pressable>

        {game.ended ? (
          <Text style={game.won ? styles.winText : styles.loseText}>
            {game.won
              ? "You cleared all cards."
              : "No adjacent pairs and stock is empty."}
          </Text>
        ) : null}
      </View>
    </>
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
    color: "#1f2937",
    fontFamily: "Outfit_600SemiBold",
  },
  button: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#1d4ed8",
    alignSelf: "flex-start",
  },
  dealButton: {
    backgroundColor: "#0f766e",
  },
  dealEnabled: {
    backgroundColor: "#0f766e",
  },
  dealDisabled: {
    backgroundColor: "#94a3b8",
  },
  buttonText: {
    color: "#fff",
    fontFamily: "Outfit_500Medium",
  },
  metaText: {
    color: "#334155",
    fontFamily: "Outfit_400Regular",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 6,
  },
  cell: {
    width: "18%",
    alignItems: "center",
    borderRadius: 8,
    paddingVertical: 2,
  },
  selectedCell: {
    backgroundColor: "rgba(37,99,235,0.16)",
  },
  emptyCell: {
    width: 62,
    height: 90,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.2)",
    backgroundColor: "rgba(255,255,255,0.2)",
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
