import React, { memo, useCallback, useEffect, useState } from "react";
import { scheduleOnRN } from "react-native-worklets";
import { Platform, Pressable, StyleSheet } from "react-native";
import {
  bufferedDefaultAnimDuration,
  defaultAnimDuration,
} from "@/constants/animation";
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
import { getDropOffset } from "./drop-flight";
import { PlayingCard } from "./card-utils";
import { CardColor, CardSizes } from "./CardStyles";

const DROP_FLIGHT_DURATION = 180;
/** Added to a moving card's zIndex so it passes over resting cards. */
const MOVING_Z_OFFSET = 500;
/**
 * Viewing distance for the flip, in card widths. Without a perspective a
 * rotateY only squashes the card flat and back; with one, the near edge grows
 * and the far edge recedes, so the card reads as turning over in 3D. Smaller
 * is a stronger effect.
 */
const FLIP_PERSPECTIVE_IN_CARD_WIDTHS = 5;
/** How much a card rises towards you at the middle of a flip. */
const FLIP_LIFT = 0.07;
/** How much a card rises while it flies from one pile to another. */
const MOVE_LIFT = 0.035;

export { defaultAnimDuration, bufferedDefaultAnimDuration };

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
  cardBackPath?: string;
};

export type AnimatedCardMapping = Omit<
  AnimatedCardProps,
  "cardWidth" | "cardHeight" | "targetState"
>;

