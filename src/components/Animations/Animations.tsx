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
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { Card, CardProps } from "../Cards/Card";

type AnimCardInfo = Pick<
  CardProps,
  "rank" | "suit" | "isBack" | "isPlaceholder" | "cardSize" | "cardsPerRow"
>;

export type CardAnimationParams = {
  id: string; // unique id for the animated card
  cardInfo: AnimCardInfo;
  from: {
    x: number;
    y: number;
    width?: number;
    height?: number;
    zIndex?: number;
    rotation?: number;
  };
  to: {
    x: number;
    y: number;
    width?: number;
    height?: number;
    zIndex?: number;
    rotation?: number;
  };
  duration?: number;
  delay?: number;
  flip?: "toFace" | "toBack"; // whether it flips during the animation
  keepAlive?: boolean; // if true, the card won't be unmounted automatically when the animation ends
};

interface AnimationContextType {
  isAnimating: boolean;
  setIsAnimating: (isAnimating: boolean) => void;
  animateCards: (params: CardAnimationParams[]) => Promise<void>;
  clearAnimations: (ids?: string[]) => void;
  measureRef: (
    ref: React.RefObject<View | null>,
  ) => Promise<{ x: number; y: number; width: number; height: number } | null>;
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

  const { from, to, duration = 250, delay = 0, flip } = params;

  // Trigger animation on mount
  React.useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(1, { duration }, () => {
        scheduleOnRN(onComplete, params.id);
      }),
    );
  }, [delay, duration, params.id, progress, onComplete]);

  const animatedStyle = useAnimatedStyle(() => {
    const translateX = interpolate(progress.value, [0, 1], [from.x, to.x]);
    const translateY = interpolate(progress.value, [0, 1], [from.y, to.y]);

    // For flipping
    const rotationY = flip
      ? interpolate(
          progress.value,
          [0, 1],
          flip === "toFace" ? [180, 0] : [0, 180],
        )
      : 0;

    const scale =
      from.width && to.width
        ? interpolate(progress.value, [0, 1], [1, to.width / from.width])
        : 1;

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
      width: to.width,
      height: to.height,
      transform: [
        { translateX },
        { translateY },
        { scale },
        { rotateZ: `${rotationZ}deg` },
        { rotateY: `${rotationY}deg` },
      ],
      // transformOrigin: flip === undefined ? "top left" : "center center",
      transformOrigin: "top left",
      zIndex:
        progress.value > 0.5
          ? (to.zIndex ?? from.zIndex ?? 100)
          : (from.zIndex ?? 100),
    };
  });

  // Calculate back and front visibility based on 3D rotation if flipping
  const frontStyle = useAnimatedStyle(() => {
    if (!flip) return { opacity: params.cardInfo.isBack ? 0 : 1 };
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
    if (!flip) return { opacity: params.cardInfo.isBack ? 1 : 0 };
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
      {/* Front side */}
      <Animated.View style={frontStyle}>
        <Card {...params.cardInfo} isBack={false} />
      </Animated.View>
      {/* Back side */}
      <Animated.View style={backStyle}>
        <Card
          {...params.cardInfo}
          isBack={true}
          rank={undefined}
          suit={undefined}
        />
      </Animated.View>
    </Animated.View>
  );
};

export const AnimationProvider = ({ children }: { children: ReactNode }) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [animations, setAnimations] = useState<CardAnimationParams[]>([]);
  const promisesRef = useRef<Record<string, () => void>>({});

  const animateCards = useCallback((params: CardAnimationParams[]) => {
    return new Promise<void>((resolve) => {
      let completedCount = 0;
      const total = params.length;

      if (total === 0) {
        resolve();
        return;
      }

      const onAnimComplete = (id: string, keepAlive?: boolean) => {
        if (keepAlive === false) {
          setAnimations((prev) => prev.filter((anim) => anim.id !== id));
        }
        completedCount++;
        if (completedCount === total) {
          resolve();
        }
      };

      params.forEach((param) => {
        promisesRef.current[param.id] = () =>
          onAnimComplete(param.id, param.keepAlive);
      });

      setAnimations((prev) => [...prev, ...params]);
    });
  }, []);

  const clearAnimations = useCallback((ids?: string[]) => {
    if (ids) {
      setAnimations((prev) => prev.filter((anim) => !ids.includes(anim.id)));
    } else {
      setAnimations([]);
    }
  }, []);

  useEffect(() => {
    if (!isAnimating) {
      setTimeout(clearAnimations, 0);
    }
  }, [isAnimating]);

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
        setIsAnimating,
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
              key={anim.id}
              params={anim}
              onComplete={handleComplete}
            />
          ))}
        </View>
      )}
    </AnimationContext.Provider>
  );
};
