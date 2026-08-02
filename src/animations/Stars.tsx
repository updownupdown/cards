import { useEffect, useRef, useState } from "react";
import {
  Platform,
  Animated as RNAnimated,
  Easing as RNEasing,
  StyleSheet,
  View,
} from "react-native";
import { type SceneProps, seeded } from "./BackgroundAnimations";

const STAR_COLORS = ["#ffffff", "#eef8ff", "#d9efff", "#b9ddff", "#91c7ff"];

function ShootingStar({ width, height }: SceneProps) {
  const opacity = useRef(new RNAnimated.Value(0)).current;
  const translateX = useRef(new RNAnimated.Value(0)).current;
  const translateY = useRef(new RNAnimated.Value(0)).current;
  const [appearance, setAppearance] = useState({
    angle: 0,
    color: "#ffffff",
    trailLength: 40,
  });

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let animation: RNAnimated.CompositeAnimation | undefined;
    let cancelled = false;

    function schedule() {
      timer = setTimeout(
        () => {
          const startX = Math.random() * width;
          const startY = Math.random() * height;
          let endX = Math.random() * width;
          let endY = Math.random() * height;
          const minimumDistance = Math.min(width, height) * 0.3;

          while (Math.hypot(endX - startX, endY - startY) < minimumDistance) {
            endX = Math.random() * width;
            endY = Math.random() * height;
          }

          const angle = Math.atan2(endY - startY, endX - startX);
          const fadeInDuration = 20 + Math.random() * 80;
          const holdDuration = 200 + Math.random() * 600;
          const fadeOutDuration = 100 + Math.random() * 300;
          const travelDuration =
            fadeInDuration + holdDuration + fadeOutDuration;

          setAppearance({
            angle,
            color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
            trailLength: 28 + Math.random() * 44,
          });
          translateX.setValue(startX);
          translateY.setValue(startY);
          opacity.setValue(0);

          animation = RNAnimated.parallel([
            RNAnimated.timing(translateX, {
              toValue: endX,
              duration: travelDuration,
              easing: RNEasing.linear,
              useNativeDriver: Platform.OS !== "web",
            }),
            RNAnimated.timing(translateY, {
              toValue: endY,
              duration: travelDuration,
              easing: RNEasing.linear,
              useNativeDriver: Platform.OS !== "web",
            }),
            RNAnimated.sequence([
              RNAnimated.timing(opacity, {
                toValue: 1,
                duration: fadeInDuration,
                easing: RNEasing.out(RNEasing.quad),
                useNativeDriver: Platform.OS !== "web",
              }),
              RNAnimated.delay(holdDuration),
              RNAnimated.timing(opacity, {
                toValue: 0,
                duration: fadeOutDuration,
                easing: RNEasing.in(RNEasing.quad),
                useNativeDriver: Platform.OS !== "web",
              }),
            ]),
          ]);
          animation.start(({ finished }) => {
            if (finished && !cancelled) schedule();
          });
        },
        6000 + Math.random() * 14000,
      );
    }

    schedule();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      animation?.stop();
    };
  }, [height, opacity, translateX, translateY, width]);

  return (
    <RNAnimated.View
      style={[
        styles.shootingStar,
        {
          opacity,
          transform: [
            { translateX },
            { translateY },
            { rotate: `${appearance.angle}rad` },
          ],
        },
      ]}
    >
      <View
        style={[
          styles.shootingStarTrail,
          {
            backgroundColor: appearance.color,
            width: appearance.trailLength,
            left: -appearance.trailLength,
          },
        ]}
      />
      <View
        style={[styles.shootingStarHead, { backgroundColor: appearance.color }]}
      />
    </RNAnimated.View>
  );
}

export function Stars({ width, height }: SceneProps) {
  const stars = useRef(
    Array.from({ length: 80 }, (_, index) => {
      const baseOpacity = 0.1 + seeded(index, 35) * 0.525;

      return {
        baseOpacity,
        opacity: new RNAnimated.Value(baseOpacity),
      };
    }),
  ).current;

  useEffect(() => {
    let cancelled = false;
    const activeStars = new Set<number>();
    const animations = new Set<RNAnimated.CompositeAnimation>();

    function startShimmerLane() {
      let starIndex = Math.floor(Math.random() * stars.length);
      while (activeStars.has(starIndex)) {
        starIndex = Math.floor(Math.random() * stars.length);
      }

      const star = stars[starIndex];
      const shimmerDuration = (300 + Math.random() * 700) / 1.5;
      const animation = RNAnimated.sequence([
        RNAnimated.timing(star.opacity, {
          toValue: 1,
          duration: shimmerDuration * 0.45,
          easing: RNEasing.inOut(RNEasing.sin),
          useNativeDriver: Platform.OS !== "web",
        }),
        RNAnimated.timing(star.opacity, {
          toValue: star.baseOpacity,
          duration: shimmerDuration * 0.55,
          easing: RNEasing.inOut(RNEasing.sin),
          useNativeDriver: Platform.OS !== "web",
        }),
      ]);

      activeStars.add(starIndex);
      animations.add(animation);
      animation.start(({ finished }) => {
        activeStars.delete(starIndex);
        animations.delete(animation);
        if (finished && !cancelled) startShimmerLane();
      });
    }

    Array.from({ length: 3 }, startShimmerLane);

    return () => {
      cancelled = true;
      animations.forEach((animation) => animation.stop());
    };
  }, [stars]);

  return (
    <>
      {stars.map((star, index) => {
        const size = 1 + Math.floor(seeded(index, 36) * 3);

        return (
          <RNAnimated.View
            key={index}
            style={[
              styles.star,
              {
                backgroundColor:
                  STAR_COLORS[
                    Math.floor(seeded(index, 37) * STAR_COLORS.length)
                  ],
                width: size,
                height: size,
                borderRadius: size / 2,
                left: seeded(index, 38) * width,
                top: seeded(index, 39) * height,
                opacity: star.opacity,
              },
            ]}
          />
        );
      })}
      <ShootingStar width={width} height={height} />
    </>
  );
}

const styles = StyleSheet.create({
  star: {
    position: "absolute",
  },
  shootingStar: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 3,
    height: 3,
  },
  shootingStarTrail: {
    position: "absolute",
    top: 1,
    height: 1,
    opacity: 0.45,
  },
  shootingStarHead: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
});
