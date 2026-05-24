import { useMemo, useState } from "react";
import { GameMenus } from "../common/GameMenus";
import { useGameLoading } from "@/hooks/useGameLoading";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Card } from "../Cards/Card";
import {
  RANK_VALUE,
  createDeck,
  shuffle,
  type PlayingCard,
} from "../Cards/card-utils";
import { textStyles } from "@/styles/textStyles";

type Pile = {
  x: number;
  y: number;
  cards: PlayingCard[];
};

type Pos = { x: number; y: number };

type GameState = {
  deck: PlayingCard[];
  piles: Pile[];
  current: PlayingCard | null;
  ended: boolean;
  won: boolean;
};

function isFace(card: PlayingCard) {
  return card.rank === "J" || card.rank === "Q" || card.rank === "K";
}

function setup(): GameState {
  const cards = shuffle(createDeck({ faceUp: true }).filter((c) => !isFace(c)));
  const first = cards[0];
  return {
    deck: cards.slice(1),
    piles: [{ x: 0, y: 0, cards: [first] }],
    current: cards[1] ?? null,
    ended: false,
    won: false,
  };
}

function top(pile: Pile) {
  return pile.cards[pile.cards.length - 1];
}

function keyOf(pos: Pos) {
  return `${pos.x}:${pos.y}`;
}

