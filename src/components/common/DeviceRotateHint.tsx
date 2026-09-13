import { useFade } from "@/hooks/useFade";
import { TABLET_BREAKPOINT } from "@/hooks/useResponsiveLayout";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useViewportDimensions } from "@/hooks/useViewportDimensions";
import { Colors, LayerZIndexes, layoutDims, rgba } from "@/styles/styles";
import { useEffect, useState } from "react";
import { Animated } from "react-native";
import { Button } from "../Button/Button";

const HINT_DURATION = 8_000;
const FADE_DURATION = 250;

interface Props {
  enabled?: boolean;
}

export const DeviceRotateHint = ({ enabled = false }: Props) => {
  const { width, height } = useViewportDimensions();
  const { spacing } = useResponsiveMetrics();
  const [started, setStarted] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const qualifies =
    enabled &&
    width > 0 &&
    height > 0 &&
    width < TABLET_BREAKPOINT &&
    width < height;
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
        left: spacing(layoutDims.pagePadding),
        bottom: spacing(layoutDims.pagePadding),
        opacity: fade.opacity,
        pointerEvents: "none",
      }}
    >
      <Button
        text={`Landscape mode\nrecommended`}
        size="md"
        iconSize={40}
        iconName="rotate-device"
        autoProgress={HINT_DURATION}
        autoProgressColor={rgba(Colors.white, 0.1)}
        onPress={() => {}}
        theme={rgba(Colors.K950, 0.65)}
        lineHeight={1.3}
        style={{
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
