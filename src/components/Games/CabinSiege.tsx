import {
  ColRows,
  getGridColRows,
  MappedCard,
  MapZone,
  useCardMap,
} from "@/components/Cards/CardMap";
import { Text } from "@/components/common/Text";
import { useGameColors } from "@/hooks/useGameColors";
import { useStateManager } from "@/hooks/useStateManager";
import { flexStyles } from "@/styles/flexStyles";
import { FontWeight } from "@/styles/styles";
import { delay } from "@/utils/utils";
import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
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
import { DeckPreviewModal } from "../Modals/DeckPreviewModal";
import { useHint } from "@/hints/hint-store";
import { cardTarget, makeHint, withNote, zoneTarget } from "@/hints/hint";

import { i18n } from "@/i18n";
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

export type CabinSiegeZombie = Zombie;

type Phase = "reveal" | "play" | "kill";

export type CabinSiegePhase = Phase;

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

export type CabinSiegeGameState = GameState;

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
    draft.ended = false;
    draft.won = false;
    draft.winLoseMessage = "";
  });

  await delay();

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

  await delay();

  setGame((draft) => {
    draft.draw = flipTopCardToFace(draft.draw);
  });

  await delay();
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

function getAvailableAttacks(snapshot: GameState) {
  if (snapshot.phase !== "kill" || snapshot.lastPlayedPile === null) {
    return [] as number[];
  }

  const lastPlayedPile = snapshot.lastPlayedPile;
  return (PILE_TO_ZOMBIES[lastPlayedPile] ?? []).filter((index) => {
    const zombie = snapshot.zombies[index];
    if (!zombie || zombie.dead || !zombie.card.faceUp) return false;

    const supports = supportIndicesForAttack(lastPlayedPile, index)
      .map((pileIndex) => {
        const pile = snapshot.piles[pileIndex];
        return pile?.[pile.length - 1];
      })
      .filter((card): card is PlayingCard => card !== undefined);

    return supports.length === 2 && canKillZombie(zombie.card, supports);
  });
}

function phaseAfterKill(zombies: Zombie[]): Phase {
  return needsReveal(zombies) ? "reveal" : "play";
}

function playPileAction(draft: GameState, pileIndex: number) {
  if (draft.phase !== "play" || draft.ended) return false;

  const drawCard = draft.draw[draft.draw.length - 1];
  const pile = draft.piles[pileIndex];
  const top = pile?.[pile.length - 1];
  if (!drawCard || !top || !canPlayOn(top, drawCard)) return false;

  draft.piles[pileIndex] = [...pile, drawCard];
  draft.draw = draft.draw.slice(0, -1);
  draft.phase = "kill";
  draft.lastPlayedPile = pileIndex;
  return true;
}

function killZombieAction(draft: GameState, zombieIndex: number) {
  if (
    draft.phase !== "kill" ||
    draft.ended ||
    !getAvailableAttacks(draft).includes(zombieIndex)
  ) {
    return false;
  }

  draft.zombies[zombieIndex].dead = true;
  draft.phase = phaseAfterKill(draft.zombies);
  draft.lastPlayedPile = null;
  return true;
}

function evaluateOutcome(snapshot: GameState) {
  if (aliveCount(snapshot.zombies) === 0) {
    return {
      won: true,
      message: i18n.t("games:cabinSiege.youKilledAllTheZombies"),
    };
  }

  if (snapshot.draw.length === 0) {
    if (getAvailableAttacks(snapshot).length > 0) return null;

    return {
      won: false,
      message: i18n.t("games:cabinSiege.noCardsLeftToDraw"),
    };
  }

  const currentDraw = snapshot.draw[snapshot.draw.length - 1];
  const playable = snapshot.piles.some((pile) =>
    canPlayOn(pile[pile.length - 1], currentDraw),
  );

  if (!playable) {
    return {
      won: false,
      message: i18n.t("games:cabinSiege.unableToPlaceCard"),
    };
  }

  return null;
}

