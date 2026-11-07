import { Button } from "@/components/Button/Button";
import { REVEAL_TIMING } from "@/components/common/reveal-timing";
import {
  SkyIsland,
  useTapShootingStars,
} from "@/components/common/TapShootingStars";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useTranslation } from "@/i18n";
import { PaletteContext, usePalette } from "@/styles/palette";
import { Colors, rgba } from "@/styles/styles";
import type { ThemeColors } from "@/styles/themes";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { haptics } from "@/utils/haptics";

/** The backdrop fades in over this, and the page opens on it a little before. */
const IN_MS = REVEAL_TIMING.fadeInMs;
const PAGE_AT = IN_MS * 0.6;
/** When the screen behind can change unseen, after the player leaves. */
export const EXIT_UNCOVER_MS = REVEAL_TIMING.fadeOutMs * 0.3;
/** When the reveal is gone, after the player leaves. */
export const EXIT_TOTAL_MS = REVEAL_TIMING.fadeOutMs;
const BUTTON_IN_MS = 700;
/** Held this long, Hold to skip leaves; meanwhile the page darkens to black. */
export const HOLD_TO_SKIP_MS = 2500;
/** Let go early, and the dark and the bar drain back at this pace (from full). */
const RELEASE_MS = 500;

export type RevealPage = {
  width: number;
  height: number;
  /** Room to keep clear at the top, and at the bottom for the button. */
  topInset: number;
  bottomInset: number;
  /** Tell the reveal its animation has finished: Skip becomes Continue. */
  onRead: () => void;
};

type Props = {
  testID: string;
  /** What covers the game, filling the screen under the page. */
  backdrop: ReactNode;
  /** Opaque behind the backdrop, so the game never shows through it. */
  backgroundColor: string;
  /** The colours of the page and the button; the game's own by default. */
  palette?: ThemeColors;
  /** The collectible's page, as the Gallery shows it. */
  children: (page: RevealPage) => ReactNode;
  /** Just before the backdrop clears: the screen behind can change unseen. */
  onUncover?: () => void;
  onDone: () => void;
};

/**
 * The full-screen reveal of a collectible earned by a Campaign win: a
 * backdrop fades in over the game, and on it the collectible's own page
 * from the Gallery, animating as it does there. The one thing added is the
 * button fixed at the bottom, which closes the reveal and gives the win box
 * back: a quiet Hold to skip while the page is still animating, then the
 * bright Continue. Covers its parent, so place it last in the screen's tree.
 */
