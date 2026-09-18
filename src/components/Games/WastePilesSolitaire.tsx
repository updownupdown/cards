import { useStateManager } from "@/hooks/useStateManager";
import { delay, DOUBLE_TAP_MS } from "@/utils/utils";
import { useEffect, useMemo, useRef } from "react";
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
export type WastePilesVariant = "frog" | "puss-in-the-corner";

type Config = {
  decks: 1 | 2;
  wastePiles: number;
  reserveSize: number;
  /** Foundations build up from Ace in any suit, or keeping to one colour. */
  build: "any-suit" | "same-color";
  /** "all" starts every Ace on a foundation; "one" guarantees at least one. */
  seedAces: "all" | "one";
  redeals: number;
  winMessage: () => string;
  loseMessage: () => string;
};

const CONFIGS: Record<WastePilesVariant, Config> = {
  frog: {
    decks: 2,
    wastePiles: 5,
    reserveSize: 13,
    build: "any-suit",
    seedAces: "one",
    redeals: 0,
    winMessage: () => i18n.t("games:frog.everyFrogMadeItHome"),
    loseMessage: () => i18n.t("games:sirTommy.theStockIsSpent"),
  },
  "puss-in-the-corner": {
    decks: 1,
    wastePiles: 4,
    reserveSize: 0,
    build: "same-color",
    seedAces: "all",
    redeals: 1,
    winMessage: () => i18n.t("games:pussInTheCorner.allFourCornersFilled"),
    loseMessage: () => i18n.t("cards:noMovesRemain"),
  },
};

// Bottom row for the stock, leaving room for its label above.
const STOCK_ROW = 6.35;
const WASTE_ROW = 1.2;

export type WastePilesState = {
  stock: PlayingCard[];
  reserve: PlayingCard[];
  waste: PlayingCard[][];
  foundations: PlayingCard[][];
  redealsUsed: number;
  ended: boolean;
  won: boolean;
};

function emptyPiles(count: number) {
  return Array.from({ length: count }, () => [] as PlayingCard[]);
}

function canBuildFoundation(
  card: PlayingCard,
  pile: PlayingCard[],
  config: Config,
) {
  const pileTop = top(pile);
  if (!pileTop) return card.rank === "A";
  if (rankValue(card) !== rankValue(pileTop) + 1) return false;
  return (
    config.build === "any-suit" || isRed(card.suit) === isRed(pileTop.suit)
  );
}

function foundationFor(
  state: WastePilesState,
  card: PlayingCard,
  config: Config,
) {
  return state.foundations.findIndex((pile) =>
    canBuildFoundation(card, pile, config),
  );
}

function revealStockTop(stock: PlayingCard[]) {
  const stockTop = top(stock);
  if (!stockTop || stockTop.faceUp) return;
  stock[stock.length - 1] = flipToFace(stockTop);
}

function createInitialState(config: Config): WastePilesState {
  return {
    stock: shuffle(createDeck({ deckCount: config.decks })).map(flipToBack),
    reserve: [],
    waste: emptyPiles(config.wastePiles),
    foundations: emptyPiles(config.decks * 4),
    redealsUsed: 0,
    ended: false,
    won: false,
  };
}

function dealFromStock(stock: PlayingCard[], config: Config) {
  const deck = [...stock];
  const foundations = emptyPiles(config.decks * 4);
  const seed = (card: PlayingCard) =>
    foundations[foundations.findIndex((pile) => pile.length === 0)].push(
      flipToFace(card),
    );

  if (config.seedAces === "all") {
    for (let index = deck.length - 1; index >= 0; index -= 1) {
      if (deck[index].rank !== "A") continue;
      seed(deck[index]);
      deck.splice(index, 1);
    }
  }

  // Aces met while dealing the reserve go straight up and are replaced.
  const reserve: PlayingCard[] = [];
  while (reserve.length < config.reserveSize && deck.length > 0) {
    const card = deck.pop()!;
    if (card.rank === "A") seed(card);
    else reserve.push(flipToFace(card));
  }

  if (config.seedAces === "one" && foundations[0].length === 0) {
    const aceIndex = deck.findIndex((card) => card.rank === "A");
    if (aceIndex >= 0) seed(deck.splice(aceIndex, 1)[0]);
  }

  revealStockTop(deck);
  return { stock: deck, reserve, foundations };
}

