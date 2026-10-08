import { useGameColors } from "@/hooks/useGameColors";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useStateManager } from "@/hooks/useStateManager";
import { flexStyles } from "@/styles/flexStyles";
import { rgba } from "@/styles/styles";
import { delay } from "@/utils/utils";
import { useEffect, useMemo } from "react";
import { View } from "react-native";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import {
  createDeck,
  flipAllToBack,
  flipAllToFace,
  flipToFace,
  RANK_VALUE,
  shuffle,
  zoneFanOffset,
  type CardSuit,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { Text } from "../common/Text";
import { ProgressBar } from "../Home/ProgressBar";

import { i18n } from "@/i18n";
import { cardTarget, makeHint, zoneTarget } from "@/hints/hint";
import { useHint } from "@/hints/hint-store";

// Sevens: the domino game played with cards (Fan Tan, Parliament). Each
// suit's row grows out from its 7, a rank at a time, up towards the King
// and down towards the Ace. You and the rival each hold seven cards and
// draw from the stock when stuck; the first to empty their hand wins.

type Seat = "player" | "rival";

/**
 * play: the player plays or draws next. rival: the rival plays next.
 * dealing: the deal is on its way. over: a hand is empty.
 */
type Phase = "play" | "rival" | "dealing" | "over";

type GameState = {
  stock: PlayingCard[];
  /** Every card played, in the order it was played. */
  table: PlayingCard[];
  hand: PlayingCard[];
  rival: PlayingCard[];
  phase: Phase;
  /** Who went last, so a stuck player hands the turn back. */
  passes: number;
};

export type SevensGameState = GameState;

const HAND_SIZE = 7;
const RIVAL_DELAY = 600;
const BOARD_WIDTH = 7;
/** A rank's place along its row, in card widths. */
const SLOT = 0.5;
const SUITS: CardSuit[] = ["spades", "hearts", "clubs", "diamonds"];
const SUIT_ORDER: CardSuit[] = ["clubs", "diamonds", "hearts", "spades"];

function value(card: PlayingCard) {
  return RANK_VALUE[card.rank];
}

function strength(card: PlayingCard) {
  return value(card) * 4 + SUIT_ORDER.indexOf(card.suit);
}

// —— The rows ————————————————————————————————————————————————

/** The cards of one suit on the table, by rank. */
function row(table: PlayingCard[], suit: CardSuit) {
  return table
    .filter((card) => card.suit === suit)
    .sort((a, b) => value(a) - value(b));
}

/** Whether a card may be played: a 7, or next to its row's end. */
function isPlayable(table: PlayingCard[], card: PlayingCard) {
  const cards = row(table, card.suit);
  const target = value(card);
  if (target === 7) return cards.length === 0;
  if (cards.length === 0) return false;
  const low = value(cards[0]);
  const high = value(cards[cards.length - 1]);
  return target === low - 1 || target === high + 1;
}

function playable(table: PlayingCard[], hand: PlayingCard[]) {
  return hand.filter((card) => isPlayable(table, card));
}

/**
 * How many more of a hand's cards playing `card` frees, counting the run
 * of that hand's own cards that follows it away from the 7.
 */
function unlocks(hand: PlayingCard[], card: PlayingCard) {
  const target = value(card);
  const held = new Set(
    hand
      .filter((other) => other.suit === card.suit && other.id !== card.id)
      .map(value),
  );
  if (target === 7) {
    let count = 0;
    for (let rank = 8; held.has(rank); rank += 1) count += 1;
    for (let rank = 6; held.has(rank); rank -= 1) count += 1;
    return count;
  }
  const step = target > 7 ? 1 : -1;
  let count = 0;
  for (let rank = target + step; held.has(rank); rank += step) count += 1;
  return count;
}

// —— The rival's habits ———————————————————————————————————————

/**
 * The rival plays a 7 if it holds one. Otherwise it plays the card
 * followed by the most of its own cards, and, of equals, its lowest card.
 */
function rivalChoice(table: PlayingCard[], hand: PlayingCard[]) {
  const options = playable(table, hand);
  if (options.length === 0) return null;
  const sevens = options.filter((card) => value(card) === 7);
  const pool = sevens.length > 0 ? sevens : options;
  return pool.reduce((best, card) => {
    const a = unlocks(hand, card);
    const b = unlocks(hand, best);
    if (a !== b) return a > b ? card : best;
    return strength(card) < strength(best) ? card : best;
  });
}

// —— Moves ————————————————————————————————————————————————————

function allCards(state: GameState) {
  return [...state.stock, ...state.table, ...state.hand, ...state.rival];
}

function gather(draft: GameState) {
  draft.stock = flipAllToBack(shuffle(allCards(draft)));
  draft.table = [];
  draft.hand = [];
  draft.rival = [];
  draft.passes = 0;
  draft.phase = "dealing";
}

function sortHand(cards: PlayingCard[]) {
  return [...cards].sort(
    (a, b) =>
      SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit) || value(a) - value(b),
  );
}

