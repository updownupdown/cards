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
  value: { min: number; max: number };
  onRangeChange: (range: { min: number; max: number }) => void;
};

export const RangeSlider = ({
  label,
  min = 0,
  max = 100,
  value,
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

  // Animated values for layout rendering
  const leftThumbX = useRef(new Animated.Value(0)).current;
  const rightThumbX = useRef(new Animated.Value(0)).current;

  // Track absolute pixel positions directly
  const leftX = useRef(0);
  const rightX = useRef(0);

  // Snapshot positions when a drag starts
  const leftStartX = useRef(0);
  const rightStartX = useRef(0);

  // Sync incoming props or layout changes to the thumb positions
  useEffect(() => {
    if (containerWidth > 0) {
      const trackWidth = containerWidth - THUMB_SIZE;
      const rangeSpan = max - min || 1;

      // Translate the min/max values back into absolute pixel coordinates
      const targetLeft = ((value.min - min) / rangeSpan) * trackWidth;
      const targetRight = ((value.max - min) / rangeSpan) * trackWidth;

      leftThumbX.setValue(targetLeft);
      rightThumbX.setValue(targetRight);

      leftX.current = targetLeft;
      rightX.current = targetRight;
    }
  }, [value.min, value.max, containerWidth, min, max, THUMB_SIZE]);

  // Converts current pixel coordinates back to min/max integers for the parent
  const reportValues = useCallback(() => {
    if (containerWidth === 0) return;
    const trackWidth = containerWidth - THUMB_SIZE;
    const rangeSpan = max - min;

    const lowVal = min + (leftX.current / trackWidth) * rangeSpan;
    const highVal = min + (rightX.current / trackWidth) * rangeSpan;

    onRangeChange({
      min: Math.round(lowVal),
      max: Math.round(highVal),
    });
  }, [containerWidth, min, max, onRangeChange, THUMB_SIZE]);

  // Drag responder for the minimum (left) toggle
  const leftPanGesture = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-5, 5])
    .onStart(() => {
      leftStartX.current = leftX.current;
    })
    .onUpdate((e) => {
      let absoluteX = leftStartX.current + e.translationX;
      const maxLeftBound = rightX.current - THUMB_SIZE;

      // Clamp position between 0 and the right thumb collision boundary
      absoluteX = Math.max(0, Math.min(absoluteX, maxLeftBound));

      leftThumbX.setValue(absoluteX);
      leftX.current = absoluteX;
    })
    .onEnd(() => {
      reportValues();
    });

  // Drag responder for the maximum (right) toggle
  const rightPanGesture = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-5, 5])
    .onStart(() => {
      rightStartX.current = rightX.current;
    })
    .onUpdate((e) => {
      let absoluteX = rightStartX.current + e.translationX;
      const minRightBound = leftX.current + THUMB_SIZE;
      const maxRightBound = containerWidth - THUMB_SIZE;

      // Clamp position between the left thumb collision boundary and track end
      absoluteX = Math.max(minRightBound, Math.min(absoluteX, maxRightBound));

      rightThumbX.setValue(absoluteX);
      rightX.current = absoluteX;
    })
    .onEnd(() => {
      reportValues();
    });

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
