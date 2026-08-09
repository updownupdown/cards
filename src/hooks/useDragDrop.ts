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

export function resolveOverlapDropTarget<TSource, TTarget>(
  source: TSource,
  draggedRect: Rect,
  dropHitAreas: DropHitArea<TTarget>[],
  canDropOnTarget: (source: TSource, target: TTarget) => boolean,
): TTarget | null {
  const draggedCenter = rectCenter(draggedRect);
  const candidates = dropHitAreas
    .filter(({ target }) => canDropOnTarget(source, target))
    .filter(({ rect }) => rectsOverlap(draggedRect, rect));

  if (candidates.length === 0) return null;

  return candidates.slice().sort((a, b) => {
    const firstCenter = rectCenter(a.rect);
    const secondCenter = rectCenter(b.rect);
    const firstDistance =
      (firstCenter.x - draggedCenter.x) ** 2 +
      (firstCenter.y - draggedCenter.y) ** 2;
    const secondDistance =
      (secondCenter.x - draggedCenter.x) ** 2 +
      (secondCenter.y - draggedCenter.y) ** 2;

    if (firstDistance !== secondDistance) {
      return firstDistance - secondDistance;
    }
    return b.priority - a.priority;
  })[0].target;
}

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
  /** Optional callback fired when the valid hovered drop target changes. */
  onHoverTargetChange?: (target: TTarget | null) => void;
};

