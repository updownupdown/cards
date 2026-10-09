import { SpadeMark } from "@/components/common/Logo";
import {
  INTRO_EASE_MS,
  INTRO_FADE_MS,
  INTRO_HOLD_MS,
  LAUNCH_INTRO_ID,
  LAUNCH_INTRO_NAME_ID,
  LAUNCH_INTRO_SPADE_ID,
  NAME_GAP,
  NAME_SIZE,
  SPADE_FILL,
  SPADE_HEIGHT,
  SPLASH_BACKGROUND,
  SPLASH_SPADE,
} from "@/components/common/launch-lockup";
import { FontWeight, theme } from "@/styles/styles";
import { SplashScreen } from "expo-router";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Platform, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  interpolateColor,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

// The launch intro takes over from the splash with the same picture (the
// white spade on black), eases the colours into the colour theme, adding the
// name in its ink, then fades away over the home screen. Native draws it here;
// the web page draws it before the app loads (+html.tsx) and this drives it.

/** CSS's ease-in-out, which the web uses, so both ease alike. */
const EASE_IN_OUT = Easing.bezier(0.42, 0, 0.58, 1);
const CSS_EASE_IN_OUT = "cubic-bezier(0.42, 0, 0.58, 1)";
const SPADE_BOX = SPADE_HEIGHT / SPADE_FILL;

/** "intro" until the colours start to move, "easing" until it's gone. */
export type LaunchIntroPhase = "intro" | "easing" | "done";

let phase: LaunchIntroPhase = "intro";
const listeners = new Set<() => void>();

function setPhase(next: LaunchIntroPhase) {
  if (phase === next || phase === "done") return;
  phase = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useLaunchIntroPhase() {
  return useSyncExternalStore(
    subscribe,
    () => phase,
    () => "intro" as const,
  );
}

/** Takes the intro away at once (the error screen). */
export function dismissLaunchIntro() {
  if (typeof document !== "undefined") {
    document.getElementById(LAUNCH_INTRO_ID)?.remove();
    document.documentElement.style.transition = "";
    document.body.style.transition = "";
  }
  setPhase("done");
}

/**
 * Mounted once the app is ready to show. `pageColor` is what the web page
 * (and Chrome's bars) ease to: the colour of the screen under the intro.
 */
export function LaunchIntro({ pageColor }: { pageColor: string }) {
  const current = useLaunchIntroPhase();
  if (current === "done") return null;
  return Platform.OS === "web" ? (
    <WebLaunchIntro pageColor={pageColor} />
  ) : (
    <NativeLaunchIntro />
  );
}

function NativeLaunchIntro() {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);
  const opacity = useSharedValue(1);
  const [fading, setFading] = useState(false);
  const started = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const { night, accent, ink } = theme;

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  // Hidden only once this has laid out, so nothing shows between the two.
  const start = () => {
    if (started.current) return;
    started.current = true;
    requestAnimationFrame(() => SplashScreen.hide());
    const at = (ms: number, run: () => void) =>
      timers.current.push(setTimeout(run, ms));
    const easeAt = INTRO_HOLD_MS;
    const fadeAt = easeAt + INTRO_EASE_MS;
    at(easeAt, () => {
      setPhase("easing");
      progress.value = reduceMotion
        ? 1
        : withTiming(1, {
            duration: INTRO_EASE_MS,
            easing: EASE_IN_OUT,
            reduceMotion: ReduceMotion.Never,
          });
    });
    if (reduceMotion) {
      at(fadeAt, () => setPhase("done"));
      return;
    }
    at(fadeAt, () => {
      setFading(true);
      opacity.value = withTiming(0, {
        duration: INTRO_FADE_MS,
        easing: EASE_IN_OUT,
        reduceMotion: ReduceMotion.Never,
      });
    });
    at(fadeAt + INTRO_FADE_MS, () => setPhase("done"));
  };

  const overlayStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [SPLASH_BACKGROUND, night],
    ),
    opacity: opacity.value,
  }));
  // react-native-svg's colour can't be animated, so the spade in the accent
  // fades in over the white one; the white goes once it's covered, so its
  // anti-aliased edge doesn't linger.
  const whiteStyle = useAnimatedStyle(() => ({
    opacity: progress.value < 1 ? 1 : 0,
  }));
  const accentStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  // The splash has no name: it starts black, unseen on the black.
  const nameStyle = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], ["#000000", ink]),
  }));

  return (
    <Animated.View
      onLayout={start}
      pointerEvents={fading ? "none" : "auto"}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.overlay, overlayStyle]}
    >
      <View style={styles.spade}>
        <Animated.View style={[styles.spadeBox, whiteStyle]}>
          <SpadeMark size={SPADE_BOX} color={SPLASH_SPADE} />
        </Animated.View>
        <Animated.View style={[styles.spadeBox, accentStyle]}>
          <SpadeMark size={SPADE_BOX} color={accent} />
        </Animated.View>
      </View>
      <Animated.Text allowFontScaling={false} style={[styles.name, nameStyle]}>
        Solitarius
      </Animated.Text>
    </Animated.View>
  );
}