function bounding(piles: Pile[]) {
  const xs = piles.map((p) => p.x);
  const ys = piles.map((p) => p.y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

function legalPlacements(piles: Pile[]): Pos[] {
  const occupied = new Set(piles.map((p) => keyOf(p)));
  const result: Pos[] = [];

  // Existing piles are legal if below stack height cap.
  piles.forEach((p) => {
    if (p.cards.length < 4) result.push({ x: p.x, y: p.y });
  });

  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  for (const p of piles) {
    for (const [dx, dy] of dirs) {
      const candidate = { x: p.x + dx, y: p.y + dy };
      const k = keyOf(candidate);
      if (occupied.has(k)) continue;

      const simulated = [
        ...piles,
        { x: candidate.x, y: candidate.y, cards: [] },
      ];
      const b = bounding(simulated);
      const width = b.maxX - b.minX + 1;
      const height = b.maxY - b.minY + 1;
      if (width <= 4 && height <= 4) {
        result.push(candidate);
      }
    }
  }

  const unique = new Map<string, Pos>();
  result.forEach((r) => unique.set(keyOf(r), r));
  return [...unique.values()];
}

function flipTop(pile: Pile) {
  const copy = [...pile.cards];
  const t = copy[copy.length - 1];
  copy[copy.length - 1] = { ...t, faceUp: !t.faceUp };
  return { ...pile, cards: copy };
}

function compareValue(card: PlayingCard | undefined) {
  if (!card || !card.faceUp) return null;
  return RANK_VALUE[card.rank];
}

function applyFlips(piles: Pile[], placed: Pos) {
  let next = piles.map((p) => ({ ...p, cards: [...p.cards] }));

  const placedPile = next.find((p) => p.x === placed.x && p.y === placed.y);
  if (!placedPile) return next;
  const placedValue = compareValue(top(placedPile));
  if (placedValue === null) return next;

  const checkAxis = (axis: "row" | "col") => {
    const line = next.filter((p) =>
      axis === "row" ? p.y === placed.y : p.x === placed.x,
    );
    const withValues = line
      .map((p) => ({ pile: p, value: compareValue(top(p)) }))
      .filter((entry) => entry.value !== null) as Array<{
      pile: Pile;
      value: number;
    }>;

    if (withValues.length === 0) return;

    const values = withValues.map((entry) => entry.value);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const maxCount = values.filter((v) => v === max).length;
    const minCount = values.filter((v) => v === min).length;

    const isUniqueHigh = placedValue === max && maxCount === 1;
    const isUniqueLow = placedValue === min && minCount === 1;
    if (!isUniqueHigh && !isUniqueLow) return;

    const placedKey = keyOf(placed);
    next = next.map((p) => {
      if (
        (axis === "row" ? p.y === placed.y : p.x === placed.x) &&
        keyOf(p) !== placedKey
      ) {
        return flipTop(p);
      }
      return p;
    });
  };

  checkAxis("row");
  checkAxis("col");

  return next;
}

function countFaceDownTops(piles: Pile[]) {
  return piles.filter((p) => !top(p).faceUp).length;
}

function has4x4AllFaceUp(piles: Pile[]) {
  if (piles.length !== 16) return false;
  const b = bounding(piles);
  if (b.maxX - b.minX + 1 !== 4 || b.maxY - b.minY + 1 !== 4) return false;
  return piles.every((p) => top(p).faceUp);
}

export default function Foursquare() {
  const isLoaded = useGameLoading();

  const [game, setGame] = useState<GameState>(setup);
  const [message, setMessage] = useState("Place the current restaurant.");

  const legal = useMemo(() => legalPlacements(game.piles), [game.piles]);

  const score = game.deck.length;

  function reset() {
    setGame(setup());
    setMessage("Place the current restaurant.");
  }

  function placeAt(pos: Pos) {
    setGame((prev) => {
      if (prev.ended || !prev.current) return prev;

      const legalNow = legalPlacements(prev.piles).some(
        (p) => p.x === pos.x && p.y === pos.y,
      );
      if (!legalNow) return prev;

      let piles = prev.piles.map((p) => ({ ...p, cards: [...p.cards] }));
      const existing = piles.find((p) => p.x === pos.x && p.y === pos.y);
      if (existing) {
        if (existing.cards.length >= 4) return prev;
        existing.cards.push(prev.current);
      } else {
        piles.push({ x: pos.x, y: pos.y, cards: [prev.current] });
      }

      piles = applyFlips(piles, pos);

      if (countFaceDownTops(piles) > 4) {
        return { ...prev, piles, ended: true, won: false };
      }

      if (has4x4AllFaceUp(piles)) {
        return { ...prev, piles, ended: true, won: true, current: null };
      }

      const deck = [...prev.deck];
      const current = deck.shift() ?? null;
      if (!current) {
        return { ...prev, piles, deck, current: null, ended: true, won: false };
      }

      const nextLegal = legalPlacements(piles);
      if (nextLegal.length === 0) {
        return { ...prev, piles, deck, current, ended: true, won: false };
      }

      return { ...prev, piles, deck, current };
    });

    setMessage("Placement resolved.");
  }

  const b = bounding(game.piles);
  const cells: Pos[] = [];
  for (let y = b.minY - 1; y <= b.maxY + 1; y += 1) {
    for (let x = b.minX - 1; x <= b.maxX + 1; x += 1) {
      cells.push({ x, y });
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <GameMenus ended={game.ended} won={game.won} reset={reset} isLoaded={isLoaded} />

      

      <Text style={textStyles.default}>Deck remaining: {game.deck.length}</Text>
      <Text style={textStyles.default}>Message: {message}</Text>
      {game.current ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current card</Text>
          <Card
            suit={game.current.suit}
            rank={game.current.rank}
            cardsPerRow={5}
          />
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>City grid</Text>
        <View style={styles.gridWrap}>
          {cells.map((cell) => {
            const pile = game.piles.find(
              (p) => p.x === cell.x && p.y === cell.y,
            );
            const isLegal = legal.some((p) => p.x === cell.x && p.y === cell.y);

            return (
              <Pressable
                key={`${cell.x}:${cell.y}`}
                onPress={() => placeAt(cell)}
                style={[styles.cell, isLegal ? styles.legalCell : null]}
              >
                {pile ? (
                  <Card
                    suit={top(pile).suit}
                    rank={top(pile).rank}
                    isBack={!top(pile).faceUp}
                    cardsPerRow={5}
                  />
                ) : (
                  <Text style={styles.cellHint}>{isLegal ? "Drop" : ""}</Text>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      {game.ended ? (
        <Text style={game.won ? styles.winText : styles.loseText}>
          {game.won
            ? `You won with score ${score} (cards left in deck).`
            : "You lost: grid constraints, closures, or draw exhaustion ended the game."}
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
    fontFamily: "Outfit_600SemiBold",
    color: "#1f2937",
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
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
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontFamily: "Outfit_600SemiBold",
    color: "#111827",
  },
  gridWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  cell: {
    width: 58,
    height: 78,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.2)",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  legalCell: {
    borderWidth: 2,
    borderColor: "#0f766e",
    backgroundColor: "rgba(16,185,129,0.14)",
  },
  cellHint: {
    fontSize: 11,
    color: "#64748b",
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
