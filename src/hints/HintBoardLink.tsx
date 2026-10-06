import { useEffect, useRef } from "react";
import { View } from "react-native";
import type { Hint, HintTarget } from "./hint";
import { setHintBoard, type HintSpot } from "./hint-store";

/**
 * Links the card map to the hint system: an invisible point at the board's
 * top left tells HintUfo where the board is on screen, so it can place
 * beacons and fly to targets, and the card map taps targets for Autopilot.
 */
export function HintBoardLink({
  locate,
  tap,
}: {
  /** Where a target is, in board coordinates. */
  locate: (target: HintTarget) => HintSpot | null;
  tap: (target: HintTarget, hint: Hint) => boolean;
}) {
  const anchor = useRef<View>(null);
  const origin = useRef({ x: 0, y: 0 });
  const latest = useRef({ locate, tap });
  latest.current = { locate, tap };

  useEffect(() => {
    const measure = () =>
      new Promise<void>((resolve) => {
        const node = anchor.current;
        // A board that can't be measured (tests) keeps the last origin.
        const timer = setTimeout(resolve, 100);
        if (!node?.measureInWindow) return;
        node.measureInWindow((x, y) => {
          if (Number.isFinite(x) && Number.isFinite(y)) {
            origin.current = { x, y };
          }
          clearTimeout(timer);
          resolve();
        });
      });
    void measure();
    return setHintBoard({
      locate: (target) => {
        const spot = latest.current.locate(target);
        return spot
          ? {
              ...spot,
              x: spot.x + origin.current.x,
              y: spot.y + origin.current.y,
            }
          : null;
      },
      tap: (target, hint) => latest.current.tap(target, hint),
      measure,
    });
  }, []);

  return (
    <View
      ref={anchor}
      collapsable={false}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: 1,
        height: 1,
        pointerEvents: "none",
      }}
    />
  );
}
