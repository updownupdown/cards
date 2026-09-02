import { useStateManager } from "@/hooks/useStateManager";
import { DOUBLE_TAP_MS } from "@/utils/utils";
import { useEffect, useMemo, useState } from "react";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import {
  cardDims,
  createDeck,
  rankValue,
  shuffle,
  top,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";

export type FanVariant = "la-belle-lucie" | "shamrocks" | "flower-garden";

type FanConfig = {
  tableauCount: number;
  tableauCards: number;
  reserveCards: number;
  redeals: number;
  maxPileSize?: number;
  emptyPile: "blocked" | "any";
  build: "down-suit" | "adjacent" | "down-any";
};

export type FanGameState = {
  tableau: PlayingCard[][];
  reserve: PlayingCard[];
  foundations: PlayingCard[][];
  redealsUsed: number;
  ended: boolean;
  won: boolean;
};

type Selection =
  | { zone: "tableau"; index: number }
  | { zone: "reserve"; index: number }
  | null;

const CONFIGS: Record<FanVariant, FanConfig> = {
  "la-belle-lucie": {
    tableauCount: 18,
    tableauCards: 52,
    reserveCards: 0,
    redeals: 2,
    emptyPile: "blocked",
    build: "down-suit",
  },
  shamrocks: {
    tableauCount: 18,
    tableauCards: 52,
    reserveCards: 0,
    redeals: 0,
    maxPileSize: 3,
    emptyPile: "blocked",
    build: "adjacent",
  },
  "flower-garden": {
    tableauCount: 6,
    tableauCards: 36,
    reserveCards: 16,
    redeals: 0,
    emptyPile: "any",
    build: "down-any",
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
  destinationSize: number,
  config: FanConfig,
) {
  if (!destination) return config.emptyPile === "any";
  if (config.maxPileSize && destinationSize >= config.maxPileSize) return false;

  if (config.build === "adjacent") {
    return Math.abs(rankValue(card) - rankValue(destination)) === 1;
  }

  const buildsDown = rankValue(card) === rankValue(destination) - 1;
  return (
    buildsDown &&
    (config.build === "down-any" || card.suit === destination.suit)
  );
}

function dealPiles(cards: PlayingCard[], count: number) {
  const piles = Array.from({ length: count }, () => [] as PlayingCard[]);
  cards.forEach((card, index) => {
    piles[Math.floor(index / 3)]?.push(card);
  });
  return piles;
}

function createInitialState(variant: FanVariant): FanGameState {
  const config = CONFIGS[variant];
  const deck = shuffle(createDeck({ faceUp: true }));
  const tableauCards = deck.slice(0, config.tableauCards);
  const tableau =
    variant === "flower-garden"
      ? Array.from({ length: config.tableauCount }, (_, index) =>
          tableauCards.slice(index * 6, index * 6 + 6),
        )
      : dealPiles(tableauCards, config.tableauCount);

  return {
    tableau,
    reserve: deck.slice(
      config.tableauCards,
      config.tableauCards + config.reserveCards,
    ),
    foundations: Array.from({ length: 4 }, () => [] as PlayingCard[]),
    redealsUsed: 0,
    ended: false,
    won: false,
  };
}

function getSelectedCard(state: FanGameState, selection: Selection) {
  if (!selection) return undefined;
  return selection.zone === "tableau"
    ? top(state.tableau[selection.index])
    : state.reserve[selection.index];
}

function hasAnyLegalMove(state: FanGameState, config: FanConfig) {
  if (
    state.redealsUsed < config.redeals &&
    state.tableau.some((pile) => pile.length > 0)
  ) {
    return true;
  }

  const sources = [
    ...state.tableau.flatMap((pile, index) => {
      const card = top(pile);
      return card ? [{ card, tableauIndex: index }] : [];
    }),
    ...state.reserve.map((card) => ({ card, tableauIndex: -1 })),
  ];

  return sources.some(({ card, tableauIndex }) => {
    if (
      state.foundations.some((foundation) =>
        canBuildFoundation(card, top(foundation)),
      )
    ) {
      return true;
    }
    return state.tableau.some((pile, index) => {
      if (index === tableauIndex) return false;
      return canBuildTableau(card, top(pile), pile.length, config);
    });
  });
}

function evaluate(state: FanGameState, config: FanConfig) {
  const won = state.foundations.every((pile) => pile.length === 13);
  return {
    ended: won || !hasAnyLegalMove(state, config),
    won,
  };
}

export const fanSolitaireRules = {
  configs: CONFIGS,
  canBuildFoundation,
  canBuildTableau,
  createInitialState,
  dealPiles,
  evaluate,
  hasAnyLegalMove,
};

export function FanSolitaire({ variant }: { variant: FanVariant }) {
  const config = CONFIGS[variant];
  const [selected, setSelected] = useState<Selection>(null);
  const [lastTap, setLastTap] = useState<{ key: string; at: number } | null>(
    null,
  );
  const gameStateInitial = useMemo(
    () => createInitialState(variant),
    [variant],
  );

  const { isLoaded, game, setGame, reset, undo, canUndo, saveUndoState } =
    useStateManager<FanGameState>({
      gameStateInitial,
      resetNonGameStates: () => {
        setSelected(null);
        setLastTap(null);
      },
      resetAndSetup: async () => {
        setGame(createInitialState(variant));
      },
    });

  useEffect(() => {
    const outcome = evaluate(game, config);
    if (outcome.ended !== game.ended || outcome.won !== game.won) {
      setGame((draft) => {
        draft.ended = outcome.ended;
        draft.won = outcome.won;
      });
    }
  }, [config, game, setGame]);

  const selectedCard = getSelectedCard(game, selected);

  function removeSelection(draft: FanGameState, source: Selection) {
    if (!source) return undefined;
    return source.zone === "tableau"
      ? draft.tableau[source.index].pop()
      : draft.reserve.splice(source.index, 1)[0];
  }

  function moveToTableau(destinationIndex: number) {
    if (
      !selectedCard ||
      (selected?.zone === "tableau" && selected.index === destinationIndex) ||
      !canBuildTableau(
        selectedCard,
        top(game.tableau[destinationIndex]),
        game.tableau[destinationIndex].length,
        config,
      )
    ) {
      return false;
    }

    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const card = removeSelection(draft, selected);
      if (card) draft.tableau[destinationIndex].push(card);
    });
    setSelected(null);
    return true;
  }

  function moveToFoundation(
    foundationIndex?: number,
    source: Selection = selected,
  ) {
    const sourceCard = getSelectedCard(game, source);
    if (!sourceCard) return false;
    const target =
      foundationIndex ??
      game.foundations.findIndex((foundation) =>
        canBuildFoundation(sourceCard, top(foundation)),
      );
    if (
      target < 0 ||
      !canBuildFoundation(sourceCard, top(game.foundations[target]))
    ) {
      return false;
    }

    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const card = removeSelection(draft, source);
      if (card) draft.foundations[target].push(card);
    });
    setSelected(null);
    return true;
  }

  function selectOrMove(next: Exclude<Selection, null>) {
    if (game.ended) return;
    const key = `${next.zone}-${next.index}`;
    const now = Date.now();
    if (lastTap?.key === key && now - lastTap.at < DOUBLE_TAP_MS) {
      setLastTap(null);
      if (moveToFoundation(undefined, next)) return;
    } else {
      setLastTap({ key, at: now });
    }

    if (!selected) {
      setSelected(next);
      return;
    }
    if (selected.zone === next.zone && selected.index === next.index) {
      setSelected(null);
      return;
    }
    if (next.zone === "tableau" && moveToTableau(next.index)) return;
    setSelected(next);
  }

  function redeal() {
    if (
      game.ended ||
      game.redealsUsed >= config.redeals ||
      !game.tableau.some((pile) => pile.length > 0)
    ) {
      return;
    }
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const remaining = shuffle(draft.tableau.flat());
      draft.tableau = dealPiles(remaining, config.tableauCount);
      draft.redealsUsed += 1;
    });
    setSelected(null);
  }

  const zones: MapZone[] = useMemo(() => {
    const foundationZones: MapZone[] = game.foundations.map((pile, index) => ({
      id: `foundation-${index}`,
      name: "foundation",
      pileIndex: index,
      cards: pile,
      col: 1 + index,
      row: 0,
      baseZIndex: 80 + index,
      fan: { maxVisible: 1 },
      placeholder: {},
    }));

    if (variant === "flower-garden") {
      const reserveZones: MapZone[] = game.reserve.map((card, index) => ({
        id: `reserve-${card.id}`,
        name: "reserve",
        pileIndex: index,
        cards: [card],
        col: index % 8,
        row: 1.15 + Math.floor(index / 8) * 1.1,
        baseZIndex: 50 + index,
      }));
      const tableauZones: MapZone[] = game.tableau.map((pile, index) => ({
        id: `tableau-${index}`,
        name: "tableau",
        pileIndex: index,
        cards: pile,
        col: 1 + index,
        row: 3.5,
        baseZIndex: 10 + index,
        fan: { direction: "down", offset: cardDims.tableauOffset },
        placeholder: {},
      }));
      return [...foundationZones, ...reserveZones, ...tableauZones];
    }

    const tableauZones: MapZone[] = game.tableau.map((pile, index) => ({
      id: `tableau-${index}`,
      name: "tableau",
      pileIndex: index,
      cards: pile,
      col: index % 6,
      row: 1.2 + Math.floor(index / 6) * 2,
      baseZIndex: 10 + index,
      fan: { direction: "down", offset: cardDims.tableauOffset },
      placeholder: { hideBackground: pile.length === 0 },
    }));
    const redealZone: MapZone[] = config.redeals
      ? [
          {
            id: "redeal",
            name: "redeal",
            cards: [],
            col: 5,
            row: 0,
            placeholder: {
              text: `Redeal ${config.redeals - game.redealsUsed}`,
              hideBackground: game.redealsUsed >= config.redeals,
            },
          },
        ]
      : [];
    return [...foundationZones, ...redealZone, ...tableauZones];
  }, [config, game, variant]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (
      mappedCard.zoneName === "foundation" &&
      mappedCard.pileIndex !== undefined
    ) {
      return {
        isDisabled: game.ended || !selectedCard,
        onPress: () => moveToFoundation(mappedCard.pileIndex),
      };
    }
    if (mappedCard.pileIndex === undefined) return {};

    const selection: Exclude<Selection, null> = {
      zone: mappedCard.zoneName === "reserve" ? "reserve" : "tableau",
      index: mappedCard.pileIndex,
    };
    const isSelected =
      selected?.zone === selection.zone && selected.index === selection.index;
    const canDrop =
      selection.zone === "tableau" &&
      !!selectedCard &&
      canBuildTableau(
        selectedCard,
        top(game.tableau[selection.index]),
        game.tableau[selection.index].length,
        config,
      );

    return {
      isDisabled: game.ended || !mappedCard.topOfZone,
      isSelected: mappedCard.topOfZone && isSelected,
      selectColor: canDrop ? "green" : "blue",
      onPress: () => selectOrMove(selection),
    };
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name === "redeal") {
      return {
        onPress: redeal,
        isDisabled: game.ended || game.redealsUsed >= config.redeals,
      };
    }
    if (zone.name === "foundation" && zone.pileIndex !== undefined) {
      return {
        onPress: () => moveToFoundation(zone.pileIndex),
        isDisabled: game.ended || !selectedCard,
      };
    }
    if (zone.name === "tableau" && zone.pileIndex !== undefined) {
      return {
        onPress: () => moveToTableau(zone.pileIndex!),
        isDisabled: game.ended || !selectedCard,
      };
    }
    return {};
  };

  const { cardMap } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper,
    cardSize: "tableau",
    fixedCols: variant === "flower-garden" ? 8 : 6,
    fixedRows: variant === "flower-garden" ? 7.2 : 7,
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
      winLoseMessage={
        game.won ? "The foundations are complete!" : "No moves remain."
      }
      showDeviceRotateHint
    >
      {cardMap}
    </GameWrapper>
  );
}
