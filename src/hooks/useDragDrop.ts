import {
  DRAG_MOVE_THRESHOLD,
  PlayingCard,
} from "@/components/Cards/card-utils";
import {
  clearDropOffsets,
  setDropOffsets,
} from "@/components/Cards/drop-flight";
import { isBoardInputLocked } from "@/components/Cards/input-lock";
import { haptics } from "@/utils/haptics";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View as RNView } from "react-native";
import { Gesture } from "react-native-gesture-handler";
import {
  Easing,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

const nextFrame = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

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

/**
 * The live drag offset. Shared values rather than Animated values so that on
 * native the ghost is moved on the UI thread, independent of how busy the JS
 * thread is. Render it with DragGhostView.
 */
export type DragTranslate = { x: SharedValue<number>; y: SharedValue<number> };

export function runTiming(
  value: DragTranslate,
  toValue: { x: number; y: number },
  duration = 180,
): Promise<void> {
  return new Promise<void>((resolve) => {
    const config = { duration, easing: Easing.out(Easing.cubic) };
    value.y.value = withTiming(toValue.y, config);
    value.x.value = withTiming(toValue.x, config, () => {
      "worklet";
      scheduleOnRN(resolve);
    });
  });
}

// ─── Shared types ─────────────────────────────────────────────────────────────

export type DragGhost<TSource> = {
  source: TSource;
  cards: PlayingCard[];
  origin: { x: number; y: number };
};

type DragCallbacks<TSource> = {
  onDragStart: (source: TSource) => void;
  onTap?: () => void;
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

/**
 * Default target comparison: drop targets are small plain objects (a zone plus
 * an index or suit), so two are the same when every field matches.
 */
export function sameDropTarget<TTarget>(
  a: TTarget | null,
  b: TTarget | null,
): boolean {
  if (!a || !b) return a === b;
  const aKeys = Object.keys(a) as (keyof TTarget)[];
  if (aKeys.length !== Object.keys(b).length) return false;
  return aKeys.every((key) => a[key] === b[key]);
}

/** The highest-priority drop area under (pageX, pageY). */
export function findDropTargetAt<TTarget>(
  dropHitAreas: DropHitArea<TTarget>[],
  pageX: number,
  pageY: number,
): TTarget | null {
  let best: DropHitArea<TTarget> | null = null;
  for (const area of dropHitAreas) {
    if (!pointInRect(pageX, pageY, area.rect)) continue;
    if (!best || area.priority > best.priority) best = area;
  }
  return best?.target ?? null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

type UseDragDropOptions<TSource, TTarget> = {
  /**
   * Resolve the drop target at (pageX, pageY). Called synchronously from the
   * gesture callbacks — use pre-computed hit areas rather than async
   * measurement here. Defaults to the highest-priority area from
   * getDropHitAreas under the point.
   */
  findDropTarget?: (pageX: number, pageY: number) => TTarget | null;
  /** Return true when source may be dropped onto target (game rules). */
  canDropOnTarget: (source: TSource, target: TTarget) => boolean;
  /**
   * Return true when two targets refer to the same zone slot. Defaults to
   * comparing every field (sameDropTarget).
   */
  sameTarget?: (a: TTarget | null, b: TTarget | null) => boolean;
  /**
   * Tap handler for a source's hit area, or undefined when tapping it does
   * nothing. Used by makeDragHandlers when no explicit onTap is passed; always
   * read fresh, so it sees the latest game state.
   */
  getTapHandler?: (source: TSource) => (() => void) | undefined;
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
  /**
   * Optional callback fired when the valid hovered drop target changes (the
   * hook also returns it as hoverTarget).
   */
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
  getTapHandler,
}: UseDragDropOptions<TSource, TTarget>) {
  // ── State & refs ────────────────────────────────────────────────────────────

  const [dragGhost, setDragGhostState] = useState<DragGhost<TSource> | null>(
    null,
  );
  // Ref mirror of dragGhost — avoids stale closures inside gesture callbacks
  const dragGhostRef = useRef<DragGhost<TSource> | null>(null);

  const hoverTargetRef = useRef<TTarget | null>(null);
  // The valid drop target under the dragged cards, for highlighting it. Updated
  // at most once per frame.
  const [hoverTarget, setHoverTarget] = useState<TTarget | null>(null);
  const justDroppedCardIds = useRef<Set<string> | null>(null);
  const [hideDraggedCards, setHideDraggedCards] = useState(false);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const dragTranslate = useMemo<DragTranslate>(
    () => ({ x: translateX, y: translateY }),
    [translateX, translateY],
  );
  // Gesture translation at the moment the pan activated, so the ghost starts
  // where the finger is rather than jumping by the activation threshold.
  const gestureStartX = useSharedValue(0);
  const gestureStartY = useSharedValue(0);
  // True while a hover-target check is queued on the JS thread, so move events
  // (which arrive every frame) don't pile up behind a busy JS thread.
  const hoverCheckPending = useSharedValue(false);

  const pendingDragOffsetRef = useRef<{ x: number; y: number } | null>(null);
  const dragStartOffsetRef = useRef({ x: 0, y: 0 });

  const boardRef = useRef<RNView | null>(null);
  const [boardPageOffset, setBoardPageOffset] = useState({ x: 0, y: 0 });

  // Always-fresh callback refs — gesture callbacks read through these so
  // they never capture stale game state.
  const findDropTargetRef = useRef(findDropTarget);
  const canDropOnTargetRef = useRef(canDropOnTarget);
  const sameTargetRef = useRef(sameTarget ?? sameDropTarget);
  const onSuccessfulDropRef = useRef(onSuccessfulDrop);
  const getDroppedCardIdsRef = useRef(getDroppedCardIds);
  const getDropHitAreasRef = useRef(getDropHitAreas);
  const getSourceRectRef = useRef(getSourceRect);
  const onHoverTargetChangeRef = useRef(onHoverTargetChange);
  const getTapHandlerRef = useRef(getTapHandler);
  const boardPageOffsetRef = useRef(boardPageOffset);
  const pendingHoverTargetRef = useRef<TTarget | null>(null);
  const hoverNotifyFrameRef = useRef<number | null>(null);

  findDropTargetRef.current = findDropTarget;
  canDropOnTargetRef.current = canDropOnTarget;
  sameTargetRef.current = sameTarget ?? sameDropTarget;
  getTapHandlerRef.current = getTapHandler;
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

  // Clear justDroppedCardIds one animation frame after the ghost disappears
  useEffect(() => {
    if (dragGhost !== null) return;
    // The ghost is unmounted now, so this can't move it on screen.
    translateX.value = 0;
    translateY.value = 0;
    const frame = requestAnimationFrame(() => {
      justDroppedCardIds.current = null;
      clearDropOffsets();
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
      const next = pendingHoverTargetRef.current;
      setHoverTarget((current) =>
        sameTargetRef.current(current, next) ? current : next,
      );
      onHoverTargetChangeRef.current?.(next);
    });
  }

  function clearDragGhost() {
    setDragGhost(null);
    setHideDraggedCards(false);
    hoverTargetRef.current = null;
    notifyHoverTargetChange(null);
    dragStartOffsetRef.current = { x: 0, y: 0 };
    // The drag translation is reset once the ghost has unmounted (see the
    // effect on dragGhost): resetting it here moved the still-mounted ghost
    // back to the card's original spot for a frame before React removed it.
  }

  function startDrag(
    source: TSource,
    cards: PlayingCard[],
    origin: { x: number; y: number },
  ) {
    const gestureOffset = pendingDragOffsetRef.current;
    const initialOffset = gestureOffset ?? { x: 0, y: 0 };
    pendingDragOffsetRef.current = null;
    dragStartOffsetRef.current = initialOffset;
    // A gesture-driven drag is already being translated on the UI thread;
    // resetting it here would snap the ghost back for a frame. Programmatic
    // drags (e.g. an animated auto-move) start from zero.
    if (!gestureOffset) {
      translateX.value = 0;
      translateY.value = 0;
    }
    hoverTargetRef.current = null;
    notifyHoverTargetChange(null);
    // Only a finger drag gets pick-up feedback, not a programmatic move.
    if (gestureOffset) haptics.pickUp();
    // Show the ghost and hide the originals in the same render. (This used to
    // take two renders a frame apart — an empty ghost first — which delayed
    // the dragged cards appearing under the finger.)
    setHideDraggedCards(true);
    setDragGhost({
      source,
      cards,
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
    if (findDropTargetRef.current) {
      return findDropTargetRef.current(pageX, pageY);
    }
    return findDropTargetAt(getDropHitAreasRef.current?.() ?? [], pageX, pageY);
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
      if (valid) haptics.validTarget();
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

    const droppedCardIds = getDroppedCardIdsRef.current(source);
    justDroppedCardIds.current = new Set(droppedCardIds);
    // Where the ghost was released, relative to the cards' original spot, so
    // they can fly on from there (see drop-flight.ts).
    setDropOffsets(droppedCardIds, {
      x: dragStartOffsetRef.current.x + translateX.value,
      y: dragStartOffsetRef.current.y + translateY.value,
    });
    haptics.drop();
    await onSuccessfulDropRef.current(source, target);

    // Keep the ghost up for two frames while the moved cards (still hidden)
    // start their flight from the release point, so swapping the ghost for
    // the real cards doesn't show them at their old spot first.
    await nextFrame();
    await nextFrame();
  }

  // Gestures are cached per source so a game re-render (every move, hover or
  // selection) hands each DragHandle the same gesture object, instead of
  // re-configuring a native gesture for every face-up card. The callbacks
  // they call are updated on each render, so they never act on stale state.
  const gestureCacheRef = useRef(
    new Map<
      string,
      {
        gesture: ReturnType<typeof createGesture>;
        callbacks: DragCallbacks<TSource>;
      }
    >(),
  );

  /**
   * Get the gesture for a draggable hit area. Render it with DragHandle.
   *
   * @param source      The MoveSource this hit area represents.
   * @param onDragStart Called once movement crosses the threshold to validate
   *                    and start the ghost.
   * @param onTap       Called when the gesture ends without significant movement.
   *                    Defaults to the getTapHandler option.
   */
  function makeDragHandlers(
    source: TSource,
    onDragStart: (source: TSource) => void,
    explicitOnTap?: () => void,
  ) {
    const onTap =
      explicitOnTap ??
      (getTapHandlerRef.current?.(source)
        ? () => getTapHandlerRef.current?.(source)?.()
        : undefined);
    const key = `${JSON.stringify(source)}|${onTap ? "tap" : "drag"}`;
    let entry = gestureCacheRef.current.get(key);

    if (!entry) {
      const callbacks: DragCallbacks<TSource> = { onDragStart, onTap };
      entry = { callbacks, gesture: createGesture(source, callbacks) };
      gestureCacheRef.current.set(key, entry);
    }

    entry.callbacks.onDragStart = onDragStart;
    entry.callbacks.onTap = onTap;
    return entry.gesture;
  }

  function createGesture(source: TSource, callbacks: DragCallbacks<TSource>) {
    let started = false;

    // JS-thread handlers. The gesture callbacks below are worklets (UI thread
    // on native) and hand off to these with scheduleOnRN.
    const handleStart = (offsetX: number, offsetY: number) => {
      if (isBoardInputLocked()) return;
      pendingDragOffsetRef.current = { x: offsetX, y: offsetY };
      started = true;
      callbacks.onDragStart(source);
    };

    const handleTap = () => {
      if (isBoardInputLocked()) return;
      callbacks.onTap?.();
    };

    const handleMove = (
      pageX: number,
      pageY: number,
      dragX: number,
      dragY: number,
    ) => {
      hoverCheckPending.value = false;
      if (!started) return;
      const activeSource = dragGhostRef.current?.source ?? source;
      internalUpdateHoverTarget(activeSource, pageX, pageY, dragX, dragY);
    };

    const handleRelease = (
      pageX: number,
      pageY: number,
      dragX: number,
      dragY: number,
    ) => {
      if (!started) return;
      started = false;
      const activeSource = dragGhostRef.current?.source ?? source;
      void handleDropInternal(activeSource, pageX, pageY, dragX, dragY).finally(
        () => clearDragGhost(),
      );
    };

    const handleCancel = () => {
      pendingDragOffsetRef.current = null;
      if (!started) return;
      started = false;
      clearDragGhost();
    };

    const pan = Gesture.Pan()
      .minDistance(DRAG_MOVE_THRESHOLD)
      .onStart((event) => {
        "worklet";
        gestureStartX.value = event.translationX;
        gestureStartY.value = event.translationY;
        translateX.value = 0;
        translateY.value = 0;
        scheduleOnRN(handleStart, event.translationX, event.translationY);
      })
      .onUpdate((event) => {
        "worklet";
        translateX.value = event.translationX - gestureStartX.value;
        translateY.value = event.translationY - gestureStartY.value;
        if (!hoverCheckPending.value) {
          hoverCheckPending.value = true;
          scheduleOnRN(
            handleMove,
            event.absoluteX,
            event.absoluteY,
            event.translationX,
            event.translationY,
          );
        }
      })
      .onEnd((event, success) => {
        "worklet";
        if (success) {
          scheduleOnRN(
            handleRelease,
            event.absoluteX,
            event.absoluteY,
            event.translationX,
            event.translationY,
          );
        } else {
          scheduleOnRN(handleCancel);
        }
      });

    if (!callbacks.onTap) return pan;

    const tap = Gesture.Tap()
      .maxDistance(DRAG_MOVE_THRESHOLD)
      // The default 500ms limit would drop slow taps that PanResponder used
      // to accept.
      .maxDuration(10_000)
      .onEnd((_event, success) => {
        "worklet";
        if (success) scheduleOnRN(handleTap);
      });

    return Gesture.Race(pan, tap);
  }

  return {
    dragGhost,
    hoverTarget,
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
