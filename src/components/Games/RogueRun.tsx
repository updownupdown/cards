import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useStateManager } from "@/hooks/useStateManager";
import { Icon, IconName } from "@/icons";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, FontWeight, rgba } from "@/styles/styles";
import { delay } from "@/utils/utils";
import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { Button } from "../Button/Button";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import {
  createDeck,
  flipAllToBack,
  flipAllToFace,
  rankValue,
  shuffle,
  type PlayingCard,
} from "../Cards/card-utils";
import {
  getGridColRows,
  MappedCard,
  MapZone,
  useCardMap,
} from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { ProgressBar } from "../Home/ProgressBar";
import { DeckPreviewModal } from "../Modals/DeckPreviewModal";

import { i18n } from "@/i18n";
import { useHint } from "@/hints/hint-store";
import { pressHint, withNote, type Hint } from "@/hints/hint";
import { seededRandom, shuffledWith } from "@/hints/random";
import { cardLabel } from "../Cards/card-utils";
export type RogueRunCardType = "monster" | "weapon" | "potion";

const MaxHealth = 20;
const EmptyRoom: (PlayingCard | null)[] = [null, null, null, null];
const RoomSize = EmptyRoom.length;
const MinHealthAfterSafeStart = 2;
const MaxSafeShuffleAttempts = 20;

const cardSize = "regular";

type RoomActionSpec = {
  key: string;
  /** Names the action and its card, for screen readers and hints. */
  label: string;
  text?: string;
  onPress: () => void;
  disabled: boolean;
  showDeathIndicator?: boolean;
  iconName: IconName;
  color: string;
};

type GameState = {
  draw: PlayingCard[];
  discard: PlayingCard[];
  roomCards: (PlayingCard | null)[];
  roomNum: number;
  weaponCard: PlayingCard | null;
  weaponUsedOn: PlayingCard[];
  health: number;
  lastRoomNumRanFrom: number | null;
  isRunning: boolean;
  roomsSkipped: number;
  score?: number;
  lastActionType?: RogueRunCardType;
  lastPotionValue?: number;
  ended: boolean;
  won: boolean;
};

export type RogueRunGameState = GameState;

type RoomSolveState = {
  roomCards: PlayingCard[];
  resolvedCount: number;
  health: number;
  weaponCard: PlayingCard | null;
  lastWeaponTargetValue: number | null;
};

// ========== Game Setup ========== //
function createRogueRunDeck() {
  return createDeck().filter((card) => {
    if (card.suit === "clubs" || card.suit === "spades") return true;
    if (card.suit === "hearts" || card.suit === "diamonds") {
      const value = rankValue(card);
      return value >= 2 && value <= 10;
    }
    return false;
  });
}

const gameStateInitial: GameState = {
  draw: shuffle(createRogueRunDeck()),
  discard: [],
  roomCards: [...EmptyRoom],
  roomNum: 1,
  weaponCard: null,
  weaponUsedOn: [],
  health: MaxHealth,
  lastRoomNumRanFrom: null,
  isRunning: false,
  roomsSkipped: 0,
  score: undefined,
  lastActionType: undefined,
  lastPotionValue: undefined,
  ended: false,
  won: false,
};

async function resetAndSetup(
  setGame: (updater: (draft: GameState) => void) => void,
) {
  // Bring all cards to draw deck, then delay, then distribute cards to room and draw deck, so that the animation looks like a shuffle and deal.
  setGame((draft) => {
    const allCards = [
      ...draft.draw,
      ...draft.discard,
      ...draft.roomCards.filter((card): card is PlayingCard => card !== null),
      ...(draft.weaponCard ? [draft.weaponCard] : []),
      ...draft.weaponUsedOn,
    ];

    draft.draw = getSafeShuffledDeck(flipAllToBack(allCards));
    draft.discard = [];
    draft.roomCards = [...EmptyRoom];
    draft.roomNum = 0;
    draft.weaponCard = null;
    draft.weaponUsedOn = [];
    draft.health = MaxHealth;
    draft.lastRoomNumRanFrom = null;
    draft.isRunning = false;
    draft.roomsSkipped = 0;
    draft.score = undefined;
    draft.lastActionType = undefined;
    draft.lastPotionValue = undefined;
    draft.ended = false;
    draft.won = false;
  });

  // Delay for animation
  await delay();
}

