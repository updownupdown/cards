import { useGameColors } from "@/hooks/useGameColors";
import { useGameSettingValue } from "@/hooks/useGameSettingValue";
import { useStateManager } from "@/hooks/useStateManager";
import { makeHint, withNote, zoneTarget } from "@/hints/hint";
import { useHint } from "@/hints/hint-store";
import { seededRandom, shuffledWith } from "@/hints/random";
import { i18n } from "@/i18n";
import { delay } from "@/utils/utils";
import { useEffect, useMemo } from "react";
import { View } from "react-native";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import {
  cardDims,
  collectCards,
  createDeck,
  flipAllToBack,
  flipToFace,
  rankValue,
  redealWith,
  shuffle,
  suitValue,
  top,
  zoneFanOffset,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { ProgressBar } from "../Home/ProgressBar";
import { rgba } from "@/styles/styles";

// The whole stock is placed, one card at a time, on piles of the player's
// choosing; Aces go straight to the foundations. Only then are the piles
// unpacked onto the foundations. The order of that unpacking can't matter (a
// card that can be built stays buildable until it is), so it plays itself:
// the game is won or lost in the placing.
const PILES_BY_DIFFICULTY = { easy: 9, medium: 8, hard: 7 } as const;
/** Board width in cards: eight, or one more for Easy's ninth pile. */
const MIN_BOARD_COLS = 8;
const BUILD_INTERVAL = 150;
const FOUNDATION_COUNT = 4;
const DECK_SIZE = 52;
const BOARD_GAP = 0.12;
/** The bar across the top that drains with the stock, in card heights. */
const BAR_HEIGHT = 0.12;
const TOP_ROW = BAR_HEIGHT + 0.5;
const PILE_ROW = TOP_ROW + 1.4;
/** The most a pile may fan down before its cards close up to fit. */
const PILE_SPAN = 3.4;
/** The foundations end one column short of the board's right edge. */
const FOUNDATIONS_FROM_RIGHT = 5;
const BOARD_ROWS = PILE_ROW + 1 + PILE_SPAN;

export type MachinationGameState = {
  /** Face down; the top card is turned as it comes into play. */
  stock: PlayingCard[];
  piles: PlayingCard[][];
  /** In the order the Aces appeared. */
  foundations: PlayingCard[][];
};

// ========== Rules ========== //
/** The stock card in play: the top one, once turned. */
function turnedCard(state: MachinationGameState) {
  const card = top(state.stock);
  return card?.faceUp ? card : undefined;
}

function isPlacing(state: MachinationGameState) {
  return state.stock.length > 0;
}

/** Where a suit builds: the foundation its Ace started, or an empty one. */
function foundationFor(state: MachinationGameState, card: PlayingCard) {
  const own = state.foundations.findIndex(
    (pile) => pile[0]?.suit === card.suit,
  );
  if (own >= 0) return own;
  return state.foundations.findIndex((pile) => pile.length === 0);
}

/** A card builds when it is the next rank of its suit; an Ace starts a suit. */
function canBuild(state: MachinationGameState, card: PlayingCard | undefined) {
  if (!card) return false;
  const index = foundationFor(state, card);
  if (index < 0) return false;
  const pileTop = top(state.foundations[index]);
  return pileTop
    ? rankValue(card) === rankValue(pileTop) + 1
    : card.rank === "A";
}

/** Turns the top stock card; an Ace goes straight to a foundation. */
function turnStockCard(state: MachinationGameState) {
  const card = top(state.stock);
  if (!card || card.faceUp) return false;
  if (card.rank === "A") {
    state.stock.pop();
    state.foundations[foundationFor(state, card)].push(flipToFace(card));
  } else {
    state.stock[state.stock.length - 1] = flipToFace(card);
  }
  return true;
}

/** Places the turned stock card on a pile. */
function placeCard(state: MachinationGameState, pileIndex: number) {
  const card = turnedCard(state);
  if (!card) return false;
  state.stock.pop();
  state.piles[pileIndex].push(card);
  return true;
}

/** Builds a pile's top card onto its foundation, once the stock is empty. */
function buildCard(state: MachinationGameState, pileIndex: number) {
  const card = top(state.piles[pileIndex]);
  if (isPlacing(state) || !canBuild(state, card)) return false;
  state.piles[pileIndex].pop();
  state.foundations[foundationFor(state, card!)].push(card!);
  return true;
}

function isWon(state: MachinationGameState) {
  return (
    state.foundations.reduce((sum, pile) => sum + pile.length, 0) === DECK_SIZE
  );
}

function isLost(state: MachinationGameState) {
  return (
    !isPlacing(state) &&
    !isWon(state) &&
    !state.piles.some((pile) => canBuild(state, top(pile)))
  );
}

// ========== Hints ========== //
// The piles come off in an order fixed by two rules: a card comes off before
// the card under it, and a suit builds up one rank at a time. Placing a card
// adds one more "comes off before", from it to the pile's top card. If that
// top card must already come off before it, the two wait for each other and
// the game is lost; otherwise the new rule may only delay the top card.
/** How many guesses at the order of the cards still to come each pile gets. */
const HINT_PLAYOUTS = 24;
const DEADLOCK = 1000;
/** Weights of a quick player's costs, in steps of "comes off later". */
// Tuned on random deals: a small delay is cheap (the card under often isn't
// needed soon), wasted room on a much later card is not.
const DELAY_COST = 0.25;
const DELAY_SQUARED_COST = 0.05;
const SPARE_ROOM_COST = 0.4;
const EMPTY_PILE_BASE = 4;
const EMPTY_PILE_COST = 0.2;

/** A card as the order sees it: 13 per suit, Ace to King. */
const orderIndex = (card: PlayingCard) =>
  (suitValue(card) - 1) * 13 + rankValue(card) - 1;
const NONE = -1;

/** Which card lies directly on and under each card in the piles. */
class PileOrder {
  private under = new Int8Array(DECK_SIZE).fill(NONE);
  private over = new Int8Array(DECK_SIZE).fill(NONE);
  private earliestMemo = new Int16Array(DECK_SIZE).fill(NONE);
  private seen = new Uint8Array(DECK_SIZE);

  constructor(piles: PlayingCard[][]) {
    for (const pile of piles) {
      for (let index = 1; index < pile.length; index += 1) {
        this.link(orderIndex(pile[index]), orderIndex(pile[index - 1]));
      }
    }
  }

  private link(card: number, below: number) {
    this.under[card] = below;
    this.over[below] = card;
  }

  /** Records a card placed on `below` (the pile's top card, if any). */
  place(card: PlayingCard, below: PlayingCard | undefined) {
    if (below) this.link(orderIndex(card), orderIndex(below));
    this.earliestMemo.fill(NONE);
  }

  /** Must `first` come off before `then`, whatever else happens? */
  mustPrecede(first: PlayingCard, then: PlayingCard) {
    const goal = orderIndex(then);
    this.seen.fill(0);
    const stack = [orderIndex(first)];
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (current === goal) return true;
      if (this.seen[current]) continue;
      this.seen[current] = 1;
      // The next rank of its suit, unless it is a King.
      if (current % 13 < 12) stack.push(current + 1);
      if (this.under[current] !== NONE) stack.push(this.under[current]);
    }
    return false;
  }

  /**
   * How many cards must come off, one after another, before this one can: a
   * 2 can come first; a card under others waits for them.
   */
  earliest(card: PlayingCard) {
    return this.earliestOf(orderIndex(card));
  }

  private earliestOf(index: number): number {
    const known = this.earliestMemo[index];
    if (known !== NONE) return known;
    // Cards that wait for each other (a deadlock already placed) never come
    // off: count them as coming off last.
    this.earliestMemo[index] = DECK_SIZE;
    let steps = 0;
    // Below a 2 is its Ace, already on a foundation.
    if (index % 13 > 1) steps = this.earliestOf(index - 1) + 1;
    const above = this.over[index];
    if (above !== NONE) steps = Math.max(steps, this.earliestOf(above) + 1);
    this.earliestMemo[index] = steps;
    return steps;
  }
}

