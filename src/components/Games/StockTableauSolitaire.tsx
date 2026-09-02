import { useStateManager } from "@/hooks/useStateManager";
import { DOUBLE_TAP_MS } from "@/utils/utils";
import { useEffect, useMemo, useState } from "react";
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
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";

export type StockTableauVariant =
  | "australian-patience"
  | "whitehead"
  | "easthaven"
  | "josephine"
  | "congress"
  | "westcliff"
  | "gargantua"
  | "harp"
  | "thumb-and-pouch"
  | "lucas"
  | "rank-and-file"
  | "indian"
  | "diplomat"
  | "maria"
  | "number-ten";

type BuildRule =
  | "alternating"
  | "same-color"
  | "same-suit"
  | "not-same-suit"
  | "rank";
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
  | { zone: "tableau"; pile: number; card: number }
  | { zone: "waste" }
  | null;

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
  "thumb-and-pouch": {
    decks: 1,
    foundations: 4,
    deal: { columns: 7, sizes: [1, 2, 3, 4, 5, 6, 7], faceUp: 1 },
    build: "not-same-suit",
    move: "built-run",
    empty: "any",
    stock: "waste",
    redeals: 2,
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
  const deck = shuffle(createDeck({ deckCount: config.decks }));
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
  const { isLoaded, game, setGame, reset, undo, canUndo, saveUndoState } =
    useStateManager<StockTableauState>({
      gameStateInitial: initial,
      resetNonGameStates: () => setSelected(null),
      resetAndSetup: async () => {
        setGame(createInitialState(variant));
      },
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

  function moveToTableau(destination: number) {
    if (
      !selected ||
      !selectedCard ||
      (selected.zone === "tableau" && selected.pile === destination) ||
      !isMovableRun(selectedCards, config.move, config) ||
      !canBuildTableau(selectedCard, top(game.tableau[destination]), config)
    ) {
      return false;
    }
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      draft.tableau[destination].push(...removeSelection(draft, selected));
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

  const zones: MapZone[] = useMemo(() => {
    const foundations: MapZone[] = game.foundations.map((pile, index) => ({
      id: `foundation-${index}`,
      name: "foundation",
      pileIndex: index,
      cards: pile,
      col:
        config.foundations > 4
          ? config.deal.columns - 4 + (index % 4)
          : config.deal.columns - config.foundations + index,
      row: config.foundations > 4 && index >= 4 ? 1.1 : 0,
      fan: { maxVisible: 1 },
      placeholder: {},
    }));
    const tableau: MapZone[] = game.tableau.map((pile, index) => ({
      id: `tableau-${index}`,
      name: "tableau",
      pileIndex: index,
      cards: pile,
      col: index,
      row: config.foundations > 4 ? 2.3 : 1.2,
      fan: { direction: "down", offset: cardDims.tableauOffset },
      placeholder: {},
    }));
    return [
      {
        id: "stock",
        name: "stock",
        cards: game.stock,
        col: 0,
        row: 0,
        fan: { maxVisible: 1 },
        placeholder: { text: "Stock", showCount: true },
      },
      ...(config.stock === "waste"
        ? [
            {
              id: "waste",
              name: "waste",
              cards: game.waste,
              col: 1,
              row: 0,
              fan: { maxVisible: 1 },
            } as MapZone,
          ]
        : []),
      ...foundations,
      ...tableau,
    ];
  }, [config, game]);

  const cardMapper = (card: MappedCard): AnimatedCardMapping | undefined => {
    if (card.zoneName === "stock" && card.topOfZone)
      return {
        onPress: drawStock,
        isDisabled:
          game.stock.length === 0 &&
          (game.waste.length === 0 || game.redealsUsed >= config.redeals),
      };
    if (card.zoneName === "waste" && card.topOfZone)
      return {
        onPress: () => setSelected({ zone: "waste" }),
        isSelected: selected?.zone === "waste",
        selectColor: "blue",
      };
    if (card.zoneName === "foundation") return {};
    if (card.zoneName === "tableau" && card.pileIndex !== undefined) {
      const inSelection =
        selected?.zone === "tableau" &&
        selected.pile === card.pileIndex &&
        card.cardIndex >= selected.card;
      return {
        isDisabled: game.ended || !card.card.faceUp,
        isSelected: inSelection,
        selectColor: "blue",
        onPress: () => onTableauPress(card.pileIndex!, card.cardIndex),
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
        onPress: () => setSelected({ zone: "waste" }),
        isDisabled: game.waste.length === 0,
      };
    if (zone.name === "foundation" && zone.pileIndex !== undefined)
      return {
        onPress: () => moveToFoundation(selected, zone.pileIndex),
        isDisabled: !selectedCard,
      };
    if (zone.name === "tableau" && zone.pileIndex !== undefined)
      return {
        onPress: () => moveToTableau(zone.pileIndex!),
        isDisabled: !selectedCard,
      };
    return {};
  };

  const { cardMap } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper,
    cardSize: "tableau",
    fixedCols: config.deal.columns,
    fixedRows: 7,
    gap: 0.12,
  });
  const score = game.foundations.reduce((sum, pile) => sum + pile.length, 0);
  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      reset={() => void reset()}
      isLoaded={isLoaded}
      score={score}
      canUndo={canUndo}
      undo={undo}
      winLoseMessage={game.won ? "Every suit is home!" : "No moves remain."}
      showDeviceRotateHint
    >
      {cardMap}
    </GameWrapper>
  );
}