// ========== Helper Functions ========== //
function cardType(card: PlayingCard): RogueRunCardType {
  if (card.suit === "diamonds") return "weapon";
  if (card.suit === "hearts") return "potion";
  return "monster";
}

function rogueRunValue(card: PlayingCard) {
  if (card.rank === "A") return 14;
  return rankValue(card);
}

function roomSolveKey(state: RoomSolveState) {
  const roomKey = state.roomCards
    .map((card) => `${card.suit}-${card.rank}`)
    .sort()
    .join("|");

  return [
    roomKey,
    state.resolvedCount,
    state.health,
    state.weaponCard
      ? `${state.weaponCard.suit}-${state.weaponCard.rank}`
      : "none",
    state.lastWeaponTargetValue ?? "none",
  ].join("::");
}

function bestHealthAfterRoom(
  roomCards: PlayingCard[],
  startingHealth = MaxHealth,
): number {
  const memo = new Map<string, number>();

  function solve(state: RoomSolveState): number {
    if (state.health <= 0) return Number.NEGATIVE_INFINITY;
    if (state.resolvedCount === 3) return state.health;

    const key = roomSolveKey(state);
    const cached = memo.get(key);
    if (cached !== undefined) return cached;

    let bestHealth = Number.NEGATIVE_INFINITY;

    for (let index = 0; index < state.roomCards.length; index += 1) {
      const card = state.roomCards[index];
      const nextRoomCards = state.roomCards.filter((_, i) => i !== index);
      const nextResolvedCount = state.resolvedCount + 1;

      if (cardType(card) === "potion") {
        bestHealth = Math.max(
          bestHealth,
          solve({
            roomCards: nextRoomCards,
            resolvedCount: nextResolvedCount,
            health: Math.min(MaxHealth, state.health + rogueRunValue(card)),
            weaponCard: state.weaponCard,
            lastWeaponTargetValue: state.lastWeaponTargetValue,
          }),
        );
        continue;
      }

      if (cardType(card) === "weapon") {
        bestHealth = Math.max(
          bestHealth,
          solve({
            roomCards: nextRoomCards,
            resolvedCount: nextResolvedCount,
            health: state.health,
            weaponCard: card,
            lastWeaponTargetValue: null,
          }),
        );
        continue;
      }

      bestHealth = Math.max(
        bestHealth,
        solve({
          roomCards: nextRoomCards,
          resolvedCount: nextResolvedCount,
          health: state.health - rogueRunValue(card),
          weaponCard: state.weaponCard,
          lastWeaponTargetValue: state.lastWeaponTargetValue,
        }),
      );

      if (
        state.weaponCard &&
        (state.lastWeaponTargetValue === null ||
          rogueRunValue(card) <= state.lastWeaponTargetValue)
      ) {
        bestHealth = Math.max(
          bestHealth,
          solve({
            roomCards: nextRoomCards,
            resolvedCount: nextResolvedCount,
            health:
              state.health -
              Math.max(
                0,
                rogueRunValue(card) - rogueRunValue(state.weaponCard),
              ),
            weaponCard: state.weaponCard,
            lastWeaponTargetValue: rogueRunValue(card),
          }),
        );
      }
    }

    memo.set(key, bestHealth);
    return bestHealth;
  }

  return solve({
    roomCards,
    resolvedCount: 0,
    health: startingHealth,
    weaponCard: null,
    lastWeaponTargetValue: null,
  });
}

function dungeonHasFalseStart(cards: PlayingCard[]) {
  const openingRoom = cards.slice(0, 4);
  const roomAfterRunning = cards.slice(4, 8);

  if (openingRoom.length < 4 || roomAfterRunning.length < 4) return false;

  const openingRoomHealth = bestHealthAfterRoom(openingRoom);
  const roomAfterRunningHealth = bestHealthAfterRoom(roomAfterRunning);

  return (
    openingRoomHealth <= MinHealthAfterSafeStart &&
    roomAfterRunningHealth <= MinHealthAfterSafeStart
  );
}

