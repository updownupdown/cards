import { useContentWidth } from "@/hooks/useContentWidth";
import { useGameLoading } from "@/hooks/useGameLoading";
import { useZoneLayout } from "@/hooks/useZoneLayout";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, FontWeight } from "@/styles/styles";
import { textStyles } from "@/styles/textStyles";
import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { AnimatedCard } from "../../Cards/AnimatedCard";
import { CardSelectColor } from "../../Cards/Card";
import {
  cardColor,
  createDeck,
  isFace,
  isJoker,
  PlayingCard,
  RANK_VALUE,
  rankValue,
  shuffle,
} from "../../Cards/card-utils";
import { CardPositionBuilder } from "../../Cards/CardPositionBuilder";
import { ZoneVisualizer } from "../../Cards/ZoneVisualizer";
import { GameWrapper } from "../../common/GameWrapper";
import {
  GameSnapshot,
  GameState,
  layoutZones,
  PILE_TO_ZOMBIES,
  Zombie,
} from "./DeadCenterSetup";
import { useUndoHistory } from "@/hooks/useUndoHistory";

const cardSize = "small";

function setup(): GameState {
  const deck = createDeck({ faceUp: false, includeJokers: true });
  const all = shuffle(deck);
  const zombiesCards = shuffle(all.filter(isFace));
  const draw = shuffle(all.filter((card) => !isFace(card)));

  const piles = Array.from({ length: 9 }, () => [] as PlayingCard[]);
  for (let i = 0; i < 9; i += 1) {
    const next = draw.shift();
    if (next) piles[i].push({ ...next, faceUp: true });
  }

  const zombies = Array.from({ length: 12 }, (_, idx) => ({
    id: `z-${idx}`,
    card: zombiesCards[idx],
    dead: false,
  }));

  return {
    piles,
    zombies,
    draw,
    phase: "reveal",
    lastPlayedPile: null,
    ended: false,
    won: false,
  };
}

