import { useGameColors } from "@/hooks/useGameColors";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useStateManager } from "@/hooks/useStateManager";
import { Icon } from "@/icons";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, rgba } from "@/styles/styles";
import { delay } from "@/utils/utils";
import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, Platform, View } from "react-native";
import { Button } from "../Button/Button";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import {
  CardSuit,
  createDeck,
  flipAllToFace,
  flipToBack,
  flipToFace,
  isAce,
  isNumberRank,
  RANKS,
  rankValue,
  shuffle,
  sortCardsBySuit,
  SUITS,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { getUnderlayStyle } from "../Cards/CardStyles";
import { GameWrapper } from "../common/GameWrapper";
import { Text } from "../common/Text";
import { ProgressBar } from "../Home/ProgressBar";

import { i18n } from "@/i18n";
import { useHint } from "@/hints/hint-store";
import { cardTarget, makeHint, withNote, zoneTarget } from "@/hints/hint";
// ---------- Types ---------- //
type EnemyType = "J" | "Q" | "K";

interface Enemy {
  card: PlayingCard;
  health: number;
  maxHealth: number;
  attack: number;
}

export type CrownslayerEnemy = Enemy;

type GamePhase = "attack" | "defend";

export type CrownslayerPhase = GamePhase;

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

export type CrownslayerGameState = GameState;

const ENEMY_STATS: Record<EnemyType, { health: number; attack: number }> = {
  J: { health: 20, attack: 10 },
  Q: { health: 30, attack: 15 },
  K: { health: 40, attack: 20 },
};

const SUIT_EFFECTS_TEXT = {
  hearts: "games:crownslayer.powerHeal",
  diamonds: "games:crownslayer.powerDraw",
  clubs: "games:crownslayer.powerDouble",
  spades: "games:crownslayer.powerShield",
} as const satisfies Record<CardSuit, string>;

const VICTORY_MESSAGE = {
  gold: "games:crownslayer.victoryGold",
  silver: "games:crownslayer.victorySilver",
  bronze: "games:crownslayer.victoryBronze",
} as const;

const SUIT_EFFECTS_COLOR: Record<CardSuit, string> = {
  hearts: Colors.buttonGreen,
  diamonds: Colors.buttonRed,
  clubs: Colors.buttonBlue,
  spades: Colors.buttonPurple,
};

function createEnemy(card: PlayingCard): Enemy {
  const stats = ENEMY_STATS[card.rank as EnemyType];
  return {
    card,
    health: stats.health,
    maxHealth: stats.health,
    attack: stats.attack,
  };
}

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

  await delay();

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

    const hand: PlayingCard[] = [];
    for (let i = 0; i < 8 && draft.tavernDeck.length > 0; i++) {
      hand.push(flipToFace(draft.tavernDeck.pop()!));
    }

    draft.currentEnemy = createEnemy(firstEnemy);
    draft.enemiesDefeated = 0;
    draft.hand = sortCardsBySuit(hand);
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
    hand: sortCardsBySuit([...hand, ...drawnCards]),
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

function evaluateAttackSelection(cards: PlayingCard[], enemyCard: PlayingCard) {
  const activeSuits = new Set(cards.map((card) => card.suit));
  const suitEffects = (
    ["hearts", "diamonds", "clubs", "spades"] as const
  ).filter((suit) => activeSuits.has(suit) && suit !== enemyCard.suit);
  const totalAttack = cards.reduce(
    (sum, card) => sum + getCardAttackValue(card),
    0,
  );
  const damage = totalAttack * (suitEffects.includes("clubs") ? 2 : 1);

  return { totalAttack, damage, suitEffects };
}

function getDefenseValue(cards: PlayingCard[]) {
  return cards.reduce(
    (sum, card) => sum + (isJester(card) ? 0 : getCardDamageValue(card)),
    0,
  );
}

// ---------- Hints ---------- //

// What a card in hand is worth beyond its value: one more card to play or
// block with, and its suit's power (diamonds most: only they refill the
// hand).
const CARD_WORTH = 2;
const SUIT_WORTH: Record<CardSuit, number> = {
  hearts: 1,
  diamonds: 4,
  clubs: 1,
  spades: 1,
};
// Using a jester throws the hand away: worth it only to stay alive.
const JESTER_COST = 60;
const KILL_BONUS = 15;
const LOST = -1000;

type Keepable = { card?: PlayingCard; value: number; worth: number };

/** What keeping a card is worth (a card of the enemy's suit has no power). */
function keepWorth(card: PlayingCard, enemySuit: CardSuit | undefined) {
  return (
    getCardAttackValue(card) +
    CARD_WORTH +
    (card.suit === enemySuit ? 0 : SUIT_WORTH[card.suit])
  );
}

/**
 * The tavern is face down, but what is in it is no secret: every number
 * card not in the hand or the discard, and the royals beaten exactly. (The
 * castle deals Jacks, then Queens, then Kings, so the royals of a rank not
 * seen and not still in the castle are in the tavern.) What an average card
 * drawn from it is worth.
 */
function tavernCardWorth(game: GameState) {
  const seen = [
    ...game.hand,
    ...game.discardPile,
    ...(game.currentEnemy ? [game.currentEnemy.card] : []),
  ];
  const castle = game.castleDeck.length;
  const inCastle: Record<EnemyType, number> = {
    K: Math.min(castle, 4),
    Q: Math.min(Math.max(castle - 4, 0), 4),
    J: Math.max(castle - 8, 0),
  };
  const values: number[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      if (seen.some((card) => card.rank === rank && card.suit === suit)) {
        continue;
      }
      if (rank in inCastle && inCastle[rank as EnemyType]-- > 0) continue;
      values.push(
        getCardAttackValue({ rank, suit } as PlayingCard) + CARD_WORTH + 1,
      );
    }
  }
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * The cards to block an attack with that cost least to lose (null if the
 * hand can't block it).
 */
function cheapestCover<T extends Keepable>(cards: T[], attack: number) {
  if (attack <= 0) return { cards: [] as T[], cost: 0 };
  let best: { cards: T[]; cost: number } | null = null;
  for (let mask = 1; mask < 1 << cards.length; mask += 1) {
    let value = 0;
    let cost = 0;
    for (let index = 0; index < cards.length; index += 1) {
      if (mask & (1 << index)) {
        value += cards[index].value;
        cost += cards[index].worth;
      }
    }
    if (value < attack || (best && cost >= best.cost)) continue;
    best = {
      cards: cards.filter((_, index) => mask & (1 << index)),
      cost,
    };
  }
  return best;
}

function validPlays(hand: PlayingCard[]) {
  const plays: PlayingCard[][] = [];
  for (let mask = 1; mask < 1 << hand.length; mask += 1) {
    const play = hand.filter((_, index) => mask & (1 << index));
    if (play.length <= 4 && isValidPlaySelection(play)) plays.push(play);
  }
  return plays;
}

type AttackPlan = { play: PlayingCard[]; value: number; kills: boolean };

/**
 * How good a play is: the damage it does (a kill most of all), what its
 * powers bring, and what the hand is left with once the enemy's attack is
 * blocked; with `ahead`, a play that doesn't kill is judged by the best
 * play the hand then has left. The cards a diamond draws are unknown: they
 * count at the tavern's average.
 */
function judgeAttack(
  game: GameState,
  play: PlayingCard[],
  drawnWorth: number,
  ahead: number,
): AttackPlan {
  const enemy = game.currentEnemy!;
  const enemySuit = enemy.card.suit;
  const health = enemy.maxHealth - game.damageDealt;
  const { totalAttack, damage, suitEffects } = evaluateAttackSelection(
    play,
    enemy.card,
  );
  const ids = new Set(play.map((card) => card.id));
  const rest: Keepable[] = game.hand
    .filter((card) => !ids.has(card.id))
    .map((card) => ({
      card,
      value: getCardAttackValue(card),
      worth: keepWorth(card, enemySuit),
    }));
  const drawn = suitEffects.includes("diamonds")
    ? Math.min(totalAttack, 8 - rest.length, game.tavernDeck.length)
    : 0;
  for (let index = 0; index < drawn; index += 1) {
    rest.push({ value: drawnWorth - CARD_WORTH - 1, worth: drawnWorth });
  }
  let value = 0;
  if (suitEffects.includes("hearts")) {
    // Healed cards come back to the tavern (there's no other way back for
    // them), worth most when it runs low.
    const healed = Math.min(totalAttack, game.discardPile.length);
    value += healed * (game.tavernDeck.length < 10 ? 4 : 2);
  }
  const kept = rest.reduce((sum, card) => sum + card.worth, 0);

  if (damage >= health) {
    // An exact kill puts the royal on top of the tavern: a strong card.
    const exact = damage === health ? 0.4 * getCardAttackValue(enemy.card) : 0;
    return {
      play,
      value: value + health + KILL_BONUS + exact + kept,
      kills: true,
    };
  }

  const attack = suitEffects.includes("spades")
    ? Math.max(0, enemy.attack - totalAttack)
    : enemy.attack;
  const cover = cheapestCover(rest, attack);
  if (cover && ahead > 0) {
    const left = rest.filter((card) => !cover.cards.includes(card));
    const hand = left.flatMap((card) => (card.card ? [card.card] : []));
    // Cards still to draw can't be planned with: they count as they are.
    value += left
      .filter((card) => !card.card)
      .reduce((sum, card) => sum + card.worth, 0);
    const next = bestAttack(
      {
        ...game,
        hand,
        damageDealt: game.damageDealt + damage,
        currentEnemy: { ...enemy, attack },
      },
      ahead - 1,
      drawnWorth,
    );
    if (next) return { play, value: value + next.value, kills: false };
  }
  // A shield lasts the whole fight, not just this attack.
  value += damage + 0.5 * (enemy.attack - attack);
  if (cover) return { play, value: value + kept - cover.cost, kills: false };
  if (game.jestersDeck.length === 0) {
    return { play, value: LOST + damage, kills: false };
  }
  // A jester's fresh hand, less what blocking the attack takes from it.
  const fresh = Math.min(8, game.tavernDeck.length) * drawnWorth;
  const blockCost = attack * (drawnWorth / Math.max(1, drawnWorth - 3));
  return {
    play,
    value: value - JESTER_COST + fresh - blockCost,
    kills: false,
  };
}

/**
 * The best attack: every play the hand allows, judged by judgeAttack, a
 * turn ahead (deeper finds little more on the cards in hand).
 */
function bestAttack(
  game: GameState,
  ahead = 1,
  drawnWorth = tavernCardWorth(game),
) {
  let best: AttackPlan | null = null;
  for (const play of validPlays(game.hand)) {
    const plan = judgeAttack(game, play, drawnWorth, ahead);
    if (!best || plan.value > best.value) best = plan;
  }
  return best;
}

/** The cards to block with: the least worth keeping that cover the attack. */
function bestDefense(game: GameState) {
  const enemySuit = game.currentEnemy?.card.suit;
  return (
    cheapestCover(
      game.hand.map((card) => ({
        card,
        value: getCardAttackValue(card),
        worth: keepWorth(card, enemySuit),
      })),
      game.currentEnemy?.attack ?? 0,
    )?.cards.map(({ card }) => card) ?? null
  );
}

/** Taps that turn the selection into `wanted`: undo wrong picks first. */
function selectionTaps(game: GameState, wanted: PlayingCard[]) {
  const wantedIds = new Set(wanted.map((card) => card.id));
  const selectedIds = new Set(game.selectedCards.map((card) => card.id));
  return [
    ...game.selectedCards.filter((card) => !wantedIds.has(card.id)),
    ...wanted.filter((card) => !selectedIds.has(card.id)),
  ].map((card) => cardTarget(card));
}

function jesterHint(game: GameState) {
  const jester = game.jestersDeck.at(-1);
  if (!jester) return null;
  return withNote(
    makeHint("tapCard", ...selectionTaps(game, []), cardTarget(jester)),
    i18n.t("games:crownslayer.hint.jester"),
  );
}

function pressAfter(label: string, taps: ReturnType<typeof cardTarget>[]) {
  return makeHint(
    { key: "press", values: { label } },
    ...taps,
    zoneTarget("actions"),
  );
}

/**
 * Attack with the play that does most for the fight and keeps the hand
 * strongest; block with the cards least worth keeping; call a jester only
 * when the hand can't go on.
 */
function findCrownslayerHint(game: GameState) {
  const enemy = game.currentEnemy;
  if (game.ended || !enemy) return null;

  if (game.phase === "defend") {
    // An enemy without attack lets the hand be: the fight goes on.
    if (enemy.attack <= 0) return null;
    const cover = bestDefense(game);
    if (!cover) return jesterHint(game);
    return withNote(
      pressAfter(
        i18n.t("games:crownslayer.defend"),
        selectionTaps(game, cover),
      ),
      i18n.t("games:crownslayer.hint.defend"),
    );
  }

  const plan = bestAttack(game);
  if (!plan) return jesterHint(game);
  const hint = pressAfter(
    i18n.t("games:crownslayer.attack"),
    selectionTaps(game, plan.play),
  );
  const health = enemy.maxHealth - game.damageDealt;
  const { damage, suitEffects } = evaluateAttackSelection(
    plan.play,
    enemy.card,
  );
  const note = plan.kills
    ? damage === health
      ? "exactKill"
      : "kill"
    : suitEffects.includes("spades")
      ? "shield"
      : suitEffects.includes("diamonds")
        ? "draw"
        : suitEffects.includes("hearts")
          ? "heal"
          : null;
  return note ? withNote(hint, i18n.t(`games:crownslayer.hint.${note}`)) : hint;
}

export const crownslayerRules = {
  findHint: findCrownslayerHint,
  bestAttack,
  bestDefense,
  createEnemy,
  getCardAttackValue,
  getCardDamageValue,
  isJester,
  isAnimalCompanion,
  isValidComboSelection,
  isValidPlaySelection,
  healFromDiscard,
  drawFromTavern,
  hasValidPlayInHand,
  evaluateAttackSelection,
  getDefenseValue,
};

// ---------- Main Component ---------- //
export default function Crownslayer() {
  const { spacing } = useResponsiveMetrics();
  const { colorZone, colorDark, colorPale } = useGameColors();

  const {
    game,
    setGame,
    reset,
    isSettingUp,
    isLoaded,
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

  useHint(() => findCrownslayerHint(game), { game, enabled: !isSettingUp });

  const playSelection = useMemo(() => {
    const evaluated = game.currentEnemy
      ? evaluateAttackSelection(game.selectedCards, game.currentEnemy.card)
      : { totalAttack: 0, damage: 0, suitEffects: [] };

    const isValid =
      game.phase === "attack" &&
      game.currentEnemy !== undefined &&
      isValidPlaySelection(game.selectedCards);

    return {
      isValid,
      ...evaluated,
    };
  }, [game.currentEnemy, game.phase, game.selectedCards]);

  const canPlayAnyCards = useMemo(
    () => hasValidPlayInHand(game.hand),
    [game.hand],
  );

  const selectedDefenseValue = useMemo(
    () => getDefenseValue(game.selectedCards),
    [game.selectedCards],
  );

  const totalHandDefenseValue = useMemo(
    () => getDefenseValue(game.hand),
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
      draft.winLoseMessage = i18n.t("games:crownslayer.noPlayableCards");
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
      draft.winLoseMessage = i18n.t("games:crownslayer.noDiscardCanCover");
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

      // Apply suit powers (can be more than one, with aces!)
      // Only apply if enemy is not immune (i.e. has the same suit)
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
      }

      if (
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
      }

      if (
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
          draft.winLoseMessage = i18n.t(VICTORY_MESSAGE[victoryType]);
        } else {
          // Move to next enemy
          if (draft.castleDeck.length > 0) {
            const nextEnemyCard = flipToFace(draft.castleDeck.pop()!);
            draft.currentEnemy = createEnemy(nextEnemyCard);
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
    const discardValue = getDefenseValue(game.selectedCards);

    if (discardValue < enemyDamage) {
      // Couldn't block enough damage - lose
      setGame((draft) => {
        draft.ended = true;
        draft.won = false;
        draft.winLoseMessage = i18n.t("games:crownslayer.failedToBlock", {
          damage: enemyDamage - discardValue,
        });
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
        row: 0.25,
        cards: game.castleDeck,
        placeholder: {
          infoPos: "above",
          text: i18n.t("games:crownslayer.castle"),
        },
        fan: { maxVisible: 3 },
        baseZIndex: 30,
      },
      {
        id: "tavernDeck",
        name: "tavernDeck",
        col: 1,
        row: 0.25,
        cards: game.tavernDeck,
        placeholder: {
          infoPos: "above",
          text: i18n.t("games:crownslayer.tavern"),
        },
        fan: { maxVisible: 3 },
        baseZIndex: 30,
      },
      {
        id: "jestersDeck",
        name: "jestersDeck",
        col: 2,
        row: 0.25,
        cards: game.jestersDeck,
        placeholder: {
          infoPos: "above",
          text: i18n.t("games:crownslayer.jesters"),
        },
        fan: { maxVisible: 3 },
        baseZIndex: 30,
      },
      {
        id: "discardPile",
        col: 3,
        row: 0.25,
        cards: game.discardPile,
        placeholder: { infoPos: "above", text: i18n.t("cards:discard") },
        fan: { maxVisible: 3 },
        baseZIndex: 40,
      },

      // Enemy
      {
        id: "enemyZone",
        col: 0,
        row: 1.35,
        width: 4,
        height: 1.2,
        baseZIndex: 1,
      },
      {
        id: "currentEnemy",
        col: 0.16,
        row: 1.45,
        cards: game.currentEnemy?.card ? [game.currentEnemy.card] : undefined,
        baseZIndex: 10,
      },
      {
        id: "enemyStats",
        col: 1.2,
        row: 1.45,
        width: 2.55,
        height: 1,
        baseZIndex: 2,
      },

      // Actions
      {
        id: "actions",
        col: 0,
        row: 2.5,
        width: 4,
        height: 0.8,
        baseZIndex: 2,
      },

      // Hand
      {
        id: "hand",
        name: "hand",
        col: 0,
        row: 3.45,
        width: 4,
        cards: game.hand,
        fan: { direction: "right", offset: 0.53 },
        baseZIndex: 10,
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
      const enemyIsImmune =
        game.currentEnemy?.card.suit === mappedCard.card.suit;

      const selectedColor = () => {
        if (!isSelected) return enemyIsImmune ? "lightGrey" : "none";
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
        forceOverlayColor: enemyIsImmune,
        onPress: () =>
          game.phase === "attack"
            ? selectCardForAttack(mappedCard.card)
            : selectCardForDefend(mappedCard.card),
      };
    }
    return;
  };

  const { cardMap, cardWidth, cardHeight, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper,
    cardSize: "regular",
  });

  return (
    <GameWrapper
      reset={reset}
      isLoaded={isLoaded}
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      winLoseMessage={game.winLoseMessage ?? undefined}
      // Jesters left unused: 2 is a gold victory, 1 silver, 0 bronze.
      score={game.won ? game.jestersDeck.length : undefined}
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}

      {/* Enemy Display */}
      <View
        style={[
          getUnderlayStyle(cardWidth, colorDark, colorPale),
          getZoneStylesById("enemyZone"),
        ]}
      />
      {game.currentEnemy && (
        <View
          style={[
            getZoneStylesById("enemyStats"),
            flexStyles.colStart,
            flexStyles.spaceBetween,
            {
              paddingVertical: spacing(8),
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
              paddingVertical: spacing(6),
              paddingHorizontal: spacing(16),
              backfaceVisibility: "hidden",
              opacity: attackFaceOpacity,
              transform: [{ perspective: 900 }, { rotateX: attackFaceRotateX }],
              pointerEvents: game.phase === "attack" ? "auto" : "none",
              backgroundColor: colorZone,
              borderRadius: spacing(16),
              boxShadow: `inset 0 0 0 ${spacing(1.5)}px ${rgba(Colors.buttonBlue, 0.5)}, inset 0 0 ${spacing(20)}px ${rgba(Colors.buttonBlue, 0.4)}, 0 0 ${spacing(16)}px ${rgba(Colors.black, 1)}`,
            },
          ]}
        >
          {/* Powers/Suits */}
          <View
            style={[flexStyles.colCentered, { width: "30%", gap: spacing(8) }]}
          >
            {playSelection.isValid &&
              playSummary.suitEffects.map((suit) => (
                <View
                  key={suit}
                  style={[
                    flexStyles.rowCentered,
                    { width: "100%", gap: spacing(6) },
                  ]}
                >
                  <Icon
                    key={suit}
                    name={suit}
                    size={22}
                    color={SUIT_EFFECTS_COLOR[suit]}
                  />
                  <Text
                    size="sm"
                    weight={500}
                    color={SUIT_EFFECTS_COLOR[suit]}
                    style={{ flex: 1 }}
                  >
                    {i18n.t(SUIT_EFFECTS_TEXT[suit])}
                  </Text>
                </View>
              ))}
          </View>

          {/* Attack Button */}
          <Button
            onPress={playCards}
            text={i18n.t("games:crownslayer.attack")}
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
                gap: spacing(6),
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
              paddingVertical: spacing(6),
              paddingHorizontal: spacing(16),
              gap: spacing(16),
              backfaceVisibility: "hidden",
              opacity: defendFaceOpacity,
              transform: [{ perspective: 900 }, { rotateX: defendFaceRotateX }],
              pointerEvents: game.phase === "defend" ? "auto" : "none",
              backgroundColor: colorZone,
              borderRadius: spacing(16),
              boxShadow: `inset 0 0 0 ${spacing(1.5)}px ${rgba(Colors.buttonPurple, 0.5)}, inset 0 0 ${spacing(20)}px ${rgba(Colors.buttonPurple, 0.4)}, 0 0 ${spacing(16)}px ${rgba(Colors.black, 1)}`,
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
            text={i18n.t("games:crownslayer.defend")}
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