function getSafeShuffledDeck(cards: PlayingCard[]) {
  let deck = shuffle(cards);
  let shuffleCount = 1;

  while (dungeonHasFalseStart(deck) && shuffleCount < MaxSafeShuffleAttempts) {
    shuffleCount += 1;
    deck = shuffle(cards);
  }

  return deck;
}

function validRoomCards(roomCards: (PlayingCard | null)[]) {
  return roomCards.filter((card): card is PlayingCard => card !== null);
}

function canFightWithWeapon(game: GameState, monster: PlayingCard) {
  if (!game.weaponCard) return false;

  const lastWeaponTarget = game.weaponUsedOn[game.weaponUsedOn.length - 1];
  if (!lastWeaponTarget) return true;

  return rogueRunValue(monster) <= rogueRunValue(lastWeaponTarget);
}

function damageWithWeapon(weapon: PlayingCard | null, monster: PlayingCard) {
  if (!weapon) return rogueRunValue(monster);

  return Math.max(0, rogueRunValue(monster) - rogueRunValue(weapon));
}

function removeRoomCard(
  roomCards: (PlayingCard | null)[],
  roomIndex: number,
): (PlayingCard | null)[] {
  return roomCards.map((card, index) => (index === roomIndex ? null : card));
}

function faceCard(card: PlayingCard) {
  return flipAllToFace([card])[0];
}

function backCard(card: PlayingCard) {
  return flipAllToBack([card])[0];
}

function countRemainingMonsterValue(game: GameState) {
  const deckMonsters = game.draw.filter((card) => cardType(card) === "monster");
  const roomMonsters = validRoomCards(game.roomCards).filter(
    (card) => cardType(card) === "monster",
  );

  return [...deckMonsters, ...roomMonsters].reduce(
    (sum, card) => sum + rogueRunValue(card),
    0,
  );
}

// The first room deals a full hand; every later room keeps the last card and
// deals the rest, down to whatever is left in the deck. Running returns the
// cards to the deck, so it adds a room without changing that count.
function dungeonRoomCount(deckSize: number) {
  return 1 + Math.ceil((deckSize - RoomSize) / (RoomSize - 1));
}

const RoomsWithoutRunning = dungeonRoomCount(createRogueRunDeck().length);

function roomProgress(game: Pick<GameState, "roomNum" | "roomsSkipped">) {
  const skipped = game.roomsSkipped ?? 0;
  return {
    current: game.roomNum + skipped,
    total: RoomsWithoutRunning + skipped,
  };
}

function refillRoom(game: GameState) {
  const currentRoomCards = validRoomCards(game.roomCards);

  if (game.draw.length === 0 || currentRoomCards.length > 1) return game;

  const cardToKeep = currentRoomCards[0];
  const neededCards = cardToKeep ? 3 : 4;
  const roomDraw = game.draw
    .slice(0, neededCards)
    .map((card) => faceCard(card));
  const nextRoom: (PlayingCard | null)[] = [...EmptyRoom];

  if (cardToKeep) {
    const keepIndex = game.roomCards.findIndex(
      (card) => card?.id === cardToKeep.id,
    );
    if (keepIndex >= 0) {
      nextRoom[keepIndex] = cardToKeep;
    }
  }

  let cursor = 0;
  for (let i = 0; i < nextRoom.length; i += 1) {
    if (nextRoom[i] === null && cursor < roomDraw.length) {
      nextRoom[i] = roomDraw[cursor];
      cursor += 1;
    }
  }

  return {
    ...game,
    draw: game.draw.slice(neededCards),
    roomCards: nextRoom,
    roomNum: game.roomNum + (game.isRunning ? 0 : 1),
    isRunning: false,
  };
}

export type RogueRunAction =
  | { type: "run" }
  | { type: "heal"; roomIndex: number }
  | { type: "equip"; roomIndex: number }
  | { type: "fight-bare"; roomIndex: number }
  | { type: "fight-weapon"; roomIndex: number };

