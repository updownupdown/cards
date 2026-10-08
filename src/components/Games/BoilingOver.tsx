import { Button } from "@/components/Button/Button";
import { Text } from "@/components/common/Text";
import { useGameColors } from "@/hooks/useGameColors";
import { useStateManager } from "@/hooks/useStateManager";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, rgba } from "@/styles/styles";
import { delay } from "@/utils/utils";
import { produce } from "immer";
import { useMemo, useState } from "react";
import { View } from "react-native";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import {
  collectCards,
  createDeck,
  flipAllToBack,
  flipToBack,
  flipToFace,
  isRed,
  rankValue,
  redealWith,
  shuffle,
  zoneFanOffset,
  type CardSuit,
  type PlayingCard,
} from "../Cards/card-utils";
import { getUnderlayStyle } from "../Cards/CardStyles";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { useToast } from "../common/Toast";
import { ProgressBar } from "../Home/ProgressBar";

import { i18n } from "@/i18n";
import { pointerEventsStyles } from "@/styles/pointerEventsStyles";
import { Icon } from "@/icons";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useHint } from "@/hints/hint-store";
import {
  cardTarget,
  makeHint,
  pressHint,
  withNote,
  zoneTarget,
} from "@/hints/hint";

// A push-your-luck deck builder in cards (The Quacks of Quedlinburg): each
// round, cards are flipped from your own deck into the cauldron until you stop
// or the duds boil over, and the potion's strength buys better cards.
//
// Each suit does one clear thing, so every buy is a plan: hearts are the
// cheapest strength, diamonds bring coins (best early, while there are markets
// left to spend them in), clubs let the potion hold more duds, and spades
// skip a dud. Simulated play scores much the same with any of them, so the
// choice is the player's.
const ROUNDS = 9;
const DUD_LIMIT = 7;
const MAX_BUYS = 2;
/** What a card costs over its value: hearts are plain, effects cost more. */
const SURCHARGE: Record<CardSuit, number> = {
  hearts: 0,
  diamonds: 1,
  spades: 2,
  clubs: 3,
};
const WIN_SCORE = 250;
const MARKET_SUITS: CardSuit[] = ["hearts", "diamonds", "clubs", "spades"];
const STARTING_INGREDIENTS = [
  "2-hearts",
  "3-hearts",
  "4-hearts",
  "2-diamonds",
  "3-diamonds",
];

const TIERS = [
  { min: 450, key: "games:boilingOver.tierMiracleWorker" },
  { min: 350, key: "games:boilingOver.tierCourtAlchemist" },
  { min: WIN_SCORE, key: "games:boilingOver.tierVillageHealer" },
] as const;

type Phase = "brewing" | "boiledOver" | "market" | "over";

export type BoilingOverGameState = {
  /** Your own cards, face down. The last card is the top. */
  deck: PlayingCard[];
  /** This round's potion, in the order the cards went in. */
  cauldron: PlayingCard[];
  /** Cards for sale: one row per suit, in MARKET_SUITS order, lowest first. */
  market: PlayingCard[][];
  round: number;
  score: number;
  coins: number;
  /** Suits bought on this visit to the market. */
  bought: CardSuit[];
  phase: Phase;
};

// ========== Rules ========== //
/** The black A, 2 and 3 are duds. */
function isDud(card: PlayingCard) {
  return !isRed(card.suit) && rankValue(card) <= 3;
}

function dudTotal(cauldron: PlayingCard[]) {
  return cauldron.reduce(
    (sum, card) => sum + (isDud(card) ? rankValue(card) : 0),
    0,
  );
}

/** Each club in the cauldron lets it hold one more dud. */
function dudLimit(cauldron: PlayingCard[]) {
  return (
    DUD_LIMIT +
    cauldron.filter((card) => card.suit === "clubs" && !isDud(card)).length
  );
}

function strengthOf(cauldron: PlayingCard[]) {
  return cauldron.reduce(
    (sum, card) => sum + (isDud(card) ? 0 : rankValue(card)),
    0,
  );
}

/** Half the potion's strength, rounded up, with diamonds counting double. */
function coinsFor(cauldron: PlayingCard[]) {
  const diamonds = cauldron.reduce(
    (sum, card) => sum + (card.suit === "diamonds" ? rankValue(card) : 0),
    0,
  );
  return Math.ceil((strengthOf(cauldron) + diamonds) / 2);
}

function costOf(card: PlayingCard) {
  return rankValue(card) + SURCHARGE[card.suit];
}

