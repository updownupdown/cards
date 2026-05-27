import { useMemo, useState } from "react";
import { GameMenus } from "../common/GameMenus";
import { useGameLoading } from "@/hooks/useGameLoading";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

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

const cardsPerRow = 8;

type Foundations = Record<CardSuit, PlayingCard[]>;

type PenguinState = {
  foundations: Foundations;
  beakRank: PlayingCard["rank"];
  tableau: PlayingCard[][];
  ended: boolean;
  won: boolean;
};

type Selection = { column: number; index: number } | null;

function emptyFoundations(): Foundations {
  return {
    clubs: [],
    diamonds: [],
    hearts: [],
    spades: [],
  };
}

function prevRankWrap(rank: PlayingCard["rank"]) {
  const v = RANK_VALUE[rank];
  const prev = v === 1 ? 13 : v - 1;
  return prev;
}

function nextRankWrap(rank: PlayingCard["rank"]) {
  const v = RANK_VALUE[rank];
  const next = v === 13 ? 1 : v + 1;
  return next;
}

function setup(): PenguinState {
  const cards = shuffle(createDeck({ faceUp: true }));
  const beak = cards.shift();
  if (!beak) {
    return {
      foundations: emptyFoundations(),
      beakRank: "A",
      tableau: Array.from({ length: 7 }, () => []),
      ended: true,
      won: false,
    };
  }

  const all = [beak, ...cards];
  const foundations = emptyFoundations();
  const remaining: PlayingCard[] = [];

  for (const card of all) {
    if (card.rank === beak.rank && foundations[card.suit].length === 0) {
      foundations[card.suit].push(card);
    } else {
      remaining.push(card);
    }
  }

  const tableau: PlayingCard[][] = Array.from({ length: 7 }, () => []);
  let idx = 0;
  while (remaining.length > 0) {
    const card = remaining.shift();
    if (card) tableau[idx].push(card);
    idx = (idx + 1) % 7;
  }

  return {
    foundations,
    beakRank: beak.rank,
    tableau,
    ended: false,
    won: false,
  };
}

function canPlaceOnFoundation(card: PlayingCard, pile: PlayingCard[]) {
  const top = pile[pile.length - 1] ?? null;
  if (!top) return false;
  return (
    card.suit === top.suit && RANK_VALUE[card.rank] === nextRankWrap(top.rank)
  );
}

function canPlaceOnTableau(
  card: PlayingCard,
  targetTop: PlayingCard | null,
  beakRank: PlayingCard["rank"],
) {
  if (!targetTop) {
    return RANK_VALUE[card.rank] === prevRankWrap(beakRank);
  }
  return (
    card.suit === targetTop.suit &&
    RANK_VALUE[card.rank] === prevRankWrap(targetTop.rank)
  );
}

function isDescendingSameSuitRun(cards: PlayingCard[]) {
  for (let i = 0; i < cards.length - 1; i += 1) {
    const a = cards[i];
    const b = cards[i + 1];
    if (a.suit !== b.suit) return false;
    if (RANK_VALUE[a.rank] !== prevRankWrap(b.rank)) return false;
  }
  return true;
}

function hasAnyLegalMove(state: PenguinState) {
  for (let i = 0; i < state.tableau.length; i += 1) {
    const col = state.tableau[i];
    if (col.length === 0) continue;
    const top = col[col.length - 1];

    if (canPlaceOnFoundation(top, state.foundations[top.suit])) return true;

    for (let j = 0; j < state.tableau.length; j += 1) {
      if (i === j) continue;
      const targetTop = state.tableau[j][state.tableau[j].length - 1] ?? null;
      if (canPlaceOnTableau(top, targetTop, state.beakRank)) return true;
    }
  }

  return false;
}

function totalFoundations(foundations: Foundations) {
  return (
    foundations.clubs.length +
    foundations.diamonds.length +
    foundations.hearts.length +
    foundations.spades.length
  );
}

