import React, { useMemo } from "react";
import Animated, {
  useAnimatedStyle,
  withTiming,
  Easing,
  useDerivedValue,
  useSharedValue,
  useAnimatedReaction,
  interpolate,
} from "react-native-reanimated";
import { Pressable, StyleSheet } from "react-native";
import { PlayingCard } from "./card-utils";
import { CardColor, CardSizes } from "./CardStyles";
import { Card } from "./Card";

export const animationDuration = 400;

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

export type ArcConfig = {
  enabled?: boolean;
  magnitudeY?: number;
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
  isPlaceholder?: boolean;
  yOffset?: number;
  arcConfig?: ArcConfig;
  clickThroughCards?: boolean;
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
  arcConfig,
  cardSize = "regular",
  isSelected,
  isDisabled,
  isVisible,
  selectColor,
  yOffset,
  forceSelectColor,
  forceOverlayColor,
  isPlaceholder,
  clickThroughCards,
}: AnimatedCardProps) => {
  const startX = useSharedValue(targetState.x);
  const startY = useSharedValue(targetState.y);
  const startYOffset = useSharedValue(yOffset);
  const startZ = useSharedValue(targetState.zIndex);
  const startRotation = useSharedValue(targetState.rotation);
  const moveProgress = useSharedValue(1); // Default to 1 (already at destination)

  const currentVisualX = useSharedValue(targetState.x);
  const currentVisualY = useSharedValue(targetState.y);
  const currentVisualYOffset = useSharedValue(yOffset);
  const currentVisualZ = useSharedValue(targetState.zIndex);
  const currentRotation = useSharedValue(targetState.rotation);

  useAnimatedReaction(
    () => ({
      loc: targetState.zoneId,
      x: targetState.x,
      y: targetState.y,
      zIndex: targetState.zIndex,
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
        curr.zIndex !== prev?.zIndex;

      if (prev && hasChanged) {
        startX.value = currentVisualX.value;
        startY.value = currentVisualY.value;
        startYOffset.value = currentVisualYOffset.value;
        startZ.value = currentVisualZ.value;
        startRotation.value = currentRotation.value;

        moveProgress.value = 0;
        moveProgress.value = withTiming(1, {
          duration: animationDuration,
          easing: Easing.out(Easing.quad),
        });
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
    ],
  );

  const spinY = useDerivedValue(() => {
    return withTiming(targetState.card?.faceUp ? 0 : 180, {
      duration: animationDuration,
      easing: Easing.out(Easing.quad),
    });
  }, [targetState.card?.faceUp]);

  const hopMagnitude = useMemo(() => {
    if (arcConfig?.magnitudeY !== undefined) {
      return {
        y: cardHeight * (arcConfig.magnitudeY ?? 0),
      };
    }

    if (yOffset !== undefined) {
      return {
        enabled: arcConfig?.enabled ?? false,
        y: cardHeight * (arcConfig?.magnitudeY ?? 0),
      };
    }

    return {
      y: cardHeight * (0.25 + Math.random() * 0.25),
    };
  }, [arcConfig, cardHeight, yOffset]);

  const animatedStyle = useAnimatedStyle(() => {
    // 1. Calculate raw float positions for X and Y
    const rawXBase = interpolate(
      moveProgress.value,
      [0, 1],
      [startX.value, targetState.x],
    );
    const rawYBase = interpolate(
      moveProgress.value,
      [0, 1],
      [startY.value, targetState.y],
    );
    const rawYOffset = interpolate(
      moveProgress.value,
      [0, 1],
      [startYOffset.value ?? 0, yOffset ? yOffset * cardHeight : 0],
    );

    const rawX = rawXBase;

    const parabolicMultiplier =
      4 * moveProgress.value * (1 - moveProgress.value);

    const arcYOffset =
      (arcConfig?.enabled ?? true)
        ? -(hopMagnitude.y * parabolicMultiplier)
        : 0;

    const rawY = rawYBase + arcYOffset;

    const rawZ = moveProgress.value < 0.5 ? startZ.value : targetState.zIndex;

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

    const rotation = interpolate(
      moveProgress.value,
      [0, 1],
      [startRotation.value ?? 0, targetState.rotation ?? 0],
    );

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
    yOffset,
    hopMagnitude,
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

  if (isVisible === false || targetState.isHiddenUnderDeck) return null;

  return (
    <Animated.View
      style={[animatedStyle, { userSelect: "none", pointerEvents: "none" }]}
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
          />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
};