function isFinalRound(state: BoilingOverGameState) {
  return state.round >= ROUNDS;
}

/** The chance that the next card from the deck boils the potion over. */
function bustChance(state: BoilingOverGameState) {
  const { deck } = state;
  if (deck.length === 0) return 0;
  const room = dudLimit(state.cauldron) - dudTotal(state.cauldron);
  const busts = (card: PlayingCard) => isDud(card) && rankValue(card) > room;
  const top = deck[deck.length - 1];
  if (top.faceUp) return busts(top) ? 1 : 0;
  return deck.filter(busts).length / deck.length;
}

type DrawResult = "ingredient" | "dud" | "dudSkipped" | "boiledOver";

/** A dud a spade turned up goes face down to the bottom of the deck. */
function skipShownDud(state: BoilingOverGameState) {
  const top = state.deck[state.deck.length - 1];
  if (!top?.faceUp || !isDud(top) || state.deck.length < 2) return false;
  state.deck.pop();
  state.deck.unshift(flipToBack(top));
  return true;
}

/**
 * Adds the deck's top card to the cauldron. A spade turns up the next card,
 * and a dud it turns up is skipped, unless `skipDud` is off (the board shows
 * the dud before skipping it).
 */
function drawCard(
  state: BoilingOverGameState,
  skipDud = true,
): DrawResult | null {
  if (state.phase !== "brewing" || state.deck.length === 0) return null;
  const card = flipToFace(state.deck.pop()!);
  state.cauldron.push(card);

  if (isDud(card)) {
    if (dudTotal(state.cauldron) <= dudLimit(state.cauldron)) return "dud";
    if (isFinalRound(state)) {
      // No market follows the last round, so the points are the only choice.
      state.score += strengthOf(state.cauldron);
      state.phase = "over";
    } else {
      state.phase = "boiledOver";
    }
    return "boiledOver";
  }

  if (card.suit === "spades" && state.deck.length > 0) {
    const top = state.deck.length - 1;
    state.deck[top] = flipToFace(state.deck[top]);
    if (isDud(state.deck[top]) && state.deck.length > 1) {
      if (skipDud) skipShownDud(state);
      return "dudSkipped";
    }
  }

  return "ingredient";
}

/** The potion is poured back: its cards return to the deck for the market. */
function pourBack(state: BoilingOverGameState) {
  state.deck = flipAllToBack([...state.deck, ...state.cauldron]);
  state.cauldron = [];
}

function stopBrewing(state: BoilingOverGameState) {
  if (state.phase !== "brewing" || state.cauldron.length === 0) return false;
  state.score += strengthOf(state.cauldron);
  if (isFinalRound(state)) {
    state.phase = "over";
  } else {
    state.coins = coinsFor(state.cauldron);
    state.bought = [];
    state.phase = "market";
    pourBack(state);
  }
  return true;
}

/** After boiling over, keep either the potion's points or its coins. */
function keepAfterBoilOver(
  state: BoilingOverGameState,
  choice: "points" | "coins",
) {
  if (state.phase !== "boiledOver") return false;
  if (choice === "points") state.score += strengthOf(state.cauldron);
  state.coins = choice === "coins" ? coinsFor(state.cauldron) : 0;
  state.bought = [];
  state.phase = "market";
  pourBack(state);
  return true;
}

function canBuy(state: BoilingOverGameState, card: PlayingCard) {
  return (
    state.phase === "market" &&
    state.bought.length < MAX_BUYS &&
    !state.bought.includes(card.suit) &&
    costOf(card) <= state.coins
  );
}

function buyCard(state: BoilingOverGameState, row: number, index: number) {
  const card = state.market[row]?.[index];
  if (!card || !canBuy(state, card)) return false;
  state.market[row].splice(index, 1);
  state.coins -= costOf(card);
  state.bought.push(card.suit);
  state.deck.push(flipToBack(card));
  return true;
}

/** Everything is shuffled into the deck; coins left over are lost. */
function startNextRound(state: BoilingOverGameState) {
  if (state.phase !== "market") return false;
  state.deck = shuffle(flipAllToBack([...state.deck, ...state.cauldron]));
  state.cauldron = [];
  state.coins = 0;
  state.bought = [];
  state.round += 1;
  state.phase = "brewing";
  return true;
}

function getTier(score: number) {
  return TIERS.find((tier) => score >= tier.min);
}