// Kings ask most of their supports, so take one whenever the board allows.
const ZOMBIE_PRIORITY: Record<string, number> = { K: 3, Q: 2, J: 1 };

function zombiePriority(zombie: Zombie) {
  return ZOMBIE_PRIORITY[zombie.card.rank] ?? 0;
}

/** How many of the draw's possible cards could follow this one. */
function openness(top: PlayingCard) {
  return createDeck({ includeJokers: true }).filter((card) =>
    canPlayOn(top, card),
  ).length;
}

/**
 * Kills the next card could make: for each zombie on view, each pile beside
 * it whose supports already kill it, weighted by the zombie and by how many
 * cards that pile takes.
 */
function setUpKills(state: GameState) {
  let value = 0;
  state.zombies.forEach((zombie, zombieIndex) => {
    if (zombie.dead || !zombie.card.faceUp) return;
    state.piles.forEach((pile, pileIndex) => {
      if (!(PILE_TO_ZOMBIES[pileIndex] ?? []).includes(zombieIndex)) return;
      const supports = supportIndicesForAttack(pileIndex, zombieIndex).map(
        (index) => state.piles[index].at(-1)!,
      );
      if (supports.length === 2 && canKillZombie(zombie.card, supports)) {
        value += zombiePriority(zombie) * openness(pile.at(-1)!);
      }
    });
  });
  return value;
}

/**
 * The draw is face down past its top card, so the hint looks one card
 * ahead: place it where it kills a zombie (the most demanding first), else
 * where it sets up kills for the cards to come, keeping piles open to them.
 */
function findCabinSiegeHint(state: GameState) {
  if (state.ended) return null;
  if (state.phase === "reveal") {
    const hidden = state.zombies.find((z) => !z.dead && !z.card.faceUp);
    return hidden ? makeHint("tapCard", cardTarget(hidden.card)) : null;
  }
  if (state.phase === "kill") {
    const targets = getAvailableAttacks(state)
      .map((index) => state.zombies[index])
      .sort((a, b) => zombiePriority(b) - zombiePriority(a));
    const best = targets[0];
    if (!best) return null;
    const hint = makeHint("tapCard", cardTarget(best.card));
    // Only one zombie dies per card: say why when a lesser one could too.
    return targets.some((other) => zombiePriority(other) < zombiePriority(best))
      ? withNote(hint, i18n.t("games:cabinSiege.hint.kill"))
      : hint;
  }
  const before = setUpKills(state);
  const options = state.piles.flatMap((_, pileIndex) => {
    const next: GameState = { ...state, piles: [...state.piles] };
    if (!playPileAction(next, pileIndex)) return [];
    const kills = getAvailableAttacks(next).map((index) =>
      zombiePriority(next.zombies[index]),
    );
    const setUp = setUpKills(next);
    return [
      {
        pileIndex,
        kills: kills.length > 0,
        setUp: setUp > before,
        value:
          (kills.length > 0 ? 10000 + 1000 * Math.max(...kills) : 0) +
          setUp +
          openness(next.piles[pileIndex].at(-1)!),
      },
    ];
  });
  const best = options.reduce<(typeof options)[number] | null>(
    (top, option) => (!top || option.value > top.value ? option : top),
    null,
  );
  if (!best) return null;
  // The draw card takes no tap; the pile it goes on does.
  const hint = makeHint("moveCard", zoneTarget(`pile-${best.pileIndex}`));
  return best.kills
    ? withNote(hint, i18n.t("games:cabinSiege.hint.playToKill"))
    : best.setUp
      ? withNote(hint, i18n.t("games:cabinSiege.hint.prepareKill"))
      : hint;
}

export const cabinSiegeRules = {
  findHint: findCabinSiegeHint,
  canPlayOn,
  supportIndicesForAttack,
  canKillZombie,
  needsReveal,
  aliveCount,
  getAvailableAttacks,
  phaseAfterKill,
  playPileAction,
  killZombieAction,
  evaluateOutcome,
};

