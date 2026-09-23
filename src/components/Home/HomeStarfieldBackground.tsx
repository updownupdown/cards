import { ShootingStar } from "@/components/common/ShootingStar";
import { Colors, rgba } from "@/styles/styles";
import { useRef, useState } from "react";
import {
  ImageBackground,
  View,
  type LayoutChangeEvent,
} from "react-native";

const OVERLAY_COLOR = rgba(Colors.starfieldOverlay, 0.7);

type Props = {
  animationsEnabled: boolean;
  width: number;
  height: number;
};

export function HomeStarfieldBackground({
  animationsEnabled,
  width,
  height,
}: Props) {
  const viewportRef = useRef({ width, height });
  if (Math.abs(viewportRef.current.width - width) > 1) {
    viewportRef.current = { width, height };
  } else if (height > viewportRef.current.height) {
    viewportRef.current.height = height;
  }

  // The reported viewport can be smaller than the area to cover: web debounces
  // resize events, and a platform can report the window without its system
  // bars. The image has to reach under the status and navigation bars, so
  // measure this view (which fills the screen) too and cover whichever of the
  // two is larger.
  const [measured, setMeasured] = useState({ width: 0, height: 0 });
  const onLayout = (event: LayoutChangeEvent) => {
    const { width: layoutWidth, height: layoutHeight } =
      event.nativeEvent.layout;
    setMeasured((current) =>
      Math.abs(current.width - layoutWidth) > 1 ||
      Math.abs(current.height - layoutHeight) > 1
        ? { width: layoutWidth, height: layoutHeight }
        : current,
    );
  };

  const viewport = {
    width: Math.max(viewportRef.current.width, measured.width),
    height: Math.max(viewportRef.current.height, measured.height),
  };

  const isLandscape = viewport.width > viewport.height;
  const imageWidth = isLandscape ? viewport.height : viewport.width;
  const imageHeight = isLandscape ? viewport.width : viewport.height;

  return (
    <View
      testID="home-starfield-background"
      onLayout={onLayout}
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        pointerEvents: "none",
      }}
    >
      <ImageBackground
        source={require("../../../assets/images/starfield.webp")}
        resizeMode="cover"
        style={{
          position: "absolute",
          left: (viewport.width - imageWidth) / 2,
          top: (viewport.height - imageHeight) / 2,
          width: imageWidth,
          height: imageHeight,
          transform: isLandscape ? [{ rotate: "90deg" }] : undefined,
        }}
      />
      <View
        testID="home-starfield-overlay"
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          backgroundColor: OVERLAY_COLOR,
        }}
      />
      <ShootingStar
        testID="home-shooting-star"
        width={viewport.width}
        height={viewport.height}
        animationsEnabled={animationsEnabled}
      />
    </View>
  );
}
