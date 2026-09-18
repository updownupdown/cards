import { useStateManager } from "@/hooks/useStateManager";
import { useAutoComplete } from "@/hooks/useAutoComplete";
import { useGameColors } from "@/hooks/useGameColors";
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
import { StyleSheet, View } from "react-native";
import { Button } from "../Button/Button";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import {
  cardDims,
  createDeck,
  flipToBack,
  flipToFace,
  rankValue,
  shuffle,
  top,
  zoneFanOffset,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";

import { i18n } from "@/i18n";
export type FanVariant = "la-belle-lucie" | "shamrocks" | "flower-garden";

/**
 * A fan's offset, tightened once it would run into the next row of fans (or,
 * in Flower Garden, off the bottom of the board).
 */
function fanOffset(count: number, variant: FanVariant) {
  return zoneFanOffset(
    count,
    variant === "flower-garden" ? 3.7 : 1.8,
    cardDims.tableauOffsetMin,
    cardDims.tableauOffset,
  );
}

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
  setupPile: PlayingCard[];
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

type MoveSource = Exclude<Selection, null>;
type DropTarget =
  { zone: "tableau"; index: number } | { zone: "foundation"; index: number };

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
  return {
    setupPile: shuffle(createDeck()).map(flipToBack),
    tableau: Array.from(
      { length: config.tableauCount },
      () => [] as PlayingCard[],
    ),
    reserve: [],
    foundations: Array.from({ length: 4 }, () => [] as PlayingCard[]),
    redealsUsed: 0,
    ended: false,
    won: false,
  };
}

