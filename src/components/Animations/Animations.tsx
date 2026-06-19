import React, {
  createContext,
  useContext,
  useState,
  useRef,
  ReactNode,
  useCallback,
  useEffect,
} from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  interpolate,
  Easing,
  EasingFunction,
  cancelAnimation,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { CardOLD, CardSizes } from "../Cards/CardOLD";
import { PlayingCard } from "../Cards/card-utils";

export const defaultAnimDuration = 400;

export type CardAnimationParams = {
  card: PlayingCard;
  cardSize?: CardSizes;
  cardsPerRow?: number;
  from: {
    x: number;
    y: number;
    width?: number;
    height?: number;
    zIndex?: number;
    rotation?: number;
    opacity?: number;
  };
  to: {
    x: number;
    y: number;
    width?: number;
    height?: number;
    zIndex?: number;
    rotation?: number;
    opacity?: number;
  };
  duration?: number;
  delay?: number;
  flip?: "toFace" | "toBack"; // whether it flips during the animation
  arcX?: number; // rightward arc height in pixels (parabolic path)
  arcY?: number; // upward arc height in pixels (parabolic path)
  keepAlive?: boolean; // if true, the card won't be unmounted automatically when the animation ends
  easing?: EasingFunction;
  id?: string; // unique animation ID to prevent key collisions
};

export type MeasuredRef = {
  x: number;
  y: number;
  width: number;
  height: number;
} | null;

interface AnimationContextType {
  cardsPerRow: number;
  cardSize: CardSizes;
  isAnimating: boolean;
  animatingCardIds: string[];
  animateCards: (params: (CardAnimationParams | null)[]) => Promise<void>;
  clearAnimations: (ids?: string[]) => void;
  animateQueue: () => void;
  addToAnimQueue: (anim: CardAnimationParams) => void;
}

const AnimationContext = createContext<AnimationContextType | null>(null);

type AnimationParams = {
  cardsPerRow: number;
  cardSize: CardSizes;
};

/**
 * @deprecated
 */
export const useAnimations = () => {
  const context = useContext(AnimationContext);
  if (!context) {
    throw new Error("useAnimations must be used within an AnimationProvider");
  }
  return context;
};

/**
 * @deprecated
 */
const AnimatedCard = ({
  params,
  onComplete,
  cardsPerRow,
  cardSize,
}: {
  params: CardAnimationParams;
  onComplete: (id: string) => void;
  cardsPerRow: number;
  cardSize: CardSizes;
}) => {
  const progress = useSharedValue(0);

  const { from, to, duration = defaultAnimDuration, delay = 0, flip } = params;

  // Trigger animation on mount
  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(
        1,
        { duration, easing: Easing.inOut(Easing.ease) },
        (isFinished) => {
          // ONLY resolve if the animation actually ran to completion
          if (isFinished && params.id) {
            scheduleOnRN(onComplete, params.id);
          }
        },
      ),
    );

    return () => {
      cancelAnimation(progress);
    };
  }, [delay, duration, params.id, progress, onComplete]);

  const animatedStyle = useAnimatedStyle(() => {
    // Get dimensions, using to dimensions as fallback
    const fromWidth = from.width ?? to.width ?? 0;
    const fromHeight = from.height ?? to.height ?? 0;
    const toWidth = to.width ?? 0;
    const toHeight = to.height ?? 0;

    // Interpolate dimensions to handle smooth size transitions
    const currentWidth = interpolate(
      progress.value,
      [0, 1],
      [fromWidth, toWidth],
    );
    const currentHeight = interpolate(
      progress.value,
      [0, 1],
      [fromHeight, toHeight],
    );

    // Calculate where the CENTER of the element should be at each point
    const centerX = interpolate(
      progress.value,
      [0, 1],
      [from.x + fromWidth / 2, to.x + toWidth / 2],
    );
    const centerY = interpolate(
      progress.value,
      [0, 1],
      [from.y + fromHeight / 2, to.y + toHeight / 2],
    );

    // Position element so its center is at (centerX, centerY)
    // Since element is at (left: 0, top: 0), we translate to center it
    let translateX = centerX - currentWidth / 2;
    let translateY = centerY - currentHeight / 2;

    // Apply parabolic arcs if specified
    if (params.arcX) {
      const arcOffset = params.arcX * 4 * progress.value * (1 - progress.value);
      translateX -= arcOffset; // subtract to arc upward
    }
    if (params.arcY) {
      const arcOffset = params.arcY * 4 * progress.value * (1 - progress.value);
      translateY -= arcOffset; // subtract to arc upward
    }

    const opacity =
      from.opacity !== undefined && to.opacity !== undefined
        ? interpolate(progress.value, [0, 1], [from.opacity, to.opacity])
        : 1;

    const rotationY = flip
      ? interpolate(
          progress.value,
          [0, 1],
          flip === "toFace" ? [180, 0] : [0, 180],
        )
      : 0;

    const rotationZ =
      from.rotation || to.rotation
        ? interpolate(
            progress.value,
            [0, 1],
            [from.rotation || 0, to.rotation || 0],
          )
        : 0;

    return {
      position: "absolute",
      left: 0,
      top: 0,
      width: currentWidth,
      height: currentHeight,
      opacity,
      transform: [
        { translateX },
        { translateY },
        { rotateZ: `${rotationZ}deg` },
        { rotateY: `${rotationY}deg` },
      ],
      transformOrigin: "center center",
      zIndex:
        progress.value > 0.5
          ? (to.zIndex ?? from.zIndex ?? 100)
          : (from.zIndex ?? 100),
    };
  });

  // Calculate back and front visibility based on 3D rotation if flipping
  const frontStyle = useAnimatedStyle(() => {
    if (!flip) {
      return {
        position: "absolute",
        opacity: params.card.faceUp ? 1 : 0,
      };
    }

    const rotationY = interpolate(
      progress.value,
      [0, 1],
      flip === "toFace" ? [180, 0] : [0, 180],
    );

    return {
      position: "absolute",
      opacity: rotationY > 90 && rotationY < 270 ? 0 : 1,
    };
  });

  const backStyle = useAnimatedStyle(() => {
    if (!flip) {
      return {
        position: "absolute",
        opacity: params.card.faceUp ? 0 : 1,
      };
    }

    const rotationY = interpolate(
      progress.value,
      [0, 1],
      flip === "toFace" ? [180, 0] : [0, 180],
    );

    return {
      position: "absolute",
      opacity: rotationY > 90 && rotationY < 270 ? 1 : 0,
      transform: [{ rotateY: "180deg" }],
    };
  });

  return (
    <Animated.View style={animatedStyle}>
      <Animated.View style={frontStyle}>
        <CardOLD
          cardsPerRow={params.cardsPerRow ?? cardsPerRow}
          card={{ ...params.card, faceUp: true }}
          cardSize={params.cardSize ?? cardSize}
          style={[{ width: "100%", height: "100%" }]}
        />
      </Animated.View>

      <Animated.View style={backStyle}>
        <CardOLD
          cardsPerRow={params.cardsPerRow ?? cardsPerRow}
          card={{ ...params.card, faceUp: false }}
          cardSize={params.cardSize ?? cardSize}
          style={[{ width: "100%", height: "100%" }]}
        />
      </Animated.View>
    </Animated.View>
  );
};
