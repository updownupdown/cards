import {
  CardHitArea,
  createRect,
  DropHitArea,
  pointInRect,
  useDragDrop,
} from "@/hooks/useDragDrop";
import { useStateManager } from "@/hooks/useStateManager";
import { useViewportDimensions } from "@/hooks/useViewportDimensions";
import { DOUBLE_TAP_MS } from "@/utils/utils";
import { useNavigation } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GestureResponderEvent } from "react-native";
import { Animated, StyleSheet, View } from "react-native";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import { Card } from "../Cards/Card";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import {
  cardDims,
  PlayingCard,
  RANK_VALUE,
  RANKS,
  shuffle,
  SUITS,
} from "../Cards/card-utils";
import { GameWrapper } from "../common/GameWrapper";

const cardSize = "tableau";

// ─── Types ────────────────────────────────────────────────────────────────────

type GameState = {
  cascades: PlayingCard[][];
  freeCells: (PlayingCard | null)[];
  foundations: PlayingCard[][];
};

export type BakersGameState = GameState;

type Selection = { zone: "free"; slotIndex: number } | null;

type MoveSource =
  | { zone: "cascade"; pileIndex: number; startIndex: number }
  | { zone: "free"; slotIndex: number };

type DropTarget =
  | { zone: "cascade"; pileIndex: number }
  | { zone: "free"; slotIndex: number }
  | { zone: "foundation"; pileIndex: number };

// ─── Pure game logic ──────────────────────────────────────────────────────────

function canPlaceOnCascade(
  card: PlayingCard,
  destinationTop?: PlayingCard,
): boolean {
  if (!destinationTop) return true;
  return (
    card.suit === destinationTop.suit &&
    RANK_VALUE[card.rank] + 1 === RANK_VALUE[destinationTop.rank]
  );
}

function canPlaceOnFoundation(
  card: PlayingCard,
  destinationTop?: PlayingCard,
): boolean {
  if (!destinationTop) return card.rank === "A";
  return (
    card.suit === destinationTop.suit &&
    RANK_VALUE[card.rank] === RANK_VALUE[destinationTop.rank] + 1
  );
}

function createInitialState(): GameState {
  const deck = shuffle(
    SUITS.flatMap((suit) =>
      RANKS.map((rank) => ({
        id: `${suit}-${rank}-${Math.random().toString(36).slice(2, 8)}`,
        suit,
        rank,
        faceUp: true,
      })),
    ),
  );

  const cascades: PlayingCard[][] = Array.from({ length: 8 }, () => []);
  deck.forEach((card, i) => cascades[i % 8].push(card));

  return {
    cascades,
    freeCells: [null, null, null, null],
    foundations: Array.from({ length: 4 }, () => [] as PlayingCard[]),
  };
}

function isDescendingSameSuitStack(cards: PlayingCard[]): boolean {
  return cards.every((card, index) => {
    if (index === 0) return true;
    const previous = cards[index - 1];
    return (
      card.suit === previous.suit &&
      RANK_VALUE[card.rank] + 1 === RANK_VALUE[previous.rank]
    );
  });
}

function getMaxMovableStackSize(snapshot: GameState): number {
  return snapshot.freeCells.filter((card) => card === null).length + 1;
}

function isWon(snapshot: GameState): boolean {
  return snapshot.foundations.every((pile) => pile.length === 13);
}

export const bakersGameRules = {
  canPlaceOnCascade,
  canPlaceOnFoundation,
  createInitialState,
  isDescendingSameSuitStack,
  getMaxMovableStackSize,
  isWon,
};

const gameStateInitial = createInitialState();

// ─── Component ────────────────────────────────────────────────────────────────

