import { useContentWidth } from "@/hooks/useContentWidth";
import { useGameLoading } from "@/hooks/useGameLoading";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, FontWeight } from "@/styles/styles";
import { textStyles } from "@/styles/textStyles";
import { useEffect, useMemo, useRef, useState } from "react";
import { Text, View } from "react-native";
import { useAnimations } from "../Animations/Animations";
import {
  PlayingCard,
  RANK_VALUE,
  cardColor,
  createDeck,
  isFace,
  isJoker,
  rankValue,
  shuffle,
} from "../Cards/card-utils";
import { CardButton } from "../Cards/CardButton";
import { Deck } from "../Cards/Deck";
import { GameWrapper } from "../common/GameWrapper";
import { useLayoutManager } from "@/hooks/useLayoutManager";

const cardsPerRow = 6.2;

type Zombie = {
  id: string;
  card: PlayingCard;
  dead: boolean;
};

type Phase = "reveal" | "play" | "kill";

type GameState = {
  piles: PlayingCard[][];
  zombies: Zombie[];
  draw: PlayingCard[];
  phase: Phase;
  lastPlayedPile: number | null;
  ended: boolean;
  won: boolean;
  winLoseMessage?: string;
};

const PILE_TO_ZOMBIES: Record<number, number[]> = {
  0: [0, 11],
  1: [1],
  2: [2, 3],
  3: [10],
  4: [],
  5: [4],
  6: [8, 9],
  7: [7],
  8: [5, 6],
};

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
  const { contentDiameter } = useContentWidth();
  const gridCellWidth = contentDiameter / 5;
  const gridCellHeight = gridCellWidth * 1.2;

  const { animateCards, animatingCardIds, isAnimating } = useAnimations();
  const { isLoaded, showIntro, setShowIntro } = useGameLoading();
  const [game, setGame] = useState<GameState>(setup);

  function reset() {
    setGame(setup());
  }

  const { getLayout, setRef } = useLayoutManager([
    "draw",
    "zombies",
    "pilesTop",
    "pilesNext",
  ]);

  async function revealZombie(index: number) {
    if (game.ended || game.phase !== "reveal") return;
    const zombie = game.zombies[index];
    if (!zombie || zombie.dead || zombie.card.faceUp) return;

    const zombiePos = getLayout("zombies", index);
    if (zombiePos) {
      await animateCards([
        {
          card: zombie.card,
          cardsPerRow,
          from: zombiePos,
          to: zombiePos,
          flip: "toFace",
          cardSize: "small",
        },
      ]);
    }

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

    const drawPos = getLayout("draw");
    const pilePos = getLayout("pilesNext", index);

    if (drawPos && pilePos) {
      await animateCards([
        {
          card: currentDraw,
          cardsPerRow,
          from: drawPos,
          to: pilePos,
          cardSize: "small",
        },
      ]);
    }

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
    const zombiePos = getLayout("zombies", zombieIndex);
    if (zombiePos) {
      await animateCards([
        {
          card: game.zombies[zombieIndex].card,
          cardsPerRow,
          from: { ...zombiePos, opacity: 1 },
          to: { ...zombiePos, opacity: 0 },
          cardSize: "small",
          duration: 1000,
        },
      ]);
    }

    setGame((prev) => {
      let zombies = [...prev.zombies];

      // Kill zombie
      if (zombieIndex !== null) {
        const z = zombies[zombieIndex];
        if (z && z.card.faceUp && !z.dead) {
          zombies = zombies.map((entry, idx) =>
            idx === zombieIndex ? { ...entry, dead: true } : entry,
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

    const drawPos = getLayout("draw");
    if (drawPos) {
      await animateCards([
        {
          card: drawCard,
          cardsPerRow,
          from: drawPos,
          to: drawPos,
          flip: "toFace",
          cardSize: "small",
        },
      ]);
    }

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

  const ZombieSet = ({
    startIndex,
    isVertical,
    isReversed,
  }: {
    startIndex: number;
    isVertical?: boolean;
    isReversed?: boolean;
  }) => {
    return (
      <View
        style={[
          {
            flexDirection: isVertical
              ? isReversed
                ? "column-reverse"
                : "column"
              : isReversed
                ? "row-reverse"
                : "row",
            width: isVertical ? gridCellWidth : gridCellWidth * 3,
            height: isVertical ? gridCellHeight * 3 : gridCellHeight,
          },
        ]}
      >
        {Array.from({ length: 3 }, (_, arrayIndex) => {
          const zombieIndex = startIndex + arrayIndex;

          const zombie = game.zombies[zombieIndex];
          const canReveal =
            game.phase === "reveal" && !zombie.card.faceUp && !zombie.dead;
          const canKill =
            game.phase === "kill" && currentAttacks.includes(zombieIndex);

          const selectedColor = () => {
            if (isAnimating) {
              return "none";
            } else if (game.phase === "reveal" && canReveal) {
              return "purple";
            } else if (game.phase === "kill" && canKill) {
              return "purple";
            }
            return "none";
          };

          // Zombie Card
          return (
            <View
              key={`zombie-${zombieIndex}`}
              style={[
                flexStyles.colCentered,
                {
                  width: gridCellWidth,
                  height: gridCellHeight,
                },
              ]}
            >
              <CardButton
                ref={setRef("zombies", zombieIndex)}
                onPress={() => {
                  if (canReveal) {
                    revealZombie(zombieIndex);
                  } else if (canKill) {
                    killZombie(zombieIndex);
                  }
                }}
                card={zombie.card}
                cardsPerRow={cardsPerRow}
                isPlaceholder={
                  zombie.dead || animatingCardIds.includes(zombie.card.id)
                }
                selectColor={selectedColor()}
                cardSize="small"
                forceOverlay={selectedColor() === "purple"}
              />
            </View>
          );
        })}
      </View>
    );
  };

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
    >
      <View style={[flexStyles.colCentered, flexStyles.gap20]}>
        {/* Game Info */}
        <View
          style={[
            flexStyles.rowCentered,
            flexStyles.fullWidth,
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

          <Deck
            refTop={setRef("draw")}
            cards={game.draw}
            cardsPerRow={cardsPerRow}
            showCount
            countPosition="left"
            limitFan
            fan="horizontalRight"
            cardSize="small"
            iconName="draw"
            hideTopCard={animatingCardIds.includes(
              game.draw[game.draw.length - 1]?.id,
            )}
          />
        </View>

        {/* Grid */}
        <View style={[flexStyles.colCentered, flexStyles.fullWidth]}>
          {/* Top Row */}
          <View style={[flexStyles.rowCentered, flexStyles.fullWidth]}>
            <ZombieSet startIndex={0} />
          </View>

          {/* Center Row */}
          <View style={[flexStyles.rowCentered]}>
            <ZombieSet startIndex={9} isVertical isReversed />

            <View
              style={[
                {
                  flexDirection: "row",
                  flexWrap: "wrap",
                  width: gridCellWidth * 3,
                  height: gridCellHeight * 3,
                  backgroundColor: Colors.K875,
                  borderRadius: 12,
                },
              ]}
            >
              {game.piles.map((pile, index) => {
                const topCard = pile[pile.length - 1];
                const canPlay =
                  game.phase === "play" &&
                  game.draw[game.draw.length - 1] &&
                  canPlayOn(topCard, game.draw[game.draw.length - 1]);

                return (
                  <View
                    key={`pile-${index}`}
                    style={[
                      flexStyles.colCentered,
                      {
                        width: gridCellWidth,
                        height: gridCellHeight,
                      },
                    ]}
                  >
                    {/* Cabin piles */}
                    <Deck
                      refTop={setRef("pilesTop", index)}
                      refNext={setRef("pilesNext", index)}
                      limitFan
                      cards={pile}
                      cardsPerRow={cardsPerRow}
                      isDisabled={!canPlay}
                      onPress={() => playToPile(index)}
                      cardSize="small"
                      selectColor={canPlay ? "green" : "none"}
                      hideTopCard={animatingCardIds.includes(topCard.id)}
                    />
                  </View>
                );
              })}
            </View>

            <ZombieSet startIndex={3} isVertical />
          </View>

          {/* Bottom Row */}
          <View style={[flexStyles.rowCentered]}>
            <ZombieSet startIndex={6} isReversed />
          </View>
        </View>
      </View>
    </GameWrapper>
  );
}