function applyRogueRunAction(draft: GameState, action: RogueRunAction) {
  if (draft.ended) return false;

  if (action.type === "run") {
    const room = validRoomCards(draft.roomCards);
    if (room.length !== 4 || draft.lastRoomNumRanFrom === draft.roomNum) {
      return false;
    }

    draft.draw = [...draft.draw, ...flipAllToBack(room)];
    draft.roomCards = [...EmptyRoom];
    draft.lastRoomNumRanFrom = draft.roomNum;
    draft.isRunning = true;
    draft.roomsSkipped = (draft.roomsSkipped ?? 0) + 1;
    draft.lastActionType = undefined;
    draft.lastPotionValue = undefined;
    return true;
  }

  const roomCard = draft.roomCards[action.roomIndex];
  if (!roomCard) return false;
  const type = cardType(roomCard);

  if (action.type === "heal") {
    if (type !== "potion") return false;
    const healAmount = Math.min(
      MaxHealth - draft.health,
      rogueRunValue(roomCard),
    );
    draft.health += healAmount;
    draft.discard.push(backCard(roomCard));
    draft.roomCards = removeRoomCard(draft.roomCards, action.roomIndex);
    draft.lastActionType = "potion";
    draft.lastPotionValue = rogueRunValue(roomCard);
    return true;
  }

  if (action.type === "equip") {
    if (type !== "weapon") return false;
    if (draft.weaponCard) draft.discard.push(backCard(draft.weaponCard));
    if (draft.weaponUsedOn.length > 0) {
      draft.discard.push(...flipAllToBack(draft.weaponUsedOn));
    }
    draft.weaponCard = faceCard(roomCard);
    draft.weaponUsedOn = [];
    draft.roomCards = removeRoomCard(draft.roomCards, action.roomIndex);
    draft.lastActionType = "weapon";
    draft.lastPotionValue = undefined;
    return true;
  }

  if (type !== "monster") return false;
  if (action.type === "fight-weapon") {
    if (!canFightWithWeapon(draft, roomCard)) return false;
    draft.health = Math.max(
      0,
      draft.health - damageWithWeapon(draft.weaponCard, roomCard),
    );
    draft.weaponUsedOn.push(faceCard(roomCard));
  } else {
    draft.health = Math.max(0, draft.health - rogueRunValue(roomCard));
    draft.discard.push(backCard(roomCard));
  }
  draft.roomCards = removeRoomCard(draft.roomCards, action.roomIndex);
  draft.lastActionType = "monster";
  draft.lastPotionValue = undefined;
  return true;
}

function advanceRogueRunGame(game: Readonly<GameState>): GameState {
  if (game.ended) return game as GameState;

  const current = game as GameState;
  const refilled = refillRoom(current);
  if (refilled !== current) return refilled;

  if (current.health <= 0) {
    return {
      ...current,
      ended: true,
      won: false,
      score: -countRemainingMonsterValue(current),
    };
  }

  if (
    current.draw.length === 0 &&
    validRoomCards(current.roomCards).length === 0
  ) {
    const potionBonus =
      current.health === MaxHealth &&
      current.lastActionType === "potion" &&
      current.lastPotionValue !== undefined
        ? current.lastPotionValue
        : 0;
    return {
      ...current,
      ended: true,
      won: true,
      score: current.health + potionBonus,
    };
  }

  return current;
}

// —— Hints ——

type RoomPlan = {
  value: number;
  first: Exclude<RogueRunAction, { type: "run" }> | null;
};

// Rooms tried for what running from this one leads to: the deck is face
// down, so its next cards are dealt from what's in it, a few ways.
const RUN_SAMPLES = 10;

/**
 * What a weapon is still worth: the damage it may yet save on the monsters
 * to come that it can still fight (no higher than the last it killed).
 */
function weaponWorth(game: GameState, unseen: PlayingCard[]) {
  const weapon = game.weaponCard;
  if (!weapon) return 0;
  const cap = game.weaponUsedOn.at(-1);
  const monsters = unseen.filter((card) => cardType(card) === "monster");
  if (monsters.length === 0) return 0;
  const saved = monsters
    .filter((card) => !cap || rogueRunValue(card) <= rogueRunValue(cap))
    .reduce(
      (sum, card) => sum + Math.min(rogueRunValue(card), rogueRunValue(weapon)),
      0,
    );
  // Only some of them will meet it: a share of what it could save.
  return (0.5 * saved) / Math.max(1, monsters.length / 4);
}

