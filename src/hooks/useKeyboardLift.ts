import { useEffect, useRef } from "react";
import { Animated, Easing, Keyboard, Platform } from "react-native";

const LIFT_DURATION = 180;

/**
 * How far to raise controls pinned to the bottom of the screen so the
 * on-screen keyboard doesn't cover them, as a translateY (negative, or 0 with
 * the keyboard closed).
 *
 * Android only: the app draws edge to edge there, so the window doesn't shrink
 * for the keyboard and everything pinned to the bottom stays under it. Moving
 * just the controls, rather than resizing the screen, leaves the background
 * where it is. The keyboard's reported height is measured from the top of the
 * navigation bar, which is where those controls already sit clear of. On web
 * the browser resizes the viewport itself.
 */
export function useKeyboardLift() {
  const lift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS !== "android") return;
    const moveTo = (toValue: number) =>
      Animated.timing(lift, {
        toValue,
        duration: LIFT_DURATION,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    const shown = Keyboard.addListener("keyboardDidShow", (event) =>
      moveTo(-Math.max(0, event.endCoordinates.height)),
    );
    const hidden = Keyboard.addListener("keyboardDidHide", () => moveTo(0));
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, [lift]);

  return lift;
}
