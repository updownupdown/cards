import { Button } from "@/components/Button/Button";
import { Text } from "@/components/common/Text";
import { useFade } from "@/hooks/useFade";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useTranslation } from "@/i18n";
import { flexStyles } from "@/styles/flexStyles";
import { layoutDims, Colors, rgba, theme } from "@/styles/styles";
import React, { useRef, useState } from "react";
import { Animated, Easing, Platform } from "react-native";

const holdToResetDuration = 900;
const minDisplayDuration = holdToResetDuration;

interface Props {
  reset: () => void;
  minHintDuration?: number;
  iconColor?: string;
  pressedIconColor?: string;
  label?: string;
}

export function ResetButton({
  reset,
  iconColor = Colors.K200,
  pressedIconColor,
  label,
}: Props) {
  const { spacing } = useResponsiveMetrics();
  const { t } = useTranslation("game");
  const [showResetHint, setShowResetHint] = useState(false);
  const { isRendered: renderResetHint, opacity: hintOpacity } = useFade(
    showResetHint,
    300,
  );

  const hintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset Progress Animation
  const resetProgress = useRef(new Animated.Value(0)).current;
  const [isResetPressed, setIsResetPressed] = useState(false);

  const onPressInReset = () => {
    setIsResetPressed(true);
    resetProgress.setValue(0);
    displayResetHint();
    Animated.timing(resetProgress, {
      toValue: 1,
      duration: holdToResetDuration,
      easing: Easing.linear,
      // Drives scaleX (not width) so this can run off the JS thread.
      useNativeDriver: Platform.OS !== "web",
    }).start();
  };

  const onPressOutReset = () => {
    setIsResetPressed(false);
    Animated.timing(resetProgress, {
      toValue: 0,
      duration: 150,
      easing: Easing.linear,
      useNativeDriver: Platform.OS !== "web",
    }).start();
  };

  // Show reset hint for at least 1s
  const displayResetHint = () => {
    setShowResetHint(true);
    if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
    hintTimeoutRef.current = setTimeout(() => {
      setShowResetHint(false);
    }, minDisplayDuration);
  };

  return (
    <>
      {renderResetHint && (
        <Animated.View
          style={{
            opacity: hintOpacity,
            ...flexStyles.rowCentered,
            overflow: "hidden",
            position: "absolute",
            zIndex: 20,
            top: spacing(layoutDims.menuBarPadding),
            left: spacing(layoutDims.menuBarPadding),
            bottom: spacing(layoutDims.menuBarPadding),
            // Number of icons to the right of the reset button (2) divided by total number of icons (5)
            right: `${(2 / 5) * 100}%`,
            borderRadius: spacing(
              layoutDims.menuBarHeight / 2 - layoutDims.menuBarPadding,
            ),
            backgroundColor: rgba(theme.surface, 0.96),
            boxShadow: `1px 2px 6px ${rgba(Colors.black, 0.4)}, 2px 4px 20px ${rgba(Colors.black, 0.4)}`,
          }}
        >
          <Animated.View
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: rgba(theme.accent, 0.35),
              transformOrigin: "left",
              transform: [{ scaleX: resetProgress }],
            }}
          />

          <Text
            weight={400}
            size="sm"
            color={Colors.K100}
            style={{
              textAlign: "center",
            }}
          >
            {t("reset.hold")}
          </Text>
        </Animated.View>
      )}

      <Button
        headerButton
        onPress={displayResetHint}
        onLongPress={reset}
        onPressIn={onPressInReset}
        onPressOut={onPressOutReset}
        delayLongPress={holdToResetDuration}
        preventWebLongPressMenu
        iconName="reset"
        label={label}
        iconColor={isResetPressed ? (pressedIconColor ?? iconColor) : iconColor}
        style={{ flex: 1, paddingHorizontal: 0 }}
      />
    </>
  );
}
