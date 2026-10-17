import {
  INTRO_EASE_MS,
  INTRO_FADE_MS,
  LAUNCH_INTRO_ID,
  LAUNCH_INTRO_NAME_ID,
  LAUNCH_INTRO_SPADE_ID,
} from "@/components/common/launch-lockup";
import { theme } from "@/styles/styles";
import { SplashScreen } from "expo-router";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { Platform, StyleSheet, View } from "react-native";

// On the web, the launch intro is the page's splash (+html.tsx, drawn before
// the app loads): this eases it into the colour theme, adding the name in its
// ink, then fades it away over the home screen. Native has no intro: the
// system splash already shows the spade in Nocturne's colours, so it's hidden
// as soon as the app has laid out, and the app shows straight away.

const CSS_EASE_IN_OUT = "cubic-bezier(0.42, 0, 0.58, 1)";

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
    <NativeSplashHide />
  );
}

/** Hides the system splash once the screens under it have laid out. */
function NativeSplashHide() {
  const started = useRef(false);
  const hide = () => {
    if (started.current) return;
    started.current = true;
    requestAnimationFrame(() => {
      SplashScreen.hide();
      setPhase("done");
    });
  };
  return (
    <View
      onLayout={hide}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.probe}
    />
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
  // The page and Chrome's bars move with it, from the splash's night.
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

/** Steps the theme-color meta tags from the splash's colour to `to`. */
function easeThemeColor(to: string, instant: boolean) {
  const metas = document.querySelectorAll<HTMLMetaElement>(
    'meta[name="theme-color"], meta[name="msapplication-navbutton-color"]',
  );
  const set = (color: string) =>
    metas.forEach((meta) => meta.setAttribute("content", color));
  const from = parseHex(metas[0]?.getAttribute("content") ?? "");
  const target = parseHex(to);
  if (instant || !target || !from) {
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
    const channels = target.map((channel, index) =>
      Math.round(from[index] + (channel - from[index]) * eased),
    );
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
  // Laid out with the screens under it; draws nothing.
  probe: {
    ...StyleSheet.absoluteFillObject,
  },
});
