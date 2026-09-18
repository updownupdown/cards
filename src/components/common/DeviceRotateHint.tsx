import { useFade } from "@/hooks/useFade";
import { TABLET_BREAKPOINT } from "@/hooks/useResponsiveLayout";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useViewportDimensions } from "@/hooks/useViewportDimensions";
import { useTranslation } from "@/i18n";
import { Colors, LayerZIndexes, layoutDims, rgba } from "@/styles/styles";
import { useEffect, useState } from "react";
import { Animated, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "../Button/Button";

const HINT_DURATION = 8_000;
const FADE_DURATION = 250;

// Desktop browser windows are usually wider than tall, so the portrait hint is
// only meaningful on touch devices that can actually be rotated.
const canRotate =
  Platform.OS !== "web" ||
  (typeof window !== "undefined" &&
    !!window.matchMedia?.("(pointer: coarse)").matches);

interface Props {
  /** Landscape suits this game; otherwise portrait is recommended. */
  landscapeRecommended?: boolean;
}

export const DeviceRotateHint = ({ landscapeRecommended = false }: Props) => {
  const { width, height } = useViewportDimensions();
  const { spacing } = useResponsiveMetrics();
  const { t } = useTranslation("game");
  const insets = useSafeAreaInsets();
  const [started, setStarted] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const isPhone =
    width > 0 && height > 0 && Math.min(width, height) < TABLET_BREAKPOINT;
  const qualifies =
    isPhone &&
    (landscapeRecommended ? width < height : canRotate && width > height);
  const fade = useFade(started && !dismissed && qualifies, FADE_DURATION);

  useEffect(() => {
    if (!started && qualifies) {
      setStarted(true);
    } else if (started && !qualifies) {
      setDismissed(true);
    }
  }, [qualifies, started]);

  useEffect(() => {
    if (!started || dismissed) return;

    const timeout = setTimeout(() => setDismissed(true), HINT_DURATION);
    return () => clearTimeout(timeout);
  }, [dismissed, started]);

  if (!fade.isRendered) return null;

  return (
    <Animated.View
      style={{
        position: "absolute",
        zIndex: LayerZIndexes.boardContent + 1,
        left: insets.left + spacing(layoutDims.pagePadding),
        bottom: insets.bottom + spacing(layoutDims.pagePadding),
        opacity: fade.opacity,
        pointerEvents: "none",
      }}
    >
      <Button
        text={t(
          landscapeRecommended ? "rotateHint.landscape" : "rotateHint.portrait",
        )}
        size="md"
        iconSize={40}
        iconName="rotate-device"
        autoProgress={HINT_DURATION}
        autoProgressColor={rgba(Colors.white, 0.1)}
        onPress={() => {}}
        theme={rgba(Colors.K950, 0.65)}
        lineHeight={1.3}
        style={{
          // Grow to fit both lines (and larger system font sizes) instead of
          // the button's fixed height, which clipped the second line.
          height: "auto",
          borderRadius: spacing(12),
          paddingHorizontal: spacing(14),
          paddingVertical: spacing(12),
          boxShadow: "none",
        }}
        taller
      />
    </Animated.View>
  );
};
