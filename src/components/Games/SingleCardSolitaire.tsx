import { useStateManager } from "@/hooks/useStateManager";
import { useAutoComplete } from "@/hooks/useAutoComplete";
import {
  CardHitArea,
  createRect,
  DropHitArea,
  useDragDrop,
} from "@/hooks/useDragDrop";
import { DragGhostCards, DragHandle } from "@/components/Cards/DragDrop";
import { useViewportDimensions } from "@/hooks/useViewportDimensions";
import { delay, DOUBLE_TAP_MS } from "@/utils/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { pointerEventsStyles } from "@/styles/pointerEventsStyles";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import {
  cardDims,
  createDeck,
  flipToBack,
  flipToFace,
  isRed,
  RANK_VALUE,
  rankValue,
  shuffle,
  top,
  zoneFanOffset,
  type CardRank,
  type PlayingCard,
} from "../Cards/card-utils";
import {
  EXHAUSTED_PILE_PLACEHOLDER,
  MappedCard,
  MapZone,
  useCardMap,
} from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";

import { i18n } from "@/i18n";
import { useHint } from "@/hints/hint-store";
import { findClassicHint, type ClassicSource } from "@/hints/classic";
import { cardTarget, makeHint } from "@/hints/hint";

/**
 * Patiences where every move is a single card: the top of a tableau pile, the
 * waste or a reserve goes to a foundation or onto a tableau pile.
 */
export type SingleCardVariant =
  | "terrace"
  | "generals-patience"
  | "blondes-and-brunettes"
  | "falling-star"
  | "little-windmill"
  | "bristol";

type Config = {
  decks: 1 | 2;
  foundations: number;
  /**
   * The foundations' starting rank: always Ace, with one taken out of the
   * stock to start the first foundation ("ace-out") or none ("ace"); the card
   * the player picks from the first four dealt ("choose"); or the first card
   * dealt ("dealt").
   */
  base: "ace" | "ace-out" | "choose" | "dealt";
  foundationBuild: "suit" | "alternating" | "any";
  tableau: {
    count: number;
    /** Cards dealt to each pile at the start. */
    size: number;
    layout: "columns" | "cross" | "fans";
    kingsToBottom?: boolean;
  };
  tableauBuild: "alternating" | "any";
  /**
   * "cyclic": a King may go on an Ace. "base": ranks run round from the
   * foundation base, so only the card just below the base goes on the base's
   * neighbour. "none": Kings are high.
   */
  tableauWrap: "none" | "cyclic" | "base";
  /**
   * What fills an empty pile: any card, nothing, or only the waste or stock
   * (in which case the stock deals straight into the gap).
   */
  empty: "any" | "blocked" | "waste-or-stock";
  /**
   * A terrace: one overlapping row whose exposed card only goes to the
   * foundations. Piles: the stock deals a card onto each of them.
   */
  reserve?:
    | { kind: "terrace"; size: number }
    | { kind: "piles"; count: number };
  /** Times the waste may be turned over to go through the stock again. */
  redeals?: number;
};

const CONFIGS: Record<SingleCardVariant, Config> = {
  terrace: {
    decks: 2,
    foundations: 8,
    base: "choose",
    foundationBuild: "alternating",
    tableau: { count: 9, size: 1, layout: "columns" },
    tableauBuild: "alternating",
    tableauWrap: "cyclic",
    empty: "waste-or-stock",
    reserve: { kind: "terrace", size: 11 },
  },
  "generals-patience": {
    decks: 2,
    foundations: 8,
    base: "choose",
    foundationBuild: "suit",
    tableau: { count: 9, size: 1, layout: "columns" },
    tableauBuild: "alternating",
    tableauWrap: "cyclic",
    empty: "waste-or-stock",
    reserve: { kind: "terrace", size: 13 },
  },
  "blondes-and-brunettes": {
    decks: 2,
    foundations: 8,
    base: "dealt",
    foundationBuild: "alternating",
    tableau: { count: 9, size: 1, layout: "columns" },
    tableauBuild: "alternating",
    tableauWrap: "cyclic",
    empty: "waste-or-stock",
    reserve: { kind: "terrace", size: 10 },
  },
  "falling-star": {
    decks: 2,
    foundations: 8,
    base: "dealt",
    foundationBuild: "alternating",
    tableau: { count: 8, size: 1, layout: "columns" },
    tableauBuild: "alternating",
    tableauWrap: "cyclic",
    empty: "waste-or-stock",
    reserve: { kind: "terrace", size: 11 },
  },
  "little-windmill": {
    decks: 1,
    foundations: 4,
    base: "ace-out",
    foundationBuild: "suit",
    tableau: { count: 5, size: 1, layout: "cross" },
    tableauBuild: "any",
    tableauWrap: "none",
    empty: "any",
  },
  bristol: {
    decks: 1,
    foundations: 4,
    base: "ace",
    foundationBuild: "any",
    tableau: { count: 8, size: 3, layout: "fans", kingsToBottom: true },
    tableauBuild: "any",
    tableauWrap: "none",
    empty: "blocked",
    reserve: { kind: "piles", count: 3 },
  },
};

