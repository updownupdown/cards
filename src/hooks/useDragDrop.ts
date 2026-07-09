import {
  DRAG_CAPTURE_THRESHOLD,
  DRAG_MOVE_THRESHOLD,
  PlayingCard,
} from "@/components/Cards/card-utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  GestureResponderEvent,
  PanResponder,
  Platform,
  View as RNView,
} from "react-native";

// ─── Shared geometry helpers ─────────────────────────────────────────────────

export type Rect = { x: number; y: number; width: number; height: number };

export function createRect(
  x: number,
  y: number,
  width: number,
  height: number,
): Rect {
  return { x, y, width, height };
}

export function pointInRect(pageX: number, pageY: number, rect: Rect): boolean {
  return (
    pageX >= rect.x &&
    pageX <= rect.x + rect.width &&
    pageY >= rect.y &&
    pageY <= rect.y + rect.height
  );
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function rectCenter(rect: Rect) {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  };
}

export function runTiming(
  value: Animated.ValueXY,
  toValue: { x: number; y: number },
  duration = 180,
): Promise<void> {
  return new Promise<void>((resolve) => {
    Animated.timing(value, {
      toValue,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== "web",
    }).start(() => resolve());
  });
}

// ─── Shared types ─────────────────────────────────────────────────────────────

export type DragGhost<TSource> = {
  source: TSource;
  cards: PlayingCard[];
  origin: { x: number; y: number };
};

export type CardHitArea<TSource> = {
  source: TSource;
  rect: Rect;
  priority: number;
};