/**
 * What placing `card` on a pile costs a quick player: a deadlock if the top
 * card must already come off first; else how much later the top card can
 * come off, and the room the card takes. On a card that comes off later
 * anyway, the closer the better (a 2 on a King wastes the King's room for a
 * Queen); an empty pile is best kept for a card that comes off late.
 */
function placementCost(
  order: PileOrder,
  card: PlayingCard,
  pile: PlayingCard[],
) {
  const pileTop = top(pile);
  const cardSteps = order.earliest(card);
  if (!pileTop) {
    return EMPTY_PILE_BASE + EMPTY_PILE_COST * Math.max(0, 11 - cardSteps);
  }
  if (order.mustPrecede(pileTop, card)) return DEADLOCK;
  const topSteps = order.earliest(pileTop);
  return topSteps > cardSteps
    ? SPARE_ROOM_COST * (topSteps - cardSteps - 1)
    : delayCost(cardSteps + 1 - topSteps);
}

/** A long delay costs more than its steps: a 3 under a King waits all game. */
function delayCost(steps: number) {
  return DELAY_COST * steps + DELAY_SQUARED_COST * steps * steps;
}

/** Where a quick player puts `card`: the cheapest pile, the first of ties. */
function quickPlacement(
  piles: PlayingCard[][],
  card: PlayingCard,
  order = new PileOrder(piles),
) {
  let best = 0;
  let bestCost = Infinity;
  piles.forEach((pile, index) => {
    const cost = placementCost(order, card, pile);
    if (cost < bestCost) {
      best = index;
      bestCost = cost;
    }
  });
  return best;
}