// ========== Deal ========== //
function createInitialState(): BoilingOverGameState {
  const cards = createDeck();
  const starts = (card: PlayingCard) =>
    isDud(card) || STARTING_INGREDIENTS.includes(`${card.rank}-${card.suit}`);
  return {
    deck: shuffle(flipAllToBack(cards.filter(starts))),
    cauldron: [],
    market: MARKET_SUITS.map((suit) =>
      cards
        .filter((card) => card.suit === suit && !starts(card))
        .map(flipToFace)
        .sort((a, b) => rankValue(a) - rankValue(b)),
    ),
    round: 1,
    score: 0,
    coins: 0,
    bought: [],
    phase: "brewing",
  };
}

function gatherState(state: BoilingOverGameState): BoilingOverGameState {
  return {
    ...createInitialState(),
    deck: shuffle(flipAllToBack(collectCards(state))),
    market: MARKET_SUITS.map(() => []),
  };
}

const gameStateInitial = createInitialState();

// ========== Hints ========== //
/**
 * What a coin is worth in points: it buys a card that brews again in every
 * round left (about half the time, before the potion stops or boils over).
 */
function coinWorth(state: BoilingOverGameState) {
  return 0.45 * (ROUNDS - state.round);
}

/** Coins beyond the two dearest cards (of different suits) on sale buy nothing. */
function usefulCoins(state: BoilingOverGameState, coins: number) {
  const dearest = state.market
    .map((row) => Math.max(0, ...row.map(costOf)))
    .sort((a, b) => b - a);
  return Math.min(coins, (dearest[0] ?? 0) + (dearest[1] ?? 0));
}

/** Stopping: the points now, and what the coins will bring. */
function stopWorth(state: BoilingOverGameState, cauldron: PlayingCard[]) {
  const strength = strengthOf(cauldron);
  if (isFinalRound(state)) return strength;
  return strength + coinWorth(state) * usefulCoins(state, coinsFor(cauldron));
}

/** Boiled over: the better of the points and the coins. */
function boiledOverWorth(state: BoilingOverGameState, cauldron: PlayingCard[]) {
  const strength = strengthOf(cauldron);
  if (isFinalRound(state)) return strength;
  return Math.max(
    strength,
    coinWorth(state) * usefulCoins(state, coinsFor(cauldron)),
  );
}

/** Cards that brew alike, so the look ahead weighs each kind once. */
function brewKind(card: PlayingCard) {
  return isDud(card)
    ? `dud-${rankValue(card)}`
    : `${card.suit}-${rankValue(card)}`;
}

/**
 * What the potion is worth played on well from here, stopping or adding a
 * card, a few cards ahead. The player knows the cards in their own deck,
 * though not their order: each draw weighs every card it may be.
 */
function brewWorth(
  state: BoilingOverGameState,
  cauldron: PlayingCard[],
  unseen: PlayingCard[],
  next: PlayingCard | null,
  depth: number,
): { worth: number; draw: boolean } {
  const stop = cauldron.length > 0 ? stopWorth(state, cauldron) : -Infinity;
  if (depth === 0 || unseen.length === 0) return { worth: stop, draw: false };
  const draw = next
    ? drawWorth(state, cauldron, unseen, next, depth)
    : averageOver(unseen, (card) =>
        drawWorth(state, cauldron, unseen, card, depth),
      );
  return draw > stop
    ? { worth: draw, draw: true }
    : { worth: stop, draw: false };
}

/** The average of a worth over these cards, each kind worked out once. */
function averageOver(
  cards: PlayingCard[],
  worth: (card: PlayingCard) => number,
) {
  const kinds = new Map<string, { card: PlayingCard; count: number }>();
  for (const card of cards) {
    const kind = kinds.get(brewKind(card));
    if (kind) kind.count += 1;
    else kinds.set(brewKind(card), { card, count: 1 });
  }
  let total = 0;
  kinds.forEach(({ card, count }) => {
    total += count * worth(card);
  });
  return total / cards.length;
}