export function useDragDrop<TSource, TTarget>({
  findDropTarget,
  canDropOnTarget,
  sameTarget,
  onSuccessfulDrop,
  getDroppedCardIds,
  getDropHitAreas,
  getSourceRect,
  onHoverTargetChange,
}: UseDragDropOptions<TSource, TTarget>) {
  // ── State & refs ────────────────────────────────────────────────────────────

  const [dragGhost, setDragGhostState] = useState<DragGhost<TSource> | null>(
    null,
  );
  // Ref mirror of dragGhost — avoids stale closures inside PanResponder
  const dragGhostRef = useRef<DragGhost<TSource> | null>(null);

  const hoverTargetRef = useRef<TTarget | null>(null);
  const justDroppedCardIds = useRef<Set<string> | null>(null);
  const [hideDraggedCards, setHideDraggedCards] = useState(false);
  const pendingGhostCardsRef = useRef<PlayingCard[]>([]);

  const dragTranslate = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const pendingDragOffsetRef = useRef<{ x: number; y: number } | null>(null);
  const dragStartOffsetRef = useRef({ x: 0, y: 0 });

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
  const onHoverTargetChangeRef = useRef(onHoverTargetChange);
  const boardPageOffsetRef = useRef(boardPageOffset);
  const pendingHoverTargetRef = useRef<TTarget | null>(null);
  const hoverNotifyFrameRef = useRef<number | null>(null);

  findDropTargetRef.current = findDropTarget;
  canDropOnTargetRef.current = canDropOnTarget;
  sameTargetRef.current = sameTarget;
  onSuccessfulDropRef.current = onSuccessfulDrop;
  getDroppedCardIdsRef.current = getDroppedCardIds;
  getDropHitAreasRef.current = getDropHitAreas;
  getSourceRectRef.current = getSourceRect;
  onHoverTargetChangeRef.current = onHoverTargetChange;
  boardPageOffsetRef.current = boardPageOffset;

  useEffect(() => {
    return () => {
      if (hoverNotifyFrameRef.current !== null) {
        cancelAnimationFrame(hoverNotifyFrameRef.current);
      }
    };
  }, []);

  // ── Derived ─────────────────────────────────────────────────────────────────

  const draggedCardIds = useMemo(
    () =>
      dragGhost && hideDraggedCards
        ? new Set(dragGhost.cards.map((c) => c.id))
        : null,
    [dragGhost, hideDraggedCards],
  );

  useEffect(() => {
    if (dragGhost === null || dragGhost.cards.length > 0) return;

    const frame = requestAnimationFrame(() => {
      const activeGhost = dragGhostRef.current;
      if (!activeGhost) return;

      const revealedGhost = {
        ...activeGhost,
        cards: pendingGhostCardsRef.current,
      };
      dragGhostRef.current = revealedGhost;
      setHideDraggedCards(true);
      setDragGhostState(revealedGhost);
    });

    return () => cancelAnimationFrame(frame);
  }, [dragGhost]);

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

  function notifyHoverTargetChange(target: TTarget | null) {
    pendingHoverTargetRef.current = target;

    if (hoverNotifyFrameRef.current !== null) {
      return;
    }

    hoverNotifyFrameRef.current = requestAnimationFrame(() => {
      hoverNotifyFrameRef.current = null;
      onHoverTargetChangeRef.current?.(pendingHoverTargetRef.current);
    });
  }

  function clearDragGhost() {
    setDragGhost(null);
    setHideDraggedCards(false);
    pendingGhostCardsRef.current = [];
    hoverTargetRef.current = null;
    notifyHoverTargetChange(null);
    dragStartOffsetRef.current = { x: 0, y: 0 };
    dragTranslate.setValue({ x: 0, y: 0 });
  }

  function startDrag(
    source: TSource,
    cards: PlayingCard[],
    origin: { x: number; y: number },
  ) {
    const initialOffset = pendingDragOffsetRef.current ?? { x: 0, y: 0 };
    pendingDragOffsetRef.current = null;
    dragStartOffsetRef.current = initialOffset;
    dragTranslate.setValue({ x: 0, y: 0 });
    hoverTargetRef.current = null;
    notifyHoverTargetChange(null);
    pendingGhostCardsRef.current = cards;
    setDragGhost({
      source,
      cards: [],
      origin: {
        x: origin.x + initialOffset.x,
        y: origin.y + initialOffset.y,
      },
    });
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

  function resolveValidDropTarget(
    source: TSource,
    pageX: number,
    pageY: number,
    dragX: number,
    dragY: number,
  ): TTarget | null {
    let target = internalFindDropTarget(pageX, pageY);

    if (target && canDropOnTargetRef.current(source, target)) {
      return target;
    }

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

        target = resolveOverlapDropTarget(
          source,
          draggedRect,
          dropHitAreas,
          canDropOnTargetRef.current,
        );
      }
    }

    return target && canDropOnTargetRef.current(source, target) ? target : null;
  }

  function internalUpdateHoverTarget(
    source: TSource,
    pageX: number,
    pageY: number,
    dragX: number,
    dragY: number,
  ) {
    const valid = resolveValidDropTarget(source, pageX, pageY, dragX, dragY);
    if (!sameTargetRef.current(hoverTargetRef.current, valid)) {
      hoverTargetRef.current = valid;
      notifyHoverTargetChange(valid);
    }
  }

  async function handleDropInternal(
    source: TSource,
    pageX: number,
    pageY: number,
    dragX: number,
    dragY: number,
  ) {
    const target = resolveValidDropTarget(source, pageX, pageY, dragX, dragY);

    if (!target || !canDropOnTargetRef.current(source, target)) {
      await runTiming(
        dragTranslate,
        {
          x: -dragStartOffsetRef.current.x,
          y: -dragStartOffsetRef.current.y,
        },
        250,
      );
      return;
    }

    justDroppedCardIds.current = new Set(getDroppedCardIdsRef.current(source));
    await onSuccessfulDropRef.current(source, target);
  }

  /**
   * Create PanResponder handlers for a draggable hit area.
   *
   * @param source      The MoveSource this hit area represents.
   * @param onDragStart Called once movement crosses the threshold to validate
   *                    and start the ghost.
   * @param onTap       Called when the gesture ends without significant movement.
   */
  function makeDragHandlers(
    source: TSource,
    onDragStart: (source: TSource, event: GestureResponderEvent) => void,
    onTap?: () => void,
  ) {
    let started = false;

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) + Math.abs(gesture.dy) > DRAG_MOVE_THRESHOLD,
      onMoveShouldSetPanResponderCapture: (_, gesture) =>
        Math.abs(gesture.dx) + Math.abs(gesture.dy) > DRAG_CAPTURE_THRESHOLD,
      onPanResponderGrant: () => {
        started = false;
        pendingDragOffsetRef.current = null;
      },
      onPanResponderMove: (event, gesture) => {
        const moved =
          Math.abs(gesture.dx) + Math.abs(gesture.dy) > DRAG_MOVE_THRESHOLD;

        if (!started) {
          if (!moved) return;
          pendingDragOffsetRef.current = { x: gesture.dx, y: gesture.dy };
          started = true;
          onDragStart(source, event);
        }

        dragTranslate.setValue({
          x: gesture.dx - dragStartOffsetRef.current.x,
          y: gesture.dy - dragStartOffsetRef.current.y,
        });
        const activeSource = dragGhostRef.current?.source ?? source;
        internalUpdateHoverTarget(
          activeSource,
          gesture.moveX,
          gesture.moveY,
          gesture.dx,
          gesture.dy,
        );
      },
      onPanResponderRelease: (event, gesture) => {
        if (!started) {
          pendingDragOffsetRef.current = null;
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
      onPanResponderTerminate: () => {
        pendingDragOffsetRef.current = null;
        if (started) clearDragGhost();
      },
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