/** Do the piles all come off once the stock is empty? */
function unpacks(state: MachinationGameState) {
  const next = structuredClone(state);
  for (let index = buildablePile(next); index >= 0;) {
    buildCard(next, index);
    index = buildablePile(next);
  }
  return isWon(next);
}

/**
 * How often the game is won after placing the turned card on a pile, over a
 * few guesses at the order of the cards still to come (the stock is face
 * down, so a hint knows which cards are left, not their order), placed by
 * the quick player.
 */
function placementWins(
  state: MachinationGameState,
  pileIndex: number,
  orders: PlayingCard[][],
) {
  let wins = 0;
  for (const order of orders) {
    const next: MachinationGameState = {
      stock: [],
      piles: state.piles.map((pile) => [...pile]),
      foundations: state.foundations.map((pile) => [...pile]),
    };
    const pileOrder = new PileOrder(next.piles);
    const turned = turnedCard(state)!;
    pileOrder.place(turned, top(next.piles[pileIndex]));
    next.piles[pileIndex].push(turned);
    for (const card of order) {
      if (card.rank === "A") {
        next.foundations[foundationFor(next, card)].push(card);
        continue;
      }
      const pile = next.piles[quickPlacement(next.piles, card, pileOrder)];
      pileOrder.place(card, top(pile));
      pile.push(card);
    }
    if (unpacks(next)) wins += 1;
  }
  return wins;
}

