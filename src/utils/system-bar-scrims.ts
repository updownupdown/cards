/**
 * The black gradients laid under the system bars, so the status bar's icons
 * (top) and the navigation buttons or home indicator (bottom) stay readable
 * over whatever the app draws behind them, while the app still reaches the
 * edges of the screen.
 *
 * ─── LOCKED ────────────────────────────────────────────────────────────────
 * These values were tuned and signed off (native softened and dropped from
 * game screens on 2026-09-29, at the owner's request). Do not change them as
 * part of any other UI work, and warn the owner before changing them even
 * when asked to (see AGENTS.md). src/__tests__/system-bar-scrims.test.ts pins
 * them.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Which case draws what. A scrim is only ever drawn over a safe-area inset,
 * which is where the system draws its bars over the app:
 *
 * Native draws a softer scrim than the web (NATIVE_SCRIM): one smooth fall
 * from the screen's edge, with no band held at full strength, which read as
 * a box with a shadow. Native game screens draw none: nothing of the game's
 * interface sits under the bars, so their icons stay readable anyway.
 *
 * Native (Android, edge-to-edge is enforced; status and navigation bars are
 * transparent, see app.config.js):
 *   - Status bar: top inset (~24-50dp) -> top scrim, for the white icons.
 *   - Three-button navigation: bottom inset ~48dp -> strong bottom scrim, as
 *     the white buttons don't adapt to what is under them.
 *   - Gesture navigation: bottom inset ~16-24dp -> light bottom scrim under
 *     the handle.
 *   - Landscape: side insets are left alone (no bars are drawn there).
 * Native (iOS):
 *   - Status bar / notch / Dynamic Island: top inset (~47-59pt) -> top scrim.
 *     In landscape the status bar hides and the top inset is 0 -> none.
 *   - Home indicator: bottom inset ~21-34pt -> light bottom scrim (the
 *     indicator adapts its own colour).
 * Web in a browser tab (desktop or mobile): the browser's chrome sits outside
 *   the page, the insets are 0 -> no scrims. The chrome is tinted through the
 *   theme-color meta instead (see _layout).
 * Web app, installed (standalone PWA):
 *   - iOS: apple-mobile-web-app-status-bar-style is black-translucent, so the
 *     page runs under the status bar and home indicator and the insets come
 *     from env(safe-area-inset-*) -> scrims in the same places as native
 *     iOS, at the web's strength and shape (SYSTEM_BAR_SCRIM).
 *   - Android: Chrome paints the status and navigation bars itself (from
 *     theme-color and the page background), the insets are 0 -> no scrims.
 */

export type ScrimPlatform = "ios" | "android" | "web";

export type SystemBarScrim = {
  /** From the screen's edge inwards. */
  height: number;
  /** From the screen's edge inwards, black at falling opacity. */
  colors: string[];
  locations: number[];
};

/** LOCKED: see the note at the top of this file. */
export const SYSTEM_BAR_SCRIM = {
  /** Behind the status bar's white icons. */
  topOpacity: 0.5,
  /** Behind Android's three navigation buttons. */
  buttonsOpacity: 0.55,
  /** Behind a gesture handle or the home indicator. */
  handleOpacity: 0.3,
  /** An Android bottom inset at least this tall holds the three buttons. */
  buttonsMinInset: 40,
  /** How far past the inset the gradient runs out, as a share of it... */
  fadeRatio: 0.8,
  /** ...and at least this far, so a thin inset still fades gently. */
  minFade: 16,
} as const;

/** LOCKED: see the note at the top of this file. The native scrim. */
export const NATIVE_SCRIM = {
  topOpacity: 0.42,
  buttonsOpacity: 0.48,
  handleOpacity: 0.24,
  /** The fade runs this far past the inset, as a share of it... */
  fadeRatio: 1.5,
  /** ...and at least this far. */
  minFade: 24,
} as const;

/**
 * The fall-off, eased so it has no visible edge: [position within the
 * inset-and-fade, share of the peak opacity]. The inset itself (up to 1 on
 * the first axis) is held close to the peak.
 */
const INSET_STOPS = [
  [0, 1],
  [1, 0.8],
] as const;
const FADE_STOPS = [
  [0.35, 0.4],
  [0.7, 0.12],
  [1, 0],
] as const;

function scrim(inset: number, opacity: number): SystemBarScrim {
  const fade = Math.max(
    inset * SYSTEM_BAR_SCRIM.fadeRatio,
    SYSTEM_BAR_SCRIM.minFade,
  );
  const height = inset + fade;
  const insetShare = inset / height;
  const stops: [number, number][] = [
    ...INSET_STOPS.map(
      ([at, share]) => [at * insetShare, share] as [number, number],
    ),
    ...FADE_STOPS.map(
      ([at, share]) =>
        [insetShare + at * (1 - insetShare), share] as [number, number],
    ),
  ];
  const round = (value: number) => Math.round(value * 1000) / 1000;
  return {
    height,
    colors: stops.map(
      ([, share]) => `rgba(0, 0, 0, ${round(opacity * share)})`,
    ),
    locations: stops.map(([at]) => round(at)),
  };
}

/** Native: one smooth fall from the edge to clear, a smoothstep sampled. */
function nativeScrim(inset: number, opacity: number): SystemBarScrim {
  const height =
    inset + Math.max(inset * NATIVE_SCRIM.fadeRatio, NATIVE_SCRIM.minFade);
  const round = (value: number) => Math.round(value * 1000) / 1000;
  const steps = 8;
  const at = Array.from({ length: steps + 1 }, (_, index) => index / steps);
  return {
    height,
    colors: at.map(
      (t) => `rgba(0, 0, 0, ${round(opacity * (1 - t * t * (3 - 2 * t)))})`,
    ),
    locations: at.map(round),
  };
}

export function getSystemBarScrims({
  platform,
  insets,
  inGame = false,
}: {
  platform: ScrimPlatform;
  insets: { top: number; bottom: number };
  /** On a game's screen. */
  inGame?: boolean;
}): { top: SystemBarScrim | null; bottom: SystemBarScrim | null } {
  const native = platform !== "web";
  if (native && inGame) return { top: null, bottom: null };
  const values = native ? NATIVE_SCRIM : SYSTEM_BAR_SCRIM;
  const draw = native ? nativeScrim : scrim;

  const top = insets.top > 0 ? draw(insets.top, values.topOpacity) : null;
  let bottom: SystemBarScrim | null = null;
  if (insets.bottom > 0) {
    const buttons =
      platform === "android" &&
      insets.bottom >= SYSTEM_BAR_SCRIM.buttonsMinInset;
    bottom = draw(
      insets.bottom,
      buttons ? values.buttonsOpacity : values.handleOpacity,
    );
  }
  return { top, bottom };
}