function dealFan(stock: PlayingCard[], variant: FanVariant): FanGameState {
  const config = CONFIGS[variant];
  const deck = stock.map(flipToFace);
  const tableauCards = deck.slice(0, config.tableauCards);
  const tableau =
    variant === "flower-garden"
      ? Array.from({ length: config.tableauCount }, (_, index) =>
          tableauCards.slice(index * 6, index * 6 + 6),
        )
      : dealPiles(tableauCards, config.tableauCount);

  return {
    setupPile: [],
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
  const { colorDark } = useGameColors();
  const [selected, setSelected] = useState<Selection>(null);
  const [lastTap, setLastTap] = useState<{ key: string; at: number } | null>(
    null,
  );
  const gameStateInitial = useMemo(
    () => createInitialState(variant),
    [variant],
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
  } = useStateManager<FanGameState>({
    gameStateInitial,
    resetNonGameStates: () => {
      setSelected(null);
      setLastTap(null);
      clearDragGhost();
    },
    resetAndSetup: async () => {
      setGame((draft) => {
        draft.setupPile = [
          ...draft.setupPile,
          ...draft.tableau.flat(),
          ...draft.reserve,
          ...draft.foundations.flat(),
        ].map(flipToBack);
        draft.tableau = Array.from(
          { length: config.tableauCount },
          () => [] as PlayingCard[],
        );
        draft.reserve = [];
        draft.foundations = Array.from(
          { length: 4 },
          () => [] as PlayingCard[],
        );
        draft.redealsUsed = 0;
        draft.ended = false;
        draft.won = false;
      });

      await delay();

      setGame((draft) => {
        const next = dealFan(shuffle(draft.setupPile), variant);
        draft.setupPile = next.setupPile;
        draft.tableau = next.tableau;
        draft.reserve = next.reserve;
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
        moveToFoundation(target.index, source);
      } else {
        moveToTableau(target.index, source);
      }
    },
    getDroppedCardIds: (source) => {
      const card = getSelectedCard(game, source);
      return card ? [card.id] : [];
    },
    getDropHitAreas: () => dropHitAreasRef.current,
    getSourceRect,
    getTapHandler,
  });

  // Once the reserve is empty and every remaining card can go straight to the
  // foundations, finish the game automatically.
  const { isAutoCompleting } = useAutoComplete({
    game,
    setGame,
    isSettingUp,
    won: game.won,
    isBlocked: !!dragGhost,
    getSources: (state) => (state.reserve.length === 0 ? state.tableau : null),
    getFoundations: (state) => state.foundations,
    canPlaceOnFoundation: canBuildFoundation,
    onStart: () => setSelected(null),
  });

  useEffect(() => {
    if (isSettingUp) return;
    const outcome = evaluate(game, config);
    if (outcome.ended !== game.ended || outcome.won !== game.won) {
      setGame((draft) => {
        draft.ended = outcome.ended;
        draft.won = outcome.won;
      });
    }
  }, [config, game, isSettingUp, setGame]);

  const selectedCard = getSelectedCard(game, selected);

  function removeSelection(draft: FanGameState, source: Selection) {
    if (!source) return undefined;
    return source.zone === "tableau"
      ? draft.tableau[source.index].pop()
      : draft.reserve.splice(source.index, 1)[0];
  }

  function canDropOnTarget(
    source: MoveSource,
    target: DropTarget,
    snapshot = game,
  ) {
    if (snapshot.ended) return false;
    const card = getSelectedCard(snapshot, source);
    if (!card) return false;

    if (target.zone === "foundation") {
      return canBuildFoundation(card, top(snapshot.foundations[target.index]));
    }

    return (
      !(source.zone === "tableau" && source.index === target.index) &&
      canBuildTableau(
        card,
        top(snapshot.tableau[target.index]),
        snapshot.tableau[target.index].length,
        config,
      )
    );
  }

  function moveToTableau(
    destinationIndex: number,
    source: Selection = selected,
  ) {
    const sourceCard = getSelectedCard(game, source);
    if (
      !sourceCard ||
      (source?.zone === "tableau" && source.index === destinationIndex) ||
      !canBuildTableau(
        sourceCard,
        top(game.tableau[destinationIndex]),
        game.tableau[destinationIndex].length,
        config,
      )
    ) {
      return false;
    }

    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const card = removeSelection(draft, source);
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
    const setupZone: MapZone = {
      id: "setup",
      name: "setup",
      cards: game.setupPile,
      col: 0,
      row: 0,
      baseZIndex: 1,
      fan: { maxVisible: 3 },
    };
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
        fan: { direction: "down", offset: fanOffset(pile.length, variant) },
        placeholder: {},
      }));
      return [setupZone, ...foundationZones, ...reserveZones, ...tableauZones];
    }

    const tableauZones: MapZone[] = game.tableau.map((pile, index) => ({
      id: `tableau-${index}`,
      name: "tableau",
      pileIndex: index,
      cards: pile,
      col: index % 6,
      row: 1.2 + Math.floor(index / 6) * 2,
      baseZIndex: 10 + index,
      fan: { direction: "down", offset: fanOffset(pile.length, variant) },
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
          },
        ]
      : [];
    return [setupZone, ...foundationZones, ...redealZone, ...tableauZones];
  }, [config, game, variant]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    const isBeingDragged = draggedCardIds?.has(mappedCard.card.id) ?? false;
    const animDuration = justDroppedCardIds.current?.has(mappedCard.card.id)
      ? 0
      : undefined;

    if (mappedCard.zoneName === "setup") {
      return {
        isDisabled: true,
        isSelected: false,
        selectColor: "none",
        forceSelectColor: false,
        forceOverlayColor: false,
        isVisible: !isBeingDragged,
        animDuration,
      };
    }
    if (
      mappedCard.zoneName === "foundation" &&
      mappedCard.pileIndex !== undefined
    ) {
      const isHoverTarget =
        !!dragGhost &&
        mappedCard.topOfZone &&
        hoverTarget?.zone === "foundation" &&
        hoverTarget.index === mappedCard.pileIndex;
      return {
        isDisabled: game.ended || !selectedCard || !!dragGhost,
        onPress: () => moveToFoundation(mappedCard.pileIndex),
        isSelected: isHoverTarget,
        selectColor: "green",
        isVisible: !isBeingDragged,
        animDuration,
      };
    }
    if (mappedCard.pileIndex === undefined)
      return { isVisible: !isBeingDragged, animDuration };

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
    const isHoverTarget =
      !!dragGhost &&
      selection.zone === "tableau" &&
      mappedCard.topOfZone &&
      hoverTarget?.zone === "tableau" &&
      hoverTarget.index === selection.index;

    return {
      isDisabled: game.ended || !mappedCard.topOfZone,
      isSelected: (mappedCard.topOfZone && isSelected) || isHoverTarget,
      selectColor: isHoverTarget || canDrop ? "green" : "blue",
      onPress: () => selectOrMove(selection),
      isVisible: !isBeingDragged,
      animDuration,
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
        isDisabled: game.ended || !selectedCard || !!dragGhost,
        isSelected:
          !!dragGhost &&
          hoverTarget?.zone === "foundation" &&
          hoverTarget.index === zone.pileIndex,
        selectColor: "green",
      };
    }
    if (zone.name === "tableau" && zone.pileIndex !== undefined) {
      return {
        onPress: () => moveToTableau(zone.pileIndex!),
        isDisabled: game.ended || !selectedCard || !!dragGhost,
        isSelected:
          !!dragGhost &&
          zone.cards?.length === 0 &&
          hoverTarget?.zone === "tableau" &&
          hoverTarget.index === zone.pileIndex,
        selectColor: "green",
      };
    }
    return {};
  };

  const { cardMap, getZoneStylesById, getZoneBasePos, cardWidth, cardHeight } =
    useCardMap({
      game,
      zones,
      cardMapper,
      zoneMapper,
      cardSize: "tableau",
      fixedCols: variant === "flower-garden" ? 8 : 6,
      fixedRows: variant === "flower-garden" ? 7.2 : 7,
      gap: 0.12,
    });

  function getSourceRect(source: MoveSource) {
    const zone = zones.find(
      (entry) => entry.name === source.zone && entry.pileIndex === source.index,
    );
    if (!zone) return null;
    const base = getZoneBasePos(zone);
    const pileLength =
      source.zone === "tableau" ? game.tableau[source.index].length : 1;
    return createRect(
      base.x,
      base.y +
        Math.max(0, pileLength - 1) *
          fanOffset(pileLength, variant) *
          cardHeight,
      cardWidth,
      cardHeight,
    );
  }

  const cardHitAreas = useMemo<CardHitArea<MoveSource>[]>(() => {
    const areas: CardHitArea<MoveSource>[] = [];

    zones.forEach((zone) => {
      if (
        (zone.name !== "tableau" && zone.name !== "reserve") ||
        zone.pileIndex === undefined ||
        !zone.cards?.length
      ) {
        return;
      }

      const base = getZoneBasePos(zone);
      const cardIndex = zone.cards.length - 1;
      areas.push({
        source: { zone: zone.name, index: zone.pileIndex },
        rect: createRect(
          base.x,
          base.y +
            cardIndex * fanOffset(zone.cards.length, variant) * cardHeight,
          cardWidth,
          cardHeight,
        ),
        priority: zone.name === "reserve" ? 90 : 10 + zone.cards.length,
      });
    });

    return areas;
  }, [cardHeight, cardWidth, getZoneBasePos, variant, zones]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => updateBoardOffset());
    return () => cancelAnimationFrame(frame);
  }, [windowWidth, windowHeight, zones.length, cardWidth, cardHeight]);

  const dropHitAreas = useMemo<DropHitArea<DropTarget>[]>(() => {
    const areas: DropHitArea<DropTarget>[] = [];

    zones.forEach((zone) => {
      if (
        (zone.name !== "tableau" && zone.name !== "foundation") ||
        zone.pileIndex === undefined
      ) {
        return;
      }

      const base = getZoneBasePos(zone);
      const pile =
        zone.name === "tableau"
          ? game.tableau[zone.pileIndex]
          : game.foundations[zone.pileIndex];
      const height =
        zone.name === "tableau"
          ? cardHeight +
            Math.max(0, pile.length - 1) *
              fanOffset(pile.length, variant) *
              cardHeight
          : cardHeight;

      areas.push({
        target: { zone: zone.name, index: zone.pileIndex },
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
    game,
    getZoneBasePos,
    zones,
  ]);

  dropHitAreasRef.current = dropHitAreas;

  function startGhostDrag(source: MoveSource) {
    if (game.ended) return;
    const card = getSelectedCard(game, source);
    const rect = getSourceRect(source);
    if (!card || !rect) return;
    startDrag(source, [card], { x: rect.x, y: rect.y });
  }

  function getTapHandler(source: MoveSource) {
    return () => selectOrMove(source);
  }

  const interactionTargets = useMemo(
    () =>
      cardHitAreas.map(({ source, rect }) => (
        <DragHandle
          key={`${source.zone}-${source.index}`}
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
          ? i18n.t("games:fanSolitaire.theFoundationsAreComplete")
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

        {config.redeals > 0 && (
          <View style={[getZoneStylesById("redeal")]}>
            <Button
              text={i18n.t("cards:redeal", {
                value: config.redeals - game.redealsUsed,
              })}
              size="xs"
              onPress={redeal}
              disabled={
                isSettingUp || game.ended || game.redealsUsed >= config.redeals
              }
              style={{ flex: 1 }}
              theme={colorDark}
            />
          </View>
        )}

        <View
          style={{
            ...StyleSheet.absoluteFillObject,
            zIndex: 3000,
            touchAction: "none",
            overscrollBehaviorX: "contain",
            pointerEvents: "box-none",
          }}
        >
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