export default function Penguin() {
  const isLoaded = useGameLoading();

  const [game, setGame] = useState<PenguinState>(setup);
  const [selected, setSelected] = useState<Selection>(null);
  const [message, setMessage] = useState(
    "Tap a card to select a run, then tap another column to move. Top cards can move to foundations.",
  );

  const foundationsCount = useMemo(
    () => totalFoundations(game.foundations),
    [game.foundations],
  );

  function reset() {
    setGame(setup());
    setSelected(null);
    setMessage(
      "Tap a card to select a run, then tap another column to move. Top cards can move to foundations.",
    );
  }

  function evaluate(next: PenguinState) {
    if (totalFoundations(next.foundations) === 52) {
      return { ...next, ended: true, won: true };
    }
    if (!hasAnyLegalMove(next)) {
      return { ...next, ended: true, won: false };
    }
    return next;
  }

  function onColumnPress(columnIndex: number, cardIndex: number) {
    setGame((prev) => {
      if (prev.ended) return prev;

      const tableau = prev.tableau.map((col) => [...col]);
      const foundations = {
        clubs: [...prev.foundations.clubs],
        diamonds: [...prev.foundations.diamonds],
        hearts: [...prev.foundations.hearts],
        spades: [...prev.foundations.spades],
      } as Foundations;

      const from = tableau[columnIndex];
      const card = from[cardIndex] ?? null;
      if (!card) return prev;

      if (selected === null) {
        const moving = from.slice(cardIndex);
        if (!isDescendingSameSuitRun(moving)) return prev;
        setSelected({ column: columnIndex, index: cardIndex });
        return prev;
      }

      if (selected.column === columnIndex && selected.index === cardIndex) {
        setSelected(null);
        return prev;
      }

      const selectedFrom = tableau[selected.column];
      const moving = selectedFrom.slice(selected.index);
      const movingTop = moving[0];
      if (!movingTop || !isDescendingSameSuitRun(moving)) {
        setSelected(null);
        return prev;
      }

      // Top single card may go to foundation.
      if (moving.length === 1) {
        const pile = foundations[movingTop.suit];
        if (canPlaceOnFoundation(movingTop, pile)) {
          selectedFrom.pop();
          pile.push(movingTop);
          setSelected(null);
          return evaluate({ ...prev, foundations, tableau });
        }
      }

      const target = tableau[columnIndex];
      const targetTop = target[target.length - 1] ?? null;
      if (!canPlaceOnTableau(movingTop, targetTop, prev.beakRank)) {
        setSelected({ column: columnIndex, index: cardIndex });
        return prev;
      }

      selectedFrom.splice(selected.index, moving.length);
      target.push(...moving);
      setSelected(null);
      return evaluate({ ...prev, foundations, tableau });
    });

    setMessage("Selection updated.");
  }

  return (
    <GameWrapper
      ended={game.ended}
      won={game.won}
      reset={reset}
      isLoaded={isLoaded}
    >
      <Text style={textStyles.default}>
        Beak rank: {game.beakRank}
        <br />
        Foundations: {foundationsCount}/52
        <br />
        Message: {message}
      </Text>

      <View style={styles.foundationsRow}>
        {(Object.keys(game.foundations) as CardSuit[]).map((suit) => {
          const top =
            game.foundations[suit][game.foundations[suit].length - 1] ?? null;
          return (
            <View key={`p-found-${suit}`} style={styles.zone}>
              <Text style={styles.smallText}>{suit}</Text>
              {top ? (
                <Card
                  suit={top.suit}
                  rank={top.rank}
                  cardsPerRow={cardsPerRow}
                />
              ) : (
                <View style={styles.empty} />
              )}
            </View>
          );
        })}
      </View>

      <View style={styles.tableauRow}>
        {game.tableau.map((col, idx) => {
          return (
            <View key={`p-col-${idx}`} style={styles.zone}>
              <Text style={styles.smallText}>C{idx + 1}</Text>
              <Text style={styles.smallText}>{col.length}</Text>
              {col.length === 0 ? <View style={styles.empty} /> : null}
              {col.map((card, cardIdx) => {
                const isSelected =
                  selected?.column === idx && selected?.index === cardIdx;
                return (
                  <Pressable
                    key={card.id}
                    onPress={() => onColumnPress(idx, cardIdx)}
                    disabled={game.ended}
                    style={isSelected ? styles.selectedCard : undefined}
                  >
                    <Card
                      suit={card.suit}
                      rank={card.rank}
                      cardsPerRow={cardsPerRow}
                    />
                  </Pressable>
                );
              })}
            </View>
          );
        })}
      </View>

      {game.ended ? (
        <Text style={game.won ? styles.winText : styles.loseText}>
          {game.won
            ? "All cards moved to foundations."
            : "No legal moves remain."}
        </Text>
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
    color: "#1f2937",
    fontFamily: "Outfit_600SemiBold",
  },
  button: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
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
  foundationsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
  },
  tableauRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
  },
  zone: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  smallText: {
    fontSize: 11,
    color: "#334155",
  },
  empty: {
    width: 78,
    height: 112,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.2)",
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  selectedCard: {
    borderRadius: 8,
    backgroundColor: "rgba(37,99,235,0.16)",
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
