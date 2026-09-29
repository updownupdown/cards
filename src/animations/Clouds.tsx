import { Image, StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { type SceneProps, seeded, useLoop } from "./BackgroundAnimations";

const CLOUD_WIDTH = 240;
const CLOUD_HEIGHT = 120;
const CLOUD_IMAGES = [
  require("@/assets/images/cloud1.png"),
  require("@/assets/images/cloud2.png"),
  require("@/assets/images/cloud3.png"),
  require("@/assets/images/cloud4.png"),
  require("@/assets/images/cloud5.png"),
  require("@/assets/images/cloud6.png"),
  require("@/assets/images/cloud7.png"),
  require("@/assets/images/cloud8.png"),
  require("@/assets/images/cloud9.png"),
];

function Cloud({ scale, seed }: { scale: number; seed: number }) {
  return (
    <View style={[styles.cloud, { transform: [{ scale }] }]}>
      <Image
        source={CLOUD_IMAGES[seed % CLOUD_IMAGES.length]}
        blurRadius={2}
        resizeMode="contain"
        style={styles.cloudImage}
      />
    </View>
  );
}

function PassingCloud({
  index,
  width,
  height,
}: SceneProps & { index: number }) {
  const baseScale = 0.65 + (seeded(index, 26) * 0.75 * width) / 1000;
  const scale = baseScale * (0.8 + seeded(index, 34) * 0.6);
  const duration = 60000 + seeded(index, 23) * 300000;
  const startDelay = index * 15000 + seeded(index, 24) * 3000;
  const travelPadding = CLOUD_WIDTH * scale + 30;
  const startY = (-0.38 + seeded(index, 25) * 0.76) * height;
  const verticalDistance =
    (seeded(index, 27) > 0.5 ? 1 : -1) *
    (height * (0.06 + seeded(index, 28) * 0.16));
  const opacityFloor = 0.28 + seeded(index, 29) * 0.24;
  const opacityShift = 0.2 + seeded(index, 30) * 0.28;
  const fadesIn = seeded(index, 31) > 0.5;
  const startOpacity = fadesIn ? opacityFloor : opacityFloor + opacityShift;
  const endOpacity = fadesIn ? opacityFloor + opacityShift : opacityFloor;

  const progress = useLoop(duration, startDelay);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: startOpacity + (endOpacity - startOpacity) * progress.value,
    transform: [
      {
        translateX:
          -travelPadding + progress.value * (width + travelPadding * 2),
      },
      { translateY: startY + progress.value * verticalDistance },
    ],
  }));

  return (
    <Animated.View style={[styles.cloudDrifter, animatedStyle]}>
      <Cloud scale={scale} seed={index + 1} />
    </Animated.View>
  );
}

export function Clouds(props: SceneProps) {
  return (
    <>
      {Array.from({ length: 5 }, (_, index) => (
        <PassingCloud key={index} {...props} index={index} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  cloud: {
    width: CLOUD_WIDTH,
    height: CLOUD_HEIGHT,
  },
  cloudImage: {
    width: "100%",
    height: "100%",
  },
  cloudDrifter: {
    position: "absolute",
    top: 0,
    left: 0,
  },
});
