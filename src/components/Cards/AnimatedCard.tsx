import React from "react";
import { Pressable, StyleSheet } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Card } from "./Card";
import { PlayingCard } from "./card-utils";
import { CardColor, CardSizes } from "./CardStyles";

export const defaultAnimDuration = 400;

export type CardRegistration = {
  card: PlayingCard | null;
  zoneId: string;
  index: number;
  total: number;
  baseZIndex?: number;
  type?: string;
  yOffset?: number;
  misc?: any;
};

export type TargetState = {
  card: PlayingCard;
  zoneId: string;
  x: number;
  y: number;
  zIndex: number;
  type?: string;
  index?: number;
  rotation?: number;
  isHiddenUnderDeck?: boolean;
  misc?: any;
};

export type OrbitConfig = {
  enabled?: boolean;
};

export type CardMapBGMapping = {
  onPress?: () => void;
  isDisabled?: boolean;
  isSelected?: boolean;
  selectColor?: CardColor | string;
  forceSelectColor?: boolean;
  forceOverlayColor?: boolean;
  zIndexOffset?: number;
};

export type AnimatedCardProps = CardMapBGMapping & {
  targetState: TargetState;
  cardWidth: number;
  cardHeight: number;
  cardSize?: CardSizes;
  isVisible?: boolean;
  animDuration?: number;
  isPlaceholder?: boolean;
  yOffset?: number;
  orbitConfig?: OrbitConfig;
  clickThroughCards?: boolean;
  customBack?: string;
};

export type AnimatedCardMapping = Omit<
  AnimatedCardProps,
  "cardWidth" | "cardHeight" | "targetState"
>;

