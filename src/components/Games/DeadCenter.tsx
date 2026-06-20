import {
  ColRows,
  getGridColRows,
  MappedCard,
  MapZone,
  useCardMap,
} from "@/components/Cards/CardMap";
import { useGameLoading } from "@/hooks/useGameLoading";
import { useUndoHistory } from "@/hooks/useUndoHistory";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, FontWeight } from "@/styles/styles";
import { textStyles } from "@/styles/textStyles";
import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import {
  cardColor,
  createDeck,
  isFace,
  isJoker,
  PlayingCard,
  RANK_VALUE,
  rankValue,
  shuffle,
} from "../Cards/card-utils";
import { GameWrapper } from "../common/GameWrapper";

const zombieZonesColRows: ColRows[] = [
  { c: 1, r: 1 },
  { c: 2, r: 1 },
  { c: 3, r: 1 },
  { c: 4, r: 2 },
  { c: 4, r: 3 },
  { c: 4, r: 4 },
  { c: 3, r: 5 },
  { c: 2, r: 5 },
  { c: 1, r: 5 },
  { c: 0, r: 4 },
  { c: 0, r: 3 },
  { c: 0, r: 2 },
];

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

type GameSnapshot = {
  game: GameState;
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

  // ========== Card Mapping ========== //
  const zones: MapZone[] = useMemo(() => {
    const zombieZones: MapZone[] = zombieZonesColRows.map((pos, i) => ({
      id: `zombie-${i}`,
      pileIndex: i,
      cards: [game.zombies[i].card],
      name: "zombie",
      type: "single-card",
      col: pos.c,
      row: pos.r,
      baseZIndex: 1,
    }));
    const pileZones: MapZone[] = getGridColRows({
      cols: 3,
      rows: 3,
      colOffset: 1,
      rowOffset: 2,
    }).map((pos, i) => ({
      id: `pile-${i}`,
      pileIndex: i,
      cards: game.piles[i],
      name: "pile",
      type: "deck",
      col: pos.c,
      row: pos.r,
      baseZIndex: 10,
      fan: { maxVisible: 3 },
    }));

    return [
      {
        id: "gameInfo",
        type: "ui",
        col: 0,
        row: 0,
        width: "full",
        baseZIndex: 10,
      },
      {
        id: "draw",
        name: "draw",
        type: "deck",
        cards: game.draw,
        col: 4,
        row: 0,
        fan: { maxVisible: 3 },
        baseZIndex: 50,
        placeholder: { show: true, text: "Draw", infoPos: "left" },
      },
      ...zombieZones,
      ...pileZones,
    ];
  }, [game]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (
      mappedCard.zoneName === "zombie" &&
      mappedCard.pileIndex !== undefined
    ) {
      // ========== Zombies ========== //
      const zombie = game.zombies[mappedCard.pileIndex];
      const canReveal =
        game.phase === "reveal" && !zombie.card.faceUp && !zombie.dead;
      const canKill =
        game.phase === "kill" && currentAttacks.includes(mappedCard.pileIndex);

      const selectedColor = () => {
        if (game.phase === "reveal" && canReveal) {
          return "purple";
        } else if (game.phase === "kill" && canKill) {
          return "purple";
        }
        return "none";
      };
      const selectColor = selectedColor();

      return {
        selectColor,
        forceOverlay: selectColor === "purple",
        isPlaceholder: zombie.dead,
        onPress: () => {
          if (canReveal) {
            revealZombie(mappedCard.pileIndex!);
          } else if (canKill) {
            killZombie(mappedCard.pileIndex!);
          }
        },
      };
    } else if (
      mappedCard.zoneName === "pile" &&
      mappedCard.pileIndex !== undefined
    ) {
      // ========== Piles ========== //
      const pileIdx = mappedCard.pileIndex;
      const topCard = mappedCard.topOfZone ? mappedCard.card : undefined;
      const canPlay = !!(
        topCard &&
        game.phase === "play" &&
        game.draw[game.draw.length - 1] &&
        canPlayOn(topCard, game.draw[game.draw.length - 1])
      );

      return {
        selectColor: canPlay ? "green" : "none",
        forceSelectColor: canPlay,
        isDisabled: !canPlay,
        onPress: () => playToPile(pileIdx),
      };
    }
  };

  const { getZoneStylesById, cardMap } = useCardMap({
    game,
    zones,
    gap: 0.35,
    cardMapper,
    cardSize: "small",
  });

  return (
    <GameWrapper
      showIntro={showIntro}
      setShowIntro={setShowIntro}
      ended={game.ended}
      won={game.won}
      reset={reset}
      isLoaded={isLoaded}
      winLoseMessage={
        game.winLoseMessage ?? (game.won ? "You won!" : "You lost.")
      }
      canUndo={canUndo}
      handleUndo={handleUndo}
    >
      {cardMap}

      {/* Game Info */}
      <View
        style={[
          flexStyles.rowCentered,
          flexStyles.fullWidth,
          getZoneStylesById("gameInfo"),
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
