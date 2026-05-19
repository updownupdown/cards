import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Card, type CardSuit } from "../Cards/Card";
import HomeButton from "../Home/HomeButton";
import {
  RANK_VALUE,
  createDeck,
  isRed,
  shuffle,
  type PlayingCard,
} from "../Games/card-utils";

type DeadRank = PlayingCard["rank"] | "Joker";

type DeadCard = {
  id: string;
  suit: CardSuit;
  rank: DeadRank;
  faceUp: boolean;
};

type Zombie = {
  id: string;
  card: DeadCard;
  revealed: boolean;
  dead: boolean;
};

type Phase = "reveal" | "play" | "kill";

type GameState = {
  piles: DeadCard[][];
  zombies: Zombie[];
  draw: DeadCard[];
  phase: Phase;
  currentDraw: DeadCard | null;
  lastPlayedPile: number | null;
  ended: boolean;
  won: boolean;
};

const PILE_TO_ZOMBIES: Record<number, number[]> = {
  0: [0, 9],
  1: [1],
  2: [2, 3],
  3: [10],
  4: [],
  5: [4],
  6: [6, 11],
  7: [7],
  8: [8, 5],
};

function isFace(card: DeadCard) {
  return card.rank === "J" || card.rank === "Q" || card.rank === "K";
}

function isJoker(card: DeadCard) {
  return card.rank === "Joker";
}

function rankValue(card: DeadCard) {
  return card.rank === "Joker" ? 0 : RANK_VALUE[card.rank];
}

function cardColor(card: DeadCard) {
  return isRed(card.suit) ? "red" : "black";
}

function setup(): GameState {
  const normal = createDeck({ faceUp: true }).map((card) => ({
    ...card,
    rank: card.rank as DeadRank,
  }));

  const jokers: DeadCard[] = [
    { id: "joker-a", suit: "spades", rank: "Joker", faceUp: true },
    { id: "joker-b", suit: "hearts", rank: "Joker", faceUp: true },
  ];

  const all = shuffle([...normal, ...jokers]);
  const zombiesCards = shuffle(all.filter(isFace));
  const nonFace = shuffle(all.filter((card) => !isFace(card)));

  const piles = Array.from({ length: 9 }, () => [] as DeadCard[]);
  for (let i = 0; i < 9; i += 1) {
    const next = nonFace.shift();
    if (next) piles[i].push(next);
  }

  const zombies = Array.from({ length: 12 }, (_, idx) => ({
    id: `z-${idx}`,
    card: zombiesCards[idx],
    revealed: false,
    dead: false,
  }));

  return {
    piles,
    zombies,
    draw: nonFace,
    phase: "reveal",
    currentDraw: null,
    lastPlayedPile: null,
    ended: false,
    won: false,
  };
}

function canPlayOn(top: DeadCard, card: DeadCard) {
  if (isJoker(top) || isJoker(card)) return true;

  const topValue = rankValue(top);
  const cardValue = rankValue(card);
  const sameColor = cardColor(top) === cardColor(card);

  if (cardValue === topValue) return true;
  if (sameColor && cardValue > topValue) return true;
  if (!sameColor && cardValue < topValue) return true;

  return false;
}

function supportIndicesForAttack(
  pileIndex: number,
  zombieIndex: number,
): number[] {
  const r = Math.floor(pileIndex / 3);
  const c = pileIndex % 3;

  const isTop = zombieIndex >= 0 && zombieIndex <= 2;
  const isBottom = zombieIndex >= 6 && zombieIndex <= 8;
  const isLeft = zombieIndex >= 9 && zombieIndex <= 11;

  if (isTop || isBottom) {
    return [c, c + 3, c + 6].filter((idx) => idx !== pileIndex);
  }

  if (isLeft || zombieIndex === 3 || zombieIndex === 4 || zombieIndex === 5) {
    const row = [r * 3, r * 3 + 1, r * 3 + 2];
    return row.filter((idx) => idx !== pileIndex);
  }

  return [];
}

function canKillZombie(zombie: DeadCard, supports: DeadCard[]) {
  const values = supports.map(rankValue);
  if (values[0] + values[1] < 10) return false;

  if (zombie.rank === "K") {
    return supports.every((card) => isJoker(card) || card.suit === zombie.suit);
  }

  if (zombie.rank === "Q") {
    const color = cardColor(zombie);
    return supports.every((card) => isJoker(card) || cardColor(card) === color);
  }

  return true;
}

