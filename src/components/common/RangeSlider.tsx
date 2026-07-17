import { Colors, rgba } from "@/styles/styles";
import React, { useRef, useState, useEffect, useCallback } from "react";
import { View, Animated, ViewStyle } from "react-native";
import { Text } from "./Text";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";

type RangeSliderProps = {
  label?: string;
  min?: number;
  max?: number;
  onRangeChange?: (range: { min: number; max: number }) => void;
};

export const RangeSlider = ({
  label,
  min = 0,
  max = 100,
  onRangeChange,
}: RangeSliderProps) => {
  const { spacing } = useResponsiveMetrics();

  const THUMB_SIZE = spacing(34);
  const TRACK_PADDING = spacing(6);

  const thumbStyles: ViewStyle = {
    position: "absolute",
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: Colors.suitsRed,
    zIndex: 1,
  };

  const [containerWidth, setContainerWidth] = useState(0);

  // Animated values to handle smooth dragging
  const leftThumbX = useRef(new Animated.Value(0)).current;
  const rightThumbX = useRef(new Animated.Value(0)).current;

  // Refs to keep track of exact positional values for math logic
  const leftX = useRef(0);
  const rightX = useRef(0);

  // Refs to freeze the starting position when a drag begins
  const leftStartX = useRef(0);
  const rightStartX = useRef(0);

  // Sync Animated values with Refs
  useEffect(() => {
    const leftSub = leftThumbX.addListener(({ value }) => {
      leftX.current = value;
    });
    const rightSub = rightThumbX.addListener(({ value }) => {
      rightX.current = value;
    });
    return () => {
      leftThumbX.removeListener(leftSub);
      rightThumbX.removeListener(rightSub);
    };
  }, [leftThumbX, rightThumbX]);

  // Initialize right thumb position once the container width is known
  useEffect(() => {
    if (containerWidth > 0) {
      const initialRight = containerWidth - THUMB_SIZE;
      rightThumbX.setValue(initialRight);
      rightX.current = initialRight;
    }
  }, [containerWidth, rightThumbX]);

  // Converts pixel position back to min/max values
  const reportValues = useCallback(() => {
    if (containerWidth === 0 || !onRangeChange) return;
    const trackWidth = containerWidth - THUMB_SIZE;

    const lowVal = min + (leftX.current / trackWidth) * (max - min);
    const highVal = min + (rightX.current / trackWidth) * (max - min);

    onRangeChange({
      min: Math.round(lowVal),
      max: Math.round(highVal),
    });
  }, [containerWidth, min, max, onRangeChange]);

  // Drag responder for the minimum (left) toggle
  const leftPanGesture = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-5, 5])
    .onStart(() => {
      leftStartX.current = leftX.current; // Freeze the start position
      leftThumbX.setOffset(leftStartX.current);
      leftThumbX.setValue(0);
    })
    .onUpdate((e) => {
      let newX = e.translationX;

      // Use leftStartX.current instead of leftX.current for the math
      if (leftStartX.current + newX < 0) {
        newX = -leftStartX.current;
      }
      // Prevent crossing the right thumb
      else if (leftStartX.current + newX > rightX.current - THUMB_SIZE) {
        newX = rightX.current - THUMB_SIZE - leftStartX.current;
      }

      leftThumbX.setValue(newX);
    })
    .onEnd(() => {
      leftThumbX.flattenOffset();
      reportValues();
    });

  // Drag responder for the maximum (right) toggle
  const rightPanGesture = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-5, 5])
    .onStart(() => {
      rightStartX.current = rightX.current; // Freeze the start position
      rightThumbX.setOffset(rightStartX.current);
      rightThumbX.setValue(0);
    })
    .onUpdate((e) => {
      let newX = e.translationX;

      // Use rightStartX.current instead of rightX.current for the math
      if (rightStartX.current + newX > containerWidth - THUMB_SIZE) {
        newX = containerWidth - THUMB_SIZE - rightStartX.current;
      }
      // Prevent crossing the left thumb
      else if (rightStartX.current + newX < leftX.current + THUMB_SIZE) {
        newX = leftX.current + THUMB_SIZE - rightStartX.current;
      }

      rightThumbX.setValue(newX);
    })
    .onEnd(() => {
      rightThumbX.flattenOffset();
      reportValues();
    });

  // Math to perfectly size and position the transparent red track between the two toggles
  const trackLeftPos = Animated.add(leftThumbX, THUMB_SIZE / 2);
  const trackWidthAnim = Animated.subtract(rightThumbX, leftThumbX);

  return (
    <View style={{ width: "100%", gap: spacing(6) }}>
      {label && (
        <Text size="xs" color={Colors.K300} textTransform="uppercase">
          {label}
        </Text>
      )}

      <View
        style={{
          height: THUMB_SIZE + TRACK_PADDING * 2,
          width: "100%",
          backgroundColor: Colors.K900,
          borderRadius: THUMB_SIZE / 2 + TRACK_PADDING,
          padding: TRACK_PADDING,
          boxShadow: `inset 0 0 10px ${rgba(Colors.black, 0.2)}`,
        }}
      >
        <View
          style={{
            width: "100%",
            height: "100%",
            justifyContent: "center",
            position: "relative",
          }}
          onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
        >
          {/* Transparent Red Connecting Bar */}
          <Animated.View
            style={{
              position: "absolute",
              height: "100%",
              backgroundColor: rgba(Colors.suitsRed, 0.3),
              left: trackLeftPos,
              width: trackWidthAnim,
            }}
          />

          {/* Min Toggle */}
          <GestureDetector gesture={leftPanGesture}>
            <Animated.View
              style={[thumbStyles, { transform: [{ translateX: leftThumbX }] }]}
            />
          </GestureDetector>

          {/* Max Toggle */}
          <GestureDetector gesture={rightPanGesture}>
            <Animated.View
              style={[
                thumbStyles,
                { transform: [{ translateX: rightThumbX }] },
              ]}
            />
          </GestureDetector>
        </View>
      </View>
    </View>
  );
};