/** The best pile for the turned card, and why. */
function bestPlacement(state: MachinationGameState) {
  const card = turnedCard(state);
  if (!card || card.rank === "A") return null;
  // Empty piles are all alike: weigh only the first.
  const firstEmpty = state.piles.findIndex((pile) => pile.length === 0);
  const candidates = state.piles.flatMap((pile, index) =>
    pile.length > 0 || index === firstEmpty ? [index] : [],
  );
  const toCome = state.stock.slice(0, -1);
  const random = seededRandom(
    JSON.stringify([state.piles, state.foundations, card.id]),
  );
  const orders = Array.from({ length: HINT_PLAYOUTS }, () =>
    shuffledWith(toCome, random),
  );
  const order = new PileOrder(state.piles);
  let best: { pile: number; wins: number; cost: number } | null = null;
  for (const pile of candidates) {
    const cost = placementCost(order, card, state.piles[pile]);
    // A deadlock now can't be won, whatever comes.
    const wins = cost >= DEADLOCK ? -1 : placementWins(state, pile, orders);
    if (!best || wins > best.wins || (wins === best.wins && cost < best.cost)) {
      best = { pile, wins, cost };
    }
  }
  if (!best) return null;
  const pileTop = top(state.piles[best.pile]);
  const reason = !pileTop
    ? ("emptyPile" as const)
    : order.earliest(pileTop) > order.earliest(card)
      ? ("comesOffFirst" as const)
      : ("leastHarm" as const);
  return { pile: best.pile, reason };
}

function findMachinationHint(state: MachinationGameState) {
  if (isWon(state) || isLost(state)) return null;
  const placement = bestPlacement(state);
  if (!placement) return null;
  return withNote(
    makeHint("moveCard", zoneTarget(`pile-${placement.pile}`)),
    i18n.t(`games:machination.hint.${placement.reason}`),
  );
}

// ========== Deal ========== //
/** The next pile top that builds, if any. */
function buildablePile(state: MachinationGameState) {
  return state.piles.findIndex((pile) => canBuild(state, top(pile)));
}

function createInitialState(
  pileCount: number = PILES_BY_DIFFICULTY.medium,
): MachinationGameState {
  return {
    stock: shuffle(createDeck()),
    piles: Array.from({ length: pileCount }, () => []),
    foundations: Array.from({ length: FOUNDATION_COUNT }, () => []),
  };
}

function gatherState(state: MachinationGameState): MachinationGameState {
  return {
    stock: shuffle(flipAllToBack(collectCards(state))),
    piles: state.piles.map(() => []),
    foundations: Array.from({ length: FOUNDATION_COUNT }, () => []),
  };
}

const gameStateInitial = createInitialState();

export const machinationRules = {
  PILES_BY_DIFFICULTY,
  buildablePile,
  turnedCard,
  isPlacing,
  foundationFor,
  canBuild,
  turnStockCard,
  placeCard,
  buildCard,
  isWon,
  isLost,
  createInitialState,
  PileOrder,
  quickPlacement,
  bestPlacement,
  findHint: findMachinationHint,
};

