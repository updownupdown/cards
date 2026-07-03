import { useGameZoneBackground } from "@/hooks/useGameZoneBackground";
import { useResponsiveScale } from "@/hooks/useResponsiveLayout";
import { useStateManager } from "@/hooks/useStateManager";
import { Icon } from "@/icons";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, rgba } from "@/styles/styles";
import { delay } from "@/utils/utils";
import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, Platform, View } from "react-native";
import { Button } from "../Button/Button";
import {
  AnimatedCardMapping,
  bufferedDefaultAnimDuration,
} from "../Cards/AnimatedCard";
import {
  createDeck,
  flipAllToFace,
  flipToBack,
  flipToFace,
  isAce,
  isNumberRank,
  rankValue,
  shuffle,
  sortCards,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { Text } from "../common/Text";
import { ProgressBar } from "../Home/ProgressBar";

// ---------- Types ---------- //
type EnemyType = "J" | "Q" | "K";

interface Enemy {
  card: PlayingCard;
  health: number;
  maxHealth: number;
  attack: number;
}

type GamePhase = "attack" | "defend";

type GameState = {
  castleDeck: PlayingCard[];
  hand: PlayingCard[];
  selectedCards: PlayingCard[];
  tavernDeck: PlayingCard[];
  discardPile: PlayingCard[];
  jestersDeck: PlayingCard[];
  phase: GamePhase;
  currentEnemy?: Enemy;
  enemiesDefeated: number;
  damageDealt: number;
  spadeShield: number;
  ended: boolean;
  won: boolean;
  winLoseMessage: string | null;
  victoryType: "gold" | "silver" | "bronze" | null;
};

const ENEMY_STATS: Record<EnemyType, { health: number; attack: number }> = {
  J: { health: 20, attack: 10 },
  Q: { health: 30, attack: 15 },
  K: { health: 40, attack: 20 },
};

// ---------- Game Setup ---------- //
const gameStateInitial: GameState = {
  castleDeck: [],
  hand: [],
  selectedCards: [],
  tavernDeck: [],
  discardPile: createDeck({ includeJokers: true }),
  jestersDeck: [],
  phase: "attack",
  currentEnemy: undefined,
  enemiesDefeated: 0,
  damageDealt: 0,
  spadeShield: 0,
  ended: false,
  won: false,
  winLoseMessage: null,
  victoryType: null,
};

async function resetAndSetup(
  setGame: (updater: (draft: GameState) => void) => void,
) {
  // Gather all cards from all decks and piles, face down to discard pile
  setGame((draft) => {
    const allCards = [
      ...draft.castleDeck,
      ...draft.hand,
      ...draft.tavernDeck,
      ...draft.discardPile,
      ...draft.jestersDeck,
      ...(draft.currentEnemy ? [draft.currentEnemy.card] : []),
    ].map((card) => ({ ...card, faceUp: false }));

    draft.discardPile = allCards;
    draft.castleDeck = [];
    draft.tavernDeck = [];
    draft.jestersDeck = [];
    draft.hand = [];
    draft.currentEnemy = undefined;
  });

  await delay(bufferedDefaultAnimDuration);

  setGame((draft) => {
    const allCards = draft.discardPile;

    const kings = shuffle(allCards.filter((card) => card.rank === "K"));
    const queens = shuffle(allCards.filter((card) => card.rank === "Q"));
    const jacks = shuffle(allCards.filter((card) => card.rank === "J"));
    draft.castleDeck = [...kings, ...queens, ...jacks];

    draft.jestersDeck = flipAllToFace(
      shuffle(allCards.filter((card) => isJester(card))),
    );

    draft.tavernDeck = shuffle(
      allCards.filter((card) => isNumberRank(card.rank) || isAce(card)),
    );

    const firstEnemy = flipToFace(draft.castleDeck.pop()!);
    const enemyStats = ENEMY_STATS[firstEnemy.rank as EnemyType];

    const hand: PlayingCard[] = [];
    for (let i = 0; i < 8 && draft.tavernDeck.length > 0; i++) {
      hand.push(flipToFace(draft.tavernDeck.pop()!));
    }

    draft.currentEnemy = {
      card: firstEnemy,
      health: enemyStats.health,
      maxHealth: enemyStats.health,
      attack: enemyStats.attack,
    };
    draft.enemiesDefeated = 0;
    draft.hand = sortCards(hand);
    draft.discardPile = [];
    draft.damageDealt = 0;
    draft.spadeShield = 0;
    draft.phase = "attack";
    draft.ended = false;
    draft.won = false;
    draft.selectedCards = [] as PlayingCard[];
    draft.winLoseMessage = null;
    draft.victoryType = null as "gold" | "silver" | "bronze" | null;
  });
}

// ---------- Helper Functions ---------- //
function getCardAttackValue(card: PlayingCard): number {
  if (card.rank === "Joker") return 0;
  if (card.rank === "J") return 10;
  if (card.rank === "Q") return 15;
  if (card.rank === "K") return 20;
  return rankValue(card);
}

function getCardDamageValue(card: PlayingCard): number {
  return getCardAttackValue(card);
}

function isJester(card: PlayingCard): boolean {
  return card.rank === "Joker";
}

function isAnimalCompanion(card: PlayingCard): boolean {
  return isAce(card);
}

function isValidComboSelection(cards: PlayingCard[]): boolean {
  if (cards.length < 2 || cards.length > 4) return false;

  const firstCard = cards[0];
  if (!isNumberRank(firstCard.rank)) return false;

  return (
    cards.every((card) => card.rank === firstCard.rank) &&
    rankValue(firstCard) * cards.length <= 10
  );
}

function isValidPlaySelection(cards: PlayingCard[]): boolean {
  if (cards.length === 0) return false;
  if (cards.some((card) => isJester(card))) return false;
  if (cards.length === 1) return true;

  const hasAnimalCompanion = cards.some(isAnimalCompanion);
  if (hasAnimalCompanion) {
    return cards.length === 2;
  }

  return isValidComboSelection(cards);
}

function healFromDiscard(
  discardPile: PlayingCard[],
  tavernDeck: PlayingCard[],
  healAmount: number,
) {
  if (healAmount <= 0 || discardPile.length === 0) {
    return { discardPile, tavernDeck };
  }

  const shuffledDiscard = shuffle([...discardPile]);
  const healedCards = shuffledDiscard
    .slice(0, healAmount)
    .map((card) => flipToBack(card));
  const remainingDiscard = shuffledDiscard
    .slice(healedCards.length)
    .map((card) => flipToFace(card));

  return {
    discardPile: remainingDiscard,
    tavernDeck: [...healedCards, ...tavernDeck],
  };
}

function drawFromTavern(
  tavernDeck: PlayingCard[],
  hand: PlayingCard[],
  drawCount: number,
) {
  const nextTavernDeck = [...tavernDeck];
  const drawnCards: PlayingCard[] = [];

  while (
    drawCount > drawnCards.length &&
    hand.length + drawnCards.length < 8 &&
    nextTavernDeck.length > 0
  ) {
    const card = nextTavernDeck.pop();
    if (!card) break;
    drawnCards.push(flipToFace(card));
  }

  return {
    tavernDeck: nextTavernDeck,
    hand: sortCards([...hand, ...drawnCards]),
  };
}

function hasValidPlayInHand(cards: PlayingCard[]): boolean {
  const selected: PlayingCard[] = [];

  function search(startIndex: number): boolean {
    if (selected.length > 0 && isValidPlaySelection(selected)) {
      return true;
    }

    if (selected.length === 4) {
      return false;
    }

    for (let index = startIndex; index < cards.length; index += 1) {
      selected.push(cards[index]);
      if (search(index + 1)) {
        return true;
      }
      selected.pop();
    }

    return false;
  }

  return search(0);
}

// ---------- Main Component ---------- //
export default function Regicide() {
  const scale = useResponsiveScale();
  const { zoneBg } = useGameZoneBackground();

  const {
    game,
    setGame,
    reset,
    isSettingUp,
    isLoaded,
    showIntro,
    setShowIntro,
    canUndo,
    undo,
    saveUndoState,
  } = useStateManager({
    gameStateInitial,
    resetAndSetup: async () => {
      await resetAndSetup(setGame);
    },
    resetNonGameStates: async () => {
      setGame((draft) => {
        draft.selectedCards = [];
      });
    },
  });

  const playSelection = useMemo(() => {
    const activeSuits = new Set(game.selectedCards.map((card) => card.suit));
    const suitEffects = (
      ["hearts", "diamonds", "clubs", "spades"] as const
    ).filter((suit) => activeSuits.has(suit));
    const damageMultiplier =
      activeSuits.has("clubs") && game.currentEnemy?.card.suit !== "clubs"
        ? 2
        : 1;
    const attackValue = game.selectedCards.reduce((sum, card) => {
      return sum + getCardAttackValue(card);
    }, 0);

    const isValid =
      game.phase === "attack" &&
      game.currentEnemy !== undefined &&
      isValidPlaySelection(game.selectedCards);

    return {
      isValid,
      totalAttack: attackValue,
      damage: attackValue * damageMultiplier,
      suitEffects,
    };
  }, [game.currentEnemy, game.phase, game.selectedCards]);

  const canPlayAnyCards = useMemo(
    () => hasValidPlayInHand(game.hand),
    [game.hand],
  );

  const selectedDefenseValue = useMemo(
    () =>
      game.selectedCards.reduce((sum, card) => {
        return sum + getCardDamageValue(card);
      }, 0),
    [game.selectedCards],
  );

  const totalHandDefenseValue = useMemo(
    () =>
      game.hand.reduce((sum, card) => {
        return sum + getCardDamageValue(card);
      }, 0),
    [game.hand],
  );

  const currentEnemyHealth = game.currentEnemy
    ? Math.max(0, game.currentEnemy.maxHealth - game.damageDealt)
    : 0;

  const currentEnemyAttack = game.currentEnemy?.attack ?? 0;

  const currentEnemyBaseAttack = game.currentEnemy
    ? ENEMY_STATS[game.currentEnemy.card.rank as EnemyType].attack
    : 0;

  const pendingAttackReduction =
    game.phase === "attack" &&
    playSelection.isValid &&
    playSelection.suitEffects.includes("spades") &&
    game.currentEnemy?.card.suit !== "spades"
      ? playSelection.totalAttack
      : 0;

  const previewEnemyAttack = Math.max(
    0,
    currentEnemyAttack - pendingAttackReduction,
  );

  const playSummary = useMemo(() => {
    return {
      attackValue: playSelection.damage,
      suitEffects: playSelection.suitEffects,
    };
  }, [
    game.selectedCards.length,
    pendingAttackReduction,
    playSelection,
    previewEnemyAttack,
  ]);

  const phaseFlip = useRef(
    new Animated.Value(game.phase === "attack" ? 0 : 1),
  ).current;

  useEffect(() => {
    Animated.timing(phaseFlip, {
      toValue: game.phase === "attack" ? 0 : 1,
      duration: 500,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, [game.phase, phaseFlip]);

  const attackFaceRotateX = phaseFlip.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const defendFaceRotateX = phaseFlip.interpolate({
    inputRange: [0, 1],
    outputRange: ["180deg", "360deg"],
  });

  const attackFaceOpacity = phaseFlip.interpolate({
    inputRange: [0, 0.48, 0.52, 1],
    outputRange: [1, 1, 0, 0],
    extrapolate: "clamp",
  });

  const defendFaceOpacity = phaseFlip.interpolate({
    inputRange: [0, 0.48, 0.52, 1],
    outputRange: [0, 0, 1, 1],
    extrapolate: "clamp",
  });

  // Handle automatic game over conditions during attack phase
  useEffect(() => {
    if (
      isSettingUp ||
      game.ended ||
      game.phase !== "attack" ||
      game.jestersDeck.length > 0 ||
      canPlayAnyCards
    ) {
      return;
    }

    setGame((draft) => {
      if (
        draft.ended ||
        draft.phase !== "attack" ||
        draft.jestersDeck.length > 0 ||
        hasValidPlayInHand(draft.hand)
      ) {
        return;
      }

      draft.ended = true;
      draft.won = false;
      draft.winLoseMessage = "No playable cards remain. Game Over!";
      draft.selectedCards = [];
    });
  }, [
    canPlayAnyCards,
    game.ended,
    game.jestersDeck.length,
    game.phase,
    isSettingUp,
    setGame,
  ]);

  // Auto progress to attack phase if enemy attack is 0
  async function autoProgressToAttackPhase() {
    await delay(750);

    setGame((draft) => {
      draft.phase = "attack";
    });
  }

  useEffect(() => {
    if (game.phase === "defend" && currentEnemyAttack === 0) {
      autoProgressToAttackPhase();
    }
  }, [game.phase]);

  // Handle automatic game over conditions during defend phase
  useEffect(() => {
    if (
      isSettingUp ||
      game.ended ||
      game.phase !== "defend" ||
      game.jestersDeck.length > 0 ||
      totalHandDefenseValue >= currentEnemyAttack
    ) {
      return;
    }

    setGame((draft) => {
      const requiredDefense = Math.max(0, draft.currentEnemy?.attack ?? 0);
      const handDefense = draft.hand.reduce((sum, card) => {
        return sum + getCardDamageValue(card);
      }, 0);

      if (
        draft.ended ||
        draft.phase !== "defend" ||
        draft.jestersDeck.length > 0 ||
        handDefense >= requiredDefense
      ) {
        return;
      }

      draft.ended = true;
      draft.won = false;
      draft.winLoseMessage =
        "No possible discard can cover enemy damage. Game Over!";
      draft.selectedCards = [];
    });
  }, [
    currentEnemyAttack,
    game.ended,
    game.jestersDeck.length,
    game.phase,
    isSettingUp,
    setGame,
    totalHandDefenseValue,
  ]);

  // --------- Toggle Card Selection ---------- //
  const selectCardForAttack = (card: PlayingCard) => {
    if (game.phase !== "attack") return;

    const isSelected = game.selectedCards.some((c) => c.id === card.id);

    setGame((draft) => {
      if (isSelected) {
        draft.selectedCards = draft.selectedCards.filter(
          (c) => c.id !== card.id,
        );
      } else {
        draft.selectedCards.push(card);
      }
    });
  };

  // --------- Play Cards ---------- //
  const playCards = () => {
    if (
      !playSelection.isValid ||
      game.phase !== "attack" ||
      game.currentEnemy === undefined
    ) {
      return;
    }

    saveUndoState(structuredClone(game));

    setGame((draft) => {
      if (draft.currentEnemy === undefined) return;

      const playedCards = [...draft.selectedCards];

      // Remove played cards from hand
      for (const playedCard of playedCards) {
        const idx = draft.hand.findIndex(
          (c) => c.suit === playedCard.suit && c.rank === playedCard.rank,
        );
        if (idx >= 0) draft.hand.splice(idx, 1);
      }

      // Apply suit powers, if enemy is not immune (i.e. has the same suit)
      if (
        playSelection.suitEffects.includes("hearts") &&
        draft.currentEnemy.card.suit !== "hearts" &&
        draft.discardPile.length > 0
      ) {
        // Hearts power: heal from discard pile to tavern deck
        const healedState = healFromDiscard(
          draft.discardPile,
          draft.tavernDeck,
          playSelection.totalAttack,
        );

        draft.discardPile = healedState.discardPile;
        draft.tavernDeck = healedState.tavernDeck;
      } else if (
        playSelection.suitEffects.includes("diamonds") &&
        draft.currentEnemy.card.suit !== "diamonds"
      ) {
        // Diamonds power: draw from tavern deck to hand
        const drawnState = drawFromTavern(
          draft.tavernDeck,
          draft.hand,
          playSelection.totalAttack,
        );
        draft.tavernDeck = drawnState.tavernDeck;
        draft.hand = drawnState.hand;
      } else if (
        playSelection.suitEffects.includes("spades") &&
        draft.currentEnemy.card.suit !== "spades"
      ) {
        // Spades power: reduce enemy attack
        draft.currentEnemy.attack = Math.max(
          0,
          draft.currentEnemy.attack - playSelection.totalAttack,
        );
      }
      // Note: clubs power is applied in the damage calculation below, so no need to handle it here

      // Deal damage and check if enemy defeated
      const newDamageDealt = draft.damageDealt + playSelection.damage;
      draft.damageDealt = newDamageDealt;
      draft.currentEnemy.health = Math.max(
        0,
        draft.currentEnemy.maxHealth - newDamageDealt,
      );

      if (newDamageDealt >= draft.currentEnemy.maxHealth) {
        const exactDefeat = newDamageDealt === draft.currentEnemy.maxHealth;

        // Enemy defeated
        const newEnemiesDefeated = draft.enemiesDefeated + 1;
        draft.enemiesDefeated = newEnemiesDefeated;

        if (exactDefeat) {
          draft.tavernDeck.push(flipToBack(draft.currentEnemy.card));
        } else {
          draft.discardPile.push(draft.currentEnemy.card);
        }

        draft.discardPile.push(...playedCards);
        draft.damageDealt = 0;
        draft.spadeShield = 0;
        draft.phase = "attack";
        draft.selectedCards = [];

        if (newEnemiesDefeated === 12) {
          // Game won!
          const victoryType =
            draft.jestersDeck.length === 2
              ? "gold"
              : draft.jestersDeck.length === 1
                ? "silver"
                : "bronze";

          draft.ended = true;
          draft.won = true;
          draft.currentEnemy = undefined;
          draft.victoryType = victoryType;
          draft.winLoseMessage = `All enemies defeated! ${victoryType.toUpperCase()} victory!`;
        } else {
          // Move to next enemy
          if (draft.castleDeck.length > 0) {
            const nextEnemyCard = flipToFace(draft.castleDeck.pop()!);
            const nextEnemyType = nextEnemyCard.rank as EnemyType;
            const nextStats = ENEMY_STATS[nextEnemyType];

            draft.currentEnemy = {
              card: nextEnemyCard,
              health: nextStats.health,
              maxHealth: nextStats.health,
              attack: nextStats.attack,
            };
          }
        }
      } else {
        // Enemy survives - move to suffering damage phase
        draft.discardPile.push(...playedCards);
        draft.phase = "defend";
        draft.selectedCards = [];
      }
    });
  };

  // --------- Handle Damage Discard ---------- //
  const selectCardForDefend = (card: PlayingCard) => {
    if (game.phase !== "defend" || game.currentEnemy === undefined) {
      return;
    }

    const isSelected = game.selectedCards.some(
      (selected) => selected.id === card.id,
    );

    if (isSelected) {
      setGame((draft) => {
        draft.selectedCards = draft.selectedCards.filter(
          (selected) => selected.id !== card.id,
        );
      });
      return;
    }

    setGame((draft) => {
      draft.selectedCards.push(card);
    });
  };

  // --------- Handle End Damage Phase ---------- //
  const handleEndDamagePhase = () => {
    if (game.phase !== "defend" || game.currentEnemy === undefined) {
      return;
    }

    saveUndoState(structuredClone(game));

    const enemyDamage = Math.max(0, game.currentEnemy.attack);
    let discardValue = 0;

    for (const card of game.selectedCards) {
      if (!isJester(card)) {
        discardValue += getCardDamageValue(card);
      }
    }

    if (discardValue < enemyDamage) {
      // Couldn't block enough damage - lose
      setGame((draft) => {
        draft.ended = true;
        draft.won = false;
        draft.winLoseMessage = `Failed to block ${enemyDamage - discardValue} damage. Game Over!`;
      });
      return;
    }

    setGame((draft) => {
      // Remove discarded cards from hand
      for (const card of draft.selectedCards) {
        const idx = draft.hand.findIndex(
          (c) => c.suit === card.suit && c.rank === card.rank,
        );
        if (idx >= 0) {
          draft.hand.splice(idx, 1);
        }
      }

      // Add to discard pile
      draft.discardPile.push(...draft.selectedCards);

      draft.phase = "attack";
      draft.selectedCards = [];
      draft.winLoseMessage = null;
    });
  };

  // --------- Handle Jester Power ---------- //
  const selectJester = () => {
    if (
      game.jestersDeck.length === 0 ||
      game.ended ||
      (game.phase === "attack" && game.selectedCards.length > 0) ||
      (game.phase === "defend" && game.selectedCards.length > 0)
    ) {
      return;
    }

    saveUndoState(structuredClone(game));

    setGame((draft) => {
      draft.jestersDeck.pop();

      // Discard hand and refill
      draft.discardPile.push(...draft.hand);
      const drawnState = drawFromTavern(draft.tavernDeck, [], 8);
      draft.tavernDeck = drawnState.tavernDeck;
      draft.hand = drawnState.hand;

      draft.selectedCards = [];
      draft.winLoseMessage = null;
    });
  };

  const enemyDamageAfterShield = currentEnemyAttack;

  // ========== Card Map ========== //
  const zones: MapZone[] = useMemo(() => {
    return [
      // Top Piles
      {
        id: "castleDeck",
        name: "castleDeck",
        col: 0,
        row: 0,
        cards: game.castleDeck,
        placeholder: { infoPos: "above", text: "Castle" },
        fan: { maxVisible: 3 },
      },
      {
        id: "tavernDeck",
        name: "tavernDeck",
        col: 1,
        row: 0,
        cards: game.tavernDeck,
        placeholder: { infoPos: "above", text: "Tavern" },
        fan: { maxVisible: 3 },
      },
      {
        id: "jestersDeck",
        name: "jestersDeck",
        col: 2,
        row: 0,
        cards: game.jestersDeck,
        placeholder: { infoPos: "above", text: "Jesters" },
        fan: { maxVisible: 3 },
      },
      {
        id: "discardPile",
        col: 3,
        row: 0,
        cards: game.discardPile,
        placeholder: { infoPos: "above", text: "Discard" },
        fan: { maxVisible: 3 },
      },

      // Enemy
      {
        id: "enemyZone",
        col: 0,
        row: 1.1,
        width: 4,
        height: 1.2,
      },
      {
        id: "currentEnemy",
        col: 0.16,
        row: 1.2,
        cards: game.currentEnemy?.card ? [game.currentEnemy.card] : undefined,
      },
      {
        id: "enemyStats",
        col: 1.2,
        row: 1.2,
        width: 2.55,
        height: 1,
      },

      // Actions
      { id: "actions", col: 0, row: 2.25, width: 4, height: 0.8 },

      // Hand
      {
        id: "hand",
        name: "hand",
        col: 0,
        row: 3.2,
        width: 4,
        cards: game.hand,
        fan: { direction: "right", offset: 0.53 },
      },
    ];
  }, [game]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (mappedCard.zoneName === "jestersDeck") {
      // Jesters
      return {
        onPress: () => selectJester(),
      };
    } else if (mappedCard.zoneName === "hand") {
      // Hand
      const isSelected = game.selectedCards.some(
        (c) => c.id === mappedCard.card.id,
      );

      const selectedColor = () => {
        if (!isSelected) return "none";
        if (game.phase === "attack") {
          return playSelection.isValid ? "blue" : "orange";
        } else {
          return selectedDefenseValue >= currentEnemyAttack
            ? "purple"
            : "orange";
        }
      };

      return {
        isSelected,
        yOffset: isSelected ? -0.2 : 0,
        selectColor: selectedColor(),
        onPress: () =>
          game.phase === "attack"
            ? selectCardForAttack(mappedCard.card)
            : selectCardForDefend(mappedCard.card),
      };
    }
    return;
  };

  const { cardMap, cardHeight, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper,
    cardSize: "regular",
  });

  return (
    <GameWrapper
      showIntro={showIntro}
      setShowIntro={setShowIntro}
      reset={reset}
      isLoaded={isLoaded}
      ended={game.ended}
      won={game.won}
      winLoseMessage={game.winLoseMessage ?? undefined}
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}

      {/* Enemy Display */}
      <View
        style={[
          getZoneStylesById("enemyZone"),
          { backgroundColor: zoneBg, borderRadius: 8 * scale },
        ]}
      />
      {game.currentEnemy && (
        <View
          style={[
            getZoneStylesById("enemyStats"),
            flexStyles.colStart,
            flexStyles.spaceBetween,
            {
              paddingVertical: 8 * scale,
            },
          ]}
        >
          <ProgressBar
            totalValue={game.currentEnemy.maxHealth}
            progressValue={currentEnemyHealth}
            previewProgressValue={
              game.phase === "attack" && playSelection.isValid
                ? Math.max(0, currentEnemyHealth - playSelection.damage)
                : undefined
            }
            color={
              currentEnemyHealth === 0 ||
              (game.phase === "attack" &&
                playSelection.isValid &&
                currentEnemyHealth - playSelection.damage <= 0)
                ? "red"
                : "blue"
            }
            iconName="heart"
            autoTallyText
            scaledHeight={cardHeight * 0.34}
          />

          <ProgressBar
            totalValue={currentEnemyBaseAttack}
            progressValue={currentEnemyAttack}
            previewProgressValue={
              game.phase === "attack" && playSelection.isValid
                ? Math.max(0, currentEnemyAttack - pendingAttackReduction)
                : undefined
            }
            color={
              enemyDamageAfterShield === 0 ||
              currentEnemyAttack - pendingAttackReduction <= 0
                ? "red"
                : "purple"
            }
            iconName="sword"
            autoTallyText
            scaledHeight={cardHeight * 0.34}
          />
        </View>
      )}

      {/* Actions */}
      <View
        style={[
          getZoneStylesById("actions"),
          {
            position: "absolute",
          },
        ]}
      >
        {/* Attack Actions */}
        <Animated.View
          style={[
            flexStyles.rowCentered,
            {
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              paddingVertical: 6 * scale,
              paddingHorizontal: 16 * scale,
              gap: 16 * scale,
              backfaceVisibility: "hidden",
              opacity: attackFaceOpacity,
              transform: [{ perspective: 900 }, { rotateX: attackFaceRotateX }],
              pointerEvents: game.phase === "attack" ? "auto" : "none",
              backgroundColor: zoneBg,
              borderRadius: 8 * scale,
              boxShadow: `inset 0 0 0 ${1.5 * scale}px ${rgba(Colors.buttonBlue, 0.5)}, 0 0 ${20 * scale}px ${rgba(Colors.buttonBlue, 0.5)}`,
            },
          ]}
        >
          {/* Powers/Suits */}
          <View
            style={[flexStyles.rowCentered, { width: "20%", gap: 6 * scale }]}
          >
            {playSelection.isValid &&
              playSummary.suitEffects.length > 0 &&
              playSummary.suitEffects.map((suit) => (
                <Icon key={suit} name={suit} size={22} color={Colors.white} />
              ))}
          </View>

          {/* Attack Button */}
          <Button
            onPress={playCards}
            text="Attack"
            disabled={!playSelection.isValid}
            theme="blue"
            style={{ flex: 1 }}
          />

          {/* Attack Values */}
          <View
            style={[
              flexStyles.rowCentered,
              {
                width: "20%",
                gap: 6 * scale,
              },
            ]}
          >
            {playSelection.isValid && (
              <>
                <Text size="md" weight={400} color={Colors.white}>
                  x
                </Text>
                <Text size="xl" weight={500} color={Colors.white}>
                  {playSelection.isValid ? playSummary.attackValue : "-"}
                </Text>
              </>
            )}
          </View>
        </Animated.View>

        {/* Defend Actions */}
        <Animated.View
          style={[
            flexStyles.rowCentered,
            {
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              paddingVertical: 6 * scale,
              paddingHorizontal: 16 * scale,
              gap: 16 * scale,
              backfaceVisibility: "hidden",
              opacity: defendFaceOpacity,
              transform: [{ perspective: 900 }, { rotateX: defendFaceRotateX }],
              pointerEvents: game.phase === "defend" ? "auto" : "none",
              backgroundColor: zoneBg,
              borderRadius: 8 * scale,
              boxShadow: `inset 0 0 0 ${1.5 * scale}px ${rgba(Colors.buttonPurple, 0.5)}, 0 0 ${20 * scale}px ${rgba(Colors.buttonPurple, 0.5)}`,
            },
          ]}
        >
          {/* ---------- Defend ---------- */}
          {/* Defend Values */}
          <View style={[flexStyles.rowCentered, { width: "35%" }]}>
            <Text
              size="lg"
              weight={400}
              color={enemyDamageAfterShield === 0 ? Colors.K500 : Colors.white}
            >
              {`${selectedDefenseValue} / ${enemyDamageAfterShield}`}
            </Text>
          </View>

          {/* Defend Button */}
          <Button
            onPress={handleEndDamagePhase}
            text="Defend"
            disabled={
              enemyDamageAfterShield === 0 ||
              selectedDefenseValue < currentEnemyAttack
            }
            theme="purple"
            style={{ flex: 1 }}
          />
        </Animated.View>
      </View>
    </GameWrapper>
  );
}
