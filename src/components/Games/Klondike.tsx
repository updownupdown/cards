import {
  CardHitArea,
  createRect,
  DropHitArea,
  pointInRect,
  useDragDrop,
} from "@/hooks/useDragDrop";
import { useGameSettingValue } from "@/hooks/useGameSettingValue";
import { useStateManager } from "@/hooks/useStateManager";
import { useViewportDimensions } from "@/hooks/useViewportDimensions";
import { useNavigation } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GestureResponderEvent } from "react-native";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import { Card } from "../Cards/Card";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import {
  cardDims,
  isRed,
  PlayingCard,
  RANK_VALUE,
  RANKS,
  shuffle,
  SUITS,
} from "../Cards/card-utils";
import { GameWrapper } from "../common/GameWrapper";
import { DOUBLE_TAP_MS } from "@/utils/utils";

type GameState = {
  tableau: PlayingCard[][];
  stock: PlayingCard[];
  waste: PlayingCard[];
  foundations: PlayingCard[][];
  drawCount: 1 | 3;
};

type Selection =
  | { zone: "stock" }
  | { zone: "waste" }
  | { zone: "tableau"; pileIndex: number; cardIndex: number }
  | { zone: "foundation"; pileIndex: number }
  | null;

type MoveSource = Exclude<Selection, null | { zone: "stock" }>;

type DropTarget =
  | { zone: "tableau"; pileIndex: number }
  | { zone: "foundation"; pileIndex: number };

function canPlaceOnTableau(card: PlayingCard, destinationTop?: PlayingCard) {
  if (!destinationTop) return card.rank === "K";

  return (
    isRed(card.suit) !== isRed(destinationTop.suit) &&
    RANK_VALUE[card.rank] + 1 === RANK_VALUE[destinationTop.rank]
  );
}

function canPlaceOnFoundation(card: PlayingCard, destinationTop?: PlayingCard) {
  if (!destinationTop) return card.rank === "A";

  return (
    card.suit === destinationTop.suit &&
    RANK_VALUE[card.rank] === RANK_VALUE[destinationTop.rank] + 1
  );
}

function isValidTableauRun(cards: readonly PlayingCard[]) {
  if (cards.length <= 1) return true;

  for (let index = 0; index < cards.length - 1; index += 1) {
    const current = cards[index];
    const next = cards[index + 1];

    if (isRed(current.suit) === isRed(next.suit)) return false;
    if (RANK_VALUE[current.rank] !== RANK_VALUE[next.rank] + 1) return false;
  }

  return true;
}

function revealLastIfNeeded(pile: readonly PlayingCard[]) {
  if (pile.length === 0) return [];

  const last = pile[pile.length - 1];
  if (last.faceUp) return [...pile];

  return [...pile.slice(0, -1), { ...last, faceUp: true }];
}

export const klondikeRules = {
  canPlaceOnTableau,
  canPlaceOnFoundation,
  isValidTableauRun,
  revealLastIfNeeded,
};

function createInitialState(drawCount: 1 | 3 = 1): GameState {
  const fullDeck = shuffle(
    SUITS.flatMap((suit) =>
      RANKS.map((rank) => ({
        id: `${suit}-${rank}-${Math.random().toString(36).slice(2, 8)}`,
        suit,
        rank,
        faceUp: false,
      })),
    ),
  );

  const tableau: PlayingCard[][] = Array.from({ length: 7 }, () => []);
  let cursor = 0;

  for (let pile = 0; pile < 7; pile += 1) {
    for (let depth = 0; depth <= pile; depth += 1) {
      const baseCard = fullDeck[cursor++];
      tableau[pile].push({
        ...baseCard,
        faceUp: depth === pile,
      });
    }
  }

  return {
    tableau,
    stock: fullDeck.slice(cursor),
    waste: [],
    foundations: Array.from({ length: 4 }, () => [] as PlayingCard[]),
    drawCount,
  };
}

const gameStateInitial = createInitialState();