function needsReveal(zombies: Zombie[]) {
  return zombies.some((z) => !z.revealed && !z.dead);
}

function aliveCount(zombies: Zombie[]) {
  return zombies.filter((z) => !z.dead).length;
}

export default function DeadCenter() {
  const [game, setGame] = useState<GameState>(setup);
  const [message, setMessage] = useState(
    "Reveal one zombie to begin the turn.",
  );

  const currentAttacks = useMemo(() => {
    if (game.phase !== "kill" || game.lastPlayedPile === null)
      return [] as number[];

    return PILE_TO_ZOMBIES[game.lastPlayedPile].filter((index) => {
      const z = game.zombies[index];
      if (!z || z.dead || !z.revealed) return false;

      const supportIdx = supportIndicesForAttack(game.lastPlayedPile!, index);
      const supports = supportIdx
        .map((idx) => game.piles[idx][game.piles[idx].length - 1])
        .filter(Boolean) as DeadCard[];

      if (supports.length !== 2) return false;
      return canKillZombie(z.card, supports);
    });
  }, [game]);

  function reset() {
    setGame(setup());
    setMessage("Reveal one zombie to begin the turn.");
  }

  function revealZombie(index: number) {
    setGame((prev) => {
      if (prev.ended || prev.phase !== "reveal") return prev;

      const zombie = prev.zombies[index];
      if (!zombie || zombie.dead || zombie.revealed) return prev;

      const zombies = prev.zombies.map((z, i) =>
        i === index ? { ...z, revealed: true } : z,
      );

      if (prev.draw.length === 0) {
        return { ...prev, zombies, ended: true, won: false };
      }

      const draw = [...prev.draw];
      const currentDraw = draw.shift() ?? null;
      if (!currentDraw) {
        return { ...prev, zombies, ended: true, won: false };
      }

      const playable = prev.piles.some((pile) =>
        canPlayOn(pile[pile.length - 1], currentDraw),
      );
      if (!playable) {
        return { ...prev, zombies, draw, currentDraw, ended: true, won: false };
      }

      return {
        ...prev,
        zombies,
        draw,
        currentDraw,
        phase: "play",
      };
    });

    setMessage("Play the drawn card to a legal cabin pile.");
  }

  function playToPile(index: number) {
    setGame((prev) => {
      if (prev.ended || prev.phase !== "play" || !prev.currentDraw) return prev;

      const top = prev.piles[index][prev.piles[index].length - 1];
      if (!canPlayOn(top, prev.currentDraw)) return prev;

      const piles = prev.piles.map((pile) => [...pile]);
      piles[index].push(prev.currentDraw);

      return {
        ...prev,
        piles,
        phase: "kill",
        lastPlayedPile: index,
      };
    });

    setMessage("You may kill one adjacent revealed zombie, or skip.");
  }

  function finishKill(zombieIndex: number | null) {
    setGame((prev) => {
      if (prev.ended || prev.phase !== "kill") return prev;

      let zombies = [...prev.zombies];
      if (zombieIndex !== null) {
        const z = zombies[zombieIndex];
        if (z && z.revealed && !z.dead) {
          zombies = zombies.map((entry, idx) =>
            idx === zombieIndex ? { ...entry, dead: true } : entry,
          );
        }
      }

      if (aliveCount(zombies) === 0) {
        return { ...prev, zombies, ended: true, won: true };
      }

      if (!needsReveal(zombies)) {
        if (prev.draw.length === 0) {
          return { ...prev, zombies, ended: true, won: false };
        }

        const draw = [...prev.draw];
        const currentDraw = draw.shift() ?? null;
        if (!currentDraw) {
          return { ...prev, zombies, ended: true, won: false };
        }

        const playable = prev.piles.some((pile) =>
          canPlayOn(pile[pile.length - 1], currentDraw),
        );
        if (!playable) {
          return {
            ...prev,
            zombies,
            draw,
            currentDraw,
            ended: true,
            won: false,
          };
        }

        return {
          ...prev,
          zombies,
          draw,
          currentDraw,
          phase: "play",
          lastPlayedPile: null,
        };
      }

      return {
        ...prev,
        zombies,
        phase: "reveal",
        currentDraw: null,
        lastPlayedPile: null,
      };
    });

    setMessage("Next turn.");
  }

  const loseText =
    game.ended && !game.won
      ? "You lost: deck exhausted or no legal play remained."
      : null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <HomeButton />

      <View style={styles.headerRow}>
        <Text style={styles.title}>Dead Center</Text>
        <Pressable style={styles.button} onPress={reset}>
          <Text style={styles.buttonText}>New Game</Text>
        </Pressable>
      </View>

      <Text style={styles.metaText}>Draw pile: {game.draw.length}</Text>
      <Text style={styles.metaText}>
        Zombies left: {aliveCount(game.zombies)}
      </Text>
      <Text style={styles.metaText}>Phase: {game.phase}</Text>
      <Text style={styles.metaText}>Message: {message}</Text>

      {game.currentDraw ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current draw</Text>
          <Card
            suit={game.currentDraw.suit}
            rank={
              game.currentDraw.rank === "Joker"
                ? "Joker"
                : game.currentDraw.rank
            }
            widthRatio={10}
          />
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cabin (3x3)</Text>
        <View style={styles.grid}>
          {game.piles.map((pile, index) => {
            const top = pile[pile.length - 1];
            const canPlay =
              game.phase === "play" &&
              game.currentDraw &&
              canPlayOn(top, game.currentDraw);

            return (
              <Pressable
                key={`pile-${index}`}
                onPress={() => playToPile(index)}
                style={[styles.pileCell, canPlay ? styles.playable : null]}
              >
                <Card
                  suit={top.suit}
                  rank={top.rank === "Joker" ? "Joker" : top.rank}
                  widthRatio={13}
                />
                <Text style={styles.pileDepth}>x{pile.length}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Zombies</Text>
        <View style={styles.zombieWrap}>
          {game.zombies.map((z, index) => {
            const canReveal = game.phase === "reveal" && !z.revealed && !z.dead;
            const canKill =
              game.phase === "kill" && currentAttacks.includes(index);

            return (
              <Pressable
                key={z.id}
                onPress={() => {
                  if (canReveal) {
                    revealZombie(index);
                    return;
                  }
                  if (canKill) {
                    finishKill(index);
                  }
                }}
                style={[
                  styles.zombieSlot,
                  canReveal ? styles.playable : null,
                  canKill ? styles.killable : null,
                ]}
              >
                {z.dead ? (
                  <Text style={styles.deadText}>DEAD</Text>
                ) : z.revealed ? (
                  <Card
                    suit={z.card.suit}
                    rank={z.card.rank === "Joker" ? "Joker" : z.card.rank}
                    widthRatio={15}
                  />
                ) : (
                  <Card suit={z.card.suit} isBack widthRatio={15} />
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      {game.phase === "kill" ? (
        <Pressable style={styles.skipBtn} onPress={() => finishKill(null)}>
          <Text style={styles.skipText}>Skip Kill</Text>
        </Pressable>
      ) : null}

      {game.ended && game.won ? (
        <Text style={styles.winText}>You won!</Text>
      ) : null}
      {loseText ? <Text style={styles.loseText}>{loseText}</Text> : null}
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
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pileCell: {
    width: "31%",
    aspectRatio: 1,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.25)",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  playable: {
    borderColor: "#0f766e",
    borderWidth: 2,
    backgroundColor: "rgba(16,185,129,0.14)",
  },
  killable: {
    borderColor: "#b91c1c",
    borderWidth: 2,
    backgroundColor: "rgba(239,68,68,0.16)",
  },
  pileDepth: {
    fontSize: 11,
    color: "#334155",
  },
  zombieWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  zombieSlot: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.2)",
    padding: 4,
    minWidth: 56,
    minHeight: 80,
    justifyContent: "center",
    alignItems: "center",
  },
  deadText: {
    color: "#991b1b",
    fontFamily: "Outfit_600SemiBold",
    fontSize: 11,
  },
  skipBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#475569",
  },
  skipText: {
    color: "#fff",
    fontFamily: "Outfit_500Medium",
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