/** How many cards the player picks the foundation base from. */
const BASE_CHOICES = 4;

export type SingleCardState = {
  tableau: PlayingCard[][];
  reserves: PlayingCard[][];
  stock: PlayingCard[];
  waste: PlayingCard[];
  foundations: PlayingCard[][];
  /** The rank every foundation starts from; null while the player picks it. */
  baseRank: CardRank | null;
  /** Times the waste has been turned over; absent in older saved games. */
  redealsUsed?: number;
  ended: boolean;
  won: boolean;
};

type Selection =
  | { zone: "tableau"; pile: number }
  | { zone: "reserve"; pile: number }
  | { zone: "waste" }
  | null;

type MoveSource = Exclude<Selection, null>;

type DropTarget =
  | { zone: "tableau"; pile: number }
  | { zone: "foundation"; pile: number };

// ─── Rules ────────────────────────────────────────────────────────────────────

/** A card's place in the run from the base rank (0) up to the rank below it (12). */
function order(card: PlayingCard, baseRank: CardRank) {
  return (rankValue(card) - RANK_VALUE[baseRank] + 13) % 13;
}

function canBuildFoundation(
  card: PlayingCard,
  destination: PlayingCard | undefined,
  baseRank: CardRank | null,
  config: Config,
) {
  if (!baseRank) return false;
  if (!destination) return card.rank === baseRank;
  if (order(destination, baseRank) === 12) return false;
  if (order(card, baseRank) !== order(destination, baseRank) + 1) return false;
  if (config.foundationBuild === "suit") return card.suit === destination.suit;
  if (config.foundationBuild === "alternating")
    return isRed(card.suit) !== isRed(destination.suit);
  return true;
}

function isOneBelow(
  card: PlayingCard,
  destination: PlayingCard,
  baseRank: CardRank | null,
  config: Config,
) {
  if (config.tableauWrap === "base" && baseRank) {
    return order(card, baseRank) === order(destination, baseRank) - 1;
  }
  if (config.tableauWrap === "cyclic") {
    return (rankValue(destination) - rankValue(card) + 13) % 13 === 1;
  }
  return rankValue(card) === rankValue(destination) - 1;
}

function canBuildTableau(
  card: PlayingCard,
  source: MoveSource,
  destination: PlayingCard | undefined,
  state: SingleCardState,
  config: Config,
) {
  // A terrace card only ever goes to the foundations.
  if (source.zone === "reserve" && config.reserve?.kind === "terrace")
    return false;
  if (!destination) {
    if (config.empty === "blocked") return false;
    if (config.empty === "waste-or-stock") return source.zone === "waste";
    return true;
  }
  if (!isOneBelow(card, destination, state.baseRank, config)) return false;
  return (
    config.tableauBuild === "any" ||
    isRed(card.suit) !== isRed(destination.suit)
  );
}

function getCard(state: SingleCardState, source: Selection) {
  if (!source) return undefined;
  if (source.zone === "waste") return top(state.waste);
  if (source.zone === "reserve") return top(state.reserves[source.pile]);
  return top(state.tableau[source.pile]);
}

function sourcesOf(state: SingleCardState): MoveSource[] {
  return [
    ...(state.waste.length ? [{ zone: "waste" } as const] : []),
    ...state.reserves.flatMap((pile, index) =>
      pile.length ? [{ zone: "reserve", pile: index } as const] : [],
    ),
    ...state.tableau.flatMap((pile, index) =>
      pile.length ? [{ zone: "tableau", pile: index } as const] : [],
    ),
  ];
}

function canRedeal(state: SingleCardState, config: Config) {
  return (
    state.stock.length === 0 &&
    state.waste.length > 0 &&
    (state.redealsUsed ?? 0) < (config.redeals ?? 0)
  );
}

/** Whether the stock can be tapped: to turn a card, or to turn the waste over. */
function canDraw(state: SingleCardState, config: Config) {
  return (
    state.baseRank !== null &&
    (state.stock.length > 0 || canRedeal(state, config))
  );
}

