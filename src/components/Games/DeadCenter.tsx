import {
  ColRows,
  getGridColRows,
  MappedCard,
  MapZone,
  useCardMap,
} from "@/components/Cards/CardMap";
import { Text } from "@/components/common/Text";
import { useGameZoneBackground } from "@/hooks/useGameZoneBackground";
import { useStateManager } from "@/hooks/useStateManager";
import { flexStyles } from "@/styles/flexStyles";
import { FontWeight } from "@/styles/styles";
import { delay } from "@/utils/utils";
import { useEffect, useMemo } from "react";
import { View } from "react-native";
import {
  AnimatedCardMapping,
  bufferedDefaultAnimDuration,
} from "../Cards/AnimatedCard";
import {
  cardColor,
  createDeck,
  flipAllToBack,
  flipToFace,
  flipTopCardToFace,
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
  draw: PlayingCard[];
  piles: PlayingCard[][];
  zombies: Zombie[];
  phase: Phase;
  lastPlayedPile: number | null;
  ended: boolean;
  won: boolean;
  winLoseMessage?: string;
};

const gameStateInitial: GameState = {
  draw: createDeck({ faceUp: false, includeJokers: true }),
  piles: [],
  zombies: [],
  phase: "reveal",
  lastPlayedPile: null,
  ended: false,
  won: false,
};

async function resetAndSetup(
  setGame: (updater: (draft: GameState) => void) => void,
) {
  setGame((draft) => {
    const allCards = flipAllToBack([
      ...draft.draw,
      ...draft.piles.flat(),
      ...draft.zombies.map((z) => z.card),
    ]);

    draft.draw = allCards;
    draft.piles = [];
    draft.zombies = [];
    draft.phase = "reveal";
    draft.lastPlayedPile = null;
  });

  await delay(bufferedDefaultAnimDuration);

  setGame((draft) => {
    const allCards = shuffle(draft.draw);

    const zombiesCards = shuffle(allCards.filter(isFace));
    draft.draw = shuffle(allCards.filter((card) => !isFace(card)));

    const piles = Array.from({ length: 9 }, () => [] as PlayingCard[]);
    for (let i = 0; i < 9; i += 1) {
      const next = draft.draw.pop();
      if (next) piles[i].push(flipToFace(next));
    }

    const zombies = Array.from({ length: 12 }, (_, idx) => ({
      id: `z-${idx}`,
      card: zombiesCards[idx],
      dead: false,
    }));

    draft.piles = piles;
    draft.zombies = zombies;
  });

  await delay(bufferedDefaultAnimDuration);

  setGame((draft) => {
    draft.draw = flipTopCardToFace(draft.draw);
  });

  await delay(bufferedDefaultAnimDuration);
}