export function RewardReveal({
  testID,
  backdrop,
  backgroundColor,
  palette: paletteProp,
  children,
  onUncover,
  onDone,
}: Props) {
  const insets = useSafeAreaInsets();
  const { spacing } = useResponsiveMetrics();
  const { t } = useTranslation("campaign");
  const inherited = usePalette();
  const palette = paletteProp ?? inherited;
  const [size, setSize] = useState<{ width: number; height: number } | null>(
    null,
  );
  const [pageOpen, setPageOpen] = useState(false);
  const [read, setRead] = useState(false);
  const [closing, setClosing] = useState(false);
  const cover = useSharedValue(0);
  const button = useSharedValue(0);
  /** How far Hold to skip has been held, 0 to 1. */
  const hold = useSharedValue(0);

  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const onUncoverRef = useRef(onUncover);
  onUncoverRef.current = onUncover;

  useEffect(() => {
    cover.value = withTiming(1, {
      duration: IN_MS,
      easing: Easing.inOut(Easing.quad),
    });
    const timer = setTimeout(() => setPageOpen(true), PAGE_AT);
    return () => clearTimeout(timer);
  }, [cover]);

  // The button comes in with the page, and stays.
  useEffect(() => {
    if (!pageOpen) return;
    button.value = withTiming(1, {
      duration: BUTTON_IN_MS,
      easing: Easing.inOut(Easing.quad),
    });
  }, [button, pageOpen]);

  const exitTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => exitTimers.current.forEach(clearTimeout), []);
  const close = useCallback(() => {
    if (closing) return;
    setClosing(true);
    const ease = Easing.inOut(Easing.quad);
    button.value = withTiming(0, { duration: BUTTON_IN_MS, easing: ease });
    cover.value = withTiming(0, { duration: EXIT_TOTAL_MS, easing: ease });
    exitTimers.current.push(
      setTimeout(() => onUncoverRef.current?.(), EXIT_UNCOVER_MS),
      setTimeout(() => onDoneRef.current(), EXIT_TOTAL_MS),
    );
  }, [button, closing, cover]);
  const onRead = useCallback(() => setRead(true), []);

  // Skipping asks for a moment's patience: the button has to be held, and
  // while it is the page slowly goes dark, so the player sees what they're
  // letting go of. Let go early and it all comes back.
  //
  // Where the hold stood and which way it was going, so a second press picks
  // up from wherever the first one's drain had got to. Kept here rather than
  // read back from the animation.
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdRun = useRef({ from: 0, at: 0, rising: false });
  const holding = useRef(false);
  const heldNow = useCallback(() => {
    const { from, at, rising } = holdRun.current;
    const elapsed = Date.now() - at;
    return rising
      ? Math.min(1, from + elapsed / HOLD_TO_SKIP_MS)
      : Math.max(0, from - elapsed / RELEASE_MS);
  }, []);
  const startHold = useCallback(() => {
    if (read || closing || !pageOpen || holding.current) return;
    holding.current = true;
    const from = heldNow();
    holdRun.current = { from, at: Date.now(), rising: true };
    const remaining = HOLD_TO_SKIP_MS * (1 - from);
    hold.value = withTiming(1, { duration: remaining, easing: Easing.linear });
    holdTimer.current = setTimeout(() => {
      holdTimer.current = null;
      holding.current = false;
      haptics.drop();
      close();
    }, remaining);
  }, [close, closing, heldNow, hold, pageOpen, read]);
  const endHold = useCallback(() => {
    if (!holding.current) return;
    holding.current = false;
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
    const from = heldNow();
    holdRun.current = { from, at: Date.now(), rising: false };
    hold.value = withTiming(0, {
      duration: RELEASE_MS * from,
      easing: Easing.linear,
    });
  }, [heldNow, hold]);
  useEffect(
    () => () => {
      if (holdTimer.current) clearTimeout(holdTimer.current);
    },
    [],
  );
  // Once the page is read, the bright Continue is free.
  useEffect(() => {
    if (read) endHold();
  }, [endHold, read]);
  const onButton = useCallback(() => {
    if (read) close();
  }, [close, read]);

  const coverStyle = useAnimatedStyle(() => ({ opacity: cover.value }));
  const buttonStyle = useAnimatedStyle(() => ({ opacity: button.value }));
  // Slow at first, so a brief press barely dims; black only at the end.
  const dimStyle = useAnimatedStyle(() => ({
    opacity: Math.pow(hold.value, 1.6),
  }));

  const buttonBottom = insets.bottom + spacing(24);

  // The hidden game: taps on the sky send shooting stars (see
  // TapShootingStars). The button is an island.
  const sky = useTapShootingStars({
    enabled: pageOpen && !closing,
    width: size?.width ?? 0,
    height: size?.height ?? 0,
  });

  return (
    <Animated.View
      testID={testID}
      {...sky.rootProps}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setSize((current) => current ?? { width, height });
        sky.onLayout();
      }}
      style={[
        StyleSheet.absoluteFill,
        { zIndex: 1000, backgroundColor },
        coverStyle,
      ]}
    >
      {backdrop}

      <PaletteContext.Provider value={palette}>
        {size &&
          pageOpen &&
          children({
            width: size.width,
            height: size.height,
            topInset: insets.top + spacing(12),
            bottomInset: buttonBottom + spacing(56),
            onRead,
          })}

        {sky.layer}

        {/* Darkens over everything but the button as Hold to skip is held. */}
        <Animated.View
          testID="reveal-dim"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: Colors.black, pointerEvents: "none" },
            dimStyle,
          ]}
        />

        {/* Fixed at the bottom, over the page as it scrolls. A plain view
            holds it in place: a pointerEvents style on an animated view
            reaches the web as "none" and the button under it can't be
            pressed. */}
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: buttonBottom,
            alignItems: "center",
            pointerEvents: "box-none",
          }}
        >
          <Animated.View style={buttonStyle}>
            <SkyIsland testID="reveal-button">
              {/* Still animating, the way out is there but doesn't call:
                  the palette's night with its accent for the word, and a
                  bar of the accent filling it as it's held. Done, it is the
                  bright Continue. One button, so the change is a fade. */}
              <Button
                text={read ? t("reveal.continue") : t("reveal.holdToSkip")}
                onPress={onButton}
                onPressIn={read ? undefined : startHold}
                onPressOut={read ? undefined : endHold}
                preventWebLongPressMenu
                progress={read ? undefined : hold}
                autoProgressColor={rgba(palette.accent, 0.3)}
                disabled={!pageOpen || closing}
                style={read ? undefined : { backgroundColor: palette.night }}
                textStyle={read ? undefined : { color: palette.accent }}
              />
            </SkyIsland>
          </Animated.View>
        </View>
      </PaletteContext.Provider>
    </Animated.View>
  );
}