function hasMove(state: SingleCardState, config: Config) {
  if (state.baseRank === null) return true;
  if (canDraw(state, config)) return true;
  return sourcesOf(state).some((source) => {
    const card = getCard(state, source)!;
    if (
      state.foundations.some((pile) =>
        canBuildFoundation(card, top(pile), state.baseRank, config),
      )
    )
      return true;
    return state.tableau.some(
      (pile, index) =>
        !(source.zone === "tableau" && source.pile === index) &&
        // Moving a lone card to another gap changes nothing.
        !(
          source.zone === "tableau" &&
          pile.length === 0 &&
          state.tableau[source.pile].length === 1
        ) &&
        canBuildTableau(card, source, top(pile), state, config),
    );
  });
}

// ─── Setup ────────────────────────────────────────────────────────────────────

function emptyPiles(count: number) {
  return Array.from({ length: count }, () => [] as PlayingCard[]);
}

function createInitialState(variant: SingleCardVariant): SingleCardState {
  const config = CONFIGS[variant];
  return {
    tableau: emptyPiles(config.tableau.count),
    reserves: emptyPiles(
      config.reserve?.kind === "piles"
        ? config.reserve.count
        : config.reserve
          ? 1
          : 0,
    ),
    stock: shuffle(createDeck({ deckCount: config.decks })).map(flipToBack),
    waste: [],
    foundations: emptyPiles(config.foundations),
    baseRank: null,
    redealsUsed: 0,
    ended: false,
    won: false,
  };
}

function moveKingsToBottom(pile: PlayingCard[]) {
  return [
    ...pile.filter((card) => card.rank === "K"),
    ...pile.filter((card) => card.rank !== "K"),
  ];
}

/** Deals a gathered, shuffled stock. */
function deal(stock: PlayingCard[], config: Config): SingleCardState {
  const deck = [...stock];
  const take = (count: number) =>
    deck
      .splice(deck.length - count, count)
      .reverse()
      .map(flipToFace);

  const reserves =
    config.reserve?.kind === "terrace"
      ? [take(config.reserve.size)]
      : config.reserve?.kind === "piles"
        ? Array.from({ length: config.reserve.count }, () => take(1))
        : [];

  const foundations = emptyPiles(config.foundations);
  let baseRank: CardRank | null =
    config.base === "ace" || config.base === "ace-out" ? "A" : null;
  if (config.base === "ace-out") {
    // The Ace nearest the top of the stock comes out to start a foundation.
    const ace = deck.findLastIndex((card) => card.rank === "A");
    if (ace >= 0) foundations[0].push(flipToFace(deck.splice(ace, 1)[0]));
  }
  if (config.base === "dealt") {
    const [base] = take(1);
    foundations[0].push(base);
    baseRank = base.rank;
  }

  // When the player chooses the base, only the first few piles are dealt;
  // the rest follow once the choice is made.
  const dealtPiles =
    config.base === "choose" ? BASE_CHOICES : config.tableau.count;
  const tableau = Array.from({ length: config.tableau.count }, (_, index) => {
    if (index >= dealtPiles) return [];
    const pile = take(config.tableau.size);
    return config.tableau.kingsToBottom ? moveKingsToBottom(pile) : pile;
  });

  return {
    tableau,
    reserves,
    stock: deck.map(flipToBack),
    waste: [],
    foundations,
    baseRank,
    redealsUsed: 0,
    ended: false,
    won: false,
  };
}

/**
 * Choosing the base, the hint picks the rank the terrace (the cards that can
 * only go home) wants soonest. After, it ranks the single-card moves on view,
 * and once the stock is spent, searches for a win.
 */
