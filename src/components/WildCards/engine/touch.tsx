import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { now } from "./loop";
import type { Stage } from "./stage";

export type WorldTouch = { id: number; x: number; y: number; t: number };

export type TouchHandlers = {
  onStart?: (touch: WorldTouch) => void;
  onMove?: (touch: WorldTouch) => void;
  /** `cancelled` when the system took the touch away. */
  onEnd?: (touch: WorldTouch, cancelled: boolean) => void;
};

/**
 * Every finger on the screen, one by one, in world units. Wraps the whole
 * game so a touch anywhere reaches it; the header sits above it.
 */
export function TouchSurface({
  stage,
  handlers,
  children,
}: {
  stage: Stage;
  handlers: TouchHandlers;
  children: ReactNode;
}) {
  // Read through refs, so the gesture is built once and not every frame.
  const stageRef = useRef(stage);
  const handlersRef = useRef(handlers);
  useEffect(() => {
    stageRef.current = stage;
    handlersRef.current = handlers;
  });

  const gesture = useMemo(() => {
    const toWorld = (id: number, x: number, y: number) => {
      const { offsetX, offsetY, scale } = stageRef.current;
      return {
        id,
        x: (x - offsetX) / scale,
        y: (y - offsetY) / scale,
        t: now(),
      };
    };
    // The fingers down, so the gesture ends once the last one lifts.
    const down = new Set<number>();
    return Gesture.Manual()
      .runOnJS(true)
      .onTouchesDown((event, manager) => {
        manager.activate();
        event.changedTouches.forEach((touch) => {
          down.add(touch.id);
          handlersRef.current.onStart?.(toWorld(touch.id, touch.x, touch.y));
        });
      })
      .onTouchesMove((event) => {
        event.changedTouches.forEach((touch) =>
          handlersRef.current.onMove?.(toWorld(touch.id, touch.x, touch.y)),
        );
      })
      .onTouchesUp((event, manager) => {
        event.changedTouches.forEach((touch) => {
          down.delete(touch.id);
          handlersRef.current.onEnd?.(
            toWorld(touch.id, touch.x, touch.y),
            false,
          );
        });
        if (down.size === 0) manager.end();
      })
      .onTouchesCancelled((event, manager) => {
        event.changedTouches.forEach((touch) => {
          down.delete(touch.id);
          handlersRef.current.onEnd?.(toWorld(touch.id, touch.x, touch.y), true);
        });
        down.clear();
        manager.end();
      });
  }, []);

  return (
    <GestureDetector gesture={gesture}>
      <View style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}>
        {children}
      </View>
    </GestureDetector>
  );
}