function WebLaunchIntro({ pageColor }: { pageColor: string }) {
  // Not undone on unmount: the overlay belongs to the page, not to React.
  useEffect(() => {
    runWebIntro(pageColor);
  }, []);
  return null;
}

/** Eases the static overlay from +html.tsx into the theme, then removes it. */
function runWebIntro(pageColor: string) {
  if (phase !== "intro") return;
  const overlay = document.getElementById(LAUNCH_INTRO_ID);
  const spade = document.getElementById(LAUNCH_INTRO_SPADE_ID);
  const name = document.getElementById(LAUNCH_INTRO_NAME_ID);
  if (!overlay || !spade || !name) {
    dismissLaunchIntro();
    return;
  }
  setPhase("easing");
  const reduceMotion =
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  const html = document.documentElement;
  const body = document.body;
  const ease = `${INTRO_EASE_MS}ms ${CSS_EASE_IN_OUT}`;
  const transition = reduceMotion
    ? "none"
    : `background-color ${ease}, color ${ease}`;
  for (const element of [overlay, spade, name, html, body]) {
    element.style.transition = transition;
  }
  // Commit the starting colours, so the new ones transition from them.
  void overlay.getBoundingClientRect();
  overlay.style.backgroundColor = theme.night;
  spade.style.color = theme.accent;
  name.style.color = theme.ink;
  // The page and Chrome's bars move with it, from the splash's black.
  html.style.backgroundColor = pageColor;
  body.style.backgroundColor = pageColor;
  easeThemeColor(pageColor, reduceMotion);

  if (reduceMotion) {
    setTimeout(dismissLaunchIntro, INTRO_EASE_MS);
    return;
  }
  setTimeout(() => {
    overlay.style.pointerEvents = "none";
    overlay.style.transition = `opacity ${INTRO_FADE_MS}ms ${CSS_EASE_IN_OUT}`;
    overlay.style.opacity = "0";
  }, INTRO_EASE_MS);
  setTimeout(dismissLaunchIntro, INTRO_EASE_MS + INTRO_FADE_MS);
}

/** Steps the theme-color meta tags from the splash's black to `to`. */
function easeThemeColor(to: string, instant: boolean) {
  const metas = document.querySelectorAll<HTMLMetaElement>(
    'meta[name="theme-color"], meta[name="msapplication-navbutton-color"]',
  );
  const set = (color: string) =>
    metas.forEach((meta) => meta.setAttribute("content", color));
  const target = parseHex(to);
  if (instant || !target) {
    set(to);
    return;
  }
  const startTime = performance.now();
  const step = () => {
    // Once the intro's gone, _layout keeps these up.
    if (phase === "done") return;
    const elapsed = (performance.now() - startTime) / INTRO_EASE_MS;
    const t = Math.min(1, Math.max(0, elapsed));
    // Close to CSS's ease-in-out.
    const eased = t * t * (3 - 2 * t);
    const channels = target.map((channel) => Math.round(channel * eased));
    set(t < 1 ? `rgb(${channels.join(",")})` : to);
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function parseHex(color: string): number[] | null {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color);
  return match ? match.slice(1).map((hex) => parseInt(hex, 16)) : null;
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    // Above everything, the system bars' scrims included.
    zIndex: 1000,
    alignItems: "center",
    justifyContent: "center",
  },
  // As tall as the spade itself, so the lockup (spade, gap, name) centres.
  spade: {
    width: SPADE_BOX,
    height: SPADE_HEIGHT,
  },
  spadeBox: {
    position: "absolute",
    left: 0,
    top: (SPADE_HEIGHT - SPADE_BOX) / 2,
  },
  name: {
    marginTop: NAME_GAP,
    height: NAME_SIZE,
    fontFamily: FontWeight[500],
    fontSize: NAME_SIZE,
    lineHeight: NAME_SIZE,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
});
