import { Text } from "@/components/common/Text";
import { Button } from "@/components/Button/Button";
import { useFade } from "@/hooks/useFade";
import { flexStyles } from "@/styles/flexStyles";
import { menuStyles } from "@/styles/menuStyles";
import {
  Colors,
  ContentSidePadding,
  FontWeight,
  HeaderButtonIconSize,
  HeaderButtonSize,
  rgba,
} from "@/styles/styles";
import React, { useRef, useState } from "react";
import { Animated, Easing, Platform, StyleSheet, View } from "react-native";

const holdToResetDuration = 900;
const minDisplayDuration = holdToResetDuration;

interface Props {
  reset: () => void;
  minHintDuration?: number;
  iconColor?: string;
  pressedIconColor?: string;
}

export function ResetButton({
  reset,
  iconColor = Colors.K200,
  pressedIconColor,
}: Props) {
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
        <Animated.View style={[styles.resetHint, { opacity: hintOpacity }]}>
          <Animated.View
            style={[
              styles.resetHintProgress,
              {
                width: resetProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0%", "100%"],
                }),
              },
            ]}
          />

          <Text style={styles.resetHintText}>Press and hold to reset game</Text>
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
        iconSize={HeaderButtonIconSize}
      />
    </>
  );
}

export const styles = StyleSheet.create({
  // Restart game
  resetHint: {
    ...flexStyles.rowCentered,
    overflow: "hidden",
    position: "absolute",
    zIndex: 20,
    top: ContentSidePadding / 2,
    left: ContentSidePadding,
    right: HeaderButtonSize * 2 + 8 + ContentSidePadding,
    height: HeaderButtonSize,

    borderRadius: HeaderButtonSize / 2,
    backgroundColor: rgba(Colors.black, 0.8),
    boxShadow: `1px 2px 6px ${rgba(Colors.black, 0.4)}, 2px 4px 20px ${rgba(Colors.black, 0.4)}`,
  },
  resetHintText: {
    color: Colors.K100,
    fontSize: 16,
    fontFamily: FontWeight[300],
    textAlign: "center",
  },
  resetHintProgress: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: rgba(Colors.lose, 0.7),
  },
});
