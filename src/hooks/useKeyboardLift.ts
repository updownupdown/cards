import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Keyboard, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const LIFT_DURATION = 180;

type KeyboardState = {
  visible: boolean;
  /** Where the keyboard's top edge is, measured up from the screen bottom. */
  top: number;
};

const HIDDEN: KeyboardState = { visible: false, top: 0 };

function isEditable(element: Element | null) {
  if (!element) return false;
  const tag = element.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    (element as HTMLElement).isContentEditable
  );
}

/**
 * A desktop browser: no touch input of any kind, so typing is done on a
 * physical keyboard. Anything that can be touched might bring up an on-screen
 * keyboard, so it doesn't count.
 */
function hasNoVirtualKeyboard() {
  const anyCoarsePointer =
    window.matchMedia?.("(any-pointer: coarse)").matches ?? true;
  const touchPoints = navigator.maxTouchPoints ?? 1;
  return !anyCoarsePointer && touchPoints === 0;
}

/**
 * Whether the on-screen keyboard is up, and how far it reaches.
 *
 * Android: the app draws edge to edge there, so the window doesn't shrink for
 * the keyboard. Its reported height is measured from the top of the
 * navigation bar, so the bottom inset is added back.
 *
 * Web: the viewport shrinks to end at the keyboard (the page asks for
 * interactive-widget=resizes-content), so `top` stays 0. There's no keyboard
 * event, so a focused text field stands in for one, unless the device plainly
 * has no on-screen keyboard (see hasNoVirtualKeyboard).
 */
export function useKeyboardState(): KeyboardState {
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<KeyboardState>(HIDDEN);

  useEffect(() => {
    if (Platform.OS === "android") {
      const shown = Keyboard.addListener("keyboardDidShow", (event) =>
        setState({
          visible: true,
          top: Math.max(0, event.endCoordinates.height) + insets.bottom,
        }),
      );
      const hidden = Keyboard.addListener("keyboardDidHide", () =>
        setState(HIDDEN),
      );
      return () => {
        shown.remove();
        hidden.remove();
      };
    }

    if (Platform.OS !== "web" || typeof document === "undefined") return;
    if (hasNoVirtualKeyboard()) return;

    const update = () =>
      setState(
        isEditable(document.activeElement) ? { visible: true, top: 0 } : HIDDEN,
      );
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", update);
    return () => {
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", update);
    };
  }, [insets.bottom]);

  return state;
}

/**
 * A translateY that moves a control pinned `restingBottom` above the screen
 * bottom to sit `gap` above the keyboard while it's up, and back when it
 * closes. Moving just the control, rather than resizing the screen, leaves
 * the background where it is.
 */
export function useKeyboardLift(restingBottom: number, gap: number) {
  const { visible, top } = useKeyboardState();
  const lift = useRef(new Animated.Value(0)).current;
  const target = visible ? restingBottom - gap - top : 0;

  useEffect(() => {
    Animated.timing(lift, {
      toValue: target,
      duration: LIFT_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, [lift, target]);

  return lift;
}