function canPlayOn(top: PlayingCard, card: PlayingCard) {
  if (!top || !card) return false;

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

function canKillZombie(zombie: PlayingCard, supports: PlayingCard[]) {
  const values = supports.map((card) =>
    card.rank === "Joker" ? 0 : RANK_VALUE[card.rank],
  );

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
  return zombies.some((z) => !z.card.faceUp && !z.dead);
}

function aliveCount(zombies: Zombie[]) {
  return zombies.filter((z) => !z.dead).length;
}

export default function DeadCenter() {
  const { isLoaded, showIntro, setShowIntro } = useGameLoading();
  const [game, setGame] = useState<GameState>(setup);

  const { saveUndoState, undo, canUndo, clearHistory } =
    useUndoHistory<GameSnapshot>();
  const handleUndo = () => {
    const previousState = undo();
    if (previousState) {
      setGame(previousState.game);
    }
  };

  function reset() {
    clearHistory();
    setGame(setup());
  }

  async function revealZombie(index: number) {
    if (game.ended || game.phase !== "reveal") return;
    const zombie = game.zombies[index];
    if (!zombie || zombie.dead || zombie.card.faceUp) return;

    saveUndoState(structuredClone({ game }));

    setGame((prev) => {
      const zombies = prev.zombies.map((z, i) =>
        i === index ? { ...z, card: { ...z.card, faceUp: true } } : z,
      );

      return {
        ...prev,
        zombies,
        phase: "play",
      };
    });
  }

  async function playToPile(index: number) {
    const currentDraw = game.draw[game.draw.length - 1];
    if (game.ended || game.phase !== "play" || !currentDraw) return;

    const top = game.piles[index][game.piles[index].length - 1];
    if (!canPlayOn(top, currentDraw)) return;

    saveUndoState(structuredClone({ game }));

    setGame((prev) => {
      const piles = prev.piles;
      piles[index] = [...piles[index], currentDraw];

      const draw = [...prev.draw].slice(0, -1);

      return {
        ...prev,
        piles,
        draw,
        phase: "kill",
        lastPlayedPile: index,
      };
    });
  }

  async function killZombie(zombieIndex: number) {
    saveUndoState(structuredClone({ game }));

    setGame((prev) => {
      let zombies = [...prev.zombies];

      // Kill zombie
      if (zombieIndex !== null) {
        const z = zombies[zombieIndex];
        if (z && z.card.faceUp && !z.dead) {
          zombies = zombies.map((entry, idx) =>
            idx === zombieIndex
              ? { ...entry, card: { ...entry.card, faceUp: false }, dead: true }
              : entry,
          );
        }
      }

      // Go to reveal phase if possible, otherwise, play phase
      return {
        ...prev,
        zombies,
        phase: needsReveal(zombies) ? "reveal" : "play",
        lastPlayedPile: null,
      };
    });
  }

  // Turn over draw card when in play phase
  async function turnOverDrawCard() {
    // Animate draw card toFace
    if (game.draw.length === 0) return;
    const drawCard = game.draw[game.draw.length - 1];
    if (drawCard.faceUp) return;

    setGame((prev) => {
      const draw = [...prev.draw];
      const drawCardIndex = prev.draw.length - 1;
      const currentDraw = draw[drawCardIndex];
      draw[drawCardIndex] = { ...draw[drawCardIndex], faceUp: true };

      return {
        ...prev,
        draw,
        currentDraw,
        phase: "play",
        lastPlayedPile: null,
      };
    });
  }

  useEffect(() => {
    if (game.phase === "play") {
      turnOverDrawCard();
    }
  }, [game.phase]);

  // Skip kill phase if cannot kill any zombie
  const currentAttacks = useMemo(() => {
    if (game.phase !== "kill" || game.lastPlayedPile === null) {
      return [] as number[];
    }

    return PILE_TO_ZOMBIES[game.lastPlayedPile].filter((index) => {
      const z = game.zombies[index];
      if (!z || z.dead || !z.card.faceUp) return false;

      const supportIdx = supportIndicesForAttack(game.lastPlayedPile!, index);
      const supports = supportIdx
        .map((idx) => game.piles[idx][game.piles[idx].length - 1])
        .filter(Boolean) as PlayingCard[];

      if (supports.length !== 2) return false;
      return canKillZombie(z.card, supports);
    });
  }, [game]);

  useEffect(() => {
    if (game.ended || game.phase !== "kill" || currentAttacks.length > 0)
      return;

    setTimeout(() => {
      setGame((prev) => {
        return {
          ...prev,
          phase: needsReveal(prev.zombies) ? "reveal" : "play",
        };
      });
    }, 1500);
  }, [currentAttacks]);

  // Manage win/lose condition
  useEffect(() => {
    if (game.ended) return;

    if (game.draw.length === 0) {
      setGame((prev) => {
        return {
          ...prev,
          ended: true,
          won: false,
          winLoseMessage: "No cards left to draw!",
        };
      });
      return;
    }

    const currentDraw = game.draw[game.draw.length - 1];
    const playable = game.piles.some((pile) =>
      canPlayOn(pile[pile.length - 1], currentDraw),
    );

    if (!playable) {
      setGame((prev) => {
        return {
          ...prev,
          ended: true,
          won: false,
          winLoseMessage: "Unable to place card.",
        };
      });
      return;
    }

    // No more zombie - win!
    if (aliveCount(game.zombies) === 0) {
      setGame((prev) => {
        return {
          ...prev,
          ended: true,
          won: true,
          winLoseMessage: "You killed all the zombies!",
        };
      });
      return;
    }
  }, [game]);

  const layoutManager = useZoneLayout({
    zones: layoutZones,
    gapPc: 0.35,
  });

  const { cardWidth, cardHeight, getCardPosition, getZoneStyles } =
    layoutManager;

  // ========== Card Positions ========== //
  const cardPositions = useMemo(() => {
    const builder = new CardPositionBuilder(getCardPosition);

    builder.addDeck(game.draw, "draw", 20, "draw");

    game.piles.forEach((pile, pileIndex) => {
      builder.addDeck(pile, `pile-${pileIndex}`, 10, "pile");
    });

    game.zombies.forEach((zombie, zombieIndex) => {
      builder.add({
        card: zombie.card,
        zoneId: `zombie-${zombieIndex}`,
        index: zombieIndex,
        total: 1,
        startingZIndex: 0,
        type: "zombie",
      });
    });
    return builder.build();
  }, [game, getCardPosition]);

  return (
    <GameWrapper
      showIntro={showIntro}
      setShowIntro={setShowIntro}
      ended={game.ended}
      won={game.won}
      reset={reset}
      isLoaded={isLoaded}
      winLoseMessage={
        game.winLoseMessage ?? (game.won ? "You win!" : "You lost.")
      }
      canUndo={canUndo}
      handleUndo={handleUndo}
    >
      {Object.values(cardPositions).map((target) => {
        let selectColor: CardSelectColor = "none";
        let isSelected = undefined;
        let forceOverlay = false;
        let forceSelectColor = false;
        let isDisabled = false;
        let isPlaceholder = false;
        let onPress: (() => void) | undefined = undefined;

        const zombieIndex = target.index;
        const pileIndex = target.zoneId.split("-")[1];

        if (target.type === "zombie" && zombieIndex !== undefined) {
          // ========== Zombies ========== //
          const zombie = game.zombies[zombieIndex];
          const canReveal =
            game.phase === "reveal" && !zombie.card.faceUp && !zombie.dead;
          const canKill =
            game.phase === "kill" && currentAttacks.includes(zombieIndex);

          const selectedColor = () => {
            if (game.phase === "reveal" && canReveal) {
              return "purple";
            } else if (game.phase === "kill" && canKill) {
              return "purple";
            }
            return "none";
          };
          isPlaceholder = zombie.dead;
          selectColor = selectedColor();
          forceOverlay = selectedColor() === "purple";

          onPress = () => {
            if (canReveal) {
              revealZombie(zombieIndex);
            } else if (canKill) {
              killZombie(zombieIndex);
            }
          };
        } else if (target.type === "pile" && pileIndex !== undefined) {
          // ========== Piles ========== //
          const pileIdx = Number(pileIndex);
          const topCard = target.misc?.topOfDeck ? target.card : undefined;
          const canPlay = !!(
            topCard &&
            game.phase === "play" &&
            game.draw[game.draw.length - 1] &&
            canPlayOn(topCard, game.draw[game.draw.length - 1])
          );
          isDisabled = !canPlay;
          selectColor = canPlay ? "green" : "none";
          forceOverlay = canPlay;
          forceSelectColor = canPlay;
          onPress = () => playToPile(pileIdx);
        }

        return (
          <AnimatedCard
            key={target.card.id}
            targetState={target}
            cardWidth={cardWidth}
            cardHeight={cardHeight}
            cardSize={cardSize}
            onPress={onPress}
            isSelected={isSelected}
            selectColor={selectColor}
            forceOverlay={forceOverlay}
            forceSelectColor={forceSelectColor}
            isPlaceholder={isPlaceholder}
            isDisabled={isDisabled}
          />
        );
      })}

      {/* Game Info */}
      <View
        style={[
          flexStyles.rowCentered,
          flexStyles.fullWidth,
          getZoneStyles("gameInfo"),
          {
            backgroundColor: Colors.K875,
            borderRadius: 12,
            paddingVertical: 12,
            paddingLeft: 20,
            paddingRight: 16,
          },
        ]}
      >
        <Text
          style={[
            textStyles.default,
            flexStyles.flex1,
            {
              fontSize: 18,
              fontFamily: FontWeight[400],
            },
          ]}
        >
          {game.phase === "reveal" && "Reveal a zombie"}
          {game.phase === "play" && "Place a card"}
          {game.phase === "kill" &&
            (currentAttacks.length > 0
              ? "Kill a zombie"
              : "No killable zombies!")}
        </Text>
      </View>
    </GameWrapper>
  );
}
