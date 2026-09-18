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
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import {
  cardDims,
  createDeck,
  flipToBack,
  flipToFace,
  isRed,
  rankValue,
  shuffle,
  top,
  zoneFanOffset,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";

import { i18n } from "@/i18n";
export type StockTableauVariant =
  | "australian-patience"
  | "whitehead"
  | "easthaven"
  | "josephine"
  | "congress"
  | "westcliff"
  | "gargantua"
  | "harp"
  | "raglan"
  | "thumb-and-pouch"
  | "lucas"
  | "rank-and-file"
  | "indian"
  | "diplomat"
  | "maria"
  | "number-ten"
  | "busy-aces";

type BuildRule =
  "alternating" | "same-color" | "same-suit" | "not-same-suit" | "rank";
type MoveRule = "single" | "suited-run" | "built-run" | "any-tail";
type DealConfig = {
  columns: number;
  sizes: number[];
  faceUp: "all" | number;
};
type Config = {
  decks: 1 | 2;
  foundations: number;
  deal: DealConfig;
  build: BuildRule;
  move: MoveRule;
  empty: "king" | "any";
  stock: "waste" | "row";
  redeals: number;
  seedAces?: boolean;
};

export type StockTableauState = {
  tableau: PlayingCard[][];
  stock: PlayingCard[];
  waste: PlayingCard[];
  foundations: PlayingCard[][];
  redealsUsed: number;
  ended: boolean;
  won: boolean;
};

type Selection =
  { zone: "tableau"; pile: number; card: number } | { zone: "waste" } | null;

type MoveSource = Exclude<Selection, null>;

const TABLEAU_ROW = 1.2;

/**
 * Rows of height the tableau gets before its piles start to tighten: room for
 * the tallest dealt pile plus a long build, and at least a King-to-Ace run.
 */
function tableauRows(config: Config) {
  const cards = Math.max(13, Math.max(...config.deal.sizes) + 6);
  return 1 + (cards - 1) * cardDims.tableauOffset;
}

/** Bottom row for the stock and waste, leaving room for their labels above. */
function stockRow(config: Config) {
  return TABLEAU_ROW + tableauRows(config) + 0.35;
}

/** A pile's fan offset, tightened once it would run past the tableau area. */
function pileOffset(count: number, config: Config) {
  return zoneFanOffset(
    count,
    tableauRows(config),
    cardDims.tableauOffsetMin,
    cardDims.tableauOffset,
  );
}
type DropTarget =
  { zone: "tableau"; pile: number } | { zone: "foundation"; pile: number };

const CONFIGS: Record<StockTableauVariant, Config> = {
  "australian-patience": {
    decks: 1,
    foundations: 4,
    deal: { columns: 7, sizes: [4, 4, 4, 4, 4, 4, 4], faceUp: "all" },
    build: "same-suit",
    move: "any-tail",
    empty: "king",
    stock: "waste",
    redeals: 0,
  },
  whitehead: {
    decks: 1,
    foundations: 4,
    deal: { columns: 7, sizes: [1, 2, 3, 4, 5, 6, 7], faceUp: "all" },
    build: "same-color",
    move: "suited-run",
    empty: "any",
    stock: "waste",
    redeals: 0,
  },
  easthaven: {
    decks: 1,
    foundations: 4,
    deal: { columns: 7, sizes: [3, 3, 3, 3, 3, 3, 3], faceUp: 1 },
    build: "rank",
    move: "suited-run",
    empty: "king",
    stock: "row",
    redeals: 0,
  },
  josephine: {
    decks: 2,
    foundations: 8,
    deal: { columns: 10, sizes: Array(10).fill(4), faceUp: "all" },
    build: "same-suit",
    move: "suited-run",
    empty: "any",
    stock: "waste",
    redeals: 0,
  },
  congress: {
    decks: 2,
    foundations: 8,
    deal: { columns: 8, sizes: Array(8).fill(4), faceUp: "all" },
    build: "rank",
    move: "single",
    empty: "any",
    stock: "waste",
    redeals: 0,
  },
  westcliff: {
    decks: 1,
    foundations: 4,
    deal: { columns: 10, sizes: Array(10).fill(3), faceUp: 1 },
    build: "alternating",
    move: "built-run",
    empty: "any",
    stock: "waste",
    redeals: 0,
  },
  gargantua: {
    decks: 2,
    foundations: 8,
    deal: { columns: 9, sizes: [1, 2, 3, 4, 5, 6, 7, 8, 9], faceUp: 1 },
    build: "alternating",
    move: "built-run",
    empty: "king",
    stock: "waste",
    redeals: 1,
  },
  harp: {
    decks: 2,
    foundations: 8,
    deal: { columns: 9, sizes: [1, 2, 3, 4, 5, 6, 7, 8, 9], faceUp: 1 },
    build: "alternating",
    move: "built-run",
    empty: "king",
    stock: "waste",
    redeals: 3,
  },
  raglan: {
    decks: 1,
    foundations: 4,
    deal: { columns: 7, sizes: [1, 2, 3, 4, 5, 6, 7], faceUp: 1 },
    build: "alternating",
    move: "built-run",
    empty: "king",
    stock: "waste",
    redeals: 0,
    seedAces: true,
  },
  "thumb-and-pouch": {
    decks: 1,
    foundations: 4,
    deal: { columns: 7, sizes: [1, 2, 3, 4, 5, 6, 7], faceUp: 1 },
    build: "not-same-suit",
    move: "built-run",
    empty: "any",
    stock: "waste",
    redeals: 0,
  },
  lucas: {
    decks: 2,
    foundations: 8,
    deal: { columns: 13, sizes: Array(13).fill(3), faceUp: "all" },
    build: "same-suit",
    move: "single",
    empty: "any",
    stock: "waste",
    redeals: 0,
    seedAces: true,
  },
  "rank-and-file": {
    decks: 2,
    foundations: 8,
    deal: { columns: 10, sizes: Array(10).fill(4), faceUp: 1 },
    build: "alternating",
    move: "built-run",
    empty: "any",
    stock: "waste",
    redeals: 0,
  },
  indian: {
    decks: 2,
    foundations: 8,
    deal: { columns: 10, sizes: Array(10).fill(3), faceUp: 2 },
    build: "not-same-suit",
    move: "single",
    empty: "any",
    stock: "waste",
    redeals: 0,
  },
  diplomat: {
    decks: 2,
    foundations: 8,
    deal: { columns: 8, sizes: Array(8).fill(4), faceUp: "all" },
    build: "rank",
    move: "single",
    empty: "any",
    stock: "waste",
    redeals: 0,
  },
  maria: {
    decks: 2,
    foundations: 8,
    deal: { columns: 9, sizes: Array(9).fill(4), faceUp: "all" },
    build: "alternating",
    move: "single",
    empty: "any",
    stock: "waste",
    redeals: 0,
  },
  "number-ten": {
    decks: 2,
    foundations: 8,
    deal: { columns: 10, sizes: Array(10).fill(4), faceUp: 2 },
    build: "alternating",
    move: "built-run",
    empty: "any",
    stock: "waste",
    redeals: 0,
  },
  "busy-aces": {
    decks: 2,
    foundations: 8,
    deal: { columns: 12, sizes: Array(12).fill(2), faceUp: 1 },
    build: "same-suit",
    move: "single",
    empty: "any",
    stock: "waste",
    redeals: 0,
  },
};

function canBuildFoundation(card: PlayingCard, destination?: PlayingCard) {
  if (!destination) return card.rank === "A";
  return (
    card.suit === destination.suit &&
    rankValue(card) === rankValue(destination) + 1
  );
}

function canBuildTableau(
  card: PlayingCard,
  destination: PlayingCard | undefined,
  config: Config,
) {
  if (!destination) return config.empty === "any" || card.rank === "K";
  if (rankValue(card) !== rankValue(destination) - 1) return false;
  if (config.build === "rank") return true;
  if (config.build === "same-suit") return card.suit === destination.suit;
  if (config.build === "not-same-suit") return card.suit !== destination.suit;
  if (config.build === "same-color")
    return isRed(card.suit) === isRed(destination.suit);
  return isRed(card.suit) !== isRed(destination.suit);
}

function isMovableRun(cards: PlayingCard[], rule: MoveRule, config: Config) {
  if (cards.length === 0) return false;
  if (rule === "single") return cards.length === 1;
  if (rule === "any-tail") return true;
  if (rule === "built-run") {
    return cards.every(
      (card, index) =>
        index === 0 || canBuildTableau(card, cards[index - 1], config),
    );
  }
  return cards.every(
    (card, index) =>
      index === 0 ||
      (card.suit === cards[index - 1].suit &&
        rankValue(card) === rankValue(cards[index - 1]) - 1),
  );
}

function createInitialState(variant: StockTableauVariant): StockTableauState {
  const config = CONFIGS[variant];
  return {
    tableau: Array.from(
      { length: config.deal.columns },
      () => [] as PlayingCard[],
    ),
    stock: shuffle(createDeck({ deckCount: config.decks })).map(flipToBack),
    waste: [],
    foundations: Array.from(
      { length: config.foundations },
      () => [] as PlayingCard[],
    ),
    redealsUsed: 0,
    ended: false,
    won: false,
  };
}

function dealFromStock(
  stock: PlayingCard[],
  config: Config,
): StockTableauState {
  const deck = [...stock];
  const foundations = Array.from(
    { length: config.foundations },
    () => [] as PlayingCard[],
  );
  if (config.seedAces) {
    for (let index = deck.length - 1; index >= 0; index -= 1) {
      if (deck[index].rank !== "A") continue;
      foundations[foundations.findIndex((pile) => pile.length === 0)].push(
        flipToFace(deck[index]),
      );
      deck.splice(index, 1);
    }
  }
  const tableau = Array.from(
    { length: config.deal.columns },
    () => [] as PlayingCard[],
  );
  let offset = 0;
  config.deal.sizes.forEach((size, pileIndex) => {
    const cards = deck.slice(offset, offset + size);
    tableau[pileIndex] = cards.map((card, cardIndex) =>
      config.deal.faceUp === "all" ||
      cardIndex >= cards.length - config.deal.faceUp
        ? flipToFace(card)
        : flipToBack(card),
    );
    offset += size;
  });
  return {
    tableau,
    stock: deck.slice(offset).map(flipToBack),
    waste: [],
    foundations,
    redealsUsed: 0,
    ended: false,
    won: false,
  };
}

function getCards(state: StockTableauState, selection: Selection) {
  if (!selection) return [];
  return selection.zone === "waste"
    ? top(state.waste)
      ? [top(state.waste)!]
      : []
    : state.tableau[selection.pile].slice(selection.card);
}

function flipExposed(pile: PlayingCard[]) {
  const card = top(pile);
  if (card && !card.faceUp) pile[pile.length - 1] = flipToFace(card);
}

function hasMove(state: StockTableauState, config: Config) {
  if (state.stock.length > 0) return true;
  if (state.waste.length > 0 && state.redealsUsed < config.redeals) return true;
  const sources = [
    ...(top(state.waste)
      ? [{ cards: [top(state.waste)!], sourcePile: -1 }]
      : []),
    ...state.tableau.flatMap((pile, sourcePile) =>
      pile.flatMap((card, cardIndex) => {
        const cards = pile.slice(cardIndex);
        return card.faceUp && isMovableRun(cards, config.move, config)
          ? [{ cards, sourcePile }]
          : [];
      }),
    ),
  ];
  return sources.some(({ cards, sourcePile }) => {
    const card = cards[0];
    if (
      cards.length === 1 &&
      state.foundations.some((pile) => canBuildFoundation(card, top(pile)))
    )
      return true;
    return state.tableau.some(
      (pile, destination) =>
        destination !== sourcePile && canBuildTableau(card, top(pile), config),
    );
  });
}

export const stockTableauRules = {
  configs: CONFIGS,
  canBuildFoundation,
  canBuildTableau,
  createInitialState,
  isMovableRun,
};

export function StockTableauSolitaire({
  variant,
}: {
  variant: StockTableauVariant;
}) {
  const config = CONFIGS[variant];
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
  } = useStateManager<StockTableauState>({
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
          ...draft.tableau.flat(),
          ...draft.foundations.flat(),
        ];
        const next = createInitialState(variant);

        draft.tableau = next.tableau;
        draft.stock = cards.map(flipToBack);
        draft.waste = [];
        draft.foundations = next.foundations;
        draft.redealsUsed = 0;
        draft.ended = false;
        draft.won = false;
      });

      await delay();

      setGame((draft) => {
        const next = dealFromStock(shuffle(draft.stock), config);
        draft.tableau = next.tableau;
        draft.stock = next.stock;
        draft.waste = next.waste;
        draft.foundations = next.foundations;
        draft.redealsUsed = next.redealsUsed;
        draft.ended = next.ended;
        draft.won = next.won;
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
      if (target.zone === "foundation") {
        moveToFoundation(source, target.pile);
      } else {
        moveToTableau(target.pile, source);
      }
    },
    getDroppedCardIds: (source) =>
      getCards(game, source).map((card) => card.id),
    getDropHitAreas: () => dropHitAreasRef.current,
    getSourceRect,
    getTapHandler,
  });

  // Once the stock and waste are empty and every card is face up, finish the
  // game automatically.
  const { isAutoCompleting } = useAutoComplete({
    game,
    setGame,
    isSettingUp,
    won: game.won,
    isBlocked: !!dragGhost,
    getSources: (state) =>
      state.stock.length === 0 &&
      state.waste.length === 0 &&
      state.tableau.every((pile) => pile.every((card) => card.faceUp))
        ? state.tableau
        : null,
    getFoundations: (state) => state.foundations,
    canPlaceOnFoundation: canBuildFoundation,
    onStart: () => setSelected(null),
  });

  useEffect(() => {
    const won = game.foundations.every((pile) => pile.length === 13);
    const ended = won || !hasMove(game, config);
    if (won !== game.won || ended !== game.ended) {
      setGame((draft) => {
        draft.won = won;
        draft.ended = ended;
      });
    }
  }, [config, game, setGame]);

  const selectedCards = getCards(game, selected);
  const selectedCard = selectedCards[0];

  function removeSelection(draft: StockTableauState, source: Selection) {
    if (!source) return [];
    if (source.zone === "waste") {
      const card = draft.waste.pop();
      return card ? [card] : [];
    }
    const cards = draft.tableau[source.pile].splice(source.card);
    flipExposed(draft.tableau[source.pile]);
    return cards;
  }

  function moveToTableau(destination: number, source: Selection = selected) {
    const cards = getCards(game, source);
    const card = cards[0];
    if (
      !source ||
      !card ||
      (source.zone === "tableau" && source.pile === destination) ||
      !isMovableRun(cards, config.move, config) ||
      !canBuildTableau(card, top(game.tableau[destination]), config)
    ) {
      return false;
    }
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      draft.tableau[destination].push(...removeSelection(draft, source));
    });
    setSelected(null);
    return true;
  }

  function moveToFoundation(source: Selection = selected, target?: number) {
    const cards = getCards(game, source);
    if (cards.length !== 1) return false;
    const destination =
      target ??
      game.foundations.findIndex((pile) =>
        canBuildFoundation(cards[0], top(pile)),
      );
    if (
      destination < 0 ||
      !canBuildFoundation(cards[0], top(game.foundations[destination]))
    ) {
      return false;
    }
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const [card] = removeSelection(draft, source);
      if (card) draft.foundations[destination].push(card);
    });
    setSelected(null);
    return true;
  }

  function onTableauPress(pile: number, card: number) {
    if (game.ended || !game.tableau[pile][card]?.faceUp) return;
    const next: Selection = { zone: "tableau", pile, card };
    const key = `${pile}-${card}`;
    const now = Date.now();
    if (lastTap?.key === key && now - lastTap.at < DOUBLE_TAP_MS) {
      setLastTap(null);
      if (moveToFoundation(next)) return;
    } else setLastTap({ key, at: now });
    if (!selected) return setSelected(next);
    if (
      selected.zone === "tableau" &&
      selected.pile === pile &&
      selected.card === card
    )
      return setSelected(null);
    if (!moveToTableau(pile)) setSelected(next);
  }

  function onWastePress() {
    if (game.ended || game.waste.length === 0) return;
    const next: Selection = { zone: "waste" };
    const now = Date.now();
    if (lastTap?.key === "waste" && now - lastTap.at < DOUBLE_TAP_MS) {
      setLastTap(null);
      if (moveToFoundation(next)) return;
    } else setLastTap({ key: "waste", at: now });
    if (selected?.zone === "waste") return setSelected(null);
    setSelected(next);
  }

  function drawStock() {
    if (game.ended) return;
    if (game.stock.length === 0) {
      if (game.waste.length === 0 || game.redealsUsed >= config.redeals) return;
      saveUndoState(structuredClone(game));
      setGame((draft) => {
        draft.stock = draft.waste.splice(0).reverse().map(flipToBack);
        draft.redealsUsed += 1;
      });
      setSelected(null);
      return;
    }
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      if (config.stock === "row") {
        draft.tableau.forEach((pile) => {
          const card = draft.stock.pop();
          if (card) pile.push(flipToFace(card));
        });
      } else {
        const card = draft.stock.pop();
        if (card) draft.waste.push(flipToFace(card));
      }
    });
    setSelected(null);
  }

  function canDropOnTarget(
    source: MoveSource,
    target: DropTarget,
    snapshot = game,
  ) {
    if (snapshot.ended) return false;
    const cards = getCards(snapshot, source);
    const card = cards[0];
    if (!card) return false;

    if (target.zone === "foundation") {
      return (
        cards.length === 1 &&
        canBuildFoundation(card, top(snapshot.foundations[target.pile]))
      );
    }

    return (
      !(source.zone === "tableau" && source.pile === target.pile) &&
      isMovableRun(cards, config.move, config) &&
      canBuildTableau(card, top(snapshot.tableau[target.pile]), config)
    );
  }

  const zones: MapZone[] = useMemo(() => {
    const foundations: MapZone[] = game.foundations.map((pile, index) => ({
      id: `foundation-${index}`,
      name: "foundation",
      pileIndex: index,
      cards: pile,
      col: index,
      row: 0,
      fan: { maxVisible: 3 },
      placeholder: {},
    }));
    const tableau: MapZone[] = game.tableau.map((pile, index) => ({
      id: `tableau-${index}`,
      name: "tableau",
      pileIndex: index,
      cards: pile,
      col: index,
      row: TABLEAU_ROW,
      fan: { direction: "down", offset: pileOffset(pile.length, config) },
      placeholder: {},
    }));
    // Stock and waste sit at the bottom right, within easy thumb reach.
    return [
      {
        id: "stock",
        name: "stock",
        cards: game.stock,
        col: config.deal.columns - 1,
        row: stockRow(config),
        fan: { maxVisible: 3 },
        placeholder: {
          text: i18n.t("cards:stock"),
          showCount: true,
          infoPos: "above",
        },
      },
      ...(config.stock === "waste"
        ? [
            {
              id: "waste",
              name: "waste",
              cards: game.waste,
              col: config.deal.columns - 2.25,
              row: stockRow(config),
              fan: { maxVisible: 3 },
              placeholder: {
                text: i18n.t("cards:waste"),
                showCount: true,
                infoPos: "above",
              },
            } as MapZone,
          ]
        : []),
      ...foundations,
      ...tableau,
    ];
  }, [config, game]);

  const cardMapper = (card: MappedCard): AnimatedCardMapping | undefined => {
    const isBeingDragged = draggedCardIds?.has(card.card.id) ?? false;
    const animDuration = justDroppedCardIds.current?.has(card.card.id)
      ? 0
      : undefined;

    if (card.zoneName === "stock" && card.topOfZone)
      return {
        onPress: drawStock,
        isDisabled:
          game.stock.length === 0 &&
          (game.waste.length === 0 || game.redealsUsed >= config.redeals),
        isVisible: !isBeingDragged,
        animDuration,
      };
    if (card.zoneName === "waste" && card.topOfZone)
      return {
        onPress: onWastePress,
        isSelected: selected?.zone === "waste",
        selectColor: "blue",
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
      };
    }
    if (card.zoneName === "tableau" && card.pileIndex !== undefined) {
      const inSelection =
        selected?.zone === "tableau" &&
        selected.pile === card.pileIndex &&
        card.cardIndex >= selected.card;
      const isHoverTarget =
        !!dragGhost &&
        card.topOfZone &&
        hoverTarget?.zone === "tableau" &&
        hoverTarget.pile === card.pileIndex;
      return {
        isDisabled: game.ended || !card.card.faceUp,
        isSelected: inSelection || isHoverTarget,
        selectColor: isHoverTarget ? "green" : "blue",
        onPress: () => onTableauPress(card.pileIndex!, card.cardIndex),
        isVisible: !isBeingDragged,
        animDuration,
      };
    }
    return {};
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name === "stock")
      return {
        onPress: drawStock,
        isDisabled:
          game.stock.length === 0 &&
          (game.waste.length === 0 || game.redealsUsed >= config.redeals),
      };
    if (zone.name === "waste")
      return {
        onPress: onWastePress,
        isDisabled: game.waste.length === 0,
      };
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

  const { cardMap, getZoneBasePos, cardWidth, cardHeight } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper,
    cardSize: "tableau",
    fixedCols: config.deal.columns,
    fixedRows: stockRow(config) + 1,
    gap: 0.12,
  });

  function getSourceRect(source: MoveSource) {
    const zone = zones.find((entry) =>
      source.zone === "waste"
        ? entry.name === "waste"
        : entry.name === "tableau" && entry.pileIndex === source.pile,
    );
    if (!zone) return null;

    const base = getZoneBasePos(zone);
    return createRect(
      base.x,
      base.y +
        (source.zone === "tableau"
          ? source.card *
            pileOffset(game.tableau[source.pile].length, config) *
            cardHeight
          : 0),
      cardWidth,
      cardHeight,
    );
  }

  const cardHitAreas = useMemo<CardHitArea<MoveSource>[]>(() => {
    const areas: CardHitArea<MoveSource>[] = [];

    zones.forEach((zone) => {
      const base = getZoneBasePos(zone);
      if (zone.name === "waste" && game.waste.length > 0) {
        areas.push({
          source: { zone: "waste" },
          rect: createRect(base.x, base.y, cardWidth, cardHeight),
          priority: 100,
        });
        return;
      }

      if (zone.name !== "tableau" || zone.pileIndex === undefined) return;
      const pile = game.tableau[zone.pileIndex];
      const offset = pileOffset(pile.length, config);
      pile.forEach((card, cardIndex) => {
        if (!card.faceUp) return;
        areas.push({
          source: { zone: "tableau", pile: zone.pileIndex!, card: cardIndex },
          rect: createRect(
            base.x,
            base.y + cardIndex * offset * cardHeight,
            cardWidth,
            cardIndex === pile.length - 1 ? cardHeight : offset * cardHeight,
          ),
          priority: 10 + cardIndex,
        });
      });
    });

    return areas;
  }, [cardHeight, cardWidth, config, game, getZoneBasePos, zones]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => updateBoardOffset());
    return () => cancelAnimationFrame(frame);
  }, [windowWidth, windowHeight, zones.length, cardWidth, cardHeight]);

  const dropHitAreas = useMemo<DropHitArea<DropTarget>[]>(() => {
    const areas: DropHitArea<DropTarget>[] = [];

    zones.forEach((zone) => {
      if (
        (zone.name !== "foundation" && zone.name !== "tableau") ||
        zone.pileIndex === undefined
      ) {
        return;
      }

      const base = getZoneBasePos(zone);
      const pile =
        zone.name === "foundation"
          ? game.foundations[zone.pileIndex]
          : game.tableau[zone.pileIndex];
      const height =
        zone.name === "tableau"
          ? cardHeight +
            Math.max(0, pile.length - 1) *
              pileOffset(pile.length, config) *
              cardHeight
          : cardHeight;

      areas.push({
        target: { zone: zone.name, pile: zone.pileIndex },
        rect: createRect(
          base.x + boardPageOffset.x,
          base.y + boardPageOffset.y,
          cardWidth,
          height,
        ),
        priority: zone.name === "foundation" ? 90 : 50 + pile.length,
      });
    });

    return areas;
  }, [
    boardPageOffset.x,
    boardPageOffset.y,
    cardHeight,
    cardWidth,
    config,
    game,
    getZoneBasePos,
    zones,
  ]);

  dropHitAreasRef.current = dropHitAreas;

  function startGhostDrag(source: MoveSource) {
    if (game.ended) return;
    const cards = getCards(game, source);
    if (!isMovableRun(cards, config.move, config)) return;
    const rect = getSourceRect(source);
    if (!rect) return;
    startDrag(source, cards, { x: rect.x, y: rect.y });
  }

  function getTapHandler(source: MoveSource) {
    return source.zone === "waste"
      ? onWastePress
      : () => onTableauPress(source.pile, source.card);
  }

  const interactionTargets = useMemo(
    () =>
      cardHitAreas.map(({ source, rect }) => (
        <DragHandle
          key={
            source.zone === "waste"
              ? "waste"
              : `tableau-${source.pile}-${source.card}`
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
  const score = game.foundations.reduce((sum, pile) => sum + pile.length, 0);
  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      reset={() => void reset()}
      isLoaded={isLoaded}
      score={score}
      canUndo={canUndo}
      undo={undo}
      autoCompleting={isAutoCompleting}
      winLoseMessage={
        game.won
          ? i18n.t("games:stockTableauSolitaire.everySuitIsHome")
          : i18n.t("cards:noMovesRemain")
      }
      showDeviceRotateHint
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
          style={{
            ...StyleSheet.absoluteFillObject,
            zIndex: 3000,
            touchAction: "none",
            overscrollBehaviorX: "contain",
            pointerEvents: "box-none",
          }}
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
              disabled={
                game.stock.length === 0 &&
                (game.waste.length === 0 || game.redealsUsed >= config.redeals)
              }
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
            highlightLeadOnly
          />
        )}
      </View>
    </GameWrapper>
  );
}
