import { useMemo, useState } from "react";
import { GameMenus } from "../common/GameMenus";
import { useGameLoading } from "@/hooks/useGameLoading";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Card } from "../Cards/Card";
import {
  CardRank,
  RANK_VALUE,
  createDeck,
  shuffle,
  type PlayingCard,
} from "../Cards/card-utils";
import { textStyles } from "@/styles/textStyles";

type TableauCard = PlayingCard & { faceUp: boolean };

type ScorpionState = {
  columns: TableauCard[][];
  stock: TableauCard[];
  ended: boolean;
  won: boolean;
};

const DESC_RANKS: CardRank[] = [
  "K",
  "Q",
  "J",
  "10",
  "9",
  "8",
  "7",
  "6",
  "5",
  "4",
  "3",
  "2",
  "A",
];

function setup(): ScorpionState {
  const deck = shuffle(createDeck({ faceUp: true }));
  const columns: TableauCard[][] = Array.from({ length: 7 }, () => []);

  for (let col = 0; col < 7; col += 1) {
    for (let row = 0; row < 7; row += 1) {
      const base = deck.shift();
      if (!base) continue;
      const hidden = col < 4 && row < 3;
      columns[col].push({ ...base, faceUp: !hidden });
    }
  }

  const stock = (deck.splice(0, 3) as TableauCard[]).map((card) => ({
    ...card,
    faceUp: true,
  }));

  return {
    columns,
    stock,
    ended: false,
    won: false,
  };
}

function isDescendingSameSuitRun(cards: TableauCard[]) {
  for (let i = 0; i < cards.length - 1; i += 1) {
    const a = cards[i];
    const b = cards[i + 1];
    if (!a.faceUp || !b.faceUp) return false;
    if (a.suit !== b.suit) return false;
    if (RANK_VALUE[a.rank] !== RANK_VALUE[b.rank] + 1) return false;
  }
  return true;
}

function canAttach(movingTop: TableauCard, targetTop: TableauCard | null) {
  if (!targetTop) return true;
  if (!targetTop.faceUp) return false;
  return RANK_VALUE[targetTop.rank] === RANK_VALUE[movingTop.rank] + 1;
}

function normalizeColumn(column: TableauCard[]) {
  if (column.length === 0) return column;
  const next = [...column];
  const top = next[next.length - 1];
  if (!top.faceUp) {
    next[next.length - 1] = { ...top, faceUp: true };
  }
  return next;
}

function isCompleteSuitStack(column: TableauCard[]) {
  if (column.length !== 13) return false;
  if (!column.every((c) => c.faceUp)) return false;
  const suit = column[0].suit;
  for (let i = 0; i < 13; i += 1) {
    if (column[i].suit !== suit) return false;
    if (column[i].rank !== DESC_RANKS[i]) return false;
  }
  return true;
}

function evaluate(state: ScorpionState) {
  const done = state.columns.filter(isCompleteSuitStack).length;
  if (done === 4) return { ended: true, won: true };
  return { ended: false, won: false };
}

type Selection = { column: number; index: number } | null;