export const AnimatedCard = ({
  targetState,
  cardWidth,
  cardHeight,
  onPress,
  cardSize = "regular",
  isSelected,
  isDisabled,
  isVisible,
  animDuration,
  selectColor,
  yOffset,
  orbitConfig,
  forceSelectColor,
  forceOverlayColor,
  isPlaceholder,
  clickThroughCards,
  customBack,
  zIndexOffset = 0,
}: AnimatedCardProps) => {
  const initialYOffset = (yOffset ?? 0) * cardHeight;
  const duration = animDuration ?? defaultAnimDuration;

  const startX = useSharedValue(targetState.x);
  const startY = useSharedValue(targetState.y);
  const startYOffset = useSharedValue(initialYOffset);
  const startZ = useSharedValue(targetState.zIndex + zIndexOffset);
  const startRotation = useSharedValue(targetState.rotation);
  const moveProgress = useSharedValue(1); // Default to 1 (already at destination)

  const currentVisualX = useSharedValue(targetState.x);
  const currentVisualY = useSharedValue(targetState.y);
  const currentVisualYOffset = useSharedValue(initialYOffset + zIndexOffset);
  const currentVisualZ = useSharedValue(targetState.zIndex);
  const currentRotation = useSharedValue(targetState.rotation);

  useAnimatedReaction(
    () => ({
      loc: targetState.zoneId,
      x: targetState.x,
      y: targetState.y,
      totalZIndex: targetState.zIndex + zIndexOffset,
      yOffset: yOffset,
      rotation: targetState.rotation,
      faceUp: targetState.card?.faceUp,
    }),
    (curr, prev) => {
      const hasChanged =
        curr.loc !== prev?.loc ||
        curr.yOffset !== prev?.yOffset ||
        curr.x !== prev?.x ||
        curr.y !== prev?.y ||
        curr.rotation !== prev?.rotation ||
        curr.totalZIndex !== prev?.totalZIndex ||
        curr.faceUp !== prev?.faceUp;

      if (!hasChanged) return;

      if (prev) {
        if (duration === 0) {
          moveProgress.value = 1;
        } else {
          startX.value = currentVisualX.value;
          startY.value = currentVisualY.value;
          startYOffset.value = currentVisualYOffset.value;
          startZ.value = currentVisualZ.value;
          startRotation.value = currentRotation.value;

          moveProgress.value = 0;
          moveProgress.value = withTiming(1, {
            duration,
            easing: Easing.out(Easing.quad),
          });
        }
      }
    },
    [
      targetState.zoneId,
      targetState.x,
      targetState.y,
      targetState.zIndex,
      targetState.rotation,
      targetState.card?.faceUp,
      yOffset,
      duration,
      zIndexOffset,
    ],
  );

  const spinY = useDerivedValue(() => {
    return withTiming(targetState.card?.faceUp ? 0 : 180, {
      duration: defaultAnimDuration,
      easing: Easing.out(Easing.quad),
    });
  }, [targetState.card?.faceUp]);

  const animatedStyle = useAnimatedStyle(() => {
    const rawXBaseLinear = interpolate(
      moveProgress.value,
      [0, 1],
      [startX.value, targetState.x],
    );
    const rawYBaseLinear = interpolate(
      moveProgress.value,
      [0, 1],
      [startY.value, targetState.y],
    );
    const rawYOffset = interpolate(
      moveProgress.value,
      [0, 1],
      [startYOffset.value, (yOffset ?? 0) * cardHeight],
    );

    let rawXBase = rawXBaseLinear;
    let rawYBase = rawYBaseLinear;

    if (orbitConfig?.enabled) {
      const startRotationDegrees = (startRotation.value ?? 0) + 90;
      const targetRotationDegrees = (targetState.rotation ?? 0) + 90;
      const startAngleRadians = startRotationDegrees * (Math.PI / 180);
      const targetAngleRadians = targetRotationDegrees * (Math.PI / 180);

      const startDirection = {
        x: -Math.cos(startAngleRadians),
        y: -Math.sin(startAngleRadians),
      };
      const targetDirection = {
        x: -Math.cos(targetAngleRadians),
        y: -Math.sin(targetAngleRadians),
      };

      const deltaX = targetState.x - startX.value;
      const deltaY = targetState.y - startY.value;
      const denominator =
        startDirection.x * targetDirection.y -
        startDirection.y * targetDirection.x;

      if (Math.abs(denominator) > 0.0001) {
        const startDistanceToCenter =
          (deltaX * targetDirection.y - deltaY * targetDirection.x) /
          denominator;

        const centerX = startX.value + startDirection.x * startDistanceToCenter;
        const centerY = startY.value + startDirection.y * startDistanceToCenter;

        const startRadius = Math.hypot(
          startX.value - centerX,
          startY.value - centerY,
        );
        const targetRadius = Math.hypot(
          targetState.x - centerX,
          targetState.y - centerY,
        );

        let angleDelta = targetAngleRadians - startAngleRadians;

        while (angleDelta > Math.PI) angleDelta -= Math.PI * 2;
        while (angleDelta < -Math.PI) angleDelta += Math.PI * 2;

        const interpolatedAngle =
          startAngleRadians + angleDelta * moveProgress.value;
        const interpolatedRadius = interpolate(
          moveProgress.value,
          [0, 1],
          [startRadius, targetRadius],
        );

        rawXBase = centerX + Math.cos(interpolatedAngle) * interpolatedRadius;
        rawYBase = centerY + Math.sin(interpolatedAngle) * interpolatedRadius;
      }
    }

    const rawX = rawXBase;
    const rawY = rawYBase;

    const rawZ =
      moveProgress.value < 0.5
        ? startZ.value
        : targetState.zIndex + zIndexOffset;

    // Save current visual state for graceful mid-flight interruptions
    currentVisualX.value = rawX;
    currentVisualY.value = rawY;
    currentVisualYOffset.value = rawYOffset;
    currentVisualZ.value = rawZ;

    const finalYOffset = Math.round(rawYOffset);
    //   const finalYOffset =
    // moveProgress.value === 1 ? Math.round(rawYOffset) : rawYOffset;

    // Snap to integer pixel grid to fix SVG blur
    const finalX = Math.round(rawX);
    const finalY = Math.round(rawY);

    // zIndex must always be an integer, so we round the interpolated value
    const finalZ = Math.round(rawZ);

    const startRotationDegrees = startRotation.value ?? 0;
    const targetRotationDegrees = targetState.rotation ?? 0;

    let rotationDelta = targetRotationDegrees - startRotationDegrees;
    while (rotationDelta > 180) rotationDelta -= 360;
    while (rotationDelta < -180) rotationDelta += 360;

    const rotation = startRotationDegrees + rotationDelta * moveProgress.value;

    currentRotation.value = rotation;

    return {
      position: "absolute",
      left: 0,
      top: 0,
      zIndex: finalZ,
      width: cardWidth,
      height: cardHeight,
      transform: [
        { translateX: finalX },
        { translateY: finalY + finalYOffset },
        { rotate: `${rotation}deg` },
        // { rotateX: `20deg` }, // DON'T DO THIS! It will mess up the card height
        { rotateY: `${spinY.value}deg` },
      ],
    };
  }, [
    targetState.x,
    targetState.y,
    targetState.rotation,
    targetState.zIndex,
    zIndexOffset,
    yOffset,
    orbitConfig,
    cardWidth,
    cardHeight,
  ]);

  const frontStyle = useAnimatedStyle(() => ({
    ...StyleSheet.absoluteFill,
    opacity: spinY.value >= 90 ? 0 : 1,
  }));

  const backStyle = useAnimatedStyle(() => ({
    ...StyleSheet.absoluteFill,
    opacity: spinY.value >= 90 ? 1 : 0,
    transform: [{ rotateY: "180deg" }],
  }));

  if (isVisible === false) return null;

  return (
    <Animated.View
      style={[
        animatedStyle,
        {
          userSelect: "none",
          pointerEvents: "none",
        },
      ]}
    >
      <Pressable
        onPress={onPress}
        disabled={!onPress || isDisabled}
        style={{ flex: 1, pointerEvents: clickThroughCards ? "none" : "auto" }}
      >
        <Animated.View style={[frontStyle]}>
          <Card
            cardWidth={cardWidth}
            card={{ ...targetState.card, faceUp: true }}
            selectColor={selectColor ?? "none"}
            isSelected={isSelected}
            forceSelectColor={forceSelectColor}
            forceOverlayColor={forceOverlayColor}
            isVisible={isVisible}
            cardSize={cardSize}
            isPlaceholder={isPlaceholder}
            isHiddenUnderDeck={targetState.isHiddenUnderDeck}
            customBack={customBack}
          />
        </Animated.View>

        <Animated.View style={[backStyle]}>
          <Card
            cardWidth={cardWidth}
            card={{ ...targetState.card, faceUp: false }}
            selectColor={selectColor ?? "none"}
            isSelected={isSelected}
            forceSelectColor={forceSelectColor}
            forceOverlayColor={forceOverlayColor}
            isVisible={isVisible}
            cardSize={cardSize}
            isPlaceholder={isPlaceholder}
            isHiddenUnderDeck={targetState.isHiddenUnderDeck}
            customBack={customBack}
          />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
};