const AnimatedCardComponent = ({
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
  cardBackPath,
  zIndexOffset = 0,
}: AnimatedCardProps) => {
  const initialYOffset = (yOffset ?? 0) * cardHeight;
  const duration = animDuration ?? defaultAnimDuration;

  // A card that was just dropped flies from where it was released instead of
  // snapping (games pass animDuration 0 for just-dropped cards).
  const dropOffset =
    animDuration === 0 && targetState.card
      ? getDropOffset(targetState.card.id)
      : undefined;
  const dropOffsetX = dropOffset?.x;
  const dropOffsetY = dropOffset?.y;

  const startX = useSharedValue(targetState.x);
  const startY = useSharedValue(targetState.y);
  const startYOffset = useSharedValue(initialYOffset);
  const startRotation = useSharedValue(targetState.rotation);
  const moveProgress = useSharedValue(1); // Default to 1 (already at destination)
  const shouldOrbitMove = useSharedValue(false);

  const currentVisualX = useSharedValue(targetState.x);
  const currentVisualY = useSharedValue(targetState.y);
  const currentVisualYOffset = useSharedValue(initialYOffset + zIndexOffset);
  const currentRotation = useSharedValue(targetState.rotation);

  // While moving, a card sits above resting cards but keeps its target order
  // among other moving cards (e.g. a whole deal in flight), then settles to its
  // target zIndex on landing. The zIndex is set through React, not the animated
  // style: on Android, Reanimated's synchronous prop updates change a view's
  // zIndex without re-sorting it among its siblings, so moving cards were drawn
  // in the wrong order until the animation's end was committed.
  const targetZ = targetState.zIndex + zIndexOffset;
  const moveKey = [
    targetState.zoneId,
    targetState.x,
    targetState.y,
    targetZ,
    targetState.rotation,
    yOffset,
    targetState.card?.faceUp,
  ].join("|");
  const [lastMoveKey, setLastMoveKey] = useState(moveKey);
  const [movingKey, setMovingKey] = useState<string | null>(null);
  if (lastMoveKey !== moveKey) {
    setLastMoveKey(moveKey);
    // Mirrors the reaction below: only a drop flight or a timed move animates.
    setMovingKey(dropOffset !== undefined || duration !== 0 ? moveKey : null);
  }
  const endMove = useCallback((key: string) => {
    setMovingKey((current) => (current === key ? null : current));
  }, []);

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
        shouldOrbitMove.value = !!(
          orbitConfig?.enabled &&
          prev.loc.startsWith("loop-") &&
          curr.loc.startsWith("loop-")
        );

        if (dropOffsetX !== undefined && dropOffsetY !== undefined) {
          startX.value = currentVisualX.value + dropOffsetX;
          startY.value = currentVisualY.value + dropOffsetY;
          startYOffset.value = currentVisualYOffset.value;
          startRotation.value = currentRotation.value;

          moveProgress.value = 0;
          moveProgress.value = withTiming(
            1,
            {
              duration: DROP_FLIGHT_DURATION,
              easing: Easing.out(Easing.cubic),
            },
            (finished) => {
              if (finished) scheduleOnRN(endMove, moveKey);
            },
          );
        } else if (duration === 0) {
          moveProgress.value = 1;
        } else {
          startX.value = currentVisualX.value;
          startY.value = currentVisualY.value;
          startYOffset.value = currentVisualYOffset.value;
          startRotation.value = currentRotation.value;

          moveProgress.value = 0;
          moveProgress.value = withTiming(
            1,
            {
              duration,
              easing: Easing.out(Easing.quad),
            },
            (finished) => {
              if (finished) scheduleOnRN(endMove, moveKey);
            },
          );
        }
      }
    },
    [
      moveKey,
      endMove,
      targetState.zoneId,
      targetState.x,
      targetState.y,
      targetState.zIndex,
      targetState.rotation,
      targetState.card?.faceUp,
      yOffset,
      duration,
      zIndexOffset,
      orbitConfig?.enabled,
      dropOffsetX,
      dropOffsetY,
    ],
  );

  const spinY = useDerivedValue(() => {
    return withTiming(targetState.card?.faceUp ? 0 : 180, {
      duration: defaultAnimDuration,
      easing: Easing.out(Easing.quad),
    });
  }, [targetState.card?.faceUp]);

  const isHidden = isVisible === false;

  // Render only the visible face; both are mounted just for the flip. Each
  // face is a full card view tree (image, shadow, clip), so this halves them.
  const isFaceUp = !!targetState.card?.faceUp;
  const [renderedFaceUp, setRenderedFaceUp] = useState(isFaceUp);
  const [isFlipping, setIsFlipping] = useState(false);
  if (renderedFaceUp !== isFaceUp) {
    setRenderedFaceUp(isFaceUp);
    setIsFlipping(true);
  }

  useEffect(() => {
    if (!isFlipping) return;
    const timer = setTimeout(
      () => setIsFlipping(false),
      bufferedDefaultAnimDuration,
    );
    return () => clearTimeout(timer);
  }, [isFlipping, isFaceUp]);

  const showFront = isFaceUp || isFlipping;
  const showBack = !isFaceUp || isFlipping;

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

    if (orbitConfig?.enabled && shouldOrbitMove.value) {
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

    // Save current visual state for graceful mid-flight interruptions
    currentVisualX.value = rawX;
    currentVisualY.value = rawY;
    currentVisualYOffset.value = rawYOffset;

    const finalYOffset = Math.round(rawYOffset);
    //   const finalYOffset =
    // moveProgress.value === 1 ? Math.round(rawYOffset) : rawYOffset;

    // Snap to integer pixel grid to fix SVG blur
    const finalX = Math.round(rawX);
    const finalY = Math.round(rawY);

    const startRotationDegrees = startRotation.value ?? 0;
    const targetRotationDegrees = targetState.rotation ?? 0;

    let rotationDelta = targetRotationDegrees - startRotationDegrees;
    while (rotationDelta > 180) rotationDelta -= 360;
    while (rotationDelta < -180) rotationDelta += 360;

    const rotation = startRotationDegrees + rotationDelta * moveProgress.value;

    currentRotation.value = rotation;

    // A card rises a little while it flies between piles, the way a real one
    // is lifted off the table. Zero at rest, so a settled card is back at
    // exactly its own size and stays pixel-sharp.
    const lift = Math.sin(moveProgress.value * Math.PI) * MOVE_LIFT;

    // Only the transform here. On native, any layout prop (position,
    // left/top, width/height) in an update sends the whole update through a
    // shadow-tree commit instead of Reanimated's direct UI-prop path — once per
    // card per frame. Those values are static, so they're set outside.
    //
    // The flip itself is on the faces (see faceTurn), not here: this view is
    // moved into place by translation from the board's corner, so a
    // perspective here would project from that corner rather than from the
    // card, and every flip would swing wildly off-axis.
    return {
      transform: [
        { translateX: finalX },
        { translateY: finalY + finalYOffset },
        { rotate: `${rotation}deg` },
        // { rotateX: `20deg` }, // DON'T DO THIS! It will mess up the card height
        { scale: 1 + lift },
      ],
    };
  }, [
    targetState.x,
    targetState.y,
    targetState.rotation,
    yOffset,
    orbitConfig,
    cardWidth,
    cardHeight,
  ]);

  // The flip, applied to each face so it turns about the card's own centre.
  // With a perspective the near edge grows and the far edge recedes, so the
  // card reads as turning over rather than being squashed flat; it also rises
  // a little at mid-turn. At rest this is the identity, so faces stay sharp.
  const faceTurn = (angle: number) => {
    "worklet";
    const lift = Math.sin((spinY.value / 180) * Math.PI) * FLIP_LIFT;
    return [
      // Must come first for React Native to apply it to what follows.
      { perspective: cardWidth * FLIP_PERSPECTIVE_IN_CARD_WIDTHS },
      { rotateY: `${angle}deg` },
      { scale: 1 + lift },
    ];
  };

  const frontStyle = useAnimatedStyle(() => ({
    opacity: spinY.value >= 90 ? 0 : 1,
    transform: faceTurn(spinY.value),
  }));

  // Half a turn behind the front, so it faces the viewer once the card is over.
  const backStyle = useAnimatedStyle(() => ({
    opacity: spinY.value >= 90 ? 1 : 0,
    transform: faceTurn(spinY.value + 180),
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: 0,
          top: 0,
          width: cardWidth,
          height: cardHeight,
          zIndex: movingKey === moveKey ? targetZ + MOVING_Z_OFFSET : targetZ,
        },
        animatedStyle,
        {
          userSelect: "none",
          // Native needs "box-none": "none" there disables the whole subtree,
          // including the Pressable below. Web needs "none": Reanimated writes
          // this as an inline CSS value, where "box-none" is invalid and falls
          // back to auto (blocking taps meant for zones under clickThroughCards
          // cards); the Pressable re-enables its own events.
          pointerEvents: Platform.OS === "web" ? "none" : "box-none",
        },
      ]}
    >
      <Pressable
        onPress={onPress}
        disabled={!onPress || isDisabled || isHidden}
        style={{
          flex: 1,
          pointerEvents: isHidden || clickThroughCards ? "none" : "auto",
        }}
      >
        {showFront && (
          <Animated.View style={[StyleSheet.absoluteFill, frontStyle]}>
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
              cardBackPath={cardBackPath}
            />
          </Animated.View>
        )}

        {showBack && (
          <Animated.View style={[StyleSheet.absoluteFill, backStyle]}>
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
              cardBackPath={cardBackPath}
            />
          </Animated.View>
        )}
      </Pressable>
    </Animated.View>
  );
};