/** How good a game is to be in at the end of a room. */
function standing(game: GameState, unseen: PlayingCard[]) {
  if (game.health <= 0) return -1000;
  const room = validRoomCards(game.roomCards);
  if (game.draw.length === 0 && room.length === 0) return 1000 + game.health;
  const carried = room.reduce((sum, card) => {
    const type = cardType(card);
    const value = rogueRunValue(card);
    return (
      sum + (type === "monster" ? -0.3 : type === "potion" ? 0.3 : 0.2) * value
    );
  }, 0);
  return game.health + weaponWorth(game, unseen) + carried;
}

function roomActions(
  game: GameState,
): Exclude<RogueRunAction, { type: "run" }>[] {
  type RoomAction = Exclude<RogueRunAction, { type: "run" }>;
  return game.roomCards.flatMap((card, roomIndex): RoomAction[] => {
    if (!card) return [];
    const type = cardType(card);
    if (type === "potion") return [{ type: "heal" as const, roomIndex }];
    if (type === "weapon") return [{ type: "equip" as const, roomIndex }];
    return canFightWithWeapon(game, card)
      ? [
          { type: "fight-weapon" as const, roomIndex },
          { type: "fight-bare" as const, roomIndex },
        ]
      : [{ type: "fight-bare" as const, roomIndex }];
  });
}

/** The best way through the room on view, to its end. */
function planRoom(game: GameState, unseen: PlayingCard[]): RoomPlan {
  const left = validRoomCards(game.roomCards).length;
  const done =
    game.health <= 0 || left === 0 || (left <= 1 && game.draw.length > 0);
  if (done) return { value: standing(game, unseen), first: null };
  let best: RoomPlan = { value: -Infinity, first: null };
  for (const action of roomActions(game)) {
    const next = structuredClone(game);
    applyRogueRunAction(next, action);
    const value = planRoom(next, unseen).value;
    if (value > best.value) best = { value, first: action };
  }
  return best;
}

/** What running is worth: the next room is dealt from the deck. */
function runValue(game: GameState) {
  const random = seededRandom(
    [
      game.health,
      ...validRoomCards(game.roomCards).map((card) => card.id),
    ].join(","),
  );
  const ran = structuredClone(game);
  applyRogueRunAction(ran, { type: "run" });
  let total = 0;
  for (let sample = 0; sample < RUN_SAMPLES; sample += 1) {
    const deck = shuffledWith(game.draw, random);
    const next = refillRoom({
      ...ran,
      draw: [...deck, ...ran.draw.slice(game.draw.length)],
    });
    total += planRoom(next, next.draw).value;
  }
  return total / RUN_SAMPLES;
}

function actionLabel(action: RogueRunAction, card: PlayingCard) {
  const name = cardLabel(card);
  switch (action.type) {
    case "heal":
      return i18n.t("games:rogueRun.actions.heal", { card: name });
    case "equip":
      return i18n.t("games:rogueRun.actions.equip", { card: name });
    case "fight-weapon":
      return i18n.t("games:rogueRun.actions.fightWeapon", { card: name });
    default:
      return i18n.t("games:rogueRun.actions.fightBare", { card: name });
  }
}

/**
 * Plays the room on view as well as it can be played (every order, weapon
 * or fists), judging where it ends by health and what the weapon is still
 * good for; runs from a room that would kill, when an average room from the
 * deck is kinder.
 */
function findRogueRunHint(game: GameState): Hint | null {
  if (game.ended || validRoomCards(game.roomCards).length === 0) return null;
  const unseen = game.draw;
  const plan = planRoom(game, unseen);
  const canRun =
    validRoomCards(game.roomCards).length === RoomSize &&
    game.lastRoomNumRanFrom !== game.roomNum;
  // Running only puts the room off (its cards come back at the end, when
  // there's no running from them): run only to escape a room that kills,
  // or one that leaves Alice too weak for the monster it leaves behind.
  if (canRun && plan.value < 0 && runValue(game) > plan.value) {
    // standing() scores a death at -1000: every way through dies.
    const kills = plan.value <= -1000;
    return withNote(
      pressHint("room-info", i18n.t("games:rogueRun.run")),
      i18n.t(kills ? "games:rogueRun.hint.run" : "games:rogueRun.hint.runWeak"),
    );
  }
  const action = plan.first;
  if (!action) return null;
  const card = game.roomCards[action.roomIndex]!;
  const hint = pressHint(
    `roomCardActions-${action.roomIndex}`,
    actionLabel(action, card),
  );
  if (action.type === "fight-bare" && canFightWithWeapon(game, card)) {
    return withNote(hint, i18n.t("games:rogueRun.hint.fightBare"));
  }
  return hint;
}