function evaluateEnd(
  state: WastePilesState,
  config: Config,
  isSettingUp = false,
) {
  const playing = { ended: false, won: false };
  if (isSettingUp) return playing;

  const placed = state.foundations.reduce((sum, pile) => sum + pile.length, 0);
  if (placed === config.decks * 52) return { ended: true, won: true };
  if (state.stock.length > 0) return playing;
  if (
    state.redealsUsed < config.redeals &&
    state.waste.some((pile) => pile.length > 0)
  ) {
    return playing;
  }

  const exposed = [top(state.reserve), ...state.waste.map(top)];
  if (exposed.some((card) => card && foundationFor(state, card, config) >= 0))
    return playing;
  return { ended: true, won: false };
}

export const wastePilesRules = {
  configs: CONFIGS,
  canBuildFoundation,
  dealFromStock,
  evaluateEnd,
};

export function WastePilesSolitaire({
  variant,
}: {
  variant: WastePilesVariant;
}) {
  const config = CONFIGS[variant];
  const initial = useMemo(() => createInitialState(config), [config]);
  const {
    isLoaded,
    isSettingUp,
    game,
    setGame,
    undo,
    canUndo,
    saveUndoState,
    reset,
  } = useStateManager<WastePilesState>({
    gameStateInitial: initial,
    resetAndSetup: async () => {
      setGame((draft) => {
        const cards = [
          ...draft.stock,
          ...draft.reserve,
          ...draft.waste.flat(),
          ...draft.foundations.flat(),
        ];
        draft.stock = shuffle(cards).map(flipToBack);
        draft.reserve = [];
        draft.waste = emptyPiles(config.wastePiles);
        draft.foundations = emptyPiles(config.decks * 4);
        draft.redealsUsed = 0;
        draft.ended = false;
        draft.won = false;
      });

      await delay();

      setGame((draft) => {
        const next = dealFromStock(draft.stock, config);
        draft.stock = next.stock;
        draft.reserve = next.reserve;
        draft.foundations = next.foundations;
      });
    },
  });
  const pendingWasteTapRef = useRef<{
    index: number;
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);
  const pendingStockTapRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSingleTapAtRef = useRef(0);

  useEffect(() => {
    const { ended, won } = evaluateEnd(game, config, isSettingUp);
    if (ended !== game.ended || won !== game.won) {
      setGame((draft) => {
        draft.ended = ended;
        draft.won = won;
      });
    }
  }, [config, game, isSettingUp, setGame]);

  useEffect(
    () => () => {
      const pendingTap = pendingWasteTapRef.current;
      if (pendingTap) clearTimeout(pendingTap.timer);
      if (pendingStockTapRef.current) {
        clearTimeout(pendingStockTapRef.current);
      }
    },
    [],
  );

  function placeOnWaste(index: number) {
    if (game.ended || !top(game.stock)) return;
    const now = Date.now();
    if (now - lastSingleTapAtRef.current < DOUBLE_TAP_MS) return;

    lastSingleTapAtRef.current = now;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const moved = draft.stock.pop();
      if (!moved) return;
      draft.waste[index].push(flipToFace(moved));
      revealStockTop(draft.stock);
    });
  }

  function moveToFoundation(source: "stock" | "reserve" | number) {
    const pile =
      source === "stock"
        ? game.stock
        : source === "reserve"
          ? game.reserve
          : game.waste[source];
    const card = top(pile);
    if (game.ended || !card) return false;
    const target = foundationFor(game, card, config);
    if (target < 0) return false;

    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const from =
        source === "stock"
          ? draft.stock
          : source === "reserve"
            ? draft.reserve
            : draft.waste[source];
      const moved = from.pop();
      if (moved) draft.foundations[target].push(flipToFace(moved));
      if (source === "stock") revealStockTop(draft.stock);
    });
    return true;
  }

  function onWasteCardPress(index: number, isTopCard: boolean) {
    if (!isTopCard) {
      placeOnWaste(index);
      return;
    }

    const pendingTap = pendingWasteTapRef.current;
    const card = top(game.waste[index]);
    if (!card || foundationFor(game, card, config) === -1) {
      if (pendingTap) {
        clearTimeout(pendingTap.timer);
        pendingWasteTapRef.current = null;
        placeOnWaste(pendingTap.index);
      }
      placeOnWaste(index);
      return;
    }

    if (pendingTap?.index === index) {
      clearTimeout(pendingTap.timer);
      pendingWasteTapRef.current = null;
      moveToFoundation(index);
      return;
    }

    if (pendingTap) {
      clearTimeout(pendingTap.timer);
      placeOnWaste(pendingTap.index);
    }

    pendingWasteTapRef.current = {
      index,
      timer: setTimeout(() => {
        pendingWasteTapRef.current = null;
        placeOnWaste(index);
      }, DOUBLE_TAP_MS),
    };
  }

  function onStockCardPress() {
    const card = top(game.stock);
    if (game.ended || !card || foundationFor(game, card, config) === -1) return;

    if (pendingStockTapRef.current) {
      clearTimeout(pendingStockTapRef.current);
      pendingStockTapRef.current = null;
      moveToFoundation("stock");
      return;
    }

    pendingStockTapRef.current = setTimeout(() => {
      pendingStockTapRef.current = null;
    }, DOUBLE_TAP_MS);
  }

  const canRedeal =
    !game.ended &&
    game.stock.length === 0 &&
    game.redealsUsed < config.redeals &&
    game.waste.some((pile) => pile.length > 0);

  function redeal() {
    if (!canRedeal) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      // Picked up in order, so the next pass deals in the same sequence.
      draft.stock = draft.waste.flat().reverse().map(flipToBack);
      draft.waste = emptyPiles(config.wastePiles);
      draft.redealsUsed += 1;
      revealStockTop(draft.stock);
    });
  }

  const foundationTotal = game.foundations.reduce(
    (sum, pile) => sum + pile.length,
    0,
  );

  const zones: MapZone[] = useMemo(() => {
    const foundationCount = config.decks * 4;
    // The stock (and any reserve) sits in its own column on the right.
    const rightCol = Math.max(foundationCount - 1, config.wastePiles + 0.2);
    const wasteStart = rightCol - 0.2 - config.wastePiles;

    const foundationZones: MapZone[] = game.foundations.map((pile, i) => ({
      id: `foundation-${i}`,
      name: "foundation",
      pileIndex: i,
      cards: pile,
      col: i,
      row: 0,
      baseZIndex: 40,
      fan: { maxVisible: 3 },
      placeholder: {},
    }));

    const wasteZones: MapZone[] = game.waste.map((pile, i) => ({
      id: `waste-${i}`,
      name: "waste",
      pileIndex: i,
      cards: pile,
      col: wasteStart + i,
      row: WASTE_ROW,
      baseZIndex: 10 + i,
      fan: {
        direction: "down",
        offset: zoneFanOffset(
          pile.length,
          STOCK_ROW + 1 - WASTE_ROW,
          0.1,
          cardDims.tableauOffset,
        ),
        center: false,
      },
      placeholder: {},
    }));

    return [
      ...foundationZones,
      ...(config.reserveSize > 0
        ? [
            {
              id: "reserve",
              name: "reserve",
              cards: game.reserve,
              col: rightCol,
              row: WASTE_ROW + 0.35,
              fan: { maxVisible: 3 },
              baseZIndex: 100,
              placeholder: {
                text: i18n.t("cards:reserve"),
                infoPos: "above",
                showCount: true,
              },
            } as MapZone,
          ]
        : []),
      {
        id: "stock",
        name: "stock",
        cards: game.stock,
        col: rightCol,
        row: STOCK_ROW,
        fan: { maxVisible: 3 },
        baseZIndex: 100,
        placeholder: {
          text: i18n.t("cards:stock"),
          infoPos: "above",
          showCount: true,
        },
      },
      ...wasteZones,
    ];
  }, [config, game]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    const hasPlayableStock = !game.ended && !!top(game.stock);
    if (mappedCard.zoneName === "waste" && mappedCard.pileIndex !== undefined) {
      const index = mappedCard.pileIndex;
      return {
        isDisabled: game.ended,
        selectColor: hasPlayableStock ? "green" : "none",
        onPress: () => onWasteCardPress(index, mappedCard.topOfZone),
      };
    }
    if (mappedCard.zoneName === "stock" && mappedCard.topOfZone) {
      return {
        isDisabled: game.ended,
        onPress: onStockCardPress,
      };
    }
    if (mappedCard.zoneName === "reserve" && mappedCard.topOfZone) {
      return {
        isDisabled: game.ended,
        onPress: () => moveToFoundation("reserve"),
      };
    }
    return {};
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    const hasPlayableStock = !game.ended && !!top(game.stock);
    if (zone.name === "waste" && zone.pileIndex !== undefined) {
      const index = zone.pileIndex;
      return {
        onPress: () => placeOnWaste(index),
        isDisabled: !hasPlayableStock || zone.cards!.length > 0,
      };
    }
    if (zone.name === "stock") {
      return { onPress: redeal, isDisabled: !canRedeal };
    }
    return {};
  };

  const { cardMap } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper,
    cardSize: "tableau",
    fixedRows: STOCK_ROW + 1,
    gap: 0.14,
  });

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      reset={reset}
      isLoaded={isLoaded}
      score={foundationTotal}
      winLoseMessage={game.won ? config.winMessage() : config.loseMessage()}
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}
    </GameWrapper>
  );
}