// Every game state change (a hover highlight, a drag starting, one card
// moving) re-renders the whole card map. Comparing by value lets unchanged
// cards skip rendering, which matters most on Hermes. targetState is a fresh
// object each time, so its fields are compared; onPress must be stable (see
// useCardMap) for this to skip anything.
function areAnimatedCardPropsEqual(
  prev: AnimatedCardProps,
  next: AnimatedCardProps,
) {
  const a = prev.targetState;
  const b = next.targetState;

  return (
    a.card?.id === b.card?.id &&
    a.card?.faceUp === b.card?.faceUp &&
    a.card?.rank === b.card?.rank &&
    a.card?.suit === b.card?.suit &&
    a.zoneId === b.zoneId &&
    a.x === b.x &&
    a.y === b.y &&
    a.zIndex === b.zIndex &&
    a.rotation === b.rotation &&
    a.isHiddenUnderDeck === b.isHiddenUnderDeck &&
    a.type === b.type &&
    a.index === b.index &&
    a.misc === b.misc &&
    prev.cardWidth === next.cardWidth &&
    prev.cardHeight === next.cardHeight &&
    prev.cardSize === next.cardSize &&
    prev.onPress === next.onPress &&
    prev.isSelected === next.isSelected &&
    prev.isDisabled === next.isDisabled &&
    prev.isVisible === next.isVisible &&
    prev.animDuration === next.animDuration &&
    prev.selectColor === next.selectColor &&
    prev.yOffset === next.yOffset &&
    prev.orbitConfig?.enabled === next.orbitConfig?.enabled &&
    prev.forceSelectColor === next.forceSelectColor &&
    prev.forceOverlayColor === next.forceOverlayColor &&
    prev.isPlaceholder === next.isPlaceholder &&
    prev.clickThroughCards === next.clickThroughCards &&
    prev.cardBackPath === next.cardBackPath &&
    prev.zIndexOffset === next.zIndexOffset
  );
}

export const AnimatedCard = memo(
  AnimatedCardComponent,
  areAnimatedCardPropsEqual,
);