// ========== Component ========== //
export default function Machination() {
  const { colorAccent } = useGameColors();
  const pileCount =
    PILES_BY_DIFFICULTY[useGameSettingValue("machinationDifficulty")];

  const {
    isLoaded,
    isSettingUp,
    game,
    setGame,
    reset,
    undo,
    canUndo,
    saveUndoState,
  } = useStateManager<MachinationGameState>({
    gameStateInitial,
    resetAndSetup: async () => {
      // Gather every card into the stock, then deal the same cards afresh.
      setGame((draft) => gatherState(draft));
      await delay();
      setGame((draft) =>
        redealWith(createInitialState(pileCount), draft.stock),
      );
    },
  });

  const won = isWon(game);
  const lost = isLost(game);
  const ended = won || lost;
  const placing = isPlacing(game);
  const turned = turnedCard(game);

  // Turn the next stock card as it comes into play; an Ace needs no choice.
  useEffect(() => {
    if (isSettingUp || !placing || turned) return;
    setGame((draft) => {
      turnStockCard(draft);
    });
  }, [game, isSettingUp, placing, turned, setGame]);

  // Once the stock is empty, the piles build onto the foundations by
  // themselves, one card at a time.
  const nextBuild = placing || ended || isSettingUp ? -1 : buildablePile(game);
  useEffect(() => {
    if (nextBuild < 0) return;
    const timer = setTimeout(() => {
      setGame((draft) => {
        buildCard(draft, nextBuild);
      });
    }, BUILD_INTERVAL);
    return () => clearTimeout(timer);
  }, [game, nextBuild, setGame]);

  useHint(() => findMachinationHint(game), { game });

  function onPilePress(pileIndex: number) {
    if (ended || isSettingUp || !placing || !turned) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      placeCard(draft, pileIndex);
    });
  }

  const boardCols = Math.max(MIN_BOARD_COLS, game.piles.length);

  const zones: MapZone[] = useMemo(() => {
    const cols = Math.max(MIN_BOARD_COLS, game.piles.length);
    const foundationZones: MapZone[] = game.foundations.map((cards, i) => ({
      id: `foundation-${i}`,
      name: "foundation",
      pileIndex: i,
      cards,
      col: cols - FOUNDATIONS_FROM_RIGHT + i,
      row: TOP_ROW,
      baseZIndex: 30,
      fan: { maxVisible: 3 },
      placeholder: { iconName: "ace" },
    }));
    // Fewer piles sit in the middle of the board.
    const firstCol = (cols - game.piles.length) / 2;
    const pileZones: MapZone[] = game.piles.map((cards, i) => ({
      id: `pile-${i}`,
      name: "pile",
      pileIndex: i,
      cards,
      col: firstCol + i,
      row: PILE_ROW,
      baseZIndex: 10,
      fan: {
        direction: "down",
        offset: zoneFanOffset(
          cards.length,
          PILE_SPAN + 1,
          0.1,
          cardDims.tableauOffset,
        ),
      },
      placeholder: {},
    }));
    return [
      {
        id: "stock-bar",
        col: 0,
        row: 0,
        width: "full",
        height: BAR_HEIGHT,
        baseZIndex: 1,
      },
      // The bar above says how many cards are left, so the stock needs no label.
      {
        id: "stock",
        name: "stock",
        cards: game.stock,
        col: 0,
        row: TOP_ROW,
        baseZIndex: 50,
        fan: { maxVisible: 3 },
        placeholder: {
          text: i18n.t("cards:stock"),
          infoPos: "right",
        },
      },
      ...foundationZones,
      ...pileZones,
    ];
  }, [game]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    const index = mappedCard.pileIndex;
    if (mappedCard.zoneName !== "pile" || index === undefined) {
      return { isDisabled: true };
    }
    // While placing, a whole pile takes the turned card; every pile does, so
    // none is marked.
    const canPlay = placing && turned !== undefined;
    return {
      onPress: () => onPilePress(index),
      isDisabled: ended || !canPlay,
    };
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    const index = zone.pileIndex;
    if (zone.name !== "pile" || index === undefined) return;
    const canPlay = placing && turned !== undefined;
    return {
      onPress: () => onPilePress(index),
      isDisabled: ended || !canPlay,
    };
  };

  const { cardMap, cardHeight, getZoneStylesById } = useCardMap({
    game,
    zones,
    gap: BOARD_GAP,
    cardMapper,
    zoneMapper,
    cardSize: "tableau",
    fixedCols: boardCols,
    fixedRows: BOARD_ROWS,
  });

  return (
    <GameWrapper
      outcome={won ? "won" : lost ? "lost" : "playing"}
      reset={() => void reset()}
      isLoaded={isLoaded}
      hideScore
      canUndo={canUndo}
      undo={undo}
      winLoseMessage={
        won
          ? i18n.t("games:machination.allBuilt")
          : i18n.t("games:machination.stuck", {
              value: game.piles.reduce((sum, pile) => sum + pile.length, 0),
            })
      }
    >
      {cardMap}

      {/* Cards still to place */}
      <View style={getZoneStylesById("stock-bar")}>
        <ProgressBar
          totalValue={DECK_SIZE}
          progressValue={game.stock.length}
          color={colorAccent}
          scaledHeight={cardHeight * BAR_HEIGHT}
          backgroundColor={rgba(colorAccent, 0.2)}
        />
      </View>
    </GameWrapper>
  );
}