function findSingleCardHint(
  state: SingleCardState,
  variant: SingleCardVariant,
  config: Config = CONFIGS[variant],
) {
  if (state.baseRank === null) {
    const terrace = state.reserves.flat();
    const choices = state.tableau
      .slice(0, BASE_CHOICES)
      .map((pile) => top(pile))
      .filter((card): card is PlayingCard => !!card);
    const soonness = (base: PlayingCard) =>
      terrace.reduce(
        (sum, card) => sum + Math.max(0, 6 - order(card, base.rank)),
        0,
      );
    const best = choices.reduce<PlayingCard | null>(
      (pick, card) => (!pick || soonness(card) > soonness(pick) ? card : pick),
      null,
    );
    return best ? makeHint("tapCard", cardTarget(best)) : null;
  }

  // The waste comes first among the piles whose top card plays.
  const sourceOf = (from: ClassicSource): MoveSource =>
    from.kind === "reserve"
      ? from.pile === 0
        ? { zone: "waste" }
        : { zone: "reserve", pile: from.pile - 1 }
      : { zone: "tableau", pile: from.kind === "tableau" ? from.pile : 0 };
  const canDrawNow = canDraw(state, config);
  return findClassicHint(
    {
      tableau: state.tableau,
      foundations: state.foundations,
      reserves: [state.waste, ...state.reserves],
    },
    {
      toFoundation: (card, pile) =>
        canBuildFoundation(card, top(pile), state.baseRank, config),
      toTableau: (cards, pile, _index, _board, from) =>
        cards.length === 1 &&
        canBuildTableau(cards[0], sourceOf(from), top(pile), state, config),
      canLift: (pile, index) => index === pile.length - 1,
      buildQuality: (card, base) =>
        isOneBelow(card, base, state.baseRank, config) &&
        (config.tableauBuild === "any" || isRed(card.suit) !== isRed(base.suit))
          ? 2
          : 0,
      decks: config.decks,
    },
    {
      tableau: (pile) => `tableau-${pile}`,
      foundation: (pile) => `foundation-${pile}`,
    },
    {
      stock: canDrawNow
        ? {
            zone: "stock",
            message: canRedeal(state, config)
              ? "redeal"
              : config.reserve?.kind === "piles"
                ? "dealRow"
                : "draw",
          }
        : null,
      search: canDrawNow ? undefined : `single-card:${variant}`,
    },
  );
}

export const singleCardRules = {
  findHint: findSingleCardHint,
  configs: CONFIGS,
  canBuildFoundation,
  canBuildTableau,
  canDraw,
  createInitialState,
  deal,
  hasMove,
  order,
};

// ─── Layout ───────────────────────────────────────────────────────────────────

type Layout = {
  cols: number;
  rows: number;
  foundations: { col: number; row: number }[];
  tableau: { col: number; row: number }[];
  reserves: { col: number; row: number }[];
  stock: { col: number; row: number };
  waste?: { col: number; row: number };
};

/** Leaves room under the foundations for the terrace, waste and stock labels. */
const TERRACE_ROW = 1.4;
const TABLEAU_ROW = TERRACE_ROW + 1.2;

