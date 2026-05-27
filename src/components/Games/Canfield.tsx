import { useMemo, useState } from "react";
import { GameMenus } from "../common/GameMenus";
import { useGameLoading } from "@/hooks/useGameLoading";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Card } from "../Cards/Card";
import {
  CardSuit,
  RANK_VALUE,
  createDeck,
  isRed,
  shuffle,
  type PlayingCard,
} from "../Cards/card-utils";
import { textStyles } from "@/styles/textStyles";
import { GameWrapper } from "../common/GameWrapper";

type Foundations = Record<CardSuit, PlayingCard[]>;

type CanfieldState = {
  foundations: Foundations;
  baseRank: PlayingCard["rank"];
  reserve: PlayingCard[];
  tableau: PlayingCard[][];
  stock: PlayingCard[];
  waste: PlayingCard[];
  ended: boolean;
  won: boolean;
};

function emptyFoundations(): Foundations {
  return {
    clubs: [],
    diamonds: [],
    hearts: [],
    spades: [],
  };
}

function nextRankWrap(rank: PlayingCard["rank"]) {
  const v = RANK_VALUE[rank];
  const next = v === 13 ? 1 : v + 1;
  return next;
}

function canPlaceOnFoundation(
  card: PlayingCard,
  pile: PlayingCard[],
  baseRank: PlayingCard["rank"],
) {
  if (pile.length === 0) return card.rank === baseRank;
  const top = pile[pile.length - 1];
  return (
    card.suit === top.suit && RANK_VALUE[card.rank] === nextRankWrap(top.rank)
  );
}

function canPlaceOnTableau(card: PlayingCard, targetTop: PlayingCard | null) {
  if (!targetTop) return true;
  return (
    RANK_VALUE[targetTop.rank] === RANK_VALUE[card.rank] + 1 &&
    isRed(targetTop.suit) !== isRed(card.suit)
  );
}

function hasPlacementForCard(
  card: PlayingCard,
  foundations: Foundations,
  tableau: PlayingCard[][],
  baseRank: PlayingCard["rank"],
  fromTableauIndex?: number,
) {
  if (canPlaceOnFoundation(card, foundations[card.suit], baseRank)) return true;

  for (let i = 0; i < tableau.length; i += 1) {
    if (typeof fromTableauIndex === "number" && i === fromTableauIndex)
      continue;
    const top = tableau[i][tableau[i].length - 1] ?? null;
    if (canPlaceOnTableau(card, top)) return true;
  }

  return false;
}

function hasAnyLegalMove(state: CanfieldState) {
  const reserveTop = state.reserve[state.reserve.length - 1] ?? null;
  if (
    reserveTop &&
    hasPlacementForCard(
      reserveTop,
      state.foundations,
      state.tableau,
      state.baseRank,
    )
  ) {
    return true;
  }

  const wasteTop = state.waste[state.waste.length - 1] ?? null;
  if (
    wasteTop &&
    hasPlacementForCard(
      wasteTop,
      state.foundations,
      state.tableau,
      state.baseRank,
    )
  ) {
    return true;
  }

  for (let i = 0; i < state.tableau.length; i += 1) {
    const top = state.tableau[i][state.tableau[i].length - 1] ?? null;
    if (!top) continue;
    if (
      hasPlacementForCard(
        top,
        state.foundations,
        state.tableau,
        state.baseRank,
        i,
      )
    ) {
      return true;
    }
  }

  return state.stock.length > 0 || state.waste.length > 0;
}

function refillTableauFromReserve(
  tableau: PlayingCard[][],
  reserve: PlayingCard[],
) {
  const nextTableau = tableau.map((col) => [...col]);
  const nextReserve = [...reserve];
  for (let i = 0; i < nextTableau.length; i += 1) {
    if (nextTableau[i].length === 0 && nextReserve.length > 0) {
      const card = nextReserve.shift();
      if (card) nextTableau[i].push(card);
    }
  }
  return { tableau: nextTableau, reserve: nextReserve };
}