/** Deals seven each, and starts the table with the first 7 in the stock. */
function deal(draft: GameState) {
  draft.hand = sortHand(flipAllToFace(draft.stock.splice(0, HAND_SIZE)));
  draft.rival = sortHand(flipAllToFace(draft.stock.splice(0, HAND_SIZE)));
  const seven = draft.stock.findIndex((card) => value(card) === 7);
  if (seven >= 0) draft.table.push(flipToFace(draft.stock.splice(seven, 1)[0]));
  draft.phase = "play";
}

function endTurn(draft: GameState, seat: Seat) {
  const hand = seat === "player" ? draft.hand : draft.rival;
  if (hand.length === 0) {
    draft.phase = "over";
    return;
  }
  draft.phase = seat === "player" ? "rival" : "play";
}

function playCard(draft: GameState, seat: Seat, cardId: string) {
  const hand = seat === "player" ? draft.hand : draft.rival;
  const card = hand.find((other) => other.id === cardId);
  if (!card || !isPlayable(draft.table, card)) return;
  const rest = hand.filter((other) => other.id !== card.id);
  if (seat === "player") draft.hand = rest;
  else draft.rival = rest;
  draft.table.push(card);
  draft.passes = 0;
  endTurn(draft, seat);
}

/** A stuck hand draws a card, or passes when the stock is empty. */
function drawCard(draft: GameState, seat: Seat) {
  const hand = seat === "player" ? draft.hand : draft.rival;
  if (playable(draft.table, hand).length > 0) return;
  const drawn = draft.stock.shift();
  if (drawn) {
    const next = sortHand([...hand, flipToFace(drawn)]);
    if (seat === "player") draft.hand = next;
    else draft.rival = next;
    draft.passes = 0;
  } else {
    draft.passes += 1;
  }
  draft.phase = seat === "player" ? "rival" : "play";
}

function playerPlays(draft: GameState, cardId: string) {
  if (draft.phase !== "play") return;
  playCard(draft, "player", cardId);
}

function playerDraws(draft: GameState) {
  if (draft.phase !== "play") return;
  drawCard(draft, "player");
}

function rivalPlays(draft: GameState) {
  if (draft.phase !== "rival") return;
  const card = rivalChoice(draft.table, draft.rival);
  if (card) playCard(draft, "rival", card.id);
  else drawCard(draft, "rival");
}

// —— Hints ————————————————————————————————————————————————————

/**
 * The card that frees the most of your own cards and the fewest of the
 * rival's, after the rival's reply.
 */
function bestCard(state: GameState) {
  const options = playable(state.table, state.hand);
  if (options.length === 0) return null;
  let best: PlayingCard | null = null;
  let bestScore = -Infinity;
  for (const card of options) {
    const table = [...state.table, card];
    const reply = rivalChoice(table, state.rival);
    const score =
      unlocks(state.hand, card) * 2 -
      unlocks(state.rival, card) -
      (reply ? unlocks(state.rival, reply) : 0) +
      (value(card) === 7 ? 0.5 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = card;
    }
  }
  return best;
}

function findSevensHint(state: GameState) {
  if (state.phase !== "play") return null;
  const card = bestCard(state);
  if (card) return makeHint("tapCard", cardTarget(card));
  if (state.stock.length > 0) return makeHint("draw", zoneTarget("stock"));
  return null;
}

export const sevensRules = {
  HAND_SIZE,
  row,
  isPlayable,
  playable,
  unlocks,
  rivalChoice,
  gather,
  deal,
  playerPlays,
  playerDraws,
  rivalPlays,
  bestCard,
  findHint: findSevensHint,
};

// —— Component ————————————————————————————————————————————————

const gameStateInitial: GameState = {
  stock: createDeck(),
  table: [],
  hand: [],
  rival: [],
  phase: "dealing",
  passes: 0,
};