export default function Scorpion() {
  const isLoaded = useGameLoading();

  const [game, setGame] = useState<ScorpionState>(setup);
  const [selected, setSelected] = useState<Selection>(null);
  const [message, setMessage] = useState(
    "Select any face-up card stack, then tap target column. Empty columns accept any card.",
  );

  const completedStacks = useMemo(
    () => game.columns.filter(isCompleteSuitStack).length,
    [game.columns],
  );

  function reset() {
    setGame(setup());
    setSelected(null);
    setMessage(
      "Select any face-up card stack, then tap target column. Empty columns accept any card.",
    );
  }

  function dealStock() {
    setGame((prev) => {
      if (prev.ended || prev.stock.length === 0) return prev;
      const columns = prev.columns.map((col) => [...col]);
      const stock = [...prev.stock];

      for (let i = 0; i < 3; i += 1) {
        const card = stock.shift();
        if (card) columns[i].push(card);
      }

      for (let i = 0; i < columns.length; i += 1) {
        columns[i] = normalizeColumn(columns[i]);
      }

      const next = { ...prev, columns, stock };
      return { ...next, ...evaluate(next) };
    });

    setSelected(null);
    setMessage("Dealt reserve cards to first three columns.");
  }

  function onCardPress(columnIndex: number, cardIndex: number) {
    setGame((prev) => {
      if (prev.ended) return prev;
      const column = prev.columns[columnIndex];
      const card = column?.[cardIndex];
      if (!card || !card.faceUp) return prev;

      if (!selected) {
        const moving = column.slice(cardIndex);
        if (!moving.every((c) => c.faceUp)) return prev;
        setSelected({ column: columnIndex, index: cardIndex });
        return prev;
      }

      if (selected.column === columnIndex && selected.index === cardIndex) {
        setSelected(null);
        return prev;
      }

      const columns = prev.columns.map((col) => [...col]);
      const from = columns[selected.column];
      const to = columns[columnIndex];
      const moving = from.slice(selected.index);

      if (!moving.every((c) => c.faceUp)) {
        setSelected(null);
        return prev;
      }

      const movingTop = moving[0];
      const targetTop = to.length > 0 ? to[to.length - 1] : null;
      if (!canAttach(movingTop, targetTop)) {
        setSelected(null);
        return prev;
      }

      from.splice(selected.index, moving.length);
      to.push(...moving);

      columns[selected.column] = normalizeColumn(from);
      columns[columnIndex] = normalizeColumn(to);

      const next = { ...prev, columns };
      setSelected(null);
      setMessage("Moved run.");
      return { ...next, ...evaluate(next) };
    });
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <GameMenus ended={game.ended} won={game.won} reset={reset} isLoaded={isLoaded} />

      

      <Text style={textStyles.default}>Reserve cards: {game.stock.length}</Text>
      <Text style={textStyles.default}>
        Completed suit stacks: {completedStacks}/4
      </Text>
      <Text style={textStyles.default}>Message: {message}</Text>

      <Pressable
        style={[
          styles.button,
          game.stock.length > 0 ? styles.dealEnabled : styles.dealDisabled,
        ]}
        onPress={dealStock}
        disabled={game.stock.length === 0 || game.ended}
      >
        <Text style={styles.buttonText}>Deal Reserve</Text>
      </Pressable>

      <View style={styles.columnsWrap}>
        {game.columns.map((column, colIdx) => (
          <View key={`sc-col-${colIdx}`} style={styles.column}>
            {column.length === 0 ? (
              <View style={styles.emptySlot}>
                <Text style={styles.smallText}>Empty</Text>
              </View>
            ) : null}
            {column.map((card, idx) => {
              const isSelected =
                selected?.column === colIdx && selected?.index === idx;
              return (
                <Pressable
                  key={card.id}
                  onPress={() => onCardPress(colIdx, idx)}
                  style={[
                    styles.cardPressable,
                    isSelected ? styles.cardSelected : null,
                  ]}
                >
                  <Card
                    suit={card.suit}
                    rank={card.rank}
                    isBack={!card.faceUp}
                    cardsPerRow={5}
                  />
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      {game.ended ? (
        <Text style={game.won ? styles.winText : styles.loseText}>
          {game.won
            ? "All four suit stacks are complete."
            : "No further progress."}
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
  columnsWrap: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
  },
  column: {
    flex: 1,
    gap: 4,
    alignItems: "center",
  },
  cardPressable: {
    borderRadius: 8,
  },
  cardSelected: {
    backgroundColor: "rgba(37,99,235,0.16)",
  },
  emptySlot: {
    width: "100%",
    minHeight: 60,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.2)",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  smallText: {
    fontSize: 11,
    color: "#334155",
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
