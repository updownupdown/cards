import { useStateManager } from "@/hooks/useStateManager";
import {
  CardHitArea,
  createRect,
  DropHitArea,
  pointInRect,
  useDragDrop,
} from "@/hooks/useDragDrop";
import { useNavigation } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GestureResponderEvent } from "react-native";
import { Animated, StyleSheet, View } from "react-native";
import { useViewportDimensions } from "@/hooks/useViewportDimensions";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import { Card } from "../Cards/Card";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import {
  cardDims,
  createDeck,
  flipToFace,
  isRed,
  PlayingCard,
  RANK_VALUE,
  shuffle,
  top,
} from "../Cards/card-utils";
import { GameWrapper } from "../common/GameWrapper";
import { DOUBLE_TAP_MS } from "@/utils/utils";

const columnCount = 7;

type GameState = {
  columns: PlayingCard[][];
  foundations: PlayingCard[][];
};

type MoveSource = { pileIndex: number; cardIndex: number };

type DropTarget =
  | { zone: "cascade"; pileIndex: number }
  | { zone: "foundation"; pileIndex: number };

// ─── Rules (override canPlaceOnCascade in the Russian Solitaire variant) ──────

export function yukonCanStack(
  card: PlayingCard,
  destTop: PlayingCard | undefined,
): boolean {
  if (!destTop) return card.rank === "K"; // only Kings to empty columns
  return (
    isRed(card.suit) !== isRed(destTop.suit) &&
    RANK_VALUE[card.rank] + 1 === RANK_VALUE[destTop.rank]
  );
}

function canPlaceOnFoundation(
  card: PlayingCard,
  destTop: PlayingCard | undefined,
): boolean {
  if (!destTop) return card.rank === "A";
  return (
    card.suit === destTop.suit &&
    RANK_VALUE[card.rank] === RANK_VALUE[destTop.rank] + 1
  );
}

// ─── Setup ────────────────────────────────────────────────────────────────────

export function createYukonState(): GameState {
  const deck = shuffle(createDeck());
  const columns: PlayingCard[][] = Array.from(
    { length: columnCount },
    () => [],
  );

  // Column 0: one face-up card. Columns 1..6: j face-down then 5 face-up.
  columns[0].push(flipToFace(deck.pop()!));
  for (let j = 1; j < columnCount; j += 1) {
    for (let k = 0; k < j; k += 1) columns[j].push(deck.pop()!); // face down
    for (let k = 0; k < 5; k += 1) columns[j].push(flipToFace(deck.pop()!));
  }

  return {
    columns,
    foundations: Array.from({ length: 4 }, () => [] as PlayingCard[]),
  };
}

// ─── Component factory (shared with Russian Solitaire) ────────────────────────

type YukonProps = {
  canStack?: (card: PlayingCard, destTop: PlayingCard | undefined) => boolean;
  winMessage?: string;
};