function drawWorth(
  state: BoilingOverGameState,
  cauldron: PlayingCard[],
  unseen: PlayingCard[],
  card: PlayingCard,
  depth: number,
): number {
  const rest = unseen.filter((other) => other !== card);
  const potion = [...cauldron, card];
  if (isDud(card)) {
    return dudTotal(potion) > dudLimit(potion)
      ? boiledOverWorth(state, potion)
      : brewWorth(state, potion, rest, null, depth - 1).worth;
  }
  if (card.suit === "spades" && rest.length > 0) {
    // The next card shows: a dud is skipped, anything else is known.
    return averageOver(rest, (shown) =>
      isDud(shown) && rest.length > 1
        ? brewWorth(
            state,
            potion,
            rest.filter((other) => other !== shown),
            null,
            depth - 1,
          ).worth
        : brewWorth(state, potion, rest, shown, depth - 1).worth,
    );
  }
  return brewWorth(state, potion, rest, null, depth - 1).worth;
}

/**
 * How well a card brews: its value, and its effect. A diamond's coins count
 * while markets are left to spend them in.
 */
function cardWorth(state: BoilingOverGameState, card: PlayingCard) {
  const value = rankValue(card);
  switch (card.suit) {
    case "diamonds":
      return value + (value / 2) * Math.min(1, (ROUNDS - 1 - state.round) / 3);
    case "clubs":
      return value + 3;
    case "spades":
      return value + 2;
    default:
      return value;
  }
}

/**
 * The card to buy: of the best one or two (of different suits) the coins
 * can buy, the dearer. Buying never hurts: every card dilutes the duds.
 */
function bestBuy(state: BoilingOverGameState) {
  const options = state.market.flatMap((row) =>
    row.filter((card) => canBuy(state, card)),
  );
  let best: { card: PlayingCard; worth: number } | null = null;
  for (const card of options) {
    let worth = cardWorth(state, card);
    if (state.bought.length + 1 < MAX_BUYS) {
      const left = state.coins - costOf(card);
      const seconds = options.filter(
        (other) => other.suit !== card.suit && costOf(other) <= left,
      );
      worth += Math.max(0, ...seconds.map((other) => cardWorth(state, other)));
    }
    if (
      !best ||
      worth > best.worth ||
      (worth === best.worth && costOf(card) > costOf(best.card))
    ) {
      best = { card, worth };
    }
  }
  return best?.card ?? null;
}

const BUY_NOTES = {
  hearts: "games:boilingOver.hint.buyHearts",
  diamonds: "games:boilingOver.hint.buyDiamonds",
  clubs: "games:boilingOver.hint.buyClubs",
  spades: "games:boilingOver.hint.buySpades",
} as const satisfies Record<CardSuit, string>;

const LOOK_AHEAD = 3;

function findBoilingOverHint(state: BoilingOverGameState) {
  if (state.phase === "brewing") {
    const top = state.deck[state.deck.length - 1];
    const stop = pressHint("controls", i18n.t("games:boilingOver.stop"));
    if (!top) return state.cauldron.length > 0 ? stop : null;
    const { draw } = brewWorth(
      state,
      state.cauldron,
      state.deck,
      top.faceUp ? top : null,
      LOOK_AHEAD,
    );
    if (draw) return makeHint("draw", zoneTarget("deck"));
    const risk = Math.round(bustChance(state) * 100);
    return risk > 0
      ? withNote(stop, i18n.t("games:boilingOver.hint.stop", { risk }))
      : stop;
  }
  if (state.phase === "boiledOver") {
    const strength = strengthOf(state.cauldron);
    const coins = coinsFor(state.cauldron);
    const keepCoins = coinWorth(state) * usefulCoins(state, coins) > strength;
    return withNote(
      pressHint(
        "controls",
        keepCoins
          ? i18n.t("games:boilingOver.keepCoins", { value: coins })
          : i18n.t("games:boilingOver.keepPoints", { value: strength }),
      ),
      i18n.t(
        keepCoins
          ? "games:boilingOver.hint.keepCoins"
          : "games:boilingOver.hint.keepPoints",
      ),
    );
  }
  if (state.phase === "market") {
    const buy = bestBuy(state);
    if (buy) {
      return withNote(
        makeHint("tapCard", cardTarget(buy)),
        i18n.t(BUY_NOTES[buy.suit]),
      );
    }
    return pressHint(
      "controls",
      i18n.t("games:boilingOver.continueToRound", { round: state.round + 1 }),
    );
  }
  return null;
}

export const boilingOverRules = {
  findHint: findBoilingOverHint,
  bestBuy,
  ROUNDS,
  DUD_LIMIT,
  WIN_SCORE,
  MARKET_SUITS,
  SURCHARGE,
  isDud,
  dudTotal,
  dudLimit,
  strengthOf,
  coinsFor,
  costOf,
  bustChance,
  drawCard,
  skipShownDud,
  stopBrewing,
  keepAfterBoilOver,
  canBuy,
  buyCard,
  startNextRound,
  createInitialState,
};

