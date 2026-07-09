import { useStateManager } from "@/hooks/useStateManager";
import {
  CardHitArea,
  createRect,
  DropHitArea,
  pointInRect,
  useDragDrop,
  runTiming,
} from "@/hooks/useDragDrop";
import { useNavigation } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import type { GestureResponderEvent } from "react-native";
import { Animated, StyleSheet, View } from "react-native";
import { useViewportDimensions } from "@/hooks/useViewportDimensions";
import { Button } from "../Button/Button";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import { Card } from "../Cards/Card";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import {
  CardSuit,
  isRed,
  PlayingCard,
  RANK_VALUE,
  RANKS,
  shuffle,
  SUITS,
} from "../Cards/card-utils";
import { GameWrapper } from "../common/GameWrapper";

// ─── Constants ────────────────────────────────────────────────────────────────

const CASCADE_FAN_OFFSET = 0.22;

// ─── Types ────────────────────────────────────────────────────────────────────

type GameState = {
  cascades: PlayingCard[][];
  freeCells: (PlayingCard | null)[];
  foundations: Record<CardSuit, PlayingCard[]>;
};

type Selection =
  | { zone: "cascade"; pileIndex: number }
  | { zone: "free"; slotIndex: number }
  | null;

type MoveSource = Exclude<Selection, null>;

type DropTarget =
  | { zone: "cascade"; pileIndex: number }
  | { zone: "free"; slotIndex: number }
  | { zone: "foundation"; suit: CardSuit };

// ─── Pure game logic ──────────────────────────────────────────────────────────

function canPlaceOnCascade(
  card: PlayingCard,
  destinationTop?: PlayingCard,
): boolean {
  if (!destinationTop) return true;
  return (
    isRed(card.suit) !== isRed(destinationTop.suit) &&
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
    foundations: { clubs: [], diamonds: [], hearts: [], spades: [] },
  };
}

const gameStateInitial = createInitialState();

// ─── Component ────────────────────────────────────────────────────────────────

