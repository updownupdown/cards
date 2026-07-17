import { Button } from "@/components/Button/Button";
import { Text } from "@/components/common/Text";
import { useFade } from "@/hooks/useFade";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { flexStyles } from "@/styles/flexStyles";
import { menuStyles } from "@/styles/menuStyles";
import {
  Colors,
  HeaderButtonIconSize,
  HeaderButtonSize,
  rgba,
} from "@/styles/styles";
import React, { useRef, useState } from "react";
import { Animated, Easing, Platform } from "react-native";

const holdToResetDuration = 900;
const minDisplayDuration = holdToResetDuration;

interface Props {
  reset: () => void;
  minHintDuration?: number;
  iconSize?: number;
  iconColor?: string;
  pressedIconColor?: string;
}

export function ResetButton({
  reset,
  iconColor = Colors.K200,
  pressedIconColor,
  iconSize = HeaderButtonIconSize,
}: Props) {
  const { spacing } = useResponsiveMetrics();
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
            top: 4,
            left: 4,
            bottom: 4,
            right: `${(2 / 5) * 100}%`,
            borderRadius: HeaderButtonSize / 2,
            backgroundColor: rgba(Colors.black, 0.8),
            boxShadow: `1px 2px 6px ${rgba(Colors.black, 0.4)}, 2px 4px 20px ${rgba(Colors.black, 0.4)}`,
          }}
        >
          <Animated.View
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              backgroundColor: rgba(Colors.lose, 0.7),
              width: resetProgress.interpolate({
                inputRange: [0, 1],
                outputRange: ["0%", "100%"],
              }),
            }}
          />

          <Text
            weight={300}
            size="sm"
            color={Colors.K100}
            style={{
              textAlign: "center",
            }}
          >
            Hold to reset game
          </Text>
        </Animated.View>
      )}

      <Button
        style={[menuStyles.headerButton]}
        onPress={displayResetHint}
        onLongPress={reset}
        onPressIn={onPressInReset}
        onPressOut={onPressOutReset}
        delayLongPress={holdToResetDuration}
        preventWebLongPressMenu
        iconName="reset"
        iconColor={isResetPressed ? (pressedIconColor ?? iconColor) : iconColor}
        iconSize={iconSize}
      />
    </>
  );
}