// ========== Layout ========== //
// While brewing, the market is gathered into a pile per suit, leaving the
// cauldron room; at the market the piles spread into rows, over the cauldron
// (its cards are back in the deck by then). Both layouts are the same size.
const GAP = 0.15;
const COLS = 7;
const PAD = 0.1;
const HUD_ROW = 0;
const TOP_ROW = 0.55;
// Brewing: the piles and their labels, then the cauldron.
const PILE_ROW = TOP_ROW + PAD;
const PILE_SPACING = COLS / MARKET_SUITS.length;
const PILE_LABEL_ROW = PILE_ROW + 1.02;
const PILE_LABEL_HEIGHT = 0.42;
const PILES_AREA_HEIGHT = PILE_LABEL_ROW + PILE_LABEL_HEIGHT + PAD - TOP_ROW;
const CAULDRON_AREA_ROW = TOP_ROW + PILES_AREA_HEIGHT + 0.1;
const POTION_ROW = CAULDRON_AREA_ROW + PAD;
const DUDS_ROW = POTION_ROW + 1.1;
const DUDS_WIDTH = 3.4;
const STATS_ROW = DUDS_ROW + 1.05;
const STATS_HEIGHT = 0.5;
const CAULDRON_AREA_HEIGHT = STATS_ROW + STATS_HEIGHT + PAD - CAULDRON_AREA_ROW;
const INNER_COL = PAD * 2;
const INNER_WIDTH = COLS - INNER_COL * 2;
// The market: a row per suit, with its label.
const LABEL_WIDTH = 2.2;
const MARKET_ROW = TOP_ROW + PAD;
const MARKET_AREA_HEIGHT = MARKET_SUITS.length + PAD * 2;
const DECK_ROW = CAULDRON_AREA_ROW + CAULDRON_AREA_HEIGHT + 0.1;
const STATUS_ROW = TOP_ROW + MARKET_AREA_HEIGHT;
const DECK_COL = 1;