export default function BakersGame() {
  const navigation = useNavigation();

  const [selected, setSelected] = useState<Selection>(null);
  const [hoverTarget, setHoverTarget] = useState<DropTarget | null>(null);
  const [lastTap, setLastTap] = useState<{ key: string; at: number } | null>(
    null,
  );
  const clearDragGhostRef = useRef<(() => void) | null>(null);

  const { isLoaded, game, setGame, reset, undo, canUndo, saveUndoState } =
    useStateManager<GameState>({
      gameStateInitial,
      resetNonGameStates: () => {
        setSelected(null);
        setLastTap(null);
        clearDragGhostRef.current?.();
      },
      resetAndSetup: async () => {
        setGame(createInitialState());
      },
    });

  const { width: windowWidth, height: windowHeight } = useViewportDimensions();

  // ── Drag & drop ─────────────────────────────────────────────────────────────

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
    onSuccessfulDrop: (source, target) => {
      applyMove(source, target);
    },
    getDroppedCardIds: (source) => {
      return getDraggedCards(source, game).map((card) => card.id);
    },
    getDropHitAreas: () => dropHitAreasRef.current,
    getSourceRect,
    onHoverTargetChange: handleHoverTargetChange,
  });

  clearDragGhostRef.current = clearDragGhost;

  // ── Derived ─────────────────────────────────────────────────────────────────

  const won = useMemo(() => isWon(game), [game.foundations]);

  // ── CardMap zones ───────────────────────────────────────────────────────────

  const zones: MapZone[] = useMemo(() => {
    const freeCellZones: MapZone[] = game.freeCells.map((card, i) => ({
      id: `free-${i}`,
      name: "free",
      pileIndex: i,
      cards: card ? [card] : [],
      col: i,
      row: 0,
      baseZIndex: 50,
      placeholder: { text: "Free", infoPos: "below", showCount: false },
    }));

    const foundationZones: MapZone[] = game.foundations.map((pile, i) => ({
      id: `foundation-${i}`,
      name: "foundation",
      pileIndex: i,
      cards: pile,
      col: 4 + i,
      row: 0,
      baseZIndex: 40,
      fan: { maxVisible: 1 },
      placeholder: {},
    }));

    const cascadeZones: MapZone[] = game.cascades.map((pile, i) => ({
      id: `cascade-${i}`,
      name: "cascade",
      pileIndex: i,
      cards: pile,
      col: i,
      row: 1.5,
      baseZIndex: 10 + i,
      fan: {
        direction: "down" as const,
        offset: cardDims.tableauOffset,
        center: false,
      },
      placeholder: {},
    }));

    return [...freeCellZones, ...foundationZones, ...cascadeZones];
  }, [game]);

  // ── CardMap callbacks ───────────────────────────────────────────────────────

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    const isBeingDragged = draggedCardIds?.has(mappedCard.card.id) ?? false;
    const animDuration =
      justDroppedCardIds.current?.has(mappedCard.card.id) === true
        ? 0
        : undefined;

    if (mappedCard.zoneName === "free" && mappedCard.pileIndex !== undefined) {
      const isHoverTargetTop =
        !!dragGhost &&
        mappedCard.topOfZone &&
        hoverTarget?.zone === "free" &&
        hoverTarget.slotIndex === mappedCard.pileIndex;

      return {
        selectColor: isHoverTargetTop ? "green" : "blue",
        isSelected:
          (selected?.zone === "free" &&
            selected.slotIndex === mappedCard.pileIndex) ||
          isHoverTargetTop,
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
        selectColor: "green",
        isSelected: isHoverTargetTop,
        isVisible: !isBeingDragged,
        animDuration: animDuration,
      };
    }

    if (
      mappedCard.zoneName === "cascade" &&
      mappedCard.pileIndex !== undefined
    ) {
      const pileIndex = mappedCard.pileIndex;
      const isHoverTargetTop =
        !!dragGhost &&
        mappedCard.topOfZone &&
        hoverTarget?.zone === "cascade" &&
        hoverTarget.pileIndex === pileIndex;
      return {
        selectColor: isHoverTargetTop ? "green" : "none",
        isSelected: isHoverTargetTop,
        isVisible: !isBeingDragged,
        animDuration: animDuration,
      };
    }

    return undefined;
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name === "free" && zone.pileIndex !== undefined) {
      const slotIndex = zone.pileIndex;
      const isHoverDropTarget =
        !!dragGhost &&
        hoverTarget?.zone === "free" &&
        hoverTarget.slotIndex === slotIndex;
      return {
        onPress: () => onFreeCellPress(slotIndex),
        isDisabled: !!dragGhost || !selected,
        isSelected:
          (selected?.zone === "free" && selected.slotIndex === slotIndex) ||
          (isHoverDropTarget && zone.cards?.length === 0),
        selectColor: isHoverDropTarget ? "green" : "blue",
      };
    }

    if (zone.name === "foundation" && zone.pileIndex !== undefined) {
      const foundationPileIndex = zone.pileIndex;
      const isHoverDropTarget =
        !!dragGhost &&
        hoverTarget?.zone === "foundation" &&
        hoverTarget.pileIndex === foundationPileIndex;
      return {
        onPress: () => onFoundationPress(foundationPileIndex),
        isDisabled: !!dragGhost || !selected,
        isSelected: isHoverDropTarget,
        selectColor: "green",
      };
    }

    if (zone.name === "cascade" && zone.pileIndex !== undefined) {
      const pileIndex = zone.pileIndex;
      const isHoverDropTarget =
        !!dragGhost &&
        hoverTarget?.zone === "cascade" &&
        hoverTarget.pileIndex === pileIndex;
      return {
        onPress: () => onCascadePress(pileIndex),
        isDisabled: !!dragGhost || !selected,
        isSelected: isHoverDropTarget && zone.cards?.length === 0,
        selectColor: isHoverDropTarget ? "green" : "blue",
      };
    }

    return undefined;
  };

  // ── useCardMap ──────────────────────────────────────────────────────────────

  const { cardMap, getZoneBasePos, cardWidth, cardHeight } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper,
    cardSize,
    gap: 0.12,
    fixedRows: 7,
  });

  // ── Hit areas ───────────────────────────────────────────────────────────────

  const cardHitAreas = useMemo<CardHitArea<MoveSource>[]>(() => {
    const areas: CardHitArea<MoveSource>[] = [];

    zones.forEach((zone) => {
      const zoneRect = getZoneBasePos(zone);

      if (zone.name === "free" && zone.pileIndex !== undefined) {
        const card = game.freeCells[zone.pileIndex];
        if (!card) return;
        areas.push({
          source: { zone: "free", slotIndex: zone.pileIndex },
          rect: createRect(zoneRect.x, zoneRect.y, cardWidth, cardHeight),
          priority: 90,
        });
      }

      if (zone.name === "cascade" && zone.pileIndex !== undefined) {
        const pile = game.cascades[zone.pileIndex];
        const maxStackSize = getMaxMovableStackSize(game);
        for (let startIndex = 0; startIndex < pile.length; startIndex++) {
          const cards = pile.slice(startIndex);
          if (
            cards.length > maxStackSize ||
            !isDescendingSameSuitStack(cards)
          ) {
            continue;
          }

          const isTopCard = startIndex === pile.length - 1;
          const hitHeight = isTopCard
            ? cardHeight
            : cardDims.tableauOffset * cardHeight;
          areas.push({
            source: {
              zone: "cascade",
              pileIndex: zone.pileIndex,
              startIndex,
            },
            rect: createRect(
              zoneRect.x,
              zoneRect.y + startIndex * cardDims.tableauOffset * cardHeight,
              cardWidth,
              hitHeight,
            ),
            priority: 10 + startIndex,
          });
        }
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
      const bx = zoneRect.x + boardPageOffset.x;
      const by = zoneRect.y + boardPageOffset.y;

      if (zone.name === "free" && zone.pileIndex !== undefined) {
        areas.push({
          target: { zone: "free", slotIndex: zone.pileIndex },
          rect: createRect(bx, by, cardWidth, cardHeight),
          priority: 90,
        });
      }

      if (zone.name === "foundation" && zone.pileIndex !== undefined) {
        areas.push({
          target: { zone: "foundation", pileIndex: zone.pileIndex },
          rect: createRect(bx, by, cardWidth, cardHeight),
          priority: 80,
        });
      }

      if (zone.name === "cascade" && zone.pileIndex !== undefined) {
        const pile = game.cascades[zone.pileIndex];
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

  // Keep ref in sync so the hook's findDropTarget always sees fresh areas.
  dropHitAreasRef.current = dropHitAreas;

  // ── Navigation ──────────────────────────────────────────────────────────────

  useEffect(() => {
    navigation.setOptions({ gestureEnabled: false });
    return () => {
      navigation.setOptions({ gestureEnabled: true });
    };
  }, [navigation]);

  // ── Game logic ──────────────────────────────────────────────────────────────

  function sameDropTarget(a: DropTarget | null, b: DropTarget | null): boolean {
    if (!a || !b) return a === b;
    if (a.zone !== b.zone) return false;
    if (a.zone === "cascade" && b.zone === "cascade")
      return a.pileIndex === b.pileIndex;
    if (a.zone === "free" && b.zone === "free")
      return a.slotIndex === b.slotIndex;
    return (
      a.zone === "foundation" &&
      b.zone === "foundation" &&
      a.pileIndex === b.pileIndex
    );
  }

  function getTopCard(
    source: MoveSource,
    snapshot: GameState,
  ): PlayingCard | null {
    if (source.zone === "cascade") {
      const pile = snapshot.cascades[source.pileIndex];
      return pile[pile.length - 1] ?? null;
    }
    return snapshot.freeCells[source.slotIndex];
  }

  function getDraggedCards(
    source: MoveSource,
    snapshot: GameState,
  ): PlayingCard[] {
    if (source.zone === "cascade") {
      return snapshot.cascades[source.pileIndex].slice(source.startIndex);
    }
    const card = snapshot.freeCells[source.slotIndex];
    return card ? [card] : [];
  }

  function canDropOnTarget(source: MoveSource, target: DropTarget): boolean {
    const cards = getDraggedCards(source, game);
    const card = cards[0];
    if (!card || cards.length > getMaxMovableStackSize(game)) return false;

    if (target.zone === "free") {
      return cards.length === 1 && game.freeCells[target.slotIndex] === null;
    }

    if (target.zone === "foundation") {
      if (cards.length !== 1) return false;
      const targetPile = game.foundations[target.pileIndex];
      const top = targetPile[targetPile.length - 1];
      return canPlaceOnFoundation(card, top);
    }

    // cascade — prevent dropping on self
    if (source.zone === "cascade" && source.pileIndex === target.pileIndex) {
      return false;
    }
    const top =
      game.cascades[target.pileIndex][
        game.cascades[target.pileIndex].length - 1
      ];
    return isDescendingSameSuitStack(cards) && canPlaceOnCascade(card, top);
  }

  function applyMove(source: MoveSource, target: DropTarget) {
    if (!canDropOnTarget(source, target)) {
      setSelected(null);
      return;
    }

    saveUndoState(structuredClone(game));

    setGame((draft) => {
      const snapshot = draft as GameState;
      const cards = getDraggedCards(source, snapshot);
      if (cards.length === 0) return;

      if (source.zone === "cascade") {
        draft.cascades[source.pileIndex].splice(source.startIndex);
      } else {
        draft.freeCells[source.slotIndex] = null;
      }

      if (target.zone === "cascade") {
        draft.cascades[target.pileIndex].push(...cards);
      } else if (target.zone === "free") {
        if (draft.freeCells[target.slotIndex] !== null) return;
        draft.freeCells[target.slotIndex] = cards[0];
      } else {
        draft.foundations[target.pileIndex].push(cards[0]);
      }
    });

    setLastTap(null);
    setSelected(null);
  }

  function getAutoFoundationTarget(
    source: MoveSource,
    snapshot: GameState = game,
  ): DropTarget | null {
    const card = getTopCard(source, snapshot);
    if (!card) return null;

    for (
      let pileIndex = 0;
      pileIndex < snapshot.foundations.length;
      pileIndex++
    ) {
      const pile = snapshot.foundations[pileIndex];
      const top = pile[pile.length - 1];
      if (!top) continue;
      if (top.suit !== card.suit) continue;
      if (!canPlaceOnFoundation(card, top)) continue;

      return { zone: "foundation", pileIndex };
    }

    for (
      let pileIndex = 0;
      pileIndex < snapshot.foundations.length;
      pileIndex++
    ) {
      const pile = snapshot.foundations[pileIndex];
      if (pile.length > 0) continue;
      if (!canPlaceOnFoundation(card, undefined)) continue;

      return { zone: "foundation", pileIndex };
    }

    return null;
  }

  // ── Drag helpers ─────────────────────────────────────────────────────────────

  function getSourceOrigin(
    source: MoveSource,
  ): { x: number; y: number } | null {
    const zone = zones.find((z) => {
      if (source.zone === "cascade")
        return z.name === "cascade" && z.pileIndex === source.pileIndex;
      return z.name === "free" && z.pileIndex === source.slotIndex;
    });
    if (!zone) return null;

    const base = getZoneBasePos(zone);
    if (source.zone === "cascade") {
      const pile = game.cascades[source.pileIndex];
      return {
        x: base.x,
        y: base.y + source.startIndex * cardDims.tableauOffset * cardHeight,
      };
    }
    return { x: base.x, y: base.y };
  }

  function getSourceRect(source: MoveSource) {
    const origin = getSourceOrigin(source);
    if (!origin) return null;
    return createRect(origin.x, origin.y, cardWidth, cardHeight);
  }

  function startGhostDrag(source: MoveSource, _event: GestureResponderEvent) {
    const cards = getDraggedCards(source, game);
    if (
      cards.length === 0 ||
      cards.length > getMaxMovableStackSize(game) ||
      (source.zone === "cascade" && !isDescendingSameSuitStack(cards))
    ) {
      return;
    }
    const origin = getSourceOrigin(source);
    if (!origin) return;
    startDrag(source, cards, origin);
  }

  function makeHandlers(source: MoveSource, onTap?: () => void) {
    return makeDragHandlers(source, startGhostDrag, onTap);
  }

  // ── Tap handlers ─────────────────────────────────────────────────────────────

  function onCascadePress(pileIndex: number, source?: MoveSource) {
    const now = Date.now();
    const tapKey = `cascade-${pileIndex}`;

    if (lastTap?.key === tapKey && now - lastTap.at < DOUBLE_TAP_MS) {
      setLastTap(null);
      if (
        source?.zone === "cascade" &&
        source.startIndex === game.cascades[pileIndex].length - 1
      ) {
        const foundationTarget = getAutoFoundationTarget(source);
        if (foundationTarget && canDropOnTarget(source, foundationTarget)) {
          applyMove(source, foundationTarget);
        }
      }
      return;
    }

    setLastTap({ key: tapKey, at: now });

    if (!selected) {
      return;
    }

    if (!canDropOnTarget(selected, { zone: "cascade", pileIndex })) {
      setSelected(null);
      return;
    }

    applyMove(selected, { zone: "cascade", pileIndex });
  }

  function onFreeCellPress(slotIndex: number) {
    const now = Date.now();
    const tapKey = `free-${slotIndex}`;

    if (lastTap?.key === tapKey && now - lastTap.at < DOUBLE_TAP_MS) {
      setLastTap(null);
      const source: MoveSource = { zone: "free", slotIndex };
      const foundationTarget = getAutoFoundationTarget(source);
      if (foundationTarget && canDropOnTarget(source, foundationTarget)) {
        applyMove(source, foundationTarget);
      }
      return;
    }

    setLastTap({ key: tapKey, at: now });

    const slotCard = game.freeCells[slotIndex];

    if (!selected) {
      if (slotCard) setSelected({ zone: "free", slotIndex });
      return;
    }

    if (!canDropOnTarget(selected, { zone: "free", slotIndex })) {
      setSelected(null);
      return;
    }

    applyMove(selected, { zone: "free", slotIndex });
  }

  function onFoundationPress(pileIndex: number) {
    if (!selected) return;

    if (!canDropOnTarget(selected, { zone: "foundation", pileIndex })) {
      setSelected(null);
      return;
    }

    applyMove(selected, { zone: "foundation", pileIndex });
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  const ghostLeft = dragGhost ? dragGhost.origin.x : 0;
  const ghostTop = dragGhost ? dragGhost.origin.y : 0;
  const ghostHasValidDrop = !!dragGhost && hoverTarget !== null;

  const tapHandlerResolverRef = useRef(
    (_source: MoveSource): (() => void) =>
      () => {},
  );
  tapHandlerResolverRef.current = (source: MoveSource) => {
    if (source.zone === "cascade") {
      return () => onCascadePress(source.pileIndex, source);
    }

    return () => onFreeCellPress(source.slotIndex);
  };

  const interactionTargets = useMemo(
    () =>
      cardHitAreas.map((hit) => {
        const { source, rect } = hit;
        const key =
          source.zone === "cascade"
            ? `cascade-${source.pileIndex}-${source.startIndex}`
            : `free-${source.slotIndex}`;

        return (
          <View
            key={key}
            collapsable={false}
            style={[
              {
                position: "absolute",
                backgroundColor: "transparent",
                left: rect.x,
                top: rect.y,
                width: rect.width,
                height: rect.height,
              },
            ]}
            {...makeHandlers(source, () =>
              tapHandlerResolverRef.current(source)(),
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
            {interactionTargets}
          </View>

          {dragGhost && (
            <Animated.View
              style={[
                {
                  position: "absolute",
                  zIndex: 4000,
                  pointerEvents: "none",
                  left: ghostLeft,
                  top: ghostTop,
                  transform: dragTranslate.getTranslateTransform(),
                },
              ]}
            >
              <View
                style={[
                  {
                    position: "absolute",
                    left: 0,
                    top: 0,
                    opacity: 1,
                    width: cardWidth,
                    height: cardHeight,
                  },
                ]}
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
                      cardSize={cardSize}
                      selectColor={ghostHasValidDrop ? "green" : "none"}
                      isSelected={ghostHasValidDrop}
                    />
                  </View>
                ))}
              </View>
            </Animated.View>
          )}
        </View>
      </View>
    </GameWrapper>
  );
}