export type DropHitArea<TTarget> = {
  target: TTarget;
  rect: Rect;
  priority: number;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

type UseDragDropOptions<TSource, TTarget> = {
  /**
   * Resolve the drop target at (pageX, pageY). Called synchronously from the
   * PanResponder callbacks — use pre-computed hit areas rather than async
   * measurement here.
   */
  findDropTarget: (pageX: number, pageY: number) => TTarget | null;
  /** Return true when source may be dropped onto target (game rules). */
  canDropOnTarget: (source: TSource, target: TTarget) => boolean;
  /** Return true when two targets refer to the same zone slot. */
  sameTarget: (a: TTarget | null, b: TTarget | null) => boolean;
  /**
   * Execute the game move. Called after a valid drop is confirmed.
   * May return a Promise; the ghost is cleared after it resolves.
   */
  onSuccessfulDrop: (source: TSource, target: TTarget) => void | Promise<void>;
  /**
   * Return the IDs of cards that are about to land so AnimatedCard can skip
   * its position animation (instant snap).
   */
  getDroppedCardIds: (source: TSource) => string[];
  /** Return all current drop areas for generous overlap fallback. */
  getDropHitAreas?: () => DropHitArea<TTarget>[];
  /** Return source card bounds in board coordinates for generous overlap fallback. */
  getSourceRect?: (source: TSource) => Rect | null;
};

export function useDragDrop<TSource, TTarget>({
  findDropTarget,
  canDropOnTarget,
  sameTarget,
  onSuccessfulDrop,
  getDroppedCardIds,
  getDropHitAreas,
  getSourceRect,
}: UseDragDropOptions<TSource, TTarget>) {
  // ── State & refs ────────────────────────────────────────────────────────────

  const [dragGhost, setDragGhostState] = useState<DragGhost<TSource> | null>(
    null,
  );
  // Ref mirror of dragGhost — avoids stale closures inside PanResponder
  const dragGhostRef = useRef<DragGhost<TSource> | null>(null);

  const hoverTargetRef = useRef<TTarget | null>(null);
  const justDroppedCardIds = useRef<Set<string> | null>(null);

  const dragTranslate = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  const boardRef = useRef<RNView | null>(null);
  const [boardPageOffset, setBoardPageOffset] = useState({ x: 0, y: 0 });

  // Always-fresh callback refs — PanResponder closures read through these so
  // they never capture stale game state.
  const findDropTargetRef = useRef(findDropTarget);
  const canDropOnTargetRef = useRef(canDropOnTarget);
  const sameTargetRef = useRef(sameTarget);
  const onSuccessfulDropRef = useRef(onSuccessfulDrop);
  const getDroppedCardIdsRef = useRef(getDroppedCardIds);
  const getDropHitAreasRef = useRef(getDropHitAreas);
  const getSourceRectRef = useRef(getSourceRect);
  const boardPageOffsetRef = useRef(boardPageOffset);

  findDropTargetRef.current = findDropTarget;
  canDropOnTargetRef.current = canDropOnTarget;
  sameTargetRef.current = sameTarget;
  onSuccessfulDropRef.current = onSuccessfulDrop;
  getDroppedCardIdsRef.current = getDroppedCardIds;
  getDropHitAreasRef.current = getDropHitAreas;
  getSourceRectRef.current = getSourceRect;
  boardPageOffsetRef.current = boardPageOffset;

  // ── Derived ─────────────────────────────────────────────────────────────────

  const draggedCardIds = useMemo(
    () => (dragGhost ? new Set(dragGhost.cards.map((c) => c.id)) : null),
    [dragGhost],
  );

  // Clear justDroppedCardIds one animation frame after the ghost disappears
  useEffect(() => {
    if (dragGhost !== null) return;
    const frame = requestAnimationFrame(() => {
      justDroppedCardIds.current = null;
    });
    return () => cancelAnimationFrame(frame);
  }, [dragGhost]);

  // ── Internal helpers ────────────────────────────────────────────────────────

  function setDragGhost(ghost: DragGhost<TSource> | null) {
    dragGhostRef.current = ghost;
    setDragGhostState(ghost);
  }

  function clearDragGhost() {
    setDragGhost(null);
    hoverTargetRef.current = null;
    dragTranslate.setValue({ x: 0, y: 0 });
  }

  function startDrag(
    source: TSource,
    cards: PlayingCard[],
    origin: { x: number; y: number },
  ) {
    dragTranslate.setValue({ x: 0, y: 0 });
    setDragGhost({ source, cards, origin });
  }

  const updateBoardOffset = useCallback(() => {
    boardRef.current?.measureInWindow((x, y) => {
      setBoardPageOffset({ x, y });
    });
  }, []);

  function internalFindDropTarget(
    pageX: number,
    pageY: number,
  ): TTarget | null {
    return findDropTargetRef.current(pageX, pageY);
  }

  function internalUpdateHoverTarget(
    source: TSource,
    pageX: number,
    pageY: number,
  ) {
    const target = internalFindDropTarget(pageX, pageY);
    const valid =
      target && canDropOnTargetRef.current(source, target) ? target : null;
    if (!sameTargetRef.current(hoverTargetRef.current, valid)) {
      hoverTargetRef.current = valid;
    }
  }

  async function handleDropInternal(
    source: TSource,
    pageX: number,
    pageY: number,
    dragX: number,
    dragY: number,
  ) {
    let target = internalFindDropTarget(pageX, pageY);

    if (!target || !canDropOnTargetRef.current(source, target)) {
      const sourceRectLocal = getSourceRectRef.current?.(source) ?? null;
      const dropHitAreas = getDropHitAreasRef.current?.() ?? [];

      if (sourceRectLocal && dropHitAreas.length > 0) {
        const boardOffset = boardPageOffsetRef.current;
        const draggedRect: Rect = {
          x: boardOffset.x + sourceRectLocal.x + dragX,
          y: boardOffset.y + sourceRectLocal.y + dragY,
          width: sourceRectLocal.width,
          height: sourceRectLocal.height,
        };

        const draggedCenter = rectCenter(draggedRect);

        const generousCandidates = dropHitAreas
          .filter(({ target: candidateTarget }) =>
            canDropOnTargetRef.current(source, candidateTarget),
          )
          .filter(({ rect }) => rectsOverlap(draggedRect, rect));

        if (generousCandidates.length > 0) {
          target = generousCandidates.slice().sort((a, b) => {
            const ac = rectCenter(a.rect);
            const bc = rectCenter(b.rect);
            const ad =
              (ac.x - draggedCenter.x) * (ac.x - draggedCenter.x) +
              (ac.y - draggedCenter.y) * (ac.y - draggedCenter.y);
            const bd =
              (bc.x - draggedCenter.x) * (bc.x - draggedCenter.x) +
              (bc.y - draggedCenter.y) * (bc.y - draggedCenter.y);

            if (ad !== bd) {
              return ad - bd;
            }

            return b.priority - a.priority;
          })[0].target;
        }
      }
    }

    if (!target || !canDropOnTargetRef.current(source, target)) {
      await runTiming(dragTranslate, { x: 0, y: 0 }, 250);
      return;
    }

    justDroppedCardIds.current = new Set(getDroppedCardIdsRef.current(source));
    await onSuccessfulDropRef.current(source, target);
  }

  /**
   * Create PanResponder handlers for a draggable hit area.
   *
   * @param source      The MoveSource this hit area represents.
   * @param onDragStart Called on gesture grant to validate and start the ghost.
   * @param onTap       Called when the gesture ends without significant movement.
   */
  function makeDragHandlers(
    source: TSource,
    onDragStart: (source: TSource, event: GestureResponderEvent) => void,
    onTap?: () => void,
  ) {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) + Math.abs(gesture.dy) > DRAG_MOVE_THRESHOLD,
      onMoveShouldSetPanResponderCapture: (_, gesture) =>
        Math.abs(gesture.dx) + Math.abs(gesture.dy) > DRAG_CAPTURE_THRESHOLD,
      onPanResponderGrant: (event) => {
        onDragStart(source, event);
      },
      onPanResponderMove: (_, gesture) => {
        dragTranslate.setValue({ x: gesture.dx, y: gesture.dy });
        const activeSource = dragGhostRef.current?.source ?? source;
        internalUpdateHoverTarget(activeSource, gesture.moveX, gesture.moveY);
      },
      onPanResponderRelease: (event, gesture) => {
        const moved =
          Math.abs(gesture.dx) + Math.abs(gesture.dy) > DRAG_MOVE_THRESHOLD;

        if (!moved) {
          clearDragGhost();
          onTap?.();
          return;
        }

        const activeSource = dragGhostRef.current?.source ?? source;
        void handleDropInternal(
          activeSource,
          event.nativeEvent.pageX,
          event.nativeEvent.pageY,
          gesture.dx,
          gesture.dy,
        ).finally(() => clearDragGhost());
      },
      onPanResponderTerminate: () => clearDragGhost(),
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
    }).panHandlers;
  }

  return {
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
  };
}