// ========== Helper Functions ========== //
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
  const { zoneBg } = useGameZoneBackground();

  const {
    isSettingUp,
    isLoaded,
    showIntro,
    setShowIntro,
    game,
    setGame,
    undo,
    canUndo,
    saveUndoState,
    reset,
  } = useStateManager({
    resetAndSetup: async () => {
      await resetAndSetup(setGame);
    },
    gameStateInitial,
  });

  async function revealZombie(index: number) {
    if (game.ended || game.phase !== "reveal") return;
    const zombie = game.zombies[index];
    if (!zombie || zombie.dead || zombie.card.faceUp) return;

    saveUndoState(structuredClone(game));

    setGame((draft) => {
      draft.zombies = draft.zombies.map((z, i) =>
        i === index ? { ...z, card: { ...z.card, faceUp: true } } : z,
      );

      draft.phase = "play";
    });
  }

  async function playToPile(index: number) {
    const currentDraw = game.draw[game.draw.length - 1];
    if (game.ended || game.phase !== "play" || !currentDraw) return;

    const top = game.piles[index][game.piles[index].length - 1];
    if (!canPlayOn(top, currentDraw)) return;

    saveUndoState(structuredClone(game));

    setGame((draft) => {
      draft.piles[index] = [...draft.piles[index], currentDraw];
      draft.draw = [...draft.draw].slice(0, -1);
      draft.phase = "kill";
      draft.lastPlayedPile = index;
    });
  }

  async function killZombie(zombieIndex: number) {
    saveUndoState(structuredClone(game));

    setGame((draft) => {
      // Kill zombie
      draft.zombies[zombieIndex].dead = true;

      // Go to reveal phase if possible, otherwise, play phase
      draft.phase = needsReveal(draft.zombies) ? "reveal" : "play";
      draft.lastPlayedPile = null;
    });
  }

  // Turn over draw card when in play phase
  async function turnOverDrawCard() {
    // Animate draw card toFace
    if (game.draw.length === 0) return;
    const drawCard = game.draw[game.draw.length - 1];
    if (drawCard.faceUp) return;

    setGame((draft) => {
      draft.draw = flipTopCardToFace(draft.draw);
      draft.phase = "play";
      draft.lastPlayedPile = null;
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
      setGame((draft) => {
        draft.phase = needsReveal(draft.zombies) ? "reveal" : "play";
      });
    }, 1500);
  }, [currentAttacks]);

  // Manage win/lose condition
  useEffect(() => {
    if (game.ended || isSettingUp) return;

    if (game.draw.length === 0) {
      setGame((draft) => {
        draft.ended = true;
        draft.won = false;
        draft.winLoseMessage = "No cards left to draw!";
      });
      return;
    }

    const currentDraw = game.draw[game.draw.length - 1];
    const playable = game.piles.some((pile) =>
      canPlayOn(pile[pile.length - 1], currentDraw),
    );

    if (!playable) {
      setGame((draft) => {
        draft.ended = true;
        draft.won = false;
        draft.winLoseMessage = "Unable to place card.";
      });
      return;
    }

    // No more zombie - win!
    if (aliveCount(game.zombies) === 0) {
      setGame((draft) => {
        draft.ended = true;
        draft.won = true;
        draft.winLoseMessage = "You killed all the zombies!";
      });
      return;
    }
  }, [game]);

  // ========== Card Mapping ========== //
  const zones: MapZone[] = useMemo(() => {
    const zombieZones: MapZone[] = zombieZonesColRows.map((pos, i) => ({
      id: `zombie-${i}`,
      name: "zombie",
      pileIndex: i,
      cards: game.zombies[i]?.card ? [game.zombies[i].card] : undefined,
      col: pos.c,
      row: pos.r,
      baseZIndex: 1,
      placeholder: {},
    }));
    const pileZones: MapZone[] = getGridColRows({
      cols: 3,
      rows: 3,
      colOffset: 1,
      rowOffset: 2,
    }).map((pos, i) => ({
      id: `pile-${i}`,
      name: "pile",
      pileIndex: i,
      cards: game.piles[i],
      col: pos.c,
      row: pos.r,
      baseZIndex: 10,
      fan: { maxVisible: 3 },
    }));

    return [
      {
        id: "gameInfo",
        col: 0,
        row: 0,
        width: "full",
        baseZIndex: 10,
      },
      {
        id: "draw",
        name: "draw",
        cards: game.draw,
        col: 4,
        row: 0,
        fan: { maxVisible: 3 },
        baseZIndex: 50,
        placeholder: { text: "Draw", infoPos: "left" },
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
        if (
          (game.phase === "reveal" && canReveal) ||
          (game.phase === "kill" && canKill)
        ) {
          return "red";
        }
        return "none";
      };
      const selectColor = selectedColor();

      return {
        selectColor,
        forceOverlayColor: selectColor === "red",
        forceSelectColor: selectColor === "red",
        isVisible: !zombie.dead,
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
        forceOverlayColor: canPlay,
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
      undo={undo}
    >
      {cardMap}

      {/* Game Info */}
      <View
        style={[
          flexStyles.rowCentered,
          flexStyles.fullWidth,
          getZoneStylesById("gameInfo"),
          {
            backgroundColor: zoneBg,
            borderRadius: 12,
            paddingVertical: 12,
            paddingLeft: 20,
            paddingRight: 16,
          },
        ]}
      >
        <Text
          size="sm"
          style={[
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
