import { useGameLoading } from "@/hooks/useGameLoading";
import { textStyles } from "@/styles/textStyles";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Card } from "../Cards/Card";
import {
  PlayingCardJoker,
  RANK_VALUE,
  cardColor,
  createDeck,
  isFace,
  isJoker,
  rankValue,
  shuffle,
} from "../Cards/card-utils";
import { GameWrapper } from "../common/GameWrapper";
import { Button } from "../Button/Button";
import { flexStyles } from "@/styles/flexStyles";

const cardsPerRow = 6;

type Zombie = {
  id: string;
  card: PlayingCardJoker;
  revealed: boolean;
  dead: boolean;
};

type Phase = "reveal" | "play" | "kill";

type GameState = {
  piles: PlayingCardJoker[][];
  zombies: Zombie[];
  draw: PlayingCardJoker[];
  phase: Phase;
  currentDraw: PlayingCardJoker | null;
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

function setup(): GameState {
  const normal = createDeck({ faceUp: true }).map((card) => ({
    ...card,
    rank: card.rank,
  }));

  const jokers: PlayingCardJoker[] = [
    { id: "joker-a", suit: "spades", rank: "Joker", faceUp: true },
    { id: "joker-b", suit: "hearts", rank: "Joker", faceUp: true },
  ];

  const all = shuffle([...normal, ...jokers]);
  const zombiesCards = shuffle(all.filter(isFace));
  const nonFace = shuffle(all.filter((card) => !isFace(card)));

  const piles = Array.from({ length: 9 }, () => [] as PlayingCardJoker[]);
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

function canPlayOn(top: PlayingCardJoker, card: PlayingCardJoker) {
  if (isJoker(top) || isJoker(card)) return true;

  const topValue = rankValue(top, undefined, 0);
  const cardValue = rankValue(card, undefined, 0);
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

function rankValueMap(card: PlayingCardJoker) {
  return card.rank === "Joker" ? 0 : RANK_VALUE[card.rank];
}

function canKillZombie(zombie: PlayingCardJoker, supports: PlayingCardJoker[]) {
  const values = supports.map(rankValueMap);
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
  const isLoaded = useGameLoading();

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
        .filter(Boolean) as PlayingCardJoker[];

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

  return (
    <GameWrapper
      ended={game.ended}
      won={game.won}
      reset={reset}
      isLoaded={isLoaded}
      winLoseMessage={
        game.won
          ? "You won!"
          : "You lost: deck exhausted or no legal play remained."
      }
    >
      <Text style={textStyles.default}>
        Draw ({game.draw.length}) - Zombies ({aliveCount(game.zombies)}) - Phase
        ({game.phase})
        <br />
        Message: {message}
      </Text>

      {game.currentDraw ? (
        <View style={[flexStyles.gap10]}>
          <Text style={textStyles.default}>Current draw</Text>
          <Card
            suit={game.currentDraw.suit}
            rank={
              game.currentDraw.rank === "Joker"
                ? "Joker"
                : game.currentDraw.rank
            }
            cardsPerRow={cardsPerRow}
          />
        </View>
      ) : null}

      <View style={[flexStyles.gap10]}>
        <Text style={textStyles.default}>Cabin (3x3)</Text>
        <View
          style={[
            {
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
            },
          ]}
        >
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
                  cardsPerRow={cardsPerRow}
                />
                <Text style={textStyles.default}>x{pile.length}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={[flexStyles.gap10]}>
        <Text style={textStyles.default}>Zombies</Text>
        <View
          style={[
            {
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 6,
            },
          ]}
        >
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
                  <Text style={textStyles.default}>DEAD</Text>
                ) : z.revealed ? (
                  <Card
                    suit={z.card.suit}
                    rank={z.card.rank === "Joker" ? "Joker" : z.card.rank}
                    cardsPerRow={cardsPerRow}
                  />
                ) : (
                  <Card suit={z.card.suit} isBack cardsPerRow={cardsPerRow} />
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      {game.phase === "kill" && (
        <Button onPress={() => finishKill(null)} text="Skip Kill" />
      )}
    </GameWrapper>
  );
}

const styles = StyleSheet.create({
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
});