function setup(): CanfieldState {
  const deck = shuffle(createDeck({ faceUp: true }));
  const reserve = deck.splice(0, 13);
  const tableau: PlayingCard[][] = [[], [], [], []];

  for (let i = 0; i < 4; i += 1) {
    const card = deck.shift();
    if (card) tableau[i].push(card);
  }

  const foundations = emptyFoundations();
  const base = deck.shift();
  if (!base) {
    return {
      foundations,
      baseRank: "A",
      reserve,
      tableau,
      stock: [],
      waste: [],
      ended: true,
      won: false,
    };
  }

  foundations[base.suit].push(base);

  return {
    foundations,
    baseRank: base.rank,
    reserve,
    tableau,
    stock: deck,
    waste: [],
    ended: false,
    won: false,
  };
}

function totalOnFoundations(foundations: Foundations) {
  return (
    foundations.clubs.length +
    foundations.diamonds.length +
    foundations.hearts.length +
    foundations.spades.length
  );
}

export default function Canfield() {
  const isLoaded = useGameLoading();

  const [game, setGame] = useState<CanfieldState>(setup);
  const [message, setMessage] = useState(
    "Tap reserve/waste/tableau tops to auto-place. Draw when needed.",
  );

  const foundationCount = useMemo(
    () => totalOnFoundations(game.foundations),
    [game.foundations],
  );
  const canDraw = game.stock.length > 0 || game.waste.length > 0;

  function reset() {
    setGame(setup());
    setMessage(
      "Tap reserve/waste/tableau tops to auto-place. Draw when needed.",
    );
  }

  function evaluate(next: CanfieldState): CanfieldState {
    if (totalOnFoundations(next.foundations) === 52) {
      return { ...next, ended: true, won: true };
    }
    if (!hasAnyLegalMove(next)) {
      return { ...next, ended: true, won: false };
    }
    return next;
  }

  function tryAutoPlaceFromSource(
    state: CanfieldState,
    sourceType: "reserve" | "waste" | "tableau",
    tableauIndex?: number,
  ) {
    const foundations = {
      clubs: [...state.foundations.clubs],
      diamonds: [...state.foundations.diamonds],
      hearts: [...state.foundations.hearts],
      spades: [...state.foundations.spades],
    } as Foundations;
    const tableau = state.tableau.map((col) => [...col]);
    const reserve = [...state.reserve];
    const waste = [...state.waste];

    let card: PlayingCard | null = null;

    if (sourceType === "reserve") {
      card = reserve[reserve.length - 1] ?? null;
    } else if (sourceType === "waste") {
      card = waste[waste.length - 1] ?? null;
    } else if (typeof tableauIndex === "number") {
      card = tableau[tableauIndex][tableau[tableauIndex].length - 1] ?? null;
    }

    if (!card) return state;

    const foundationPile = foundations[card.suit];
    if (canPlaceOnFoundation(card, foundationPile, state.baseRank)) {
      foundationPile.push(card);
      if (sourceType === "reserve") reserve.pop();
      if (sourceType === "waste") waste.pop();
      if (sourceType === "tableau" && typeof tableauIndex === "number")
        tableau[tableauIndex].pop();

      const filled = refillTableauFromReserve(tableau, reserve);
      return evaluate({
        ...state,
        foundations,
        tableau: filled.tableau,
        reserve: filled.reserve,
        waste,
      });
    }

    for (let i = 0; i < tableau.length; i += 1) {
      if (sourceType === "tableau" && i === tableauIndex) continue;
      const targetTop = tableau[i][tableau[i].length - 1] ?? null;
      if (!canPlaceOnTableau(card, targetTop)) continue;

      tableau[i].push(card);
      if (sourceType === "reserve") reserve.pop();
      if (sourceType === "waste") waste.pop();
      if (sourceType === "tableau" && typeof tableauIndex === "number")
        tableau[tableauIndex].pop();

      const filled = refillTableauFromReserve(tableau, reserve);
      return evaluate({
        ...state,
        foundations,
        tableau: filled.tableau,
        reserve: filled.reserve,
        waste,
      });
    }

    return state;
  }

  function playReserveTop() {
    setGame((prev) =>
      prev.ended ? prev : tryAutoPlaceFromSource(prev, "reserve"),
    );
    setMessage("Tried reserve move.");
  }

  function playWasteTop() {
    setGame((prev) =>
      prev.ended ? prev : tryAutoPlaceFromSource(prev, "waste"),
    );
    setMessage("Tried waste move.");
  }

  function playTableauTop(index: number) {
    setGame((prev) =>
      prev.ended ? prev : tryAutoPlaceFromSource(prev, "tableau", index),
    );
    setMessage("Tried tableau move.");
  }

  function draw() {
    setGame((prev) => {
      if (prev.ended) return prev;
      let stock = [...prev.stock];
      let waste = [...prev.waste];

      if (stock.length === 0 && waste.length > 0) {
        stock = shuffle(waste);
        waste = [];
      }

      const card = stock.shift();
      if (!card) return prev;
      waste.push(card);

      return evaluate({ ...prev, stock, waste });
    });
    setMessage("Drew card.");
  }

  return (
    <GameWrapper
      ended={game.ended}
      won={game.won}
      reset={reset}
      isLoaded={isLoaded}
    >
      <Text style={textStyles.default}>
        Base rank: {game.baseRank}
        <br />
        Foundations: {foundationCount}/52
      </Text>
      <Text style={textStyles.default}>
        Reserve: {game.reserve.length}
        <br />
        Stock: {game.stock.length}
        <br />
        Message: {message}
      </Text>

      <View style={styles.row}>
        {(Object.keys(game.foundations) as CardSuit[]).map((suit) => {
          const top =
            game.foundations[suit][game.foundations[suit].length - 1] ?? null;
          return (
            <View key={`c-found-${suit}`} style={styles.zone}>
              <Text style={styles.smallText}>{suit}</Text>
              {top ? (
                <Card suit={top.suit} rank={top.rank} cardsPerRow={5} />
              ) : (
                <View style={styles.empty} />
              )}
            </View>
          );
        })}
      </View>

      <View style={styles.row}>
        <View style={styles.zone}>
          <Text style={styles.smallText}>Reserve top</Text>
          <Pressable
            onPress={playReserveTop}
            disabled={game.ended || game.reserve.length === 0}
          >
            {game.reserve.length > 0 ? (
              <Card
                suit={game.reserve[game.reserve.length - 1].suit}
                rank={game.reserve[game.reserve.length - 1].rank}
                cardsPerRow={5}
              />
            ) : (
              <View style={styles.empty} />
            )}
          </Pressable>
        </View>

        <View style={styles.zone}>
          <Text style={styles.smallText}>Waste top</Text>
          <Pressable
            onPress={playWasteTop}
            disabled={game.ended || game.waste.length === 0}
          >
            {game.waste.length > 0 ? (
              <Card
                suit={game.waste[game.waste.length - 1].suit}
                rank={game.waste[game.waste.length - 1].rank}
                cardsPerRow={5}
              />
            ) : (
              <View style={styles.empty} />
            )}
          </Pressable>
        </View>

        <View style={styles.zone}>
          <Pressable
            style={[
              styles.button,
              canDraw && !game.ended
                ? styles.drawButton
                : styles.drawButtonDisabled,
            ]}
            onPress={draw}
            disabled={!canDraw || game.ended}
          >
            <Text style={styles.buttonText}>Draw</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.row}>
        {game.tableau.map((col, i) => {
          const top = col[col.length - 1] ?? null;
          return (
            <View key={`c-tab-${i}`} style={styles.zone}>
              <Text style={styles.smallText}>T{i + 1}</Text>
              <Text style={styles.smallText}>Count: {col.length}</Text>
              <Pressable
                onPress={() => playTableauTop(i)}
                disabled={game.ended || col.length === 0}
              >
                {top ? (
                  <Card suit={top.suit} rank={top.rank} cardsPerRow={5} />
                ) : (
                  <View style={styles.empty} />
                )}
              </Pressable>
            </View>
          );
        })}
      </View>

      {game.ended ? (
        <Text style={game.won ? styles.winText : styles.loseText}>
          {game.won
            ? "All cards built to foundations."
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
  drawButton: {
    backgroundColor: "#0f766e",
  },
  drawButtonDisabled: {
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
  row: {
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
  winText: {
    color: "#065f46",
    fontFamily: "Outfit_600SemiBold",
  },
  loseText: {
    color: "#991b1b",
    fontFamily: "Outfit_600SemiBold",
  },
});