export function YukonBoard({
  canStack = yukonCanStack,
  winMessage = "You cleared the board!",
}: YukonProps) {
  const navigation = useNavigation();

  const [selected, setSelected] = useState<MoveSource | null>(null);
  const [hoverTarget, setHoverTarget] = useState<DropTarget | null>(null);
  const [lastTap, setLastTap] = useState<{ key: string; at: number } | null>(
    null,
  );
  const clearDragGhostRef = useRef<(() => void) | null>(null);

  const { isLoaded, game, setGame, reset, undo, canUndo, saveUndoState } =
    useStateManager<GameState>({
      gameStateInitial: createYukonState(),
      resetNonGameStates: () => {
        setSelected(null);
        setLastTap(null);
        clearDragGhostRef.current?.();
      },
      resetAndSetup: async () => {
        setGame(createYukonState());
      },
    });

  const { width: windowWidth, height: windowHeight } = useViewportDimensions();

  const dropHitAreasRef = useRef<DropHitArea<DropTarget>[]>([]);
  const handleHoverTargetChange = useCallback((next: DropTarget | null) => {
    setHoverTarget((prev) => (sameDropTarget(prev, next) ? prev : next));
  }, []);

  function movingCards(source: MoveSource, snapshot: GameState): PlayingCard[] {
    return snapshot.columns[source.pileIndex].slice(source.cardIndex);
  }

  function sameDropTarget(a: DropTarget | null, b: DropTarget | null): boolean {
    if (!a || !b) return a === b;
    if (a.zone !== b.zone) return false;
    return a.pileIndex === b.pileIndex;
  }

  function canDropOnTarget(source: MoveSource, target: DropTarget): boolean {
    const moving = movingCards(source, game);
    if (moving.length === 0) return false;
    const card = moving[0];

    if (target.zone === "foundation") {
      if (moving.length !== 1) return false;
      return canPlaceOnFoundation(
        card,
        top(game.foundations[target.pileIndex]),
      );
    }

    if (source.pileIndex === target.pileIndex) return false;
    return canStack(card, top(game.columns[target.pileIndex]));
  }

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
    onSuccessfulDrop: (source, target) => applyMove(source, target),
    getDroppedCardIds: (source) => movingCards(source, game).map((c) => c.id),
    getDropHitAreas: () => dropHitAreasRef.current,
    getSourceRect,
    onHoverTargetChange: handleHoverTargetChange,
  });

  clearDragGhostRef.current = clearDragGhost;

  const won = useMemo(
    () => game.foundations.every((pile) => pile.length === 13),
    [game.foundations],
  );

  // ── Zones ─────────────────────────────────────────────────────────────────
  const zones: MapZone[] = useMemo(() => {
    const tallestColumn = Math.max(...game.columns.map((f) => f.length));
    const foundationRow = 1.2;
    const foundationHeight =
      tallestColumn >= 22 ? 8 : tallestColumn >= 18 ? 7 : 6;

    const sizingZone: MapZone = {
      id: "sizing-zone",
      name: "sizing",
      pileIndex: -1,
      cards: [],
      col: 0,
      row: foundationRow,
      width: "full",
      height: foundationHeight,
      baseZIndex: 0,
    };

    const foundationZones: MapZone[] = game.foundations.map((pile, i) => ({
      id: `foundation-${i}`,
      name: "foundation",
      pileIndex: i,
      cards: pile,
      col: 1.5 + i,
      row: 0,
      baseZIndex: 40,
      fan: { maxVisible: 1 },
      placeholder: {},
    }));

    const columnZones: MapZone[] = game.columns.map((pile, i) => ({
      id: `cascade-${i}`,
      name: "cascade",
      pileIndex: i,
      cards: pile,
      col: i,
      row: foundationRow,
      baseZIndex: 10 + i,
      fan: {
        direction: "down" as const,
        offset: cardDims.tableauOffset,
        center: false,
      },
      placeholder: {},
    }));

    return [sizingZone, ...foundationZones, ...columnZones];
  }, [game]);

  // ── Card / zone mappers ─────────────────────────────────────────────────────
  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    const isBeingDragged = draggedCardIds?.has(mappedCard.card.id) ?? false;
    const animDuration =
      justDroppedCardIds.current?.has(mappedCard.card.id) === true
        ? 0
        : undefined;

    if (
      mappedCard.zoneName === "foundation" &&
      mappedCard.pileIndex !== undefined
    ) {
      const isHoverTop =
        !!dragGhost &&
        mappedCard.topOfZone &&
        hoverTarget?.zone === "foundation" &&
        hoverTarget.pileIndex === mappedCard.pileIndex;
      return {
        selectColor: "green",
        isSelected: isHoverTop,
        isVisible: !isBeingDragged,
        animDuration,
      };
    }

    if (
      mappedCard.zoneName === "cascade" &&
      mappedCard.pileIndex !== undefined
    ) {
      const pileIndex = mappedCard.pileIndex;
      const isInSelection =
        !!selected &&
        selected.pileIndex === pileIndex &&
        mappedCard.refIndex !== undefined &&
        mappedCard.refIndex >= selected.cardIndex;
      const isHoverTop =
        !!dragGhost &&
        mappedCard.topOfZone &&
        hoverTarget?.zone === "cascade" &&
        hoverTarget.pileIndex === pileIndex;
      return {
        selectColor: isHoverTop ? "green" : isInSelection ? "blue" : "none",
        isSelected: isInSelection || isHoverTop,
        isVisible: !isBeingDragged,
        animDuration,
      };
    }

    return undefined;
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name === "foundation" && zone.pileIndex !== undefined) {
      const pileIndex = zone.pileIndex;
      const isHover =
        !!dragGhost &&
        hoverTarget?.zone === "foundation" &&
        hoverTarget.pileIndex === pileIndex;
      return {
        onPress: () => onFoundationPress(pileIndex),
        isDisabled: !!dragGhost || !selected,
        isSelected: isHover,
        selectColor: "green",
      };
    }

    if (zone.name === "cascade" && zone.pileIndex !== undefined) {
      const pileIndex = zone.pileIndex;
      const isHover =
        !!dragGhost &&
        hoverTarget?.zone === "cascade" &&
        hoverTarget.pileIndex === pileIndex;
      return {
        onPress: () => onColumnZonePress(pileIndex),
        isDisabled: !!dragGhost,
        isSelected: isHover && zone.cards?.length === 0,
        selectColor: "green",
      };
    }

    return undefined;
  };

  const { cardMap, getZoneBasePos, cardWidth, cardHeight } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper,
    cardSize: "tableau",
    gap: 0.16,
  });

  // ── Hit areas (each face-up card is a draggable group source) ────────────────
  const cardHitAreas = useMemo<CardHitArea<MoveSource>[]>(() => {
    const areas: CardHitArea<MoveSource>[] = [];

    zones.forEach((zone) => {
      if (zone.name !== "cascade" || zone.pileIndex === undefined) return;
      const pile = game.columns[zone.pileIndex];
      const base = getZoneBasePos(zone);

      for (let j = 0; j < pile.length; j += 1) {
        if (!pile[j].faceUp) continue;
        const isLast = j === pile.length - 1;
        areas.push({
          source: { pileIndex: zone.pileIndex, cardIndex: j },
          rect: createRect(
            base.x,
            base.y + j * cardDims.tableauOffset * cardHeight,
            cardWidth,
            isLast ? cardHeight : cardDims.tableauOffset * cardHeight,
          ),
          priority: 10 + j,
        });
      }
    });

    return areas;
  }, [cardHeight, cardWidth, game, getZoneBasePos, zones]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => updateBoardOffset());
    return () => cancelAnimationFrame(frame);
  }, [windowWidth, windowHeight, zones.length, cardWidth, cardHeight]);

  const dropHitAreas = useMemo<DropHitArea<DropTarget>[]>(() => {
    const areas: DropHitArea<DropTarget>[] = [];

    zones.forEach((zone) => {
      const zoneRect = getZoneBasePos(zone);
      const bx = zoneRect.x + boardPageOffset.x;
      const by = zoneRect.y + boardPageOffset.y;

      if (zone.name === "foundation" && zone.pileIndex !== undefined) {
        areas.push({
          target: { zone: "foundation", pileIndex: zone.pileIndex },
          rect: createRect(bx, by, cardWidth, cardHeight),
          priority: 80,
        });
      }

      if (zone.name === "cascade" && zone.pileIndex !== undefined) {
        const pile = game.columns[zone.pileIndex];
        const pileHeight =
          cardHeight +
          Math.max(0, pile.length - 1) * cardDims.tableauOffset * cardHeight;
        areas.push({
          target: { zone: "cascade", pileIndex: zone.pileIndex },
          rect: createRect(bx, by, cardWidth, pileHeight),
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
    game,
    getZoneBasePos,
    zones,
  ]);

  dropHitAreasRef.current = dropHitAreas;

  useEffect(() => {
    navigation.setOptions({ gestureEnabled: false });
    return () => {
      navigation.setOptions({ gestureEnabled: true });
    };
  }, [navigation]);

  // ── Move application ─────────────────────────────────────────────────────────
  function applyMove(source: MoveSource, target: DropTarget) {
    if (!canDropOnTarget(source, target)) {
      setSelected(null);
      return;
    }

    saveUndoState(structuredClone(game));

    setGame((draft) => {
      const moving = draft.columns[source.pileIndex].splice(source.cardIndex);
      if (moving.length === 0) return;

      if (target.zone === "foundation") {
        draft.foundations[target.pileIndex].push(moving[0]);
      } else {
        draft.columns[target.pileIndex].push(...moving);
      }

      // Flip the newly exposed card in the source column.
      const src = draft.columns[source.pileIndex];
      const last = src[src.length - 1];
      if (last && !last.faceUp) src[src.length - 1] = flipToFace(last);
    });

    setLastTap(null);
    setSelected(null);
  }

  function getAutoFoundationTarget(source: MoveSource): DropTarget | null {
    const moving = movingCards(source, game);
    if (moving.length !== 1) return null;
    const card = moving[0];

    for (let i = 0; i < game.foundations.length; i += 1) {
      if (canPlaceOnFoundation(card, top(game.foundations[i]))) {
        return { zone: "foundation", pileIndex: i };
      }
    }
    return null;
  }

  // ── Drag helpers ─────────────────────────────────────────────────────────────
  function getSourceOrigin(
    source: MoveSource,
  ): { x: number; y: number } | null {
    const zone = zones.find(
      (z) => z.name === "cascade" && z.pileIndex === source.pileIndex,
    );
    if (!zone) return null;
    const base = getZoneBasePos(zone);
    return {
      x: base.x,
      y: base.y + source.cardIndex * cardDims.tableauOffset * cardHeight,
    };
  }

  function getSourceRect(source: MoveSource) {
    const origin = getSourceOrigin(source);
    if (!origin) return null;
    return createRect(origin.x, origin.y, cardWidth, cardHeight);
  }

  function startGhostDrag(source: MoveSource, _event: GestureResponderEvent) {
    const moving = movingCards(source, game);
    if (moving.length === 0) return;
    const origin = getSourceOrigin(source);
    if (!origin) return;
    startDrag(source, moving, origin);
  }

  function makeHandlers(source: MoveSource, onTap?: () => void) {
    return makeDragHandlers(source, startGhostDrag, onTap);
  }

  // ── Tap handling ─────────────────────────────────────────────────────────────
  function onColumnCardTap(pileIndex: number, cardIndex: number) {
    const now = Date.now();
    const key = `card-${pileIndex}-${cardIndex}`;
    const isTop = cardIndex === game.columns[pileIndex].length - 1;

    if (lastTap?.key === key && now - lastTap.at < DOUBLE_TAP_MS && isTop) {
      setLastTap(null);
      const source: MoveSource = { pileIndex, cardIndex };
      const foundationTarget = getAutoFoundationTarget(source);
      if (foundationTarget && canDropOnTarget(source, foundationTarget)) {
        applyMove(source, foundationTarget);
      }
      return;
    }
    setLastTap({ key, at: now });

    if (!selected) {
      setSelected({ pileIndex, cardIndex });
      return;
    }

    const target: DropTarget = { zone: "cascade", pileIndex };
    if (canDropOnTarget(selected, target)) {
      applyMove(selected, target);
    } else {
      setSelected({ pileIndex, cardIndex });
    }
  }

  function onColumnZonePress(pileIndex: number) {
    if (selected) {
      const target: DropTarget = { zone: "cascade", pileIndex };
      if (canDropOnTarget(selected, target)) applyMove(selected, target);
      else setSelected(null);
      return;
    }
    const pile = game.columns[pileIndex];
    if (pile.length > 0) setSelected({ pileIndex, cardIndex: pile.length - 1 });
  }

  function onFoundationPress(pileIndex: number) {
    if (!selected) return;
    const target: DropTarget = { zone: "foundation", pileIndex };
    if (canDropOnTarget(selected, target)) applyMove(selected, target);
    else setSelected(null);
  }

  // ── Interaction overlay ──────────────────────────────────────────────────────
  const tapHandlerResolverRef = useRef(
    (_s: MoveSource): (() => void) =>
      () => {},
  );
  tapHandlerResolverRef.current = (source: MoveSource) => () =>
    onColumnCardTap(source.pileIndex, source.cardIndex);

  const interactionTargets = useMemo(
    () =>
      cardHitAreas.map((hit) => {
        const { source, rect } = hit;
        const key = `card-${source.pileIndex}-${source.cardIndex}`;
        return (
          <View
            key={key}
            collapsable={false}
            style={{
              position: "absolute",
              backgroundColor: "transparent",
              left: rect.x,
              top: rect.y,
              width: rect.width,
              height: rect.height,
            }}
            {...makeHandlers(source, () =>
              tapHandlerResolverRef.current(source)(),
            )}
          />
        );
      }),
    [cardHitAreas],
  );

  const ghostLeft = dragGhost ? dragGhost.origin.x : 0;
  const ghostTop = dragGhost ? dragGhost.origin.y : 0;
  const ghostHasValidDrop = !!dragGhost && hoverTarget !== null;

  return (
    <GameWrapper
      ended={won}
      won={won}
      reset={() => void reset()}
      isLoaded={isLoaded}
      canUndo={canUndo}
      undo={undo}
      winLoseMessage={winMessage}
    >
      <View style={{ flex: 1, width: "100%", gap: 12 }}>
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
            {interactionTargets}
          </View>

          {dragGhost && (
            <Animated.View
              style={{
                position: "absolute",
                zIndex: 4000,
                pointerEvents: "none",
                left: ghostLeft,
                top: ghostTop,
                transform: dragTranslate.getTranslateTransform(),
              }}
            >
              {dragGhost.cards.map((card, index) => (
                <View
                  key={card.id}
                  style={{
                    position: "absolute",
                    left: 0,
                    top: index * cardDims.tableauOffset * cardHeight,
                    width: cardWidth,
                    height: cardHeight,
                  }}
                >
                  <Card
                    card={card}
                    cardWidth={cardWidth}
                    cardSize="tableau"
                    selectColor={
                      ghostHasValidDrop && index === 0 ? "green" : "none"
                    }
                    isSelected={ghostHasValidDrop && index === 0}
                  />
                </View>
              ))}
            </Animated.View>
          )}
        </View>
      </View>
    </GameWrapper>
  );
}

export default function Yukon() {
  return <YukonBoard />;
}
