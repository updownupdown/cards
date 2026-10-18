import { Text } from "@/components/common/Text";
import { useFade } from "@/hooks/useFade";
import { TABLET_BREAKPOINT } from "@/hooks/useResponsiveLayout";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useViewportDimensions } from "@/hooks/useViewportDimensions";
import { useTranslation } from "@/i18n";
import { Icon } from "@/icons";
import { usePalette } from "@/styles/palette";
import { Colors, LayerZIndexes, layoutDims, rgba } from "@/styles/styles";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const HINT_DURATION = 8_000;
const FADE_DURATION = 250;

// Desktop browser windows are usually wider than tall, so the portrait hint is
// only meaningful on touch devices that can actually be rotated.
const canRotate =
  Platform.OS !== "web" ||
  (typeof window !== "undefined" &&
    !!window.matchMedia?.("(pointer: coarse)").matches);

interface Props {
  orientation?: "landscape" | "portrait" | null;
}

export const DeviceRotateHint = ({ orientation = null }: Props) => {
  const { width, height } = useViewportDimensions();
  const { spacing } = useResponsiveMetrics();
  const { t } = useTranslation("game");
  const insets = useSafeAreaInsets();
  const palette = usePalette();
  const [started, setStarted] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const isPhone =
    width > 0 && height > 0 && Math.min(width, height) < TABLET_BREAKPOINT;
  const qualifies =
    orientation !== null &&
    isPhone &&
    (orientation === "landscape"
      ? width < height
      : canRotate && width > height);
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
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: HINT_DURATION,
      easing: Easing.linear,
      // Drives scaleX (not width) so this can run off the JS thread.
      useNativeDriver: Platform.OS !== "web",
    });
    animation.start();
    return () => {
      clearTimeout(timeout);
      animation.stop();
    };
  }, [dismissed, progress, started]);

  if (orientation === null || !fade.isRendered) return null;

  // Its own pill rather than a Button: a Button's label is one line that
  // shrinks to fit, which cut the two-line hint down to a tiny first line.
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
      <View
        accessibilityRole="text"
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: spacing(12),
          overflow: "hidden",
          borderRadius: spacing(14),
          paddingVertical: spacing(12),
          paddingLeft: spacing(14),
          paddingRight: spacing(18),
          borderWidth: 1,
          borderColor: rgba(palette.ink, 0.1),
          backgroundColor: rgba(Colors.K950, 0.65),
        }}
      >
        <Animated.View
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            transformOrigin: "left",
            transform: [{ scaleX: progress }],
            backgroundColor: rgba(Colors.white, 0.1),
          }}
        />
        <Icon
          name="rotate-device"
          size={spacing(36)}
          color={palette.ink}
          style={{ flexShrink: 0 }}
        />
        <Text size="sm" weight="medium" lineHeight={1.3}>
          {t(
            orientation === "landscape"
              ? "rotateHint.landscape"
              : "rotateHint.portrait",
          )}
        </Text>
      </View>
    </Animated.View>
  );
};
