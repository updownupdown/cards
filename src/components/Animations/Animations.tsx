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
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { Card, CardSizes } from "../Cards/Card";
import { PlayingCard } from "../Cards/card-utils";

export type CardAnimationParams = {
  card: PlayingCard;
  cardSize?: CardSizes;
  cardsPerRow: number;
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
};

export type MeasuredRef = {
  x: number;
  y: number;
  width: number;
  height: number;
} | null;

interface AnimationContextType {
  isAnimating: boolean;
  animatingCardIds: string[];
  animateCards: (params: (CardAnimationParams | null)[]) => Promise<void>;
  clearAnimations: (ids?: string[]) => void;
  measureRef: (ref: React.RefObject<View | null>) => Promise<MeasuredRef>;
}

const AnimationContext = createContext<AnimationContextType | null>(null);

export const useAnimations = () => {
  const context = useContext(AnimationContext);
  if (!context) {
    throw new Error("useAnimations must be used within an AnimationProvider");
  }
  return context;
};

const AnimatedCard = ({
  params,
  onComplete,
}: {
  params: CardAnimationParams;
  onComplete: (id: string) => void;
}) => {
  const progress = useSharedValue(0);

  const { from, to, duration = 400, delay = 0, flip } = params;

  // Trigger animation on mount
  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(1, { duration, easing: Easing.inOut(Easing.ease) }, () => {
        scheduleOnRN(onComplete, params.card.id);
      }),
    );
  }, [delay, duration, params.card.id, progress, onComplete]);

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
        <Card
          cardsPerRow={params.cardsPerRow}
          card={{ ...params.card, faceUp: true }}
          cardSize={params.cardSize}
          style={[{ width: "100%", height: "100%" }]}
        />
      </Animated.View>

      <Animated.View style={backStyle}>
        <Card
          cardsPerRow={params.cardsPerRow}
          card={{ ...params.card, faceUp: false }}
          cardSize={params.cardSize}
          style={[{ width: "100%", height: "100%" }]}
        />
      </Animated.View>
    </Animated.View>
  );
};

export const AnimationProvider = ({ children }: { children: ReactNode }) => {
  const [animatingCardIds, setAnimatingCardIds] = useState<string[]>([]);
  const [isAnimating, setIsAnimatingState] = useState(false);
  const isAnimatingRef = useRef(false);

  const setIsAnimating = useCallback((val: boolean) => {
    isAnimatingRef.current = val;
    setIsAnimatingState(val);
  }, []);

  const [animations, setAnimations] = useState<CardAnimationParams[]>([]);
  const promisesRef = useRef<Record<string, () => void>>({});

  const cancelAnimsAfterTimeoutRef = useRef(true);

  const animateCards = useCallback(
    (params: (CardAnimationParams | null)[]) => {
      return new Promise<void>((resolve) => {
        function doResolve() {
          setAnimatingCardIds([]);
          setAnimations([]);
          resolve();

          // Buffer so that back-to-back animations don't create
          // "flashes" from isAnimating switching value
          cancelAnimsAfterTimeoutRef.current = true;

          setTimeout(() => {
            if (cancelAnimsAfterTimeoutRef.current) {
              setIsAnimating(false);
            }
          }, 50);
        }

        cancelAnimsAfterTimeoutRef.current = false;

        const validParams = params.filter(
          (p): p is CardAnimationParams => p !== null,
        );
        let completedCount = 0;
        const total = validParams.length;

        if (total === 0) {
          doResolve();
          return;
        }

        setAnimatingCardIds(validParams.map((p) => p.card.id));

        setIsAnimating(true);

        const onAnimComplete = (id: string, keepAlive?: boolean) => {
          if (keepAlive === false) {
            setAnimations((prev) => prev.filter((anim) => anim.card.id !== id));
          }
          completedCount++;
          if (completedCount === total) {
            doResolve();
          }
        };

        validParams.forEach((param) => {
          promisesRef.current[param.card.id] = () =>
            onAnimComplete(param.card.id, param.keepAlive);
        });

        setAnimations((prev) => {
          const next = prev.filter(
            (p) => !validParams.find((v) => v.card.id === p.card.id),
          );
          return [...next, ...validParams];
        });
      });
    },
    [setIsAnimating],
  );

  const clearAnimations = useCallback(() => {
    setIsAnimating(false);
    setAnimations([]);
    promisesRef.current = {};
  }, [setIsAnimating]);

  const handleComplete = useCallback((id: string) => {
    if (promisesRef.current[id]) {
      promisesRef.current[id]();
      delete promisesRef.current[id];
    }
  }, []);

  const measureRef = useCallback((ref: React.RefObject<View | null>) => {
    return new Promise<{
      x: number;
      y: number;
      width: number;
      height: number;
    } | null>((resolve) => {
      if (ref.current) {
        ref.current.measure((x, y, width, height, pageX, pageY) => {
          resolve({ x: pageX, y: pageY, width, height });
        });
      } else {
        resolve(null);
      }
    });
  }, []);

  return (
    <AnimationContext.Provider
      value={{
        animateCards,
        clearAnimations,
        measureRef,
        isAnimating,
        animatingCardIds,
      }}
    >
      {children}

      {animations.length > 0 && (
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            pointerEvents: "none",
          }}
        >
          {animations.map((anim) => (
            <AnimatedCard
              key={anim.card.id}
              params={anim}
              onComplete={handleComplete}
            />
          ))}
        </View>
      )}
    </AnimationContext.Provider>
  );
};
