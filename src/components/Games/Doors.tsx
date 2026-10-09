import { useGameColors } from "@/hooks/useGameColors";
import { useStateManager } from "@/hooks/useStateManager";
import { i18n } from "@/i18n";
import { flexStyles } from "@/styles/flexStyles";
import { delay } from "@/utils/utils";
import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { Button } from "../Button/Button";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import {
  collectCards,
  createDeck,
  flipAllToBack,
  flipToBack,
  flipToFace,
  rankValue,
  redealWith,
  shuffle,
  SUITS,
  top,
  zoneFanOffset,
  type CardSuit,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { Text } from "../common/Text";

// A dream of rooms and doors: rooms (2–10) are played in a path, three of a
// suit in a row opening one of that suit's two doors (Kings and Queens).
// Aces and Jokers are nightmares, each with a price; 2, 5 and 8 are keys,
// which open a door drawn from the stock and foresee the next five cards.
const HAND_SIZE = 5;
const RUN_LENGTH = 3;
const PROPHECY_SIZE = 5;
const BURN_SIZE = 5;
const DOORS_PER_SUIT = 2;
const DOOR_COUNT = SUITS.length * DOORS_PER_SUIT;
const COLS = 8;
const GAP = 0.12;
const DOOR_ROW = 0;
const PATH_ROW = 1.3;
const MIDDLE_ROW = 2.6;
const HAND_ROW = 3.9;
const STATUS_ROW = 5.0;
const BUTTON_ROW = 5.4;
const PATH_COL = 1.2;
const PATH_WIDTH = COLS - PATH_COL;
const PATH_VISIBLE = 5;
/** Each drawn card lands before the next is drawn. */
const REFILL_DELAY = 250;

export type Symbol = "sun" | "moon" | "key";
export type Pending =
  | { kind: "door"; card: PlayingCard }
  | { kind: "nightmare"; card: PlayingCard }
  | null;

export type DoorsGameState = {
  stock: PlayingCard[];
  hand: PlayingCard[];
  path: PlayingCard[];
  /** Eight slots: a suit's two doors at SUITS.indexOf(suit) * 2 and + 1. */
  doors: (PlayingCard | null)[];
  /** Slots filled, oldest first, so a nightmare can take the latest back. */
  claimOrder: number[];
  discard: PlayingCard[];
  /** Doors and nightmares set aside until the hand is next full. */
  limbo: PlayingCard[];
  /** The stock's top cards, face up, while a key's prophecy is read. */
  prophecy: PlayingCard[];
  /** A door or nightmare drawn that waits on the player's choice. */
  pending: Pending;
  /** Rooms of one suit played in a row since a door was last claimed. */
  run: number;
  /** Cards gathered up between deals. */
  deal: PlayingCard[];
};

// ========== Cards ========== //
function isRoom(card: PlayingCard) {
  const value = rankValue(card);
  return value >= 2 && value <= 10;
}

function isDoor(card: PlayingCard) {
  return card.rank === "K" || card.rank === "Q";
}

function isNightmare(card: PlayingCard) {
  return card.rank === "A" || card.rank === "Joker";
}

/** A room's symbol comes from its rank: 3-6-9 suns, 4-7-10 moons, 2-5-8 keys. */
function symbolOf(card: PlayingCard): Symbol {
  const remainder = rankValue(card) % 3;
  return remainder === 0 ? "sun" : remainder === 1 ? "moon" : "key";
}

function isKey(card: PlayingCard) {
  return isRoom(card) && symbolOf(card) === "key";
}

// ========== Rules ========== //
/** The first room always goes down; after that the symbol must change. */
function canPlay(state: DoorsGameState, card: PlayingCard) {
  const last = top(state.path);
  return !last || symbolOf(last) !== symbolOf(card);
}

function doorsOpen(state: DoorsGameState) {
  return state.doors.filter(Boolean).length;
}

/** Doors go to the discard pile only as rooms do; the rest wait in limbo. */
function discardOrLimbo(state: DoorsGameState, card: PlayingCard) {
  if (isRoom(card)) state.discard.push(flipToFace(card));
  else state.limbo.push(flipToBack(card));
}

/** Puts a door in its suit's next empty slot; both full, it waits in limbo. */
function placeDoor(state: DoorsGameState, door: PlayingCard) {
  const base = SUITS.indexOf(door.suit) * DOORS_PER_SUIT;
  const slot = state.doors[base] ? base + 1 : base;
  if (state.doors[slot]) {
    state.limbo.push(flipToBack(door));
    return;
  }
  state.doors[slot] = flipToFace(door);
  state.claimOrder.push(slot);
}

/** A run of three opens a door of its suit, if the stock still holds one. */
function claimDoorFromStock(state: DoorsGameState, suit: CardSuit) {
  const index = state.stock.findIndex(
    (card) => isDoor(card) && card.suit === suit,
  );
  if (index < 0) return false;
  const [door] = state.stock.splice(index, 1);
  placeDoor(state, door);
  state.stock = shuffle(state.stock);
  return true;
}

function playCard(state: DoorsGameState, cardId: string) {
  const index = state.hand.findIndex((card) => card.id === cardId);
  const card = state.hand[index];
  if (!card || !canPlay(state, card)) return false;
  const last = top(state.path);
  state.hand.splice(index, 1);
  state.run =
    last && last.suit === card.suit && state.run > 0 ? state.run + 1 : 1;
  state.path.push(card);
  if (state.run >= RUN_LENGTH) {
    claimDoorFromStock(state, card.suit);
    state.run = 0;
  }
  return true;
}

/** The stock's top cards are laid out face up for the player to thin. */
function startProphecy(state: DoorsGameState) {
  const count = Math.min(PROPHECY_SIZE, state.stock.length);
  state.prophecy = state.stock
    .splice(state.stock.length - count, count)
    .reverse()
    .map(flipToFace);
}

function discardCard(state: DoorsGameState, cardId: string) {
  const index = state.hand.findIndex((card) => card.id === cardId);
  if (index < 0) return false;
  const [card] = state.hand.splice(index, 1);
  state.discard.push(card);
  if (isKey(card)) startProphecy(state);
  return true;
}

/** One foreseen card is thrown out; the others go back in the same order. */
function resolveProphecy(state: DoorsGameState, cardId: string) {
  const index = state.prophecy.findIndex((card) => card.id === cardId);
  if (index < 0) return false;
  const [card] = state.prophecy.splice(index, 1);
  discardOrLimbo(state, card);
  state.stock.push(...state.prophecy.reverse().map(flipToBack));
  state.prophecy = [];
  return true;
}

function handHasKeyOf(state: DoorsGameState, suit: CardSuit) {
  return state.hand.some((card) => isKey(card) && card.suit === suit);
}

function needsRefill(state: DoorsGameState) {
  return (
    state.deal.length === 0 &&
    !state.pending &&
    state.prophecy.length === 0 &&
    state.hand.length < HAND_SIZE &&
    state.stock.length > 0 &&
    doorsOpen(state) < DOOR_COUNT
  );
}

/** With the hand full again, what waited in limbo is shuffled back in. */
function finishRefill(state: DoorsGameState) {
  if (state.hand.length < HAND_SIZE || state.limbo.length === 0) return;
  state.stock = shuffle(flipAllToBack([...state.stock, ...state.limbo]));
  state.limbo = [];
}

/** Draws one card: a room joins the hand, anything else asks or waits. */
function drawOne(state: DoorsGameState) {
  const card = state.stock.pop();
  if (!card) return;
  if (isRoom(card)) {
    state.hand.push(flipToFace(card));
    finishRefill(state);
  } else if (isNightmare(card)) {
    state.pending = { kind: "nightmare", card: flipToFace(card) };
  } else if (handHasKeyOf(state, card.suit)) {
    state.pending = { kind: "door", card: flipToFace(card) };
  } else {
    state.limbo.push(card);
  }
}

/** Refills with rooms only, as after a dropped hand; the rest wait in limbo. */
function refillRoomsOnly(state: DoorsGameState) {
  while (state.hand.length < HAND_SIZE && state.stock.length > 0) {
    const card = state.stock.pop()!;
    if (isRoom(card)) state.hand.push(flipToFace(card));
    else state.limbo.push(card);
  }
  finishRefill(state);
}

function discardFirstKey(state: DoorsGameState, suit?: CardSuit) {
  const index = state.hand.findIndex(
    (card) => isKey(card) && (!suit || card.suit === suit),
  );
  if (index < 0) return false;
  state.discard.push(...state.hand.splice(index, 1));
  return true;
}

/** A drawn door is opened with a key of its suit, or let go to limbo. */
function resolveDoor(state: DoorsGameState, claim: boolean) {
  if (state.pending?.kind !== "door") return false;
  const door = state.pending.card;
  state.pending = null;
  if (claim && discardFirstKey(state, door.suit)) placeDoor(state, door);
  else state.limbo.push(flipToBack(door));
  return true;
}

export type Penalty = "loseKey" | "returnDoor" | "burnFive" | "dropHand";
const PENALTIES: Penalty[] = ["loseKey", "returnDoor", "burnFive", "dropHand"];

function canPay(state: DoorsGameState, penalty: Penalty) {
  if (state.pending?.kind !== "nightmare") return false;
  switch (penalty) {
    case "loseKey":
      return state.hand.some(isKey);
    case "returnDoor":
      return state.claimOrder.length > 0;
    case "burnFive":
      return state.stock.length > 0;
    case "dropHand":
      return true;
  }
}

/** The nightmare's price is paid, and it goes to the discard pile. */
function resolveNightmare(state: DoorsGameState, penalty: Penalty) {
  if (!canPay(state, penalty)) return false;
  const nightmare = state.pending!.card;
  state.pending = null;
  switch (penalty) {
    case "loseKey":
      discardFirstKey(state);
      break;
    case "returnDoor": {
      const slot = state.claimOrder.pop()!;
      const door = state.doors[slot];
      state.doors[slot] = null;
      if (door) state.limbo.push(flipToBack(door));
      break;
    }
    case "burnFive":
      state.stock
        .splice(Math.max(0, state.stock.length - BURN_SIZE))
        .forEach((card) => discardOrLimbo(state, card));
      break;
    case "dropHand":
      state.discard.push(...state.hand);
      state.hand = [];
      refillRoomsOnly(state);
      break;
  }
  state.discard.push(nightmare);
  return true;
}

function isWon(state: DoorsGameState) {
  return doorsOpen(state) === DOOR_COUNT;
}

/** The dream fades when the stock runs out before the hand is full again. */
function isLost(state: DoorsGameState) {
  return (
    state.deal.length === 0 &&
    !isWon(state) &&
    !state.pending &&
    state.prophecy.length === 0 &&
    state.stock.length === 0 &&
    state.hand.length < HAND_SIZE
  );
}

// ========== Deal ========== //
function createInitialState(): DoorsGameState {
  const state: DoorsGameState = {
    stock: shuffle(createDeck({ includeJokers: true })),
    hand: [],
    path: [],
    doors: Array.from({ length: DOOR_COUNT }, () => null),
    claimOrder: [],
    discard: [],
    limbo: [],
    prophecy: [],
    pending: null,
    run: 0,
    deal: [],
  };
  // The first hand is five rooms; doors and nightmares drawn go back in.
  refillRoomsOnly(state);
  return state;
}

function gatherState(state: DoorsGameState): DoorsGameState {
  return {
    ...createInitialState(),
    stock: [],
    hand: [],
    deal: shuffle(flipAllToBack(collectCards(state))),
  };
}

const gameStateInitial = createInitialState();

export const doorsRules = {
  HAND_SIZE,
  RUN_LENGTH,
  PENALTIES,
  isRoom,
  isDoor,
  isNightmare,
  isKey,
  symbolOf,
  canPlay,
  playCard,
  discardCard,
  resolveProphecy,
  drawOne,
  needsRefill,
  resolveDoor,
  canPay,
  resolveNightmare,
  doorsOpen,
  isWon,
  isLost,
  createInitialState,
};

// ========== Component ========== //
export default function Doors() {
  const { colorDark, colorPale } = useGameColors();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const {
    isLoaded,
    isSettingUp,
    game,
    setGame,
    reset,
    undo,
    canUndo,
    saveUndoState,
  } = useStateManager<DoorsGameState>({
    gameStateInitial,
    resetNonGameStates: () => setSelectedId(null),
    resetAndSetup: async () => {
      // Gather every card into one pile, then deal the first hand from it.
      setGame((draft) => gatherState(draft));
      await delay();
      setGame((draft) => redealWith(createInitialState(), draft.deal));
    },
  });

  const won = isWon(game);
  const lost = isLost(game);
  const ended = won || lost;
  const busy = isSettingUp || ended;
  const selected = game.hand.find((card) => card.id === selectedId) ?? null;
  const pending = game.pending;
  const reading = game.prophecy.length > 0;
  // Hand taps and the Play and Discard buttons wait on any choice to make.
  const handFree = !busy && !pending && !reading;

  // The hand fills up again one card at a time after each action.
  useEffect(() => {
    if (isSettingUp || ended || !needsRefill(game)) return;
    const timer = setTimeout(() => {
      setGame((draft) => {
        if (needsRefill(draft)) drawOne(draft);
      });
    }, REFILL_DELAY);
    return () => clearTimeout(timer);
  }, [game, isSettingUp, ended, setGame]);

  function act(change: (draft: DoorsGameState) => void) {
    saveUndoState(structuredClone(game));
    setGame(change);
    setSelectedId(null);
  }

  function onHandTap(cardId: string) {
    if (!handFree) return;
    setSelectedId(selectedId === cardId ? null : cardId);
  }

  function play() {
    if (!handFree || !selected || !canPlay(game, selected)) return;
    act((draft) => {
      playCard(draft, selected.id);
    });
  }

  function discard() {
    if (!handFree || !selected) return;
    act((draft) => {
      discardCard(draft, selected.id);
    });
  }

  function onProphecyTap(cardId: string) {
    if (busy || !reading) return;
    act((draft) => {
      resolveProphecy(draft, cardId);
    });
  }

  function chooseDoor(claim: boolean) {
    if (busy || pending?.kind !== "door") return;
    act((draft) => {
      resolveDoor(draft, claim);
    });
  }

  function payPenalty(penalty: Penalty) {
    if (busy || !canPay(game, penalty)) return;
    act((draft) => {
      resolveNightmare(draft, penalty);
    });
  }

  const zones: MapZone[] = useMemo(() => {
    const visiblePath = Math.min(PATH_VISIBLE, Math.max(1, game.path.length));
    const doorZones: MapZone[] = game.doors.map((door, slot) => ({
      id: `door-${slot}`,
      name: "door",
      pileIndex: slot,
      cards: door ? [door] : [],
      col: slot,
      row: DOOR_ROW,
      placeholder: {},
    }));
    return [
      ...doorZones,
      {
        id: "stock",
        name: "stock",
        cards: game.stock,
        col: 0,
        row: PATH_ROW,
        baseZIndex: 10,
        fan: { maxVisible: 3 },
        placeholder: {
          text: i18n.t("cards:stock"),
          showCount: true,
          infoPos: "below",
        },
      },
      {
        id: "path",
        name: "path",
        cards: game.path,
        col: PATH_COL,
        row: PATH_ROW,
        width: PATH_WIDTH,
        baseZIndex: 20,
        fan: {
          direction: "right",
          maxVisible: PATH_VISIBLE,
          offset: Math.min(
            1 + GAP,
            (PATH_WIDTH - 1) / Math.max(1, visiblePath - 1),
          ),
        },
        placeholder: { text: i18n.t("games:doors.path"), showCount: false },
      },
      {
        id: "prophecy",
        name: "prophecy",
        cards: game.prophecy,
        col: PATH_COL,
        row: MIDDLE_ROW,
        width: PATH_WIDTH,
        baseZIndex: 30,
        fan: { direction: "right", offset: 1 + GAP },
      },
      {
        id: "pending",
        name: "pending",
        cards: pending ? [pending.card] : [],
        col: (COLS - 1) / 2,
        row: MIDDLE_ROW,
        baseZIndex: 30,
      },
      {
        id: "hand",
        name: "hand",
        cards: game.hand,
        col: 0,
        row: HAND_ROW,
        width: COLS,
        baseZIndex: 40,
        fan: {
          direction: "right",
          offset: zoneFanOffset(
            game.hand.length,
            COLS * (1 + GAP) - GAP,
            0.3,
            1 + GAP,
          ),
        },
      },
      { id: "status", col: 0, row: STATUS_ROW, width: COLS, height: 0.35 },
      { id: "buttons", col: 0, row: BUTTON_ROW, width: COLS, height: 0.5 },
    ];
  }, [game, pending]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    const { card, zoneName } = mappedCard;
    if (zoneName === "hand") {
      // While a nightmare asks its price, the keys it could take show green.
      const atRisk = pending?.kind === "nightmare" && isKey(card);
      return {
        onPress: () => onHandTap(card.id),
        isDisabled: !handFree,
        isSelected: card.id === selectedId || atRisk,
        selectColor: atRisk ? "green" : "blue",
        forceOverlayColor: atRisk,
      };
    }
    if (zoneName === "prophecy") {
      return {
        onPress: () => onProphecyTap(card.id),
        isDisabled: busy,
        selectColor: "red",
      };
    }
    return { isDisabled: true };
  };

  const zoneMapper = (): CardMapBGMapping | undefined => ({
    isDisabled: true,
  });

  const { cardMap, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper,
    cardSize: "small",
    gap: GAP,
    fixedCols: COLS,
    fixedRows: 6,
  });

  const status = reading
    ? i18n.t("games:doors.prophecy")
    : pending?.kind === "door"
      ? i18n.t("games:doors.doorFound")
      : pending?.kind === "nightmare"
        ? i18n.t("games:doors.nightmare")
        : i18n.t("games:doors.status", {
            stock: game.stock.length,
            discard: game.discard.length,
          });

  const penaltyLabels: Record<Penalty, string> = {
    loseKey: i18n.t("games:doors.loseKey"),
    returnDoor: i18n.t("games:doors.returnDoor"),
    burnFive: i18n.t("games:doors.burnFive"),
    dropHand: i18n.t("games:doors.dropHand"),
  };

  return (
    <GameWrapper
      outcome={won ? "won" : lost ? "lost" : "playing"}
      reset={() => void reset()}
      isLoaded={isLoaded}
      score={doorsOpen(game)}
      canUndo={canUndo}
      undo={() => {
        setSelectedId(null);
        undo();
      }}
      winLoseMessage={
        won
          ? i18n.t("games:doors.allOpen")
          : i18n.t("games:doors.faded", { count: doorsOpen(game) })
      }
    >
      {cardMap}

      <View style={[getZoneStylesById("status"), flexStyles.colCentered]}>
        <Text
          size="xs"
          weight={500}
          color={colorPale}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {status}
        </Text>
      </View>

      <View
        style={[
          getZoneStylesById("buttons"),
          flexStyles.rowCentered,
          { gap: 6 },
        ]}
      >
        {pending?.kind === "nightmare" ? (
          PENALTIES.map((penalty) => (
            <Button
              key={penalty}
              text={penaltyLabels[penalty]}
              size="xs"
              onPress={() => payPenalty(penalty)}
              disabled={busy || !canPay(game, penalty)}
              theme={colorDark}
              style={{ flex: 1 }}
            />
          ))
        ) : pending?.kind === "door" ? (
          <>
            <Button
              text={i18n.t("games:doors.claim")}
              size="xs"
              onPress={() => chooseDoor(true)}
              disabled={busy}
              theme={colorDark}
              style={{ flex: 1 }}
            />
            <Button
              text={i18n.t("games:doors.letGo")}
              size="xs"
              onPress={() => chooseDoor(false)}
              disabled={busy}
              theme={colorDark}
              style={{ flex: 1 }}
            />
          </>
        ) : (
          <>
            <Button
              text={i18n.t("cards:play")}
              size="xs"
              onPress={play}
              disabled={!handFree || !selected || !canPlay(game, selected)}
              theme={colorDark}
              style={{ flex: 1 }}
            />
            <Button
              text={i18n.t("cards:discardAction")}
              size="xs"
              onPress={discard}
              disabled={!handFree || !selected}
              theme={colorDark}
              style={{ flex: 1 }}
            />
          </>
        )}
      </View>
    </GameWrapper>
  );
}