export default function Klondike() {
  const configuredDrawCount = useGameSettingValue("drawCount");

  const navigation = useNavigation();
  const [selected, setSelected] = useState<Selection>(null);
  const [hoverTarget, setHoverTarget] = useState<DropTarget | null>(null);
  const [lastTap, setLastTap] = useState<{ key: string; at: number } | null>(
    null,
  );

  const { isLoaded, game, setGame, reset, undo, canUndo, saveUndoState } =
    useStateManager<GameState>({
      gameStateInitial,
      resetNonGameStates: () => {
        setSelected(null);
        setLastTap(null);
        clearDragGhost();
      },
      resetAndSetup: async () => {
        setGame(createInitialState(configuredDrawCount));
      },
    });

  const { width: windowWidth, height: windowHeight } = useViewportDimensions();

  // Pre-computed drop areas are written here each render so the hook's
  // findDropTarget closure always reads the latest values without forward-ref issues.
  const dropHitAreasRef = useRef<DropHitArea<DropTarget>[]>([]);

  const handleHoverTargetChange = useCallback((next: DropTarget | null) => {
    setHoverTarget((prev) => (sameDropTarget(prev, next) ? prev : next));
  }, []);

  const {
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
    findDropTarget: (pageX, pageY) => {
      const hit = [...dropHitAreasRef.current]
        .filter(({ rect }) => pointInRect(pageX, pageY, rect))
        .sort((a, b) => b.priority - a.priority)[0];
      return hit?.target ?? null;
    },
    canDropOnTarget,
    sameTarget: sameDropTarget,
    onSuccessfulDrop: async (source, target) => {
      if (target.zone === "foundation") {
        await moveSourceToFoundation(source, target.pileIndex);
      } else {
        moveSourceToTableau(source, target.pileIndex);
      }
    },
    getDroppedCardIds: (source) =>
      getSourceCards(source, game).map((c) => c.id),
    getDropHitAreas: () => dropHitAreasRef.current,
    getSourceRect,
    onHoverTargetChange: handleHoverTargetChange,
  });

  const wasteTop = game.waste[game.waste.length - 1];

  const zones: MapZone[] = useMemo(() => {
    const tableauZones: MapZone[] = game.tableau.map((pile, pileIndex) => ({
      id: `tableau-${pileIndex}`,
      name: "tableau",
      pileIndex,
      cards: pile,
      col: pileIndex,
      row: 1.4,
      baseZIndex: 10 + pileIndex,
      fan: { direction: "down", offset: cardDims.tableauOffset },
      placeholder: { showCount: false },
    }));
    const foundationZones: MapZone[] = game.foundations.map(
      (pile, pileIndex) => ({
        id: `foundation-${pileIndex}`,
        name: "foundation",
        pileIndex,
        cards: pile,
        col: 3 + pileIndex,
        row: 0,
        baseZIndex: 20 + pileIndex,
        fan: { maxVisible: 1 },
        placeholder: {},
      }),
    );

    return [
      {
        id: "stock",
        name: "stock",
        cards: game.stock,
        pileIndex: 0,
        col: 0,
        row: 0,
        baseZIndex: 40,
        fan: { maxVisible: 3 },
        placeholder: { text: "Draw", infoPos: "below" },
      },
      {
        id: "waste",
        name: "waste",
        cards: game.waste,
        pileIndex: 0,
        col: 1,
        row: 0,
        baseZIndex: 30,
        fan: { maxVisible: 3 },
        placeholder: { text: "Waste", infoPos: "below" },
      },
      ...foundationZones,
      ...tableauZones,
    ];
  }, [game]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    const isBeingDragged = draggedCardIds?.has(mappedCard.card.id) ?? false;
    const animDuration =
      justDroppedCardIds.current?.has(mappedCard.card.id) === true
        ? 0
        : undefined;

    if (mappedCard.zoneName === "waste") {
      return {
        selectColor: "blue",
        isSelected: selected?.zone === "waste",
        isVisible: !isBeingDragged,
        animDuration: animDuration,
      };
    }

    if (mappedCard.zoneName === "stock" && mappedCard.topOfZone) {
      return {
        selectColor: "blue",
        isSelected: selected?.zone === "stock",
        onPress: drawFromStock,
        isDisabled: game.stock.length === 0 && game.waste.length === 0,
        isVisible: !isBeingDragged,
        animDuration: animDuration,
      };
    }

    if (
      mappedCard.zoneName === "foundation" &&
      mappedCard.pileIndex !== undefined
    ) {
      const isHoverTargetTop =
        !!dragGhost &&
        mappedCard.topOfZone &&
        hoverTarget?.zone === "foundation" &&
        hoverTarget.pileIndex === mappedCard.pileIndex;

      return {
        selectColor: isHoverTargetTop ? "green" : "none",
        isSelected: isHoverTargetTop,
        isVisible: !isBeingDragged,
        animDuration: animDuration,
      };
    }

    if (
      mappedCard.zoneName === "tableau" &&
      mappedCard.pileIndex !== undefined
    ) {
      const isSelected =
        mappedCard.topOfZone &&
        selected?.zone === "tableau" &&
        selected.pileIndex === mappedCard.pileIndex;
      const isHoverTargetTop =
        !!dragGhost &&
        mappedCard.topOfZone &&
        hoverTarget?.zone === "tableau" &&
        hoverTarget.pileIndex === mappedCard.pileIndex;
      const isFaceUp = mappedCard.card?.faceUp ?? false;
      return {
        selectColor: isHoverTargetTop ? "green" : isSelected ? "blue" : "none",
        isSelected: isSelected || isHoverTargetTop,
        isDisabled: !isFaceUp,
        isVisible: !isBeingDragged,
        animDuration: animDuration,
      };
    }

    return undefined;
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name === "stock") {
      return {
        onPress: drawFromStock,
        isDisabled: game.stock.length === 0 && game.waste.length === 0,
        isSelected: selected?.zone === "stock",
      };
    }

    if (zone.name === "waste") {
      return {
        onPress: onWastePress,
        isDisabled: !wasteTop || !!dragGhost,
        isSelected: selected?.zone === "waste",
      };
    }

    if (zone.name === "foundation" && zone.pileIndex !== undefined) {
      const isHoverDropTarget =
        !!dragGhost &&
        hoverTarget?.zone === "foundation" &&
        hoverTarget.pileIndex === zone.pileIndex;

      return {
        isDisabled: !!dragGhost,
        isSelected: isHoverDropTarget,
        selectColor: isHoverDropTarget ? "green" : "none",
      };
    }

    if (zone.name === "tableau" && zone.pileIndex !== undefined) {
      const isSelected =
        selected?.zone === "tableau" && selected.pileIndex === zone.pileIndex;
      const isHoverDropTarget =
        !!dragGhost &&
        hoverTarget?.zone === "tableau" &&
        hoverTarget.pileIndex === zone.pileIndex;
      return {
        onPress: () => onEmptyTableauPress(zone.pileIndex!),
        isDisabled: !selected || !!dragGhost,
        isSelected:
          isSelected || (isHoverDropTarget && zone.cards?.length === 0),
        selectColor: isHoverDropTarget ? "green" : "blue",
      };
    }

    return undefined;
  };

  const { cardMap, getZoneBasePos, cardWidth, cardHeight } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper,
    cardSize: "small",
    fixedRows: 6.5,
    gap: 0.16,
  });

  const stockTapRect = useMemo(() => {
    const stockZone = zones.find((zone) => zone.name === "stock");
    if (!stockZone) return null;
    const pos = getZoneBasePos(stockZone);
    return createRect(pos.x, pos.y, cardWidth, cardHeight);
  }, [cardHeight, cardWidth, getZoneBasePos, zones]);

  function getSourceRect(source: MoveSource) {
    const zone = zones.find((entry) => {
      if (source.zone === "waste") return entry.name === "waste";
      if (source.zone === "foundation") {
        return (
          entry.name === "foundation" && entry.pileIndex === source.pileIndex
        );
      }
      return entry.name === "tableau" && entry.pileIndex === source.pileIndex;
    });

    if (!zone) return null;

    const base = getZoneBasePos(zone);

    if (source.zone === "tableau") {
      return createRect(
        base.x,
        base.y + source.cardIndex * cardDims.tableauOffset * cardHeight,
        cardWidth,
        cardHeight,
      );
    }

    return createRect(base.x, base.y, cardWidth, cardHeight);
  }

  const cardHitAreas = useMemo<CardHitArea<MoveSource>[]>(() => {
    const areas: CardHitArea<MoveSource>[] = [];

    zones.forEach((zone) => {
      const zoneRect = getZoneBasePos(zone);

      if (zone.name === "waste") {
        const top = game.waste[game.waste.length - 1];
        if (top) {
          areas.push({
            source: { zone: "waste" },
            rect: createRect(zoneRect.x, zoneRect.y, cardWidth, cardHeight),
            priority: 100,
          });
        }
        return;
      }

      if (zone.name === "foundation" && zone.pileIndex !== undefined) {
        areas.push({
          source: { zone: "foundation", pileIndex: zone.pileIndex },
          rect: createRect(zoneRect.x, zoneRect.y, cardWidth, cardHeight),
          priority: 90,
        });
        return;
      }

      if (zone.name === "tableau" && zone.pileIndex !== undefined) {
        const pile = game.tableau[zone.pileIndex];

        pile.forEach((card, cardIndex) => {
          if (!card.faceUp) return;

          areas.push({
            source: {
              zone: "tableau",
              pileIndex: zone.pileIndex!,
              cardIndex,
            },
            rect: createRect(
              zoneRect.x,
              zoneRect.y + cardIndex * cardDims.tableauOffset * cardHeight,
              cardWidth,
              cardHeight,
            ),
            priority: 10 + cardIndex,
          });
        });
      }
    });

    return areas;
  }, [cardHeight, cardWidth, game, getZoneBasePos, zones]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      updateBoardOffset();
    });
    return () => cancelAnimationFrame(frame);
  }, [windowWidth, windowHeight, zones.length, cardWidth, cardHeight]);

  const dropHitAreas = useMemo<DropHitArea<DropTarget>[]>(() => {
    const areas: DropHitArea<DropTarget>[] = [];

    zones.forEach((zone) => {
      const zoneRect = getZoneBasePos(zone);

      if (zone.name === "foundation" && zone.pileIndex !== undefined) {
        areas.push({
          target: { zone: "foundation", pileIndex: zone.pileIndex },
          rect: createRect(
            zoneRect.x + boardPageOffset.x,
            zoneRect.y + boardPageOffset.y,
            cardWidth,
            cardHeight,
          ),
          priority: 90,
        });
        return;
      }

      if (zone.name === "tableau" && zone.pileIndex !== undefined) {
        const pile = game.tableau[zone.pileIndex];
        const pileHeight =
          cardHeight +
          Math.max(0, pile.length - 1) * cardDims.tableauOffset * cardHeight;

        areas.push({
          target: { zone: "tableau", pileIndex: zone.pileIndex },
          rect: createRect(
            zoneRect.x + boardPageOffset.x,
            zoneRect.y + boardPageOffset.y,
            cardWidth,
            pileHeight,
          ),
          priority: 50 + pile.length,
        });
      }
    });

    return areas;
  }, [
    boardPageOffset.x,
    boardPageOffset.y,
    cardHeight,
    cardWidth,
    game.tableau,
    getZoneBasePos,
    zones,
  ]);

  // Keep ref in sync so the hook's findDropTarget always sees fresh areas.
  dropHitAreasRef.current = dropHitAreas;

  const won = useMemo(
    () => game.foundations.every((pile) => pile.length === 13),
    [game.foundations],
  );

  useEffect(() => {
    navigation.setOptions({ gestureEnabled: false });

    return () => {
      navigation.setOptions({ gestureEnabled: true });
    };
  }, [navigation]);

  function clearSelection() {
    setSelected(null);
  }

  function getSourceCards(source: MoveSource, snapshot: GameState) {
    if (source.zone === "waste") {
      const top = snapshot.waste[snapshot.waste.length - 1];
      return top ? [top] : [];
    }

    if (source.zone === "foundation") {
      const top =
        snapshot.foundations[source.pileIndex][
          snapshot.foundations[source.pileIndex].length - 1
        ];
      return top ? [top] : [];
    }

    const pile = snapshot.tableau[source.pileIndex];
    const cards = pile.slice(source.cardIndex);
    if (cards.length === 0 || !cards[0].faceUp) return [];

    return cards;
  }

  function startGhostDrag(source: MoveSource, event: GestureResponderEvent) {
    const cards = getSourceCards(source, game);
    if (cards.length === 0) return;

    if (source.zone === "tableau" && !isValidTableauRun(cards)) {
      return;
    }

    const rect = getSourceRect(source);
    if (!rect) return;

    startDrag(source, cards, { x: rect.x, y: rect.y });
  }

  function drawFromStock() {
    if (dragGhost) {
      clearDragGhost();
    }

    if (game.stock.length === 0 && game.waste.length === 0) {
      clearSelection();
      return;
    }

    saveUndoState(structuredClone(game));
    setGame((draft) => {
      if (draft.stock.length > 0) {
        const drawTotal = Math.min(draft.drawCount, draft.stock.length);
        for (let i = 0; i < drawTotal; i += 1) {
          const top = draft.stock[draft.stock.length - 1];
          if (!top) return;
          draft.stock = draft.stock.slice(0, -1);
          draft.waste.push({ ...top, faceUp: true });
        }
        return;
      }

      draft.stock = draft.waste
        .slice()
        .reverse()
        .map((card) => ({ ...card, faceUp: false }));
      draft.waste = [];
    });

    clearSelection();
  }

  function canMoveSourceToFoundation(
    source: MoveSource,
    targetPileIndex: number,
    snapshot: GameState,
  ) {
    const movingCards = getSourceCards(source, snapshot);
    if (movingCards.length !== 1) return false;

    const moving = movingCards[0];

    if (source.zone === "tableau") {
      const pile = snapshot.tableau[source.pileIndex];
      if (source.cardIndex !== pile.length - 1) return false;
      if (!moving.faceUp) return false;
    }

    const targetTop =
      snapshot.foundations[targetPileIndex][
        snapshot.foundations[targetPileIndex].length - 1
      ];

    return canPlaceOnFoundation(moving, targetTop);
  }

  function moveSourceToFoundation(source: MoveSource, targetPileIndex: number) {
    if (!canMoveSourceToFoundation(source, targetPileIndex, game)) {
      clearSelection();
      return;
    }

    saveUndoState(structuredClone(game));
    setGame((draft) => {
      let moving: PlayingCard | null = null;

      if (source.zone === "waste") {
        moving = draft.waste[draft.waste.length - 1] ?? null;
        if (!moving) return;
        draft.waste.pop();
      } else if (source.zone === "foundation") {
        if (source.pileIndex === targetPileIndex) return;
        moving =
          draft.foundations[source.pileIndex][
            draft.foundations[source.pileIndex].length - 1
          ] ?? null;
        if (!moving) return;
        draft.foundations[source.pileIndex].pop();
      } else {
        const sourcePile = draft.tableau[source.pileIndex];
        if (source.cardIndex !== sourcePile.length - 1) return;
        moving = sourcePile[sourcePile.length - 1] ?? null;
        if (!moving || !moving.faceUp) return;
        sourcePile.pop();
        draft.tableau[source.pileIndex] = revealLastIfNeeded(sourcePile);
      }

      if (!moving) {
        return;
      }

      const targetPile = draft.foundations[targetPileIndex];
      const top = targetPile[targetPile.length - 1];
      if (!canPlaceOnFoundation(moving, top)) {
        return;
      }

      targetPile.push({ ...moving, faceUp: true });
    });

    clearSelection();
  }

  function moveSourceToTableau(source: MoveSource, destinationIndex: number) {
    if (
      !canDropOnTarget(source, { zone: "tableau", pileIndex: destinationIndex })
    ) {
      clearSelection();
      return;
    }

    saveUndoState(structuredClone(game));
    setGame((draft) => {
      let movingCards: PlayingCard[] = [];

      if (source.zone === "waste") {
        const top = draft.waste[draft.waste.length - 1];
        if (!top) return;
        movingCards = [top];
        draft.waste.pop();
      } else if (source.zone === "foundation") {
        const sourcePile = draft.foundations[source.pileIndex];
        const top = sourcePile[sourcePile.length - 1];
        if (!top) return;
        movingCards = [top];
        sourcePile.pop();
      } else {
        const sourcePile = draft.tableau[source.pileIndex];
        movingCards = sourcePile.slice(source.cardIndex);

        if (movingCards.length === 0 || !movingCards[0].faceUp) {
          return;
        }

        if (!isValidTableauRun(movingCards)) {
          return;
        }

        draft.tableau[source.pileIndex] = revealLastIfNeeded(
          sourcePile.slice(0, source.cardIndex),
        );
      }

      const destinationPile = draft.tableau[destinationIndex];
      const destinationTop = destinationPile[destinationPile.length - 1];
      if (!canPlaceOnTableau(movingCards[0], destinationTop)) {
        return;
      }

      destinationPile.push(
        ...movingCards.map((card) => ({ ...card, faceUp: true })),
      );
    });

    clearSelection();
  }

  async function tryAutoFoundation(source: MoveSource) {
    const targetPileIndex = game.foundations.findIndex((_, pileIndex) =>
      canMoveSourceToFoundation(source, pileIndex, game),
    );

    if (targetPileIndex < 0) return;
    moveSourceToFoundation(source, targetPileIndex);
  }

  function onWastePress() {
    if (!wasteTop || dragGhost) {
      clearSelection();
      return;
    }

    const now = Date.now();
    if (lastTap?.key === "waste" && now - lastTap.at < DOUBLE_TAP_MS) {
      setLastTap(null);
      void tryAutoFoundation({ zone: "waste" });
      return;
    }

    setLastTap({ key: "waste", at: now });

    if (!selected) {
      setSelected({ zone: "waste" });
      return;
    }

    clearSelection();
  }

  function onTableauCardPress(pileIndex: number, cardIndex: number) {
    if (dragGhost) {
      clearSelection();
      return;
    }

    const card = game.tableau[pileIndex][cardIndex];
    if (!card.faceUp) return;

    const now = Date.now();
    const tapKey = `tableau-${pileIndex}-${cardIndex}`;

    if (lastTap?.key === tapKey && now - lastTap.at < DOUBLE_TAP_MS) {
      setLastTap(null);
      void tryAutoFoundation({ zone: "tableau", pileIndex, cardIndex });
      return;
    }

    setLastTap({ key: tapKey, at: now });

    if (selected?.zone === "stock") {
      clearSelection();
      return;
    }

    if (!selected) {
      setSelected({ zone: "tableau", pileIndex, cardIndex });
      return;
    }

    moveSourceToTableau(selected, pileIndex);
  }

  function onEmptyTableauPress(pileIndex: number) {
    if (selected?.zone === "stock") {
      clearSelection();
      return;
    }

    if (!selected || dragGhost) return;
    moveSourceToTableau(selected, pileIndex);
  }

  function sameDropTarget(a: DropTarget | null, b: DropTarget | null) {
    if (!a || !b) return a === b;
    if (a.zone !== b.zone) return false;
    if (a.zone === "tableau" && b.zone === "tableau") {
      return a.pileIndex === b.pileIndex;
    }
    return (
      a.zone === "foundation" &&
      b.zone === "foundation" &&
      a.pileIndex === b.pileIndex
    );
  }

  function canDropOnTarget(
    source: MoveSource,
    target: DropTarget,
    snapshot = game,
  ) {
    if (target.zone === "foundation") {
      return canMoveSourceToFoundation(source, target.pileIndex, snapshot);
    }

    const movingCards = getSourceCards(source, snapshot);
    if (movingCards.length === 0) return false;
    if (source.zone === "tableau" && !isValidTableauRun(movingCards))
      return false;

    const destinationPile = snapshot.tableau[target.pileIndex];
    const destinationTop = destinationPile[destinationPile.length - 1];
    return canPlaceOnTableau(movingCards[0], destinationTop);
  }

  function makeHandlers(source: MoveSource, onTap?: () => void) {
    return makeDragHandlers(source, startGhostDrag, onTap);
  }

  const ghostLeft = dragGhost ? dragGhost.origin.x : 0;
  const ghostTop = dragGhost ? dragGhost.origin.y : 0;
  const ghostHasValidDrop = !!dragGhost && hoverTarget !== null;

  const tapHandlerResolverRef = useRef(
    (_source: MoveSource): (() => void) =>
      () => {},
  );
  tapHandlerResolverRef.current = (source: MoveSource) => {
    if (source.zone === "waste") {
      return onWastePress;
    }

    if (source.zone === "foundation") {
      return () => {};
    }

    return () => onTableauCardPress(source.pileIndex, source.cardIndex);
  };

  const interactionTargets = useMemo(
    () =>
      cardHitAreas.map((hit) => {
        const source = hit.source;
        const rect = hit.rect;

        return (
          <View
            key={
              source.zone === "waste"
                ? "waste"
                : source.zone === "foundation"
                  ? `foundation-${source.pileIndex}`
                  : `tableau-${source.pileIndex}-${source.cardIndex}`
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
            {...makeHandlers(
              source,
              source.zone === "foundation"
                ? undefined
                : () => tapHandlerResolverRef.current(source)(),
            )}
          />
        );
      }),
    [cardHitAreas],
  );

  return (
    <GameWrapper
      ended={won}
      won={won}
      reset={() => {
        void reset();
      }}
      isLoaded={isLoaded}
      canUndo={canUndo}
      undo={undo}
    >
      <View
        ref={boardRef}
        style={[
          {
            flex: 1,
            width: "100%",
            // touchAction: "none",
            // overscrollBehaviorX: "contain",
          },
        ]}
      >
        {cardMap}

        <View
          style={[
            {
              ...StyleSheet.absoluteFill,
              zIndex: 3000,
              touchAction: "none",
              overscrollBehaviorX: "contain",
              pointerEvents: "box-none",
            },
          ]}
        >
          {stockTapRect && (
            <Pressable
              style={{
                position: "absolute",
                backgroundColor: "transparent",
                left: stockTapRect.x,
                top: stockTapRect.y,
                width: stockTapRect.width,
                height: stockTapRect.height,
              }}
              onPress={drawFromStock}
              disabled={game.stock.length === 0 && game.waste.length === 0}
            />
          )}
          {interactionTargets}
        </View>

        {dragGhost && (
          <Animated.View
            style={[
              {
                pointerEvents: "none",
                position: "absolute",
                zIndex: 4000,
                left: ghostLeft,
                top: ghostTop,
                transform: dragTranslate.getTranslateTransform(),
              },
            ]}
          >
            {dragGhost.cards.map((card, index) => (
              <View
                key={`ghost-${card.id}`}
                style={[
                  {
                    position: "absolute",
                    left: 0,
                    opacity: 1,
                    width: cardWidth,
                    height: cardHeight,
                  },
                  {
                    top: index * cardDims.tableauOffset * cardHeight,
                    zIndex: index + 1,
                  },
                ]}
              >
                <Card
                  card={card}
                  cardWidth={cardWidth}
                  cardSize="small"
                  selectColor={ghostHasValidDrop ? "green" : "none"}
                  isSelected={ghostHasValidDrop}
                />
              </View>
            ))}
          </Animated.View>
        )}
      </View>
    </GameWrapper>
  );
}