export const rogueRunRules = {
  findHint: findRogueRunHint,
  planRoom,
  createDeck: createRogueRunDeck,
  cardType,
  cardValue: rogueRunValue,
  bestHealthAfterRoom,
  dungeonHasFalseStart,
  validRoomCards,
  canFightWithWeapon,
  damageWithWeapon,
  refillRoom,
  dungeonRoomCount,
  roomProgress,
  applyAction: applyRogueRunAction,
  advanceGame: advanceRogueRunGame,
};

// Layout constants
const healthBarHeight = 0.34;
const drawRow = healthBarHeight + 0.12;
const weaponsRow = drawRow + 1;
const weaponsZoneInset = 0.1;
const weaponsZoneHeight = 1 + weaponsZoneInset * 2;
const roomCardsRow = weaponsRow + weaponsZoneHeight;
const roomActionsRow = roomCardsRow + 0.94;

// ========== Game Component ========== //
export default function RogueRun() {
  const { spacing, font } = useResponsiveMetrics();

  const {
    isLoaded,
    game,
    setGame,
    undo,
    canUndo,
    saveUndoState,
    reset,
    isSettingUp,
  } = useStateManager({
    resetAndSetup: async () => {
      await resetAndSetup(setGame);
    },
    gameStateInitial,
  });

  useHint(() => findRogueRunHint(game), { game, enabled: !isSettingUp });

  const rooms = roomProgress(game);
  const canRun =
    validRoomCards(game.roomCards).length === RoomSize &&
    game.lastRoomNumRanFrom !== game.roomNum &&
    !game.ended;

  function runFromRoom() {
    if (!canRun) return;

    saveUndoState(game);

    setGame((draft) => {
      applyRogueRunAction(draft, { type: "run" });
    });
  }

  function heal(roomIndex: number, _potion: PlayingCard) {
    if (game.ended) return;

    saveUndoState(game);

    setGame((draft) => {
      applyRogueRunAction(draft, { type: "heal", roomIndex });
    });
  }

  function equip(roomIndex: number, _weapon: PlayingCard) {
    if (game.ended) return;

    saveUndoState(game);

    setGame((draft) => {
      applyRogueRunAction(draft, { type: "equip", roomIndex });
    });
  }

  function fightBare(roomIndex: number, _monster: PlayingCard) {
    if (game.ended) return;

    saveUndoState(game);

    setGame((draft) => {
      applyRogueRunAction(draft, { type: "fight-bare", roomIndex });
    });
  }

  function fightWithWeapon(roomIndex: number, monster: PlayingCard) {
    if (game.ended || !canFightWithWeapon(game, monster)) return;

    saveUndoState(game);

    setGame((draft) => {
      applyRogueRunAction(draft, { type: "fight-weapon", roomIndex });
    });
  }

  const healthRatio = Math.max(0, Math.min(1, game.health / MaxHealth));

  function getRoomActionSpecs(
    roomCard: PlayingCard,
    roomIndex: number,
  ): RoomActionSpec[] {
    const type = cardType(roomCard);

    if (type === "potion") {
      return [
        {
          key: "heal",
          label: actionLabel({ type: "heal", roomIndex }, roomCard),
          text: `+${rogueRunValue(roomCard)}`,
          onPress: () => heal(roomIndex, roomCard),
          disabled: game.ended,
          iconName: "potion",
          color: "green",
        },
      ];
    }

    if (type === "weapon") {
      return [
        {
          key: "equip",
          label: actionLabel({ type: "equip", roomIndex }, roomCard),
          onPress: () => equip(roomIndex, roomCard),
          disabled: game.ended,
          iconName: "equip",
          color: "blue",
        },
      ];
    }

    const bareDamage = rogueRunValue(roomCard);
    const weaponDamage = damageWithWeapon(game.weaponCard, roomCard);
    const canUseWeapon = canFightWithWeapon(game, roomCard);
    const canPressBare = !game.ended;
    const canPressWeapon = !game.ended && canUseWeapon;

    return [
      {
        key: "fight-weapon",
        label: actionLabel({ type: "fight-weapon", roomIndex }, roomCard),
        text: `-${weaponDamage}`,
        onPress: () => fightWithWeapon(roomIndex, roomCard),
        disabled: !canPressWeapon,
        showDeathIndicator: canPressWeapon && game.health - weaponDamage <= 0,
        iconName: "sword",
        color: "purple",
      },
      {
        key: "fight-bare",
        label: actionLabel({ type: "fight-bare", roomIndex }, roomCard),
        text: `-${bareDamage}`,
        onPress: () => fightBare(roomIndex, roomCard),
        disabled: !canPressBare,
        showDeathIndicator: canPressBare && game.health - bareDamage <= 0,
        iconName: "fist",
        color: "red",
      },
    ];
  }

  // Core game progression: refill rooms, then resolve win/lose.
  useEffect(() => {
    if (isSettingUp || game.ended) return;

    const advanced = advanceRogueRunGame(game);
    if (advanced !== game) setGame(advanced);
  }, [game, isSettingUp, setGame]);

  // ========== Card Mapping ========== //

  const zones: MapZone[] = useMemo(() => {
    const roomZones: MapZone[] = getGridColRows({
      cols: 4,
      rows: 1,
      rowOffset: roomCardsRow,
    }).map((pos, i) => ({
      id: `roomCards-${i}`,
      name: "roomCards",
      pileIndex: i,
      cards: game.roomCards[i] ? [game.roomCards[i]] : undefined,
      col: pos.c,
      row: pos.r,
      baseZIndex: i + 20,
      placeholder: {},
    }));

    const roomActionZones: MapZone[] = getGridColRows({
      cols: 4,
      rows: 1,
      rowOffset: roomActionsRow,
    }).map((pos, i) => ({
      id: `roomCardActions-${i}`,
      name: "roomCardActions",
      pileIndex: i,
      col: pos.c,
      row: pos.r,
      height: 0.94,
      baseZIndex: i + 10,
      placeholder: {
        hideBackground: true,
      },
    }));

    return [
      {
        id: "health-bar",
        name: "health-bar",
        col: 0,
        row: 0,
        width: "full",
        height: healthBarHeight,
        baseZIndex: 1,
      },
      {
        id: "draw",
        name: "draw",
        cards: game.draw,
        col: 0,
        row: drawRow,
        fan: { maxVisible: 3 },
        placeholder: {
          infoPos: "right",
          text: i18n.t("cards:stock"),
        },
        baseZIndex: 50,
      },
      {
        id: "room-info",
        name: "room-info",
        col: 2.75,
        row: drawRow,
        width: 1.25,
        height: 1,
        baseZIndex: 1,
      },
      {
        id: "discard",
        name: "discard",
        cards: game.discard,
        col: 1.35,
        row: drawRow,
        fan: { maxVisible: 3 },
        placeholder: {
          infoPos: "right",
          text: i18n.t("cards:discard"),
        },
        baseZIndex: 50,
      },
      {
        id: "weapon-zone",
        name: "weapon-zone",
        col: 0,
        row: weaponsRow,
        height: weaponsZoneHeight,
        width: "full",
        placeholder: {},
        baseZIndex: 1,
      },
      {
        id: "weaponCard",
        name: "weaponCard",
        cards: game.weaponCard ? [game.weaponCard] : undefined,
        col: weaponsZoneInset + 0.05,
        row: weaponsRow + weaponsZoneInset,
        baseZIndex: 1,
        placeholder: {
          iconName: "equip",
          hideBackground: true,
          hideShadow: true,
        },
      },
      {
        id: "weaponUsedOn",
        name: "weaponUsedOn",
        cards: game.weaponUsedOn,
        col: 1.1,
        row: weaponsRow + weaponsZoneInset,
        width: 2.75,
        fan: { direction: "right", offset: 0.32 },
        baseZIndex: 1,
        placeholder: {
          iconName: "dragon",
          iconSize: 1,
          hideBackground: true,
          hideShadow: true,
        },
      },
      ...roomZones,
      ...roomActionZones,
    ];
  }, [game]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (mappedCard.zoneName === "draw") {
      return {
        clickThroughCards: true,
      };
    }
  };

  const [showDeckPreview, setShowDeckPreview] = useState(false);

  const { cardMap, cardHeight, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper: (zone) => {
      if (zone.id !== "draw") return;

      return {
        onPress: () => setShowDeckPreview(true),
        isDisabled: game.draw.length === 0,
      };
    },
    cardSize,
    paddingTop: 0.1,
  });

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      score={game.score}
      winLoseMessage={
        game.won ? i18n.t("games:rogueRun.youMadeItThroughThe") : undefined
      }
      reset={reset}
      isLoaded={isLoaded}
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

      {/* Health Bar */}
      <View style={[getZoneStylesById("health-bar")]}>
        <ProgressBar
          totalValue={MaxHealth}
          progressValue={game.health}
          color={
            healthRatio <= 0.25
              ? "red"
              : healthRatio <= 0.5
                ? "orange"
                : "green"
          }
          autoTallyText
          scaledHeight={cardHeight * healthBarHeight}
          iconName="heart"
        />
      </View>

      {/* Room Bar and Run Button */}
      <View
        style={[
          getZoneStylesById("room-info"),
          flexStyles.colCentered,
          {
            gap: spacing(12),
            justifyContent: "space-between",
          },
        ]}
      >
        {/* Room Bar */}
        <ProgressBar
          iconName="door"
          totalValue={rooms.total}
          progressValue={rooms.current}
          color="blue"
          tallyText={rooms.current}
          scaledHeight={cardHeight * 0.3}
        />

        <Button
          text={i18n.t("games:rogueRun.run")}
          size="lg"
          onPress={runFromRoom}
          disabled={!canRun}
          theme={"orange"}
          fullWidth
        />
      </View>

      {game.roomCards.map((roomCard, roomIndex) => {
        const zoneId = `roomCardActions-${roomIndex}`;
        const actions = roomCard ? getRoomActionSpecs(roomCard, roomIndex) : [];

        return (
          <View
            key={zoneId}
            style={[
              getZoneStylesById(zoneId),
              flexStyles.colCentered,
              {
                gap: "10%",
              },
            ]}
          >
            {actions.map((action) => (
              <View
                key={`${zoneId}-${action.key}`}
                style={[
                  flexStyles.colCentered,
                  {
                    position: "relative",
                    width: "100%",
                    height: "45%",
                  },
                ]}
              >
                {action.showDeathIndicator && (
                  <View
                    style={[
                      flexStyles.colCentered,
                      {
                        position: "absolute",
                        top: spacing(-4),
                        left: spacing(-6),
                        zIndex: 2,
                        width: spacing(24),
                        height: spacing(24),
                        borderRadius: 999,
                        alignItems: "center",
                        justifyContent: "center",
                        paddingHorizontal: spacing(2),

                        backgroundColor: Colors.white,
                        boxShadow: `1px 2px 4px ${rgba(Colors.K900, 0.5)}`,
                      },
                    ]}
                  >
                    <Icon name="skull" color={Colors.K950} size={spacing(20)} />
                  </View>
                )}

                <Button
                  accessibilityLabel={action.label}
                  text={action.disabled ? "--" : action.text}
                  size="xs"
                  uppercase={false}
                  onPress={action.onPress}
                  disabled={action.disabled}
                  fullWidth
                  theme={action.color}
                  iconName={action.iconName}
                  iconSize={spacing(24)}
                  taller
                  style={{
                    gap: spacing(4),
                    paddingHorizontal: 0,
                  }}
                  textStyle={{
                    fontSize: font(17),
                    lineHeight: font(17),
                    fontFamily: FontWeight[600],
                    paddingRight: spacing(4),
                  }}
                />
              </View>
            ))}
          </View>
        );
      })}
    </GameWrapper>
  );
}