function pileCol(i: number) {
  return PILE_SPACING * i + (PILE_SPACING - 1) / 2 - 0.15;
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={[flexStyles.rowCentered, { gap: 8 }]}>
      <Text size="sm" weight={300} color={rgba(color, 0.7)} numberOfLines={1}>
        {label}
      </Text>
      <Text size="lg" weight={700} color={color} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

// ========== Component ========== //
export default function BoilingOver() {
  const { colorPale, colorDark } = useGameColors();
  const { spacing } = useResponsiveMetrics();
  const showToast = useToast();
  // While a spade's dud shows, before it goes under the deck.
  const [isSkipping, setIsSkipping] = useState(false);

  const {
    isLoaded,
    game,
    setGame,
    reset,
    undo,
    canUndo,
    saveUndoState,
    clearUndoHistory,
  } = useStateManager<BoilingOverGameState>({
    gameStateInitial,
    resetAndSetup: async () => {
      // Gather every card into the deck, then lay out the market again.
      setGame((draft) => gatherState(draft));
      await delay();
      setGame((draft) => redealWith(createInitialState(), draft.deck));
    },
    resetNonGameStates: () => setIsSkipping(false),
  });

  const ended = game.phase === "over";
  const won = ended && game.score >= WIN_SCORE;
  const brewingLayout = game.phase !== "market";
  const duds = dudTotal(game.cauldron);
  const limit = dudLimit(game.cauldron);
  const strength = strengthOf(game.cauldron);
  const coins = coinsFor(game.cauldron);
  const risk = useMemo(() => bustChance(game), [game]);

  useHint(() => findBoilingOverHint(game), {
    game,
    enabled: !isSkipping,
  });

  function update(change: (draft: BoilingOverGameState) => void) {
    setGame(produce(game, change));
  }

  async function onDraw() {
    if (isSkipping || game.phase !== "brewing" || game.deck.length === 0) {
      return;
    }
    let result: DrawResult | null = null;
    // A dud a spade turns up shows for a moment before it goes under.
    const drawn = produce(game, (draft) => {
      result = drawCard(draft, false);
    });
    setGame(drawn);
    if (result === "dudSkipped") {
      setIsSkipping(true);
      showToast(i18n.t("games:boilingOver.dudSkipped"));
      await delay(700);
      setGame(
        produce(drawn, (draft) => {
          skipShownDud(draft);
        }),
      );
      setIsSkipping(false);
    }
  }

  function onStop() {
    if (isSkipping) return;
    update((draft) => {
      stopBrewing(draft);
    });
  }

  function onKeep(choice: "points" | "coins") {
    update((draft) => {
      keepAfterBoilOver(draft, choice);
    });
  }

  function onBuy(row: number, index: number) {
    const card = game.market[row][index];
    if (!card || !canBuy(game, card)) return;
    saveUndoState(structuredClone(game));
    update((draft) => {
      buyCard(draft, row, index);
    });
  }

  function onNextRound() {
    // Purchases can't be taken back once the new round is under way.
    clearUndoHistory();
    update((draft) => {
      startNextRound(draft);
    });
  }

  // ========== Card Mapping ========== //
  const zones: MapZone[] = useMemo(() => {
    const marketZones: MapZone[] = game.market.flatMap((cards, i) =>
      brewingLayout
        ? [
            {
              id: `marketLabel-${i}`,
              col: pileCol(i) - (PILE_SPACING - 1) / 2 + 0.15,
              row: PILE_LABEL_ROW,
              width: PILE_SPACING,
              height: PILE_LABEL_HEIGHT,
            },
            {
              id: `market-${i}`,
              name: "market",
              pileIndex: i,
              cards,
              col: pileCol(i),
              row: PILE_ROW,
              baseZIndex: 10,
              fan: { direction: "right", offset: 0.03, center: false },
              placeholder: { showCount: false },
            },
          ]
        : [
            {
              id: `marketLabel-${i}`,
              col: PAD,
              row: MARKET_ROW + i,
              width: LABEL_WIDTH,
              height: 1,
            },
            {
              id: `market-${i}`,
              name: "market",
              pileIndex: i,
              cards,
              col: LABEL_WIDTH,
              row: MARKET_ROW + i,
              baseZIndex: 10,
              fan: { direction: "right", offset: 0.4, center: false },
              placeholder: { showCount: false },
            },
          ],
    );

    const potion = game.cauldron.filter((card) => !isDud(card));
    const dudCards = game.cauldron.filter(isDud);

    return [
      {
        id: "hudBars",
        col: 0,
        row: HUD_ROW,
        width: "full",
        height: 0.45,
      },
      brewingLayout
        ? {
            id: "marketArea",
            col: 0,
            row: TOP_ROW,
            width: COLS,
            height: PILES_AREA_HEIGHT,
          }
        : {
            id: "marketArea",
            col: 0,
            row: TOP_ROW,
            width: COLS,
            height: MARKET_AREA_HEIGHT,
          },
      {
        id: "cauldronArea",
        col: 0,
        row: CAULDRON_AREA_ROW,
        width: COLS,
        height: CAULDRON_AREA_HEIGHT,
      },
      {
        id: "potion",
        name: "cauldron",
        cards: potion,
        col: INNER_COL,
        row: POTION_ROW,
        width: INNER_WIDTH,
        baseZIndex: 10,
        fan: {
          direction: "right",
          offset: zoneFanOffset(potion.length, INNER_WIDTH, 0.15, 0.7),
          center: false,
        },
      },
      {
        id: "duds",
        name: "cauldron",
        cards: dudCards,
        col: INNER_COL,
        row: DUDS_ROW,
        width: DUDS_WIDTH,
        baseZIndex: 10,
        fan: {
          direction: "right",
          offset: zoneFanOffset(dudCards.length, DUDS_WIDTH, 0.2, 0.7),
          center: false,
        },
      },
      {
        id: "meters",
        col: INNER_COL + DUDS_WIDTH + 0.2,
        row: DUDS_ROW,
        width: INNER_WIDTH - DUDS_WIDTH - 0.2,
        height: 1,
      },
      {
        id: "stats",
        col: INNER_COL,
        row: STATS_ROW,
        width: INNER_WIDTH,
        height: STATS_HEIGHT,
      },
      {
        id: "status",
        col: 0,
        row: STATUS_ROW,
        width: COLS,
        height: DECK_ROW - STATUS_ROW - 0.05,
      },
      ...marketZones,
      {
        id: "deck",
        name: "deck",
        cards: game.deck,
        col: 0,
        row: DECK_ROW,
        baseZIndex: 10,
        fan: { maxVisible: 3 },
        placeholder: {},
      },
      {
        id: "controls",
        col: DECK_COL + GAP * 2,
        row: DECK_ROW,
        width: COLS - 1 - GAP * 2,
        height: 1,
      },
    ];
  }, [game, brewingLayout]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    const { zoneName, pileIndex, cardIndex, card, topOfZone } = mappedCard;

    if (zoneName === "deck") {
      const canDraw = game.phase === "brewing" && topOfZone && !isSkipping;
      return {
        onPress: canDraw ? onDraw : undefined,
        isDisabled: !canDraw,
        selectColor: canDraw ? "blue" : "none",
      };
    }

    if (zoneName === "cauldron") {
      return isDud(card)
        ? { isDisabled: true, selectColor: "orange", forceOverlayColor: true }
        : { isDisabled: true };
    }

    if (zoneName === "market" && pileIndex !== undefined) {
      if (brewingLayout) return { isDisabled: true };
      const affordable = canBuy(game, card);
      return {
        onPress: affordable ? () => onBuy(pileIndex, cardIndex) : undefined,
        isDisabled: !affordable,
        selectColor: affordable ? "green" : "grey",
        forceOverlayColor: !affordable,
      };
    }

    return { isDisabled: true };
  };

  const { cardMap, cardWidth, cardHeight, getZoneStylesById } = useCardMap({
    game,
    zones,
    gap: GAP,
    cardSize: "small",
    cardMapper,
  });

  const tier = getTier(game.score);
  const isFinal = game.round >= ROUNDS;
  const effectText = (suit: CardSuit) =>
    i18n.t(`games:boilingOver.effect_${suit}`);
  const costText = (suit: CardSuit) =>
    SURCHARGE[suit] === 0
      ? i18n.t("games:boilingOver.costValue")
      : i18n.t("games:boilingOver.costValuePlus", { extra: SURCHARGE[suit] });

  return (
    <GameWrapper
      outcome={!ended ? "playing" : won ? "won" : "lost"}
      reset={() => void reset()}
      isLoaded={isLoaded}
      score={game.score}
      hideScore
      winLoseMessage={
        won && tier
          ? i18n.t("games:boilingOver.wonWithTier", {
              score: game.score,
              tier: i18n.t(tier.key),
            })
          : i18n.t("games:boilingOver.lostShortOfTarget", {
              score: game.score,
              target: WIN_SCORE,
            })
      }
      canUndo={canUndo && game.phase === "market"}
      undo={undo}
    >
      {cardMap}

      <View
        style={[
          pointerEventsStyles.none,
          getUnderlayStyle(cardWidth, colorDark, colorPale),
          getZoneStylesById("marketArea"),
        ]}
      />

      {MARKET_SUITS.map((suit, i) => (
        <View
          key={`marketLabel-${suit}`}
          style={[
            pointerEventsStyles.none,
            getZoneStylesById(`marketLabel-${i}`),
            brewingLayout
              ? [flexStyles.rowCentered, { gap: spacing(3) }]
              : [
                  flexStyles.colCentered,
                  {
                    alignItems: "flex-start",
                    paddingLeft: spacing(8),
                    gap: spacing(2),
                  },
                ],
            {
              zIndex: 2,
              opacity: game.bought.includes(suit) ? 0.4 : 1,
            },
          ]}
        >
          <Icon
            name={suit}
            size={cardWidth * (brewingLayout ? 0.2 : 0.34)}
            color={isRed(suit) ? Colors.suitsRed : colorPale}
          />
          <Text
            size={brewingLayout ? "xxs" : "xs"}
            weight={500}
            color={colorPale}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {effectText(suit)}
          </Text>
          {!brewingLayout && (
            <Text size="xs" weight={300} color={rgba(colorPale, 0.7)}>
              {costText(suit)}
            </Text>
          )}
        </View>
      ))}

      {brewingLayout && (
        <View
          style={[
            pointerEventsStyles.none,
            getUnderlayStyle(cardWidth, colorDark, colorPale),
            getZoneStylesById("cauldronArea"),
          ]}
        />
      )}

      {brewingLayout && (
        <View
          style={[
            pointerEventsStyles.none,
            getZoneStylesById("meters"),
            flexStyles.colCentered,
            { zIndex: 2, alignItems: "stretch", gap: spacing(4) },
          ]}
        >
          <ProgressBar
            progressValue={Math.min(duds, limit)}
            totalValue={limit}
            color="orange"
            backgroundColor={rgba(colorDark, 0.7)}
            labelText={i18n.t("games:boilingOver.dudsLabel")}
            tallyText={`${duds} / ${limit}`}
            scaledHeight={cardHeight * 0.36}
          />
          <ProgressBar
            progressValue={Math.round(risk * 100)}
            totalValue={100}
            color="red"
            backgroundColor={rgba(colorDark, 0.7)}
            labelText={i18n.t("games:boilingOver.bustLabel")}
            tallyText={`${Math.round(risk * 100)}%`}
            scaledHeight={cardHeight * 0.36}
          />
        </View>
      )}

      {brewingLayout && (
        <View
          style={[
            pointerEventsStyles.none,
            getZoneStylesById("stats"),
            flexStyles.rowCentered,
            { zIndex: 2, justifyContent: "space-around" },
          ]}
        >
          <Stat
            label={i18n.t("games:boilingOver.pointsLabel")}
            value={`${strength}`}
            color={colorPale}
          />
          {!isFinal && (
            <Stat
              label={i18n.t("games:boilingOver.coinsLabel")}
              value={`${coins}`}
              color={colorPale}
            />
          )}
        </View>
      )}

      {game.phase === "market" && (
        <View
          style={[
            pointerEventsStyles.none,
            getZoneStylesById("status"),
            flexStyles.rowCentered,
          ]}
        >
          <Text
            size="sm"
            weight={500}
            color={colorPale}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
            style={{ flex: 1, textAlign: "center" }}
          >
            {i18n.t("games:boilingOver.statusMarket", {
              coins: game.coins,
              buys: MAX_BUYS - game.bought.length,
            })}
          </Text>
        </View>
      )}

      {!ended && (
        <View
          style={[
            getZoneStylesById("controls"),
            flexStyles.rowCentered,
            { gap: cardWidth * 0.15 },
          ]}
        >
          {game.phase === "brewing" && (
            <>
              <Button
                text={i18n.t("games:boilingOver.stop")}
                theme="blue"
                size="sm"
                onPress={onStop}
                disabled={game.cauldron.length === 0 || isSkipping}
                taller
              />
              <Button
                text={i18n.t("games:boilingOver.addCard")}
                theme="green"
                size="sm"
                onPress={() => void onDraw()}
                disabled={game.deck.length === 0 || isSkipping}
                style={{ flex: 1 }}
                taller
              />
            </>
          )}
          {game.phase === "boiledOver" && (
            <>
              <Button
                text={i18n.t("games:boilingOver.keepPoints", {
                  value: strength,
                })}
                theme="orange"
                size="sm"
                onPress={() => onKeep("points")}
                style={{ flex: 1 }}
                taller
              />
              <Button
                text={i18n.t("games:boilingOver.keepCoins", { value: coins })}
                theme="blue"
                size="sm"
                onPress={() => onKeep("coins")}
                style={{ flex: 1 }}
                taller
              />
            </>
          )}
          {game.phase === "market" && (
            <Button
              text={i18n.t("games:boilingOver.continueToRound", {
                round: game.round + 1,
              })}
              theme="green"
              size="sm"
              onPress={onNextRound}
              style={{ flex: 1 }}
              taller
            />
          )}
        </View>
      )}

      <View
        style={[
          pointerEventsStyles.none,
          getZoneStylesById("hudBars"),
          flexStyles.rowCentered,
          { justifyContent: "space-between", gap: cardHeight * 0.15 },
        ]}
      >
        <View
          style={[
            flexStyles.rowCentered,
            {
              alignItems: "center",
              justifyContent: "space-between",
              minWidth: cardWidth * 2,
              paddingHorizontal: spacing(4),
            },
          ]}
        >
          <Text size="sm" weight={400} color={colorPale} numberOfLines={1}>
            {i18n.t("games:boilingOver.roundCounter")}
          </Text>
          <Text size="sm" weight={700} color={colorPale} numberOfLines={1}>
            {`${game.round} / ${ROUNDS}`}
          </Text>
        </View>

        <ProgressBar
          progressValue={game.score}
          // What stopping now would add.
          previewProgressValue={
            game.phase === "brewing" ? game.score + strength : undefined
          }
          totalValue={WIN_SCORE}
          color="blue"
          backgroundColor={rgba(colorDark, 0.7)}
          labelText={i18n.t("games:boilingOver.score")}
          tallyText={`${game.score} / ${WIN_SCORE}`}
          scaledHeight={cardHeight * 0.42}
          style={{ flex: 1 }}
        />
      </View>
    </GameWrapper>
  );
}
