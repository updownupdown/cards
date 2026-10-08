import { Button } from "@/components/Button/Button";
import { useGameColors } from "@/hooks/useGameColors";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useStateManager } from "@/hooks/useStateManager";
import { flexStyles } from "@/styles/flexStyles";
import { rgba } from "@/styles/styles";
import { delay } from "@/utils/utils";
import { useMemo, useState } from "react";
import { View } from "react-native";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import {
  createDeck,
  flipAllToBack,
  flipToFace,
  RANK_VALUE,
  shuffle,
  zoneFanOffset,
  type CardSuit,
  type PlayingCard,
  type StandardRank,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { Text } from "../common/Text";
import { ProgressBar } from "../Home/ProgressBar";

import { i18n } from "@/i18n";
import { cardTarget, makeHint, zoneTarget } from "@/hints/hint";
import { useHint } from "@/hints/hint-store";

// Carousel: rummy with the whole table to play with. Meld your hand away,
// rearranging the melds already down as you like, as long as every meld is
// whole again before you take another card from the carousel.

type GameState = {
  stock: PlayingCard[];
  /** The carousel: three face-up cards to take from. */
  carousel: (PlayingCard | null)[];
  hand: PlayingCard[];
  /** Places for melds on the table; an empty one is a free place. */
  melds: PlayingCard[][];
  gaveUp: boolean;
};

export type CarouselGameState = GameState;

const CAROUSEL_SIZE = 3;
const MELD_ROWS = 2;
const MELD_COLS = 8;
const MELD_SLOTS = MELD_ROWS * MELD_COLS;
const HAND_SIZE = 7;
/** Holding this many cards loses the game. */
const HAND_LIMIT = 12;
const DEAL_ATTEMPTS = 50;

const BOARD_WIDTH = 8;
/** The height a meld may fan down to, in card heights. */
const MELD_HEIGHT = 2.3;
const MELD_ROW_GAP = 0.15;
const MELDS_TOP = 1.25;
const HAND_ROW = MELDS_TOP + MELD_ROWS * (MELD_HEIGHT + MELD_ROW_GAP);

// —— Melds ————————————————————————————————————————————————————

/** Hands and sets are shown in this suit order, alternating colours. */
const DISPLAY_SUITS: CardSuit[] = ["spades", "hearts", "clubs", "diamonds"];

function rank(card: PlayingCard) {
  return RANK_VALUE[card.rank as StandardRank];
}

/** Three or four cards of one rank, all of different suits. */
function isSet(cards: PlayingCard[]) {
  return (
    cards.length >= 3 &&
    cards.length <= 4 &&
    cards.every((card) => card.rank === cards[0].rank) &&
    new Set(cards.map((card) => card.suit)).size === cards.length
  );
}

function isConsecutive(values: number[]) {
  return values.every(
    (value, index) => index === 0 || value === values[index - 1] + 1,
  );
}

/** Three or more cards of one suit in sequence; an Ace is low or high. */
function isRun(cards: PlayingCard[]) {
  if (cards.length < 3) return false;
  if (!cards.every((card) => card.suit === cards[0].suit)) return false;
  const low = cards.map(rank).sort((a, b) => a - b);
  if (isConsecutive(low)) return true;
  if (low[0] !== 1) return false;
  return isConsecutive([...low.slice(1), 14]);
}

function isMeld(cards: PlayingCard[]) {
  return isSet(cards) || isRun(cards);
}

/** Every meld on the table is whole (empty places don't count). */
function isTableValid(melds: PlayingCard[][]) {
  return melds.every((meld) => meld.length === 0 || isMeld(meld));
}

/** Whether an Ace in these cards reads best as high (after a King). */
function aceHigh(cards: PlayingCard[]) {
  return (
    cards.some((card) => card.rank === "K") &&
    !cards.some((card) => card.rank === "2")
  );
}

/** The order a meld's cards lie in: sets by suit, runs up from low. */
function sortMeld(cards: PlayingCard[]) {
  const high = aceHigh(cards);
  const order = (card: PlayingCard) =>
    card.rank === "A" && high ? 14 : rank(card);
  return [...cards].sort(
    (a, b) =>
      DISPLAY_SUITS.indexOf(a.suit) - DISPLAY_SUITS.indexOf(b.suit) ||
      order(a) - order(b),
  );
}

function sortHand(cards: PlayingCard[]) {
  return [...cards].sort(
    (a, b) =>
      DISPLAY_SUITS.indexOf(a.suit) - DISPLAY_SUITS.indexOf(b.suit) ||
      rank(a) - rank(b),
  );
}

// —— Finding melds ————————————————————————————————————————————

function subsets<T>(items: T[], size: number): T[][] {
  if (size === 0) return [[]];
  if (items.length < size) return [];
  const [first, ...rest] = items;
  return [
    ...subsets(rest, size - 1).map((subset) => [first, ...subset]),
    ...subsets(rest, size),
  ];
}

/** The largest meld these cards hold (null if none). */
function largestMeld(cards: PlayingCard[]): PlayingCard[] | null {
  let best: PlayingCard[] | null = null;
  const consider = (meld: PlayingCard[]) => {
    if (isMeld(meld) && (!best || meld.length > best.length)) best = meld;
  };
  for (const value of new Set(cards.map(rank))) {
    const sameRank = cards.filter((card) => rank(card) === value);
    const bySuit = new Map(sameRank.map((card) => [card.suit, card]));
    consider([...bySuit.values()]);
  }
  for (const suit of DISPLAY_SUITS) {
    const suited = cards.filter((card) => card.suit === suit);
    for (const high of [false, true]) {
      const ordered = [...suited].sort((a, b) => {
        const value = (card: PlayingCard) =>
          card.rank === "A" && high ? 14 : rank(card);
        return value(a) - value(b);
      });
      let run: PlayingCard[] = [];
      for (const card of ordered) {
        const value = card.rank === "A" && high ? 14 : rank(card);
        const last = run.at(-1);
        const lastValue = last
          ? last.rank === "A" && high
            ? 14
            : rank(last)
          : null;
        if (lastValue === value) continue;
        run =
          lastValue !== null && value === lastValue + 1
            ? [...run, card]
            : [card];
        consider(run);
      }
    }
  }
  return best;
}

type Play =
  | { kind: "meld"; cards: PlayingCard[] }
  | { kind: "layOff"; card: PlayingCard; meld: number }
  | { kind: "borrow"; card: PlayingCard; from: number; cards: PlayingCard[] };

/**
 * Cards a meld can spare and stay whole: either end of a run of four or
 * more, or any card of a set of four.
 */
function spareCards(meld: PlayingCard[]) {
  if (meld.length < 4) return [];
  if (isSet(meld)) return meld;
  const sorted = sortMeld(meld);
  return [sorted[0], sorted[sorted.length - 1]];
}

/**
 * A play that puts hand cards on the table without leaving any meld broken:
 * a meld from the hand (the biggest), a card laid off on a meld, or a card
 * borrowed from a meld that can spare it to make a new meld with hand cards.
 */
function findPlay(state: GameState): Play | null {
  const meld = largestMeld(state.hand);
  if (meld) return { kind: "meld", cards: meld };
  for (const card of state.hand) {
    const index = state.melds.findIndex(
      (cards) => cards.length > 0 && isMeld([...cards, card]),
    );
    if (index >= 0) return { kind: "layOff", card, meld: index };
  }
  for (let from = 0; from < state.melds.length; from += 1) {
    for (const spare of spareCards(state.melds[from])) {
      for (const size of [3, 2]) {
        for (const handCards of subsets(state.hand, size)) {
          if (isMeld([spare, ...handCards])) {
            return { kind: "borrow", card: spare, from, cards: handCards };
          }
        }
      }
    }
  }
  return null;
}

/** How much a card would help a hand and table (for choosing what to take). */
function usefulness(card: PlayingCard, state: GameState) {
  let worth = 0;
  if (state.melds.some((meld) => meld.length > 0 && isMeld([...meld, card]))) {
    worth += 3;
  }
  for (const other of state.hand) {
    if (other.rank === card.rank) worth += 1.5;
    if (other.suit === card.suit && Math.abs(rank(other) - rank(card)) <= 2) {
      worth += 1;
    }
  }
  if (!largestMeld(state.hand) && largestMeld([...state.hand, card])) {
    worth += 5;
  }
  return worth;
}

function bestTake(state: GameState) {
  let best: PlayingCard | null = null;
  let bestWorth = -Infinity;
  for (const card of state.carousel) {
    if (!card) continue;
    const worth = usefulness(card, state);
    if (worth > bestWorth) {
      bestWorth = worth;
      best = card;
    }
  }
  return best;
}

// —— Moves ————————————————————————————————————————————————————

function emptySlots(): PlayingCard[][] {
  return Array.from({ length: MELD_SLOTS }, () => []);
}

function allCards(state: GameState) {
  return [
    ...state.stock,
    ...state.carousel.filter((card): card is PlayingCard => card !== null),
    ...state.hand,
    ...state.melds.flat(),
  ];
}

/** Starting melds: two runs of three and a set of three, from the deck. */
function startingMelds(deck: PlayingCard[], random: () => number) {
  for (let attempt = 0; attempt < DEAL_ATTEMPTS; attempt += 1) {
    const pool = shuffle(deck, random);
    const melds: PlayingCard[][] = [];
    const used = new Set<string>();
    const take = (match: (card: PlayingCard) => boolean) =>
      pool.find((card) => !used.has(card.id) && match(card));
    for (const kind of ["run", "set", "run"] as const) {
      const anchor = pool.find((card) => !used.has(card.id))!;
      let cards: (PlayingCard | undefined)[];
      if (kind === "set") {
        const others = pool.filter(
          (card) =>
            !used.has(card.id) &&
            card.rank === anchor.rank &&
            card.suit !== anchor.suit,
        );
        cards = [anchor, others[0], others[1]];
      } else {
        const start = Math.min(rank(anchor), 11);
        cards = [0, 1, 2].map((step) =>
          take(
            (card) => card.suit === anchor.suit && rank(card) === start + step,
          ),
        );
      }
      if (cards.some((card) => !card)) break;
      const meld = cards as PlayingCard[];
      if (!isMeld(meld)) break;
      meld.forEach((card) => used.add(card.id));
      melds.push(meld);
    }
    if (melds.length === 3) {
      return {
        melds,
        rest: pool.filter((card) => !used.has(card.id)),
      };
    }
  }
  return { melds: [], rest: shuffle(deck, random) };
}

function gather(draft: GameState) {
  draft.stock = flipAllToBack(shuffle(allCards(draft)));
  draft.carousel = Array.from({ length: CAROUSEL_SIZE }, () => null);
  draft.hand = [];
  draft.melds = emptySlots();
  draft.gaveUp = false;
}

function deal(draft: GameState, random: () => number = Math.random) {
  const { melds, rest } = startingMelds(draft.stock, random);
  const slots = emptySlots();
  melds.forEach((meld, index) => {
    slots[index] = sortMeld(meld.map(flipToFace));
  });
  draft.melds = slots;
  draft.hand = sortHand(rest.slice(0, HAND_SIZE).map(flipToFace));
  draft.carousel = rest
    .slice(HAND_SIZE, HAND_SIZE + CAROUSEL_SIZE)
    .map(flipToFace);
  draft.stock = flipAllToBack(rest.slice(HAND_SIZE + CAROUSEL_SIZE));
}

/** Where a card is: "hand", or the index of its meld. */
function locate(state: GameState, id: string): "hand" | number | null {
  if (state.hand.some((card) => card.id === id)) return "hand";
  const index = state.melds.findIndex((meld) =>
    meld.some((card) => card.id === id),
  );
  return index >= 0 ? index : null;
}

/** Moves cards from the hand and the table into the meld at `target`. */
function moveCards(draft: GameState, ids: string[], target: number) {
  const moving = new Set(ids);
  const cards = [...draft.hand, ...draft.melds.flat()].filter(
    (card) => moving.has(card.id) && !draft.melds[target].includes(card),
  );
  if (cards.length === 0) return;
  draft.hand = draft.hand.filter((card) => !moving.has(card.id));
  draft.melds = draft.melds.map((meld, index) =>
    index === target
      ? sortMeld([...meld, ...cards])
      : meld.filter((card) => !moving.has(card.id)),
  );
}

function takeCard(draft: GameState, index: number) {
  const card = draft.carousel[index];
  if (!card || !isTableValid(draft.melds)) return;
  draft.hand = sortHand([...draft.hand, card]);
  const next = draft.stock.pop();
  draft.carousel[index] = next ? flipToFace(next) : null;
}

function cardsLeft(state: GameState) {
  return state.stock.length + state.carousel.filter(Boolean).length;
}

function isWon(state: GameState) {
  return state.hand.length === 0 && isTableValid(state.melds);
}

function isLost(state: GameState) {
  return state.gaveUp || state.hand.length >= HAND_LIMIT;
}

// —— Hints ————————————————————————————————————————————————————

function firstEmptySlot(state: GameState) {
  return state.melds.findIndex((meld) => meld.length === 0);
}

function findCarouselHint(state: GameState, selected: string[]) {
  if (isWon(state) || isLost(state)) return null;
  if (!isTableValid(state.melds)) return null;
  const play = findPlay(state);
  if (play) {
    const wanted =
      play.kind === "meld"
        ? play.cards
        : play.kind === "layOff"
          ? [play.card]
          : [play.card, ...play.cards];
    const stray = selected.filter(
      (id) => !wanted.some((card) => card.id === id),
    );
    if (stray.length > 0) {
      return makeHint("tapCard", ...stray.map((id) => cardTarget(id)));
    }
    const toPick = wanted.filter((card) => !selected.includes(card.id));
    const slot = firstEmptySlot(state);
    if (play.kind === "layOff") {
      return makeHint(
        "moveCard",
        toPick.map(cardTarget),
        zoneTarget(`meld-${play.meld}`),
      );
    }
    if (slot < 0) return null;
    return makeHint(
      "moveCards",
      toPick.map(cardTarget),
      zoneTarget(`meld-${slot}`),
    );
  }
  const take = bestTake(state);
  return take ? makeHint("tapCard", cardTarget(take)) : null;
}

export const carouselRules = {
  HAND_LIMIT,
  MELD_SLOTS,
  isSet,
  isRun,
  isMeld,
  isTableValid,
  sortMeld,
  largestMeld,
  findPlay,
  bestTake,
  startingMelds,
  gather,
  deal,
  moveCards,
  takeCard,
  isWon,
  isLost,
  findHint: findCarouselHint,
};

// —— Component ————————————————————————————————————————————————

const gameStateInitial: GameState = {
  stock: createDeck(),
  carousel: Array.from({ length: CAROUSEL_SIZE }, () => null),
  hand: [],
  melds: emptySlots(),
  gaveUp: false,
};

export default function Carousel() {
  const { spacing } = useResponsiveMetrics();
  const { colorPale } = useGameColors();
  const [selected, setSelected] = useState<string[]>([]);

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
    resetNonGameStates: () => setSelected([]),
    resetAndSetup: async () => {
      setGame(gather);
      await delay();
      setGame((draft) => deal(draft));
    },
  });

  const tableValid = isTableValid(game.melds);
  const won = !isSettingUp && isWon(game);
  const lost = !isSettingUp && !won && isLost(game);
  const ended = won || lost;
  const carouselEmpty = game.carousel.every((card) => card === null);

  useHint(() => findCarouselHint(game, selected), {
    game,
    enabled: !isSettingUp && !ended,
  });

  /** The meld the selected table cards come from, if any. */
  const selectedMeld = useMemo(() => {
    for (const id of selected) {
      const where = locate(game, id);
      if (typeof where === "number") return where;
    }
    return null;
  }, [game, selected]);

  function moveSelectionTo(target: number) {
    if (selected.length === 0) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => moveCards(draft, selected, target));
    setSelected([]);
  }

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((other) => other !== id) : [...prev, id],
    );
  }

  function onHandPress(id: string) {
    if (ended) return;
    toggle(id);
  }

  function onMeldCardPress(id: string, meld: number) {
    if (ended) return;
    if (selected.includes(id)) {
      toggle(id);
    } else if (selected.length === 0 || selectedMeld === meld) {
      toggle(id);
    } else {
      // Cards from the hand, or another meld, go to this meld.
      moveSelectionTo(meld);
    }
  }

  function onSlotPress(index: number) {
    if (ended || game.melds[index].length > 0) return;
    moveSelectionTo(index);
  }

  function onCarouselPress(index: number) {
    if (ended || !tableValid || !game.carousel[index]) return;
    // A new card comes from the stock: there's no undoing back past it.
    clearUndoHistory();
    setSelected([]);
    setGame((draft) => takeCard(draft, index));
  }

  function giveUp() {
    if (ended || !carouselEmpty) return;
    clearUndoHistory();
    setSelected([]);
    setGame((draft) => {
      draft.gaveUp = true;
    });
  }

  const zones: MapZone[] = useMemo(() => {
    const carouselZones: MapZone[] = game.carousel.map((card, index) => ({
      id: `carousel-${index}`,
      name: "carousel",
      pileIndex: index,
      cards: card ? [card] : [],
      col: 2.6 + index * 1.15,
      row: 0,
      baseZIndex: 20,
      placeholder: {},
    }));

    const meldZones: MapZone[] = game.melds.map((cards, index) => {
      const row = Math.floor(index / MELD_COLS);
      return {
        id: `meld-${index}`,
        name: "meld",
        pileIndex: index,
        cards,
        col: index % MELD_COLS,
        row: MELDS_TOP + row * (MELD_HEIGHT + MELD_ROW_GAP),
        height: MELD_HEIGHT,
        baseZIndex: 10,
        fan: {
          direction: "down",
          offset: zoneFanOffset(cards.length, MELD_HEIGHT, 0.12, 0.3),
          center: false,
        },
        // Empty places show only while there's a selection to put there.
        placeholder: cards.length === 0 && selected.length > 0 ? {} : undefined,
      };
    });

    return [
      {
        id: "stock",
        name: "stock",
        cards: game.stock,
        col: 0.6,
        row: 0,
        baseZIndex: 20,
        fan: { maxVisible: 3 },
        placeholder: { showCount: true, infoPos: "below" },
      },
      ...carouselZones,
      { id: "endGame", col: 6.2, row: 0.2, width: 1.8, height: 0.6 },
      ...meldZones,
      {
        id: "hand",
        name: "hand",
        cards: game.hand,
        col: 0,
        row: HAND_ROW,
        width: BOARD_WIDTH,
        baseZIndex: 30,
        fan: {
          direction: "right",
          offset: zoneFanOffset(game.hand.length, BOARD_WIDTH, 0.3, 1.05),
          center: true,
        },
      },
      {
        id: "hud",
        col: 0,
        row: HAND_ROW + 1.15,
        width: BOARD_WIDTH,
        height: 0.75,
      },
    ];
  }, [game, selected]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    const id = mappedCard.card.id;
    const isSelected = selected.includes(id);
    if (mappedCard.zoneName === "hand") {
      return {
        onPress: () => onHandPress(id),
        isDisabled: ended,
        isSelected,
        selectColor: "blue",
      };
    }
    if (mappedCard.zoneName === "meld" && mappedCard.pileIndex !== undefined) {
      const meld = mappedCard.pileIndex;
      const broken = !isMeld(game.melds[meld]);
      return {
        onPress: () => onMeldCardPress(id, meld),
        isDisabled: ended,
        isSelected,
        // A meld that isn't whole is tinted red until it is.
        selectColor: isSelected ? "blue" : broken ? "red" : "none",
        forceOverlayColor: !isSelected && broken,
      };
    }
    if (
      mappedCard.zoneName === "carousel" &&
      mappedCard.pileIndex !== undefined
    ) {
      const index = mappedCard.pileIndex;
      return {
        onPress: () => onCarouselPress(index),
        isDisabled: ended || !tableValid,
        // Until the table is whole again, the carousel waits.
        ...(!tableValid
          ? { selectColor: "grey", forceOverlayColor: true }
          : {}),
      };
    }
    return { isDisabled: true };
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name !== "meld" || zone.pileIndex === undefined) return;
    const index = zone.pileIndex;
    if (game.melds[index].length > 0) return;
    return {
      onPress: () => onSlotPress(index),
      isDisabled: ended || selected.length === 0,
    };
  };

  const { cardMap, cardHeight, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper,
    cardSize: "tableau",
    gap: 0.06,
  });

  return (
    <GameWrapper
      outcome={!ended ? "playing" : won ? "won" : "lost"}
      score={won ? cardsLeft(game) : 0}
      winLoseMessage={
        won
          ? i18n.t("games:carousel.allMelded", { count: cardsLeft(game) })
          : lost
            ? game.gaveUp
              ? i18n.t("games:carousel.outOfCards")
              : i18n.t("games:carousel.handFull", { count: HAND_LIMIT })
            : undefined
      }
      reset={reset}
      isLoaded={isLoaded}
      canUndo={canUndo}
      undo={() => {
        setSelected([]);
        undo();
      }}
    >
      {cardMap}

      {carouselEmpty && !ended && (
        <View style={[getZoneStylesById("endGame"), flexStyles.colCentered]}>
          <Button
            onPress={giveUp}
            text={i18n.t("cards:endGame")}
            size="sm"
            theme="red"
            fullWidth
          />
        </View>
      )}

      <View
        style={[
          getZoneStylesById("hud"),
          flexStyles.colCentered,
          { gap: spacing(8) },
        ]}
      >
        <ProgressBar
          progressValue={game.hand.length}
          totalValue={HAND_LIMIT}
          scaledHeight={cardHeight * 0.18}
          color={game.hand.length >= HAND_LIMIT - 2 ? "red" : "orange"}
          style={{ width: "100%" }}
          labelText={i18n.t("games:carousel.hand")}
          tallyText={`${game.hand.length}/${HAND_LIMIT}`}
        />
        <Text
          size="sm"
          weight={500}
          color={tableValid ? rgba(colorPale, 0.7) : colorPale}
          style={{ textAlign: "center" }}
        >
          {tableValid
            ? i18n.t("games:carousel.tableWhole")
            : i18n.t("games:carousel.tableBroken")}
        </Text>
      </View>
    </GameWrapper>
  );
}