function getLayout(config: Config): Layout {
  const { count } = config.tableau;
  if (config.tableau.layout === "cross") {
    // A 3 x 3 grid: the cross in the middle, a foundation in each corner, and
    // the waste and stock underneath.
    return {
      cols: 3,
      rows: 4.4,
      foundations: [
        { col: 0, row: 0 },
        { col: 2, row: 0 },
        { col: 0, row: 2 },
        { col: 2, row: 2 },
      ],
      tableau: [
        { col: 1, row: 0 },
        { col: 0, row: 1 },
        { col: 1, row: 1 },
        { col: 2, row: 1 },
        { col: 1, row: 2 },
      ],
      reserves: [],
      stock: { col: 1.6, row: 3.4 },
      waste: { col: 0.4, row: 3.4 },
    };
  }

  if (config.tableau.layout === "fans") {
    return {
      cols: count,
      rows: 6.8,
      foundations: Array.from({ length: config.foundations }, (_, index) => ({
        col: index,
        row: 0,
      })),
      reserves: Array.from({ length: 3 }, (_, index) => ({
        col: config.foundations + index,
        row: 0,
      })),
      tableau: Array.from({ length: count }, (_, index) => ({
        col: index,
        row: 1.45,
      })),
      stock: { col: count - 1, row: 0 },
    };
  }

  // Columns under a row of foundations, with the terrace, waste and stock
  // between them.
  const cols = Math.max(count, config.foundations + 1);
  return {
    cols,
    rows: TABLEAU_ROW + 5,
    foundations: Array.from({ length: config.foundations }, (_, index) => ({
      col: (cols - config.foundations) / 2 + index,
      row: 0,
    })),
    reserves: [{ col: 0, row: TERRACE_ROW }],
    tableau: Array.from({ length: count }, (_, index) => ({
      col: (cols - count) / 2 + index,
      row: TABLEAU_ROW,
    })),
    stock: { col: cols - 1, row: TERRACE_ROW },
    waste: { col: cols - 2.2, row: TERRACE_ROW },
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SingleCardSolitaire({
  variant,
  redeals,
}: {
  variant: SingleCardVariant;
  /** Overrides the variant's number of stock redeals. */
  redeals?: number;
}) {
  const config = useMemo(
    () =>
      redeals === undefined
        ? CONFIGS[variant]
        : { ...CONFIGS[variant], redeals },
    [redeals, variant],
  );
  const layout = useMemo(() => getLayout(config), [config]);
  const initial = useMemo(() => createInitialState(variant), [variant]);
  const [selected, setSelected] = useState<Selection>(null);
  const [lastTap, setLastTap] = useState<{ key: string; at: number } | null>(
    null,
  );

  const {
    isLoaded,
    isSettingUp,
    game,
    setGame,
    reset,
    undo,
    canUndo,
    saveUndoState,
  } = useStateManager<SingleCardState>({
    gameStateInitial: initial,
    resetNonGameStates: () => {
      setSelected(null);
      setLastTap(null);
      clearDragGhost();
    },
    resetAndSetup: async () => {
      setGame((draft) => {
        const cards = [
          ...draft.stock,
          ...draft.waste,
          ...draft.reserves.flat(),
          ...draft.tableau.flat(),
          ...draft.foundations.flat(),
        ];
        const next = createInitialState(variant);
        draft.tableau = next.tableau;
        draft.reserves = next.reserves;
        draft.stock = cards.map(flipToBack);
        draft.waste = [];
        draft.foundations = next.foundations;
        draft.baseRank = null;
        draft.redealsUsed = 0;
        draft.ended = false;
        draft.won = false;
      });

      await delay();

      setGame((draft) => {
        Object.assign(draft, deal(shuffle(draft.stock), config));
      });
    },
  });

  const { width: windowWidth, height: windowHeight } = useViewportDimensions();
  const dropHitAreasRef = useRef<DropHitArea<DropTarget>[]>([]);

  const {
    hoverTarget,
    dragGhost,
    draggedCardIds,
    justDroppedCardIds,
    dragTranslate,
    boardRef,
    boardPageOffset,
    clearDragGhost,
    startDrag,
    updateBoardOffset,
    makeDragHandlers,
  } = useDragDrop<MoveSource, DropTarget>({
    canDropOnTarget,
    onSuccessfulDrop: (source, target) => {
      if (target.zone === "foundation") moveToFoundation(source, target.pile);
      else moveToTableau(target.pile, source);
    },
    getDroppedCardIds: (source) => {
      const card = getCard(game, source);
      return card ? [card.id] : [];
    },
    getDropHitAreas: () => dropHitAreasRef.current,
    getSourceRect,
    getTapHandler,
  });

  const placeOnFoundation = (card: PlayingCard, destination?: PlayingCard) =>
    canBuildFoundation(card, destination, game.baseRank, config);

  const { isAutoCompleting } = useAutoComplete({
    game,
    setGame,
    isSettingUp,
    won: game.won,
    isBlocked: !!dragGhost,
    getSources: (state) =>
      state.stock.length === 0 &&
      state.baseRank !== null &&
      !canRedeal(state, config)
        ? [...state.tableau, ...state.reserves, state.waste]
        : null,
    getFoundations: (state) => state.foundations,
    canPlaceOnFoundation: placeOnFoundation,
    onStart: () => setSelected(null),
  });

  useHint(() => findSingleCardHint(game, variant, config), {
    game,
    enabled: !isSettingUp && !game.ended && !isAutoCompleting,
  });

  useEffect(() => {
    if (isSettingUp) return;
    const won = game.foundations.every((pile) => pile.length === 13);
    const ended = won || !hasMove(game, config);
    if (won !== game.won || ended !== game.ended) {
      setGame((draft) => {
        draft.won = won;
        draft.ended = ended;
      });
    }
  }, [config, game, isSettingUp, setGame]);

  const selectedCard = getCard(game, selected);
  const choosingBase = game.baseRank === null && !isSettingUp;

  function takeCard(draft: SingleCardState, source: MoveSource) {
    if (source.zone === "waste") return draft.waste.pop();
    if (source.zone === "reserve") return draft.reserves[source.pile].pop();
    return draft.tableau[source.pile].pop();
  }

  function canDropOnTarget(
    source: MoveSource,
    target: DropTarget,
    snapshot = game,
  ) {
    if (snapshot.ended || snapshot.baseRank === null) return false;
    const card = getCard(snapshot, source);
    if (!card) return false;
    if (target.zone === "foundation") {
      return canBuildFoundation(
        card,
        top(snapshot.foundations[target.pile]),
        snapshot.baseRank,
        config,
      );
    }
    return (
      !(source.zone === "tableau" && source.pile === target.pile) &&
      canBuildTableau(
        card,
        source,
        top(snapshot.tableau[target.pile]),
        snapshot,
        config,
      )
    );
  }

  function moveToTableau(destination: number, source: Selection = selected) {
    if (
      !source ||
      !canDropOnTarget(source, { zone: "tableau", pile: destination })
    )
      return false;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const card = takeCard(draft, source);
      if (card) draft.tableau[destination].push(card);
    });
    setSelected(null);
    return true;
  }

  function moveToFoundation(source: Selection = selected, target?: number) {
    const card = getCard(game, source);
    if (!source || !card) return false;
    const destination =
      target ??
      game.foundations.findIndex((pile) => placeOnFoundation(card, top(pile)));
    if (
      destination < 0 ||
      !canDropOnTarget(source, { zone: "foundation", pile: destination })
    )
      return false;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const moved = takeCard(draft, source);
      if (moved) draft.foundations[destination].push(moved);
    });
    setSelected(null);
    return true;
  }

  /** Terrace: the picked card starts the foundations; the rest are dealt. */
  function chooseBase(pile: number) {
    const card = top(game.tableau[pile]);
    if (!choosingBase || !card || pile >= BASE_CHOICES) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const base = draft.tableau[pile].pop()!;
      draft.foundations[0].push(base);
      draft.baseRank = base.rank;
      draft.tableau.forEach((column) => {
        const next = column.length === 0 ? draft.stock.pop() : undefined;
        if (next) column.push(flipToFace(next));
      });
    });
    setSelected(null);
  }

  function onSourcePress(source: MoveSource) {
    if (game.ended) return;
    if (choosingBase) {
      if (source.zone === "tableau") chooseBase(source.pile);
      return;
    }
    if (!getCard(game, source)) return;
    const key =
      source.zone === "waste" ? "waste" : `${source.zone}-${source.pile}`;
    const now = Date.now();
    if (lastTap?.key === key && now - lastTap.at < DOUBLE_TAP_MS) {
      setLastTap(null);
      if (moveToFoundation(source)) return;
    } else setLastTap({ key, at: now });

    const same =
      selected?.zone === source.zone &&
      (source.zone === "waste" ||
        (selected as { pile: number }).pile === source.pile);
    if (same) return setSelected(null);
    if (selected && source.zone === "tableau" && moveToTableau(source.pile))
      return;
    setSelected(source);
  }

  function drawStock() {
    if (game.ended || !canDraw(game, config)) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      if (canRedeal(draft, config)) {
        draft.stock = draft.waste.splice(0).reverse().map(flipToBack);
        draft.redealsUsed = (draft.redealsUsed ?? 0) + 1;
        return;
      }
      if (config.reserve?.kind === "piles") {
        draft.reserves.forEach((pile) => {
          const card = draft.stock.pop();
          if (card) pile.push(flipToFace(card));
        });
        return;
      }
      const card = draft.stock.pop();
      if (!card) return;
      // In Terrace, a gap in the tableau must be filled before drawing on.
      const gap =
        config.empty === "waste-or-stock"
          ? draft.tableau.findIndex((pile) => pile.length === 0)
          : -1;
      if (gap >= 0) draft.tableau[gap].push(flipToFace(card));
      else draft.waste.push(flipToFace(card));
    });
    setSelected(null);
  }

  // ─── Zones ──────────────────────────────────────────────────────────────────

  const tableauRows = layout.rows - layout.tableau[0].row;
  const pileOffset = (count: number) =>
    zoneFanOffset(
      count,
      tableauRows,
      cardDims.tableauOffsetMin,
      cardDims.tableauOffset,
    );

  const zones: MapZone[] = useMemo(() => {
    const tableau: MapZone[] = game.tableau.map((pile, index) => ({
      id: `tableau-${index}`,
      name: "tableau",
      pileIndex: index,
      cards: pile,
      ...layout.tableau[index],
      fan:
        config.tableau.layout === "cross"
          ? { maxVisible: 3 }
          : { direction: "down", offset: pileOffset(pile.length) },
      placeholder:
        config.empty === "blocked" && pile.length === 0
          ? EXHAUSTED_PILE_PLACEHOLDER
          : {},
    }));
    const foundations: MapZone[] = game.foundations.map((pile, index) => ({
      id: `foundation-${index}`,
      name: "foundation",
      pileIndex: index,
      cards: pile,
      ...layout.foundations[index],
      fan: { maxVisible: 2 },
      placeholder: config.base === "ace" ? { iconName: "ace" } : {},
    }));
    const reserves: MapZone[] = game.reserves.map((pile, index) => ({
      id: `reserve-${index}`,
      name: "reserve",
      pileIndex: index,
      cards: pile,
      ...layout.reserves[index],
      fan:
        config.reserve?.kind === "terrace"
          ? { direction: "right", offset: cardDims.tableauOffsetHorizontal }
          : { maxVisible: 2 },
      placeholder: {
        text: i18n.t("cards:reserve"),
        showCount: config.reserve?.kind === "piles",
        infoPos: config.reserve?.kind === "terrace" ? "above" : "below",
      },
    }));
    return [
      {
        id: "stock",
        name: "stock",
        cards: game.stock,
        ...layout.stock,
        fan: { maxVisible: 3 },
        placeholder: {
          text: i18n.t("cards:stock"),
          showCount: true,
          infoPos: config.tableau.layout === "fans" ? "below" : "above",
        },
      },
      ...(layout.waste
        ? [
            {
              id: "waste",
              name: "waste",
              cards: game.waste,
              ...layout.waste,
              fan: { maxVisible: 3 },
              placeholder: {
                text: i18n.t("cards:waste"),
                showCount: true,
                infoPos: "above",
              },
            } as MapZone,
          ]
        : []),
      ...reserves,
      ...foundations,
      ...tableau,
    ];
  }, [config, game, layout]);

  const cardMapper = (card: MappedCard): AnimatedCardMapping | undefined => {
    const isBeingDragged = draggedCardIds?.has(card.card.id) ?? false;
    const animDuration = justDroppedCardIds.current?.has(card.card.id)
      ? 0
      : undefined;

    if (card.zoneName === "stock" && card.topOfZone)
      return {
        onPress: drawStock,
        isDisabled: !canDraw(game, config),
        isVisible: !isBeingDragged,
        animDuration,
      };
    if (card.zoneName === "foundation") {
      const isHoverTarget =
        !!dragGhost &&
        card.topOfZone &&
        hoverTarget?.zone === "foundation" &&
        hoverTarget.pile === card.pileIndex;
      return {
        isSelected: isHoverTarget,
        selectColor: isHoverTarget ? "green" : "none",
        isVisible: !isBeingDragged,
        animDuration,
        clickThroughCards: true,
      };
    }
    const source: MoveSource | null =
      card.zoneName === "waste"
        ? { zone: "waste" }
        : card.zoneName === "reserve" && card.pileIndex !== undefined
          ? { zone: "reserve", pile: card.pileIndex }
          : card.zoneName === "tableau" && card.pileIndex !== undefined
            ? { zone: "tableau", pile: card.pileIndex }
            : null;
    if (!source || !card.topOfZone) return { animDuration };

    const isChoice =
      choosingBase && source.zone === "tableau" && source.pile < BASE_CHOICES;
    const isSelected =
      selected?.zone === source.zone &&
      (source.zone === "waste" ||
        (selected as { pile: number }).pile ===
          (source as { pile: number }).pile);
    const isHoverTarget =
      !!dragGhost &&
      source.zone === "tableau" &&
      hoverTarget?.zone === "tableau" &&
      hoverTarget.pile === source.pile;
    return {
      onPress: () => onSourcePress(source),
      isDisabled: game.ended || (choosingBase && !isChoice),
      isSelected: isChoice || isSelected || isHoverTarget,
      selectColor: isChoice || isHoverTarget ? "green" : "blue",
      isVisible: !isBeingDragged,
      animDuration,
    };
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name === "stock")
      return { onPress: drawStock, isDisabled: !canDraw(game, config) };
    if (zone.name === "foundation" && zone.pileIndex !== undefined)
      return {
        onPress: () => moveToFoundation(selected, zone.pileIndex),
        isDisabled: !selectedCard || !!dragGhost,
        isSelected:
          !!dragGhost &&
          hoverTarget?.zone === "foundation" &&
          hoverTarget.pile === zone.pileIndex,
        selectColor: "green",
      };
    if (zone.name === "tableau" && zone.pileIndex !== undefined)
      return {
        onPress: () => moveToTableau(zone.pileIndex!),
        isDisabled: !selectedCard || !!dragGhost,
        isSelected:
          !!dragGhost &&
          zone.cards?.length === 0 &&
          hoverTarget?.zone === "tableau" &&
          hoverTarget.pile === zone.pileIndex,
        selectColor: "green",
      };
    return {};
  };

  const { cardMap, getZoneBasePos, getCardPos, cardWidth, cardHeight } =
    useCardMap({
      game,
      zones,
      cardMapper,
      zoneMapper,
      cardSize: "tableau",
      fixedCols: layout.cols,
      fixedRows: layout.rows,
      gap: 0.12,
    });

  function zoneOf(source: MoveSource) {
    return zones.find((zone) =>
      source.zone === "waste"
        ? zone.name === "waste"
        : zone.name === source.zone && zone.pileIndex === source.pile,
    );
  }

  function getSourceRect(source: MoveSource) {
    const zone = zoneOf(source);
    const count = zone?.cards?.length ?? 0;
    if (!zone || count === 0) return null;
    const pos = getCardPos(zone, count - 1);
    return createRect(pos.x, pos.y, cardWidth, cardHeight);
  }

  const cardHitAreas = useMemo<CardHitArea<MoveSource>[]>(() => {
    if (game.baseRank === null) return [];
    return sourcesOf(game).flatMap((source) => {
      const zone = zoneOf(source);
      const count = zone?.cards?.length ?? 0;
      if (!zone || count === 0) return [];
      const pos = getCardPos(zone, count - 1);
      return [
        {
          source,
          rect: createRect(pos.x, pos.y, cardWidth, cardHeight),
          priority: source.zone === "tableau" ? 10 : 100,
        },
      ];
    });
  }, [cardHeight, cardWidth, game, getCardPos, zones]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => updateBoardOffset());
    return () => cancelAnimationFrame(frame);
  }, [windowWidth, windowHeight, zones.length, cardWidth, cardHeight]);

  const dropHitAreas = useMemo<DropHitArea<DropTarget>[]>(() => {
    return zones.flatMap((zone) => {
      if (
        (zone.name !== "foundation" && zone.name !== "tableau") ||
        zone.pileIndex === undefined
      )
        return [];
      const base = getZoneBasePos(zone);
      const count = zone.cards?.length ?? 0;
      const height =
        zone.name === "tableau" && config.tableau.layout !== "cross"
          ? cardHeight + Math.max(0, count - 1) * pileOffset(count) * cardHeight
          : cardHeight;
      return [
        {
          target: {
            zone: zone.name as "foundation" | "tableau",
            pile: zone.pileIndex,
          },
          rect: createRect(
            base.x + boardPageOffset.x,
            base.y + boardPageOffset.y,
            cardWidth,
            height,
          ),
          priority: zone.name === "foundation" ? 90 : 50 + count,
        },
      ];
    });
  }, [
    boardPageOffset.x,
    boardPageOffset.y,
    cardHeight,
    cardWidth,
    config,
    getZoneBasePos,
    zones,
  ]);

  dropHitAreasRef.current = dropHitAreas;

  function startGhostDrag(source: MoveSource) {
    if (game.ended || game.baseRank === null) return;
    const card = getCard(game, source);
    const rect = getSourceRect(source);
    if (!card || !rect) return;
    startDrag(source, [card], { x: rect.x, y: rect.y });
  }

  function getTapHandler(source: MoveSource) {
    return () => onSourcePress(source);
  }

  const interactionTargets = useMemo(
    () =>
      cardHitAreas.map(({ source, rect }) => (
        <DragHandle
          key={
            source.zone === "waste" ? "waste" : `${source.zone}-${source.pile}`
          }
          collapsable={false}
          style={{
            position: "absolute",
            backgroundColor: "transparent",
            left: rect.x,
            top: rect.y,
            width: rect.width,
            height: rect.height,
          }}
          gesture={makeDragHandlers(source, startGhostDrag)}
        />
      )),
    [cardHitAreas],
  );

  const stockZone = zones.find((zone) => zone.name === "stock");
  const stockRect = stockZone
    ? createRect(
        getZoneBasePos(stockZone).x,
        getZoneBasePos(stockZone).y,
        cardWidth,
        cardHeight,
      )
    : null;

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      reset={() => void reset()}
      isLoaded={isLoaded}
      canUndo={canUndo}
      undo={undo}
      autoCompleting={isAutoCompleting}
      winLoseMessage={
        game.won
          ? i18n.t("games:stockTableauSolitaire.everySuitIsHome")
          : i18n.t("cards:noMovesRemain")
      }
    >
      <View
        ref={boardRef}
        style={{
          flex: 1,
          width: "100%",
          position: "relative",
          touchAction: "none",
          overscrollBehaviorX: "contain",
        }}
      >
        {cardMap}
        <View
          style={[
            pointerEventsStyles.boxNone,
            {
              ...StyleSheet.absoluteFillObject,
              zIndex: 3000,
              touchAction: "none",
              overscrollBehaviorX: "contain",
            },
          ]}
        >
          {stockRect && (
            <Pressable
              style={{
                position: "absolute",
                left: stockRect.x,
                top: stockRect.y,
                width: stockRect.width,
                height: stockRect.height,
              }}
              onPress={drawStock}
              disabled={!canDraw(game, config)}
            />
          )}
          {interactionTargets}
        </View>
        {dragGhost && (
          <DragGhostCards
            ghost={dragGhost}
            translate={dragTranslate}
            cardWidth={cardWidth}
            cardHeight={cardHeight}
            cardSize="tableau"
            isValidDrop={hoverTarget !== null}
          />
        )}
      </View>
    </GameWrapper>
  );
}