export default function FreeCell() {
  const navigation = useNavigation();

  const [selected, setSelected] = useState<Selection>(null);
  const clearDragGhostRef = useRef<(() => void) | null>(null);

  const {
    isLoaded,
    showIntro,
    setShowIntro,
    game,
    setGame,
    reset,
    undo,
    canUndo,
    saveUndoState,
  } = useStateManager<GameState>({
    gameStateInitial,
    resetNonGameStates: () => {
      setSelected(null);
      clearDragGhostRef.current?.();
    },
    resetAndSetup: async () => {
      setGame(createInitialState());
    },
  });

  const { width: windowWidth, height: windowHeight } = useViewportDimensions();

  // ── Drag & drop ─────────────────────────────────────────────────────────────

  const dropHitAreasRef = useRef<DropHitArea<DropTarget>[]>([]);

  const {
    dragGhost,
    draggedCardIds,
    hoverTargetRef,
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
      const card = getTopCard(source, game);
      return card ? [card.id] : [];
    },
    getDropHitAreas: () => dropHitAreasRef.current,
    getSourceRect,
  });

  clearDragGhostRef.current = clearDragGhost;

  // ── Derived ─────────────────────────────────────────────────────────────────

  const won = useMemo(
    () =>
      (SUITS as readonly string[]).every(
        (suit) => game.foundations[suit as CardSuit].length === 13,
      ),
    [game.foundations],
  );

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
      fan: { maxVisible: 1 },
      placeholder: { text: "Free", infoPos: "below" as const },
    }));

    const foundationZones: MapZone[] = (SUITS as readonly string[]).map(
      (suit, i) => ({
        id: `foundation-${suit}`,
        name: "foundation",
        pileIndex: i,
        cards: game.foundations[suit as CardSuit],
        col: 4 + i,
        row: 0,
        baseZIndex: 40,
        fan: { maxVisible: 1 },
        placeholder: {
          text: suit[0].toUpperCase(),
          infoPos: "above" as const,
        },
      }),
    );

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
        offset: CASCADE_FAN_OFFSET,
        maxVisible: 52,
      },
      placeholder: { showCount: false },
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
      return {
        selectColor: "blue",
        isSelected:
          selected?.zone === "free" &&
          selected.slotIndex === mappedCard.pileIndex,
        isVisible: !isBeingDragged,
        animDuration: animDuration,
      };
    }

    if (
      mappedCard.zoneName === "foundation" &&
      mappedCard.pileIndex !== undefined
    ) {
      return {
        selectColor: "green",
        isSelected: false,
        isVisible: !isBeingDragged,
        animDuration: animDuration,
      };
    }

    if (
      mappedCard.zoneName === "cascade" &&
      mappedCard.pileIndex !== undefined
    ) {
      const pileIndex = mappedCard.pileIndex;
      const isTopSelected =
        selected?.zone === "cascade" && selected.pileIndex === pileIndex;
      return {
        selectColor: isTopSelected ? "blue" : "none",
        isSelected: isTopSelected,
        isVisible: !isBeingDragged,
        animDuration: animDuration,
      };
    }

    return undefined;
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name === "free" && zone.pileIndex !== undefined) {
      const slotIndex = zone.pileIndex;
      return {
        onPress: () => onFreeCellPress(slotIndex),
        isDisabled: !!dragGhost || !selected,
        isSelected:
          selected?.zone === "free" && selected.slotIndex === slotIndex,
      };
    }

    if (zone.name === "foundation" && zone.pileIndex !== undefined) {
      const suit = SUITS[zone.pileIndex] as CardSuit;
      return {
        onPress: () => onFoundationPress(suit),
        isDisabled: !!dragGhost || !selected,
        isSelected: false,
      };
    }

    if (zone.name === "cascade" && zone.pileIndex !== undefined) {
      const pileIndex = zone.pileIndex;
      return {
        onPress: () => onCascadePress(pileIndex),
        isDisabled: !!dragGhost || !selected,
        isSelected:
          selected?.zone === "cascade" && selected.pileIndex === pileIndex,
      };
    }

    return undefined;
  };

  // ── useCardMap ──────────────────────────────────────────────────────────────

  const { cardMap, getZoneBasePos, cardWidth, cardHeight } = useCardMap({
    game,
    zones,
    gap: 0.3,
    cardMapper,
    zoneMapper,
    cardSize: "small",
    paddingBottom: 0.9,
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
        if (pile.length === 0) return;
        areas.push({
          source: { zone: "cascade", pileIndex: zone.pileIndex },
          rect: createRect(
            zoneRect.x,
            zoneRect.y + (pile.length - 1) * CASCADE_FAN_OFFSET * cardHeight,
            cardWidth,
            cardHeight,
          ),
          priority: 10 + pile.length,
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
        const suit = SUITS[zone.pileIndex] as CardSuit;
        areas.push({
          target: { zone: "foundation", suit },
          rect: createRect(bx, by, cardWidth, cardHeight),
          priority: 80,
        });
      }

      if (zone.name === "cascade" && zone.pileIndex !== undefined) {
        const pile = game.cascades[zone.pileIndex];
        const pileHeight =
          cardHeight +
          Math.max(0, pile.length - 1) * CASCADE_FAN_OFFSET * cardHeight;
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
      a.zone === "foundation" && b.zone === "foundation" && a.suit === b.suit
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

  function canDropOnTarget(source: MoveSource, target: DropTarget): boolean {
    const card = getTopCard(source, game);
    if (!card) return false;

    if (target.zone === "free") {
      return game.freeCells[target.slotIndex] === null;
    }

    if (target.zone === "foundation") {
      if (card.suit !== target.suit) return false;
      const top =
        game.foundations[target.suit][game.foundations[target.suit].length - 1];
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
    return canPlaceOnCascade(card, top);
  }

  function applyMove(source: MoveSource, target: DropTarget) {
    if (!canDropOnTarget(source, target)) {
      setSelected(null);
      return;
    }

    saveUndoState(structuredClone(game));

    setGame((draft) => {
      const snapshot = draft as GameState;
      const card = getTopCard(source, snapshot);
      if (!card) return;

      if (source.zone === "cascade") {
        draft.cascades[source.pileIndex].pop();
      } else {
        draft.freeCells[source.slotIndex] = null;
      }

      if (target.zone === "cascade") {
        draft.cascades[target.pileIndex].push(card);
      } else if (target.zone === "free") {
        if (draft.freeCells[target.slotIndex] !== null) return;
        draft.freeCells[target.slotIndex] = card;
      } else {
        draft.foundations[target.suit].push(card);
      }
    });

    setSelected(null);
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
        y: base.y + (pile.length - 1) * CASCADE_FAN_OFFSET * cardHeight,
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
    const card = getTopCard(source, game);
    if (!card) return;
    const origin = getSourceOrigin(source);
    if (!origin) return;
    startDrag(source, [card], origin);
  }

  function makeHandlers(source: MoveSource, onTap?: () => void) {
    return makeDragHandlers(source, startGhostDrag, onTap);
  }

  // ── Tap handlers ─────────────────────────────────────────────────────────────

  function onCascadePress(pileIndex: number) {
    const pile = game.cascades[pileIndex];

    if (!selected) {
      if (pile.length > 0) setSelected({ zone: "cascade", pileIndex });
      return;
    }

    if (!canDropOnTarget(selected, { zone: "cascade", pileIndex })) {
      setSelected(null);
      return;
    }

    applyMove(selected, { zone: "cascade", pileIndex });
  }

  function onFreeCellPress(slotIndex: number) {
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

  function onFoundationPress(suit: CardSuit) {
    if (!selected) return;

    if (!canDropOnTarget(selected, { zone: "foundation", suit })) {
      setSelected(null);
      return;
    }

    applyMove(selected, { zone: "foundation", suit });
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  const ghostLeft = dragGhost ? dragGhost.origin.x : 0;
  const ghostTop = dragGhost ? dragGhost.origin.y : 0;

  return (
    <GameWrapper
      showIntro={showIntro}
      setShowIntro={setShowIntro}
      ended={won}
      won={won}
      reset={() => {
        void reset();
      }}
      isLoaded={isLoaded}
      canUndo={canUndo}
      undo={undo}
    >
      <View style={styles.gameShell}>
        <View ref={boardRef} style={styles.boardShell}>
          {cardMap}

          <View style={styles.interactionLayer}>
            {cardHitAreas.map((hit) => {
              const { source, rect } = hit;
              const onTap =
                source.zone === "cascade"
                  ? () => onCascadePress(source.pileIndex)
                  : () => onFreeCellPress(source.slotIndex);

              const key =
                source.zone === "cascade"
                  ? `cascade-${source.pileIndex}`
                  : `free-${source.slotIndex}`;

              return (
                <View
                  key={key}
                  collapsable={false}
                  style={[
                    styles.interactionTarget,
                    {
                      left: rect.x,
                      top: rect.y,
                      width: rect.width,
                      height: rect.height,
                    },
                  ]}
                  {...makeHandlers(source, onTap)}
                />
              );
            })}
          </View>

          {dragGhost && (
            <Animated.View
              style={[
                styles.ghostLayer,
                {
                  left: ghostLeft,
                  top: ghostTop,
                  transform: dragTranslate.getTranslateTransform(),
                  pointerEvents: "none",
                },
              ]}
            >
              <View
                style={[
                  styles.ghostCard,
                  { width: cardWidth, height: cardHeight },
                ]}
              >
                <Card
                  card={dragGhost.cards[0]}
                  cardWidth={cardWidth}
                  cardSize="small"
                />
              </View>
            </Animated.View>
          )}
        </View>
      </View>
    </GameWrapper>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  gameShell: {
    flex: 1,
    width: "100%",
    gap: 12,
    paddingHorizontal: 12,
  },
  toolbar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  boardShell: {
    flex: 1,
    width: "100%",
    position: "relative",
    touchAction: "none",
    overscrollBehaviorX: "contain",
  },
  interactionLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 3000,
    touchAction: "none",
    overscrollBehaviorX: "contain",
    pointerEvents: "box-none",
  },
  interactionTarget: {
    position: "absolute",
    backgroundColor: "transparent",
  },
  ghostLayer: {
    position: "absolute",
    zIndex: 4000,
    pointerEvents: "none",
  },
  ghostCard: {
    position: "absolute",
    left: 0,
    top: 0,
    opacity: 1,
  },
});