export default function Sevens() {
  const { spacing } = useResponsiveMetrics();
  const { colorPale } = useGameColors();

  const {
    isSettingUp,
    isLoaded,
    game,
    setGame,
    reset,
    undo,
    canUndo,
    saveUndoState,
    clearUndoHistory,
  } = useStateManager<GameState>({
    gameStateInitial,
    resetAndSetup: async () => {
      setGame(gather);
      await delay();
      setGame(deal);
    },
  });

  const ended = game.phase === "over";
  const canPlay = useMemo(
    () => new Set(playable(game.table, game.hand).map((card) => card.id)),
    [game],
  );
  const stuck = game.phase === "play" && canPlay.size === 0;

  useHint(() => findSevensHint(game), {
    game,
    enabled: !isSettingUp && game.phase === "play",
  });

  // The rival plays on its own, and a stuck hand with no stock passes.
  useEffect(() => {
    if (isSettingUp) return;
    if (game.phase === "rival") {
      const timer = setTimeout(() => setGame(rivalPlays), RIVAL_DELAY);
      return () => clearTimeout(timer);
    }
    if (stuck && game.stock.length === 0) {
      const timer = setTimeout(() => setGame(playerDraws), RIVAL_DELAY);
      return () => clearTimeout(timer);
    }
  }, [game, stuck, isSettingUp, setGame]);

  function onHandPress(cardId: string) {
    if (game.phase !== "play" || !canPlay.has(cardId)) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => playerPlays(draft, cardId));
  }

  function onStockPress() {
    if (!stuck || game.stock.length === 0) return;
    // A drawn card is a new one: there's no undoing back past it.
    clearUndoHistory();
    setGame(playerDraws);
  }

  const zones: MapZone[] = useMemo(() => {
    const rows: MapZone[] = SUITS.flatMap((suit, index) => {
      const cards = row(game.table, suit);
      const first = cards.length > 0 ? value(cards[0]) : 7;
      return [
        {
          id: `seven-${suit}`,
          name: "seven",
          pileIndex: index,
          col: 6 * SLOT,
          row: index * 1.05,
          baseZIndex: 5,
          placeholder: {
            showCount: false,
            hideShadow: true,
            backgroundColor: rgba(colorPale, 0.1),
          },
        },
        {
          id: `row-${suit}`,
          name: "row",
          pileIndex: index,
          cards,
          col: (first - 1) * SLOT,
          row: index * 1.05,
          baseZIndex: 10,
          fan: {
            direction: "right",
            center: false,
            offsets: cards
              .slice(1)
              .map((card, at) => (value(card) - value(cards[at])) * SLOT),
          },
        },
      ];
    });
    return [
      ...rows,
      {
        id: "rival",
        name: "rival",
        cards: game.rival,
        col: 0,
        row: 4.35,
        width: 5.8,
        baseZIndex: 10,
        fan: {
          direction: "right",
          offset: zoneFanOffset(game.rival.length, 5.8, 0.28, 1.05),
          center: true,
        },
      },
      {
        id: "stock",
        name: "stock",
        cards: game.stock,
        col: 6,
        row: 4.35,
        baseZIndex: 10,
        fan: { maxVisible: 3 },
        placeholder: { text: i18n.t("cards:stock"), infoPos: "left" },
      },
      {
        id: "hand",
        name: "hand",
        cards: game.hand,
        col: 0,
        row: 5.5,
        width: BOARD_WIDTH,
        baseZIndex: 10,
        fan: {
          direction: "right",
          offset: zoneFanOffset(game.hand.length, BOARD_WIDTH, 0.28, 1.05),
          center: true,
        },
      },
      {
        id: "hud",
        col: 0,
        row: 6.65,
        width: BOARD_WIDTH,
        height: 0.75,
      },
    ];
  }, [game, colorPale]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    const id = mappedCard.card.id;
    if (mappedCard.zoneName === "hand") {
      const can = canPlay.has(id);
      return {
        onPress: () => onHandPress(id),
        isDisabled: !can,
        ...(game.phase === "play" && !can
          ? { selectColor: "grey", forceOverlayColor: true }
          : {}),
      };
    }
    if (mappedCard.zoneName === "stock") {
      return {
        onPress: onStockPress,
        isDisabled: !stuck,
        clickThroughCards: true,
      };
    }
    return { isDisabled: true };
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name !== "stock") return;
    return { onPress: onStockPress, isDisabled: !stuck };
  };

  const { cardMap, cardHeight, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper,
    cardSize: "small",
    gap: 0,
  });

  const won = ended && game.hand.length === 0;

  return (
    <GameWrapper
      outcome={!ended ? "playing" : won ? "won" : "lost"}
      score={won ? game.rival.length : 0}
      winLoseMessage={
        ended
          ? won
            ? i18n.t("games:sevens.won", { count: game.rival.length })
            : i18n.t("games:sevens.lost", { count: game.hand.length })
          : undefined
      }
      reset={reset}
      isLoaded={isLoaded}
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}

      <View
        style={[
          getZoneStylesById("hud"),
          flexStyles.rowCentered,
          { gap: spacing(14) },
        ]}
      >
        <ProgressBar
          progressValue={game.rival.length}
          totalValue={Math.max(game.rival.length, game.hand.length, 1)}
          scaledHeight={cardHeight * 0.2}
          color="red"
          style={{ flex: 1 }}
          labelText={i18n.t("games:sevens.rival")}
          tallyText={game.rival.length}
        />
        <Text size="xs" weight={300} color={rgba(colorPale, 0.7)}>
          {stuck
            ? game.stock.length > 0
              ? i18n.t("games:sevens.drawToPass")
              : i18n.t("games:sevens.pass")
            : i18n.t("games:sevens.inHand", { count: game.hand.length })}
        </Text>
      </View>
    </GameWrapper>
  );
}
