import Leaf from "@/assets/images/leaf.svg";
import { useEffect, useRef } from "react";
import {
  Platform,
  Animated as RNAnimated,
  Easing as RNEasing,
  StyleSheet,
} from "react-native";
import { type SceneProps, seeded } from "./BackgroundAnimations";

type LeafParticleProps = SceneProps & {
  color: string;
  index: number;
  wind: RNAnimated.Value;
  windCurrent: { current: number };
};

function useLeafWind(width: number) {
  const wind = useRef(new RNAnimated.Value(0)).current;
  const windCurrent = useRef(0);

  useEffect(() => {
    let animation: RNAnimated.CompositeAnimation | undefined;
    let cancelled = false;
    const listener = wind.addListener(({ value }) => {
      windCurrent.current = value;
    });

    function gust() {
      const magnitude = Math.random();
      const duration = 8000 + magnitude * 400;
      const displacement = width * (-0 + magnitude * 0.4);

      animation = RNAnimated.timing(wind, {
        toValue: windCurrent.current - displacement,
        duration,
        easing: RNEasing.inOut(RNEasing.sin),
        useNativeDriver: Platform.OS !== "web",
      });
      animation.start(({ finished }) => {
        if (finished && !cancelled) gust();
      });
    }

    gust();

    return () => {
      cancelled = true;
      animation?.stop();
      wind.removeListener(listener);
    };
  }, [width, wind]);

  return { wind, windCurrent };
}

function LeafParticle({
  color,
  index,
  width,
  height,
  wind,
  windCurrent,
}: LeafParticleProps) {
  const size = 4 + seeded(index, 8) * 10;
  const x = useRef(new RNAnimated.Value(0)).current;
  const y = useRef(new RNAnimated.Value(0)).current;
  const scale = useRef(new RNAnimated.Value(1)).current;
  const windResponse = useRef(new RNAnimated.Value(1)).current;
  const rotationX = useRef(new RNAnimated.Value(0)).current;
  const rotationY = useRef(new RNAnimated.Value(0)).current;
  const rotationZ = useRef(new RNAnimated.Value(0)).current;
  const startX = useRef(0);
  const windAtReset = useRef(0);
  const windResponseCurrent = useRef(1);

  useEffect(() => {
    let animation: RNAnimated.CompositeAnimation | undefined;
    let cancelled = false;
    let resetting = false;

    function reset(initial: boolean) {
      const particleStartX = Math.random() * width;
      const startY = -size * (1.5 + Math.random() * 2);
      const delay = initial
        ? index * 350 + seeded(index, 7) * 16000
        : 500 + Math.random() * 5000;
      const depth = Math.random();
      const response = 0.5 + depth * 0.5;
      const duration = 18000 + Math.random() * 7000;
      const axis = Math.random();
      const rotationSpeed =
        axis < 0.25 ? 0.5 + Math.random() : 2 + Math.random() * 4;
      const staticX = axis < 0.5 ? Math.random() * 360 - 180 : 0;

      startX.current = particleStartX;
      windAtReset.current = windCurrent.current;
      windResponseCurrent.current = response;
      x.setValue(particleStartX - windAtReset.current * response);
      y.setValue(startY);
      scale.setValue(0.7 + depth * 0.4);
      windResponse.setValue(response);
      rotationX.setValue(staticX);
      rotationY.setValue(0);
      rotationZ.setValue(0);

      const turns = 360 * rotationSpeed;
      const rotationTargets = {
        x: axis > 0.5 ? turns : staticX,
        y: axis > 0.25 && axis <= 0.5 ? turns : 0,
        z: axis <= 0.25 ? turns : 0,
      };

      animation = RNAnimated.sequence([
        RNAnimated.delay(delay),
        RNAnimated.parallel([
          RNAnimated.timing(y, {
            toValue: height + size,
            duration,
            easing: RNEasing.linear,
            useNativeDriver: Platform.OS !== "web",
          }),
          RNAnimated.timing(rotationX, {
            toValue: rotationTargets.x,
            duration,
            easing: RNEasing.linear,
            useNativeDriver: Platform.OS !== "web",
          }),
          RNAnimated.timing(rotationY, {
            toValue: rotationTargets.y,
            duration,
            easing: RNEasing.linear,
            useNativeDriver: Platform.OS !== "web",
          }),
          RNAnimated.timing(rotationZ, {
            toValue: rotationTargets.z,
            duration,
            easing: RNEasing.linear,
            useNativeDriver: Platform.OS !== "web",
          }),
        ]),
      ]);
      animation.start(({ finished }) => {
        if (finished && !cancelled) reset(false);
      });
    }

    const windListener = wind.addListener(({ value }) => {
      if (
        resetting ||
        value === undefined ||
        startX.current +
          (value - windAtReset.current) * windResponseCurrent.current <
          -size ||
        startX.current +
          (value - windAtReset.current) * windResponseCurrent.current >
          width
      ) {
        if (!resetting && value !== undefined) {
          resetting = true;
          animation?.stop();
          reset(false);
          resetting = false;
        }
      }
    });

    reset(true);

    return () => {
      cancelled = true;
      animation?.stop();
      wind.removeListener(windListener);
    };
  }, [
    height,
    index,
    rotationX,
    rotationY,
    rotationZ,
    scale,
    size,
    width,
    windCurrent,
    windResponse,
    x,
    y,
    wind,
  ]);

  const rotationInput = [-3600, 3600];

  return (
    <RNAnimated.View
      style={[
        styles.leaf,
        {
          height: size,
          width: size,
          transform: [
            { perspective: 400 },
            {
              translateX: RNAnimated.add(
                x,
                RNAnimated.multiply(wind, windResponse),
              ),
            },
            { translateY: y },
            { scale },
            {
              rotateX: rotationX.interpolate({
                inputRange: rotationInput,
                outputRange: ["-3600deg", "3600deg"],
              }),
            },
            {
              rotateY: rotationY.interpolate({
                inputRange: rotationInput,
                outputRange: ["-3600deg", "3600deg"],
              }),
            },
            {
              rotateZ: rotationZ.interpolate({
                inputRange: rotationInput,
                outputRange: ["-3600deg", "3600deg"],
              }),
            },
          ],
        },
      ]}
    >
      <Leaf color={color} width={size} height={size} />
    </RNAnimated.View>
  );
}

export function Leaves(props: SceneProps) {
  const colors = ["#9b3f24", "#c35b28", "#d8892f", "#b79a36", "#7f4828"];
  const { wind, windCurrent } = useLeafWind(props.width);

  return (
    <>
      {Array.from({ length: 24 }, (_, index) => (
        <LeafParticle
          key={index}
          {...props}
          color={colors[index % colors.length]}
          index={index}
          wind={wind}
          windCurrent={windCurrent}
        />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  leaf: {
    position: "absolute",
    top: 0,
    left: 0,
    backfaceVisibility: "visible",
  },
});