export default function CabinSiege() {
  const { colorZone, colorPale } = useGameColors();
  const [showDeckPreview, setShowDeckPreview] = useState(false);

  const {
    isSettingUp,
    isLoaded,
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

  useHint(() => findCabinSiegeHint(game), { game, enabled: !isSettingUp });

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
    if (game.ended || game.phase !== "play") return;

    saveUndoState(structuredClone(game));

    setGame((draft) => {
      playPileAction(draft, index);
    });
  }

  async function killZombie(zombieIndex: number) {
    if (!currentAttacks.includes(zombieIndex)) return;
    saveUndoState(structuredClone(game));

    setGame((draft) => {
      killZombieAction(draft, zombieIndex);
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
    return getAvailableAttacks(game);
  }, [game]);

  useEffect(() => {
    if (game.ended || game.phase !== "kill" || currentAttacks.length > 0)
      return;

    const timer = setTimeout(() => {
      setGame((draft) => {
        draft.phase = phaseAfterKill(draft.zombies);
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, [currentAttacks]);

  // Manage win/lose condition
  useEffect(() => {
    if (game.ended || isSettingUp) return;

    const outcome = evaluateOutcome(game);
    if (!outcome) return;

    setGame((draft) => {
      draft.ended = true;
      draft.won = outcome.won;
      draft.winLoseMessage = outcome.message;
    });
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
        baseZIndex: 1,
      },
      {
        id: "draw",
        name: "draw",
        cards: game.draw,
        col: 4,
        row: 0,
        fan: { maxVisible: 3 },
        baseZIndex: 50,
        placeholder: { text: i18n.t("cards:stock"), infoPos: "left" },
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
        forceOverlayColor: selectColor !== "none",
        forceSelectColor: selectColor !== "none",
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
    } else if (mappedCard.zoneName === "draw") {
      return {
        clickThroughCards: true,
      };
    }
  };

  const { getZoneStylesById, cardMap } = useCardMap({
    game,
    zones,
    gap: 0.35,
    cardMapper,
    zoneMapper: (zone) => {
      if (zone.id !== "draw") return;

      return {
        onPress: () => setShowDeckPreview(true),
        isDisabled: game.draw.length === 0,
      };
    },
    cardSize: "small",
  });

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      reset={reset}
      isLoaded={isLoaded}
      winLoseMessage={
        game.winLoseMessage ??
        (game.won ? i18n.t("cards:youWon") : i18n.t("games:cabinSiege.youLost"))
      }
      canUndo={canUndo}
      undo={undo}
    >
      <DeckPreviewModal
        visible={showDeckPreview}
        cards={game.draw}
        onClose={() => setShowDeckPreview(false)}
        title={i18n.t("cards:deckPreview")}
        sortCards
      />

      {cardMap}

      {/* Game Info */}
      <View
        style={[
          flexStyles.rowCentered,
          flexStyles.fullWidth,
          getZoneStylesById("gameInfo"),
          {
            backgroundColor: colorZone,
            borderRadius: 12,
            paddingVertical: 12,
            paddingLeft: 20,
            paddingRight: 16,
          },
        ]}
      >
        <Text
          size="sm"
          color={colorPale}
          style={[
            flexStyles.flex1,
            {
              fontSize: 18,
              fontFamily: FontWeight[400],
            },
          ]}
        >
          {game.phase === "reveal" && i18n.t("games:cabinSiege.revealAZombie")}
          {game.phase === "play" && i18n.t("games:cabinSiege.placeACard")}
          {game.phase === "kill" &&
            (currentAttacks.length > 0
              ? i18n.t("games:cabinSiege.killAZombie")
              : i18n.t("games:cabinSiege.noKillableZombies"))}
        </Text>
      </View>
    </GameWrapper>
  );
}
