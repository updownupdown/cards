import { useEffect, useRef } from "react";
import { Animated, Easing, Platform, StyleSheet, View } from "react-native";
import Svg, {
  Defs,
  Ellipse,
  Mask,
  RadialGradient,
  Stop,
} from "react-native-svg";

type SingularityGraphicProps = {
  size: number;
};

export function SingularityGraphic({ size }: SingularityGraphicProps) {
  const luminosity = useRef(new Animated.Value(0)).current;
  const intensity = useRef(new Animated.Value(0)).current;
  const motion = useRef(new Animated.Value(0)).current;
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(luminosity, {
          toValue: 1,
          duration: 3200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(luminosity, {
          toValue: 0,
          duration: 4200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== "web",
        }),
      ]),
    );
    const drift = Animated.loop(
      Animated.timing(motion, {
        toValue: 1,
        duration: 15000,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: Platform.OS !== "web",
      }),
    );
    const intensityPulse = Animated.loop(
      Animated.sequence([
        Animated.timing(intensity, {
          toValue: 1,
          duration: 6000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(intensity, {
          toValue: 0,
          duration: 6000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== "web",
        }),
      ]),
    );
    const orbit = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 27000,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== "web",
      }),
    );

    pulse.start();
    drift.start();
    intensityPulse.start();
    orbit.start();
    return () => {
      pulse.stop();
      drift.stop();
      intensityPulse.stop();
      orbit.stop();
    };
  }, [intensity, luminosity, motion, rotation]);

  const glowOpacity = luminosity.interpolate({
    inputRange: [0, 1],
    outputRange: [0.78, 1],
  });
  const glowScale = luminosity.interpolate({
    inputRange: [0, 1],
    outputRange: [0.98, 1.025],
  });
  const redDrift = motion.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [-9, 12, -9],
  });
  const redOpacity = motion.interpolate({
    inputRange: [0, 0.38, 0.7, 1],
    outputRange: [0.38, 0.72, 0.48, 0.38],
  });
  const photonOpacity = luminosity.interpolate({
    inputRange: [0, 0.72, 1],
    outputRange: [0.76, 0.9, 1],
  });
  const bloomOpacity = intensity.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
  });
  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });
  const width = size * 6.825;
  const height = size * 4.225;

  return (
    <View
      style={[
        styles.container,
        {
          width,
          height,
          pointerEvents: "none",
          transform: [{ translateX: -width / 2 }, { translateY: -height / 2 }],
        },
      ]}
    >
      <Animated.View
        style={[
          styles.layer,
          {
            opacity: glowOpacity,
            transform: [{ scale: glowScale }],
          },
        ]}
      >
        <Svg width="100%" height="100%" viewBox="0 0 400 260">
          <Defs>
            <RadialGradient id="outerGlow" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor="#fff2b0" stopOpacity="0.82" />
              <Stop offset="14%" stopColor="#ffbd45" stopOpacity="0.68" />
              <Stop offset="38%" stopColor="#d94b18" stopOpacity="0.34" />
              <Stop offset="72%" stopColor="#541017" stopOpacity="0.1" />
              <Stop offset="100%" stopColor="#050309" stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id="hotGas" cx="48%" cy="50%" rx="52%" ry="50%">
              <Stop offset="0%" stopColor="#fffdf0" stopOpacity="0.98" />
              <Stop offset="10%" stopColor="#ffe79a" stopOpacity="0.96" />
              <Stop offset="28%" stopColor="#ef9b37" stopOpacity="0.84" />
              <Stop offset="53%" stopColor="#a3311c" stopOpacity="0.52" />
              <Stop offset="78%" stopColor="#35101a" stopOpacity="0.18" />
              <Stop offset="100%" stopColor="#040207" stopOpacity="0" />
            </RadialGradient>
          </Defs>

          <Ellipse cx="200" cy="130" rx="196" ry="100" fill="url(#outerGlow)" />
          <Ellipse cx="200" cy="130" rx="171" ry="42" fill="url(#hotGas)" />
        </Svg>
      </Animated.View>

      <Animated.View
        style={[
          styles.layer,
          {
            opacity: redOpacity,
            transform: [{ translateX: redDrift }, { scale: glowScale }],
          },
        ]}
      >
        <Svg width="100%" height="100%" viewBox="0 0 400 260">
          <Defs>
            <RadialGradient id="redPlasma" cx="42%" cy="48%" rx="58%" ry="52%">
              <Stop offset="0%" stopColor="#ffb078" stopOpacity="0.76" />
              <Stop offset="18%" stopColor="#e83e24" stopOpacity="0.72" />
              <Stop offset="48%" stopColor="#8b1220" stopOpacity="0.42" />
              <Stop offset="78%" stopColor="#390619" stopOpacity="0.16" />
              <Stop offset="100%" stopColor="#13020d" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Ellipse cx="200" cy="130" rx="78" ry="124" fill="url(#redPlasma)" />
        </Svg>
      </Animated.View>

      <Svg
        style={styles.layer}
        width="100%"
        height="100%"
        viewBox="0 0 400 260"
      >
        <Defs>
          <RadialGradient id="diskGlow" cx="48%" cy="48%" rx="52%" ry="52%">
            <Stop offset="0%" stopColor="#fffef1" stopOpacity="1" />
            <Stop offset="9%" stopColor="#fff3bc" stopOpacity="0.98" />
            <Stop offset="25%" stopColor="#eaa14d" stopOpacity="0.88" />
            <Stop offset="50%" stopColor="#8c2a1e" stopOpacity="0.58" />
            <Stop offset="76%" stopColor="#2a0b16" stopOpacity="0.22" />
            <Stop offset="100%" stopColor="#030106" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="innerLight" cx="47%" cy="45%" rx="54%" ry="55%">
            <Stop offset="0%" stopColor="#fffef7" stopOpacity="1" />
            <Stop offset="18%" stopColor="#ffe8a3" stopOpacity="0.95" />
            <Stop offset="42%" stopColor="#c96931" stopOpacity="0.7" />
            <Stop offset="72%" stopColor="#41101a" stopOpacity="0.26" />
            <Stop offset="100%" stopColor="#020105" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        <Ellipse cx="200" cy="130" rx="194" ry="34" fill="url(#diskGlow)" />
        <Ellipse
          cx="194"
          cy="130"
          rx="168"
          ry="20"
          fill="url(#innerLight)"
          opacity="0.82"
        />
      </Svg>

      <Animated.View
        style={[
          styles.layer,
          { opacity: photonOpacity, transform: [{ rotate: spin }] },
        ]}
      >
        <Svg width="100%" height="100%" viewBox="0 0 400 260">
          <Defs>
            <RadialGradient id="discColor" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor="#ffb348" stopOpacity="0.82" />
              <Stop offset="38%" stopColor="#f05a24" stopOpacity="0.78" />
              <Stop offset="68%" stopColor="#b62220" stopOpacity="0.62" />
              <Stop offset="86%" stopColor="#71101c" stopOpacity="0.34" />
              <Stop offset="100%" stopColor="#3d0816" stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id="photonGlow" cx="36%" cy="31%" rx="64%" ry="64%">
              <Stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <Stop offset="10%" stopColor="#fffefa" stopOpacity="1" />
              <Stop offset="24%" stopColor="#fff1bd" stopOpacity="0.98" />
              <Stop offset="42%" stopColor="#ffc354" stopOpacity="0.92" />
              <Stop offset="62%" stopColor="#f26325" stopOpacity="0.76" />
              <Stop offset="76%" stopColor="#d83d20" stopOpacity="0.68" />
              <Stop offset="89%" stopColor="#9e171d" stopOpacity="0.34" />
              <Stop offset="100%" stopColor="#64101b" stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id="photonEdge" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <Stop offset="58%" stopColor="#ffffff" stopOpacity="1" />
              <Stop offset="76%" stopColor="#ffffff" stopOpacity="0.72" />
              <Stop offset="90%" stopColor="#ffffff" stopOpacity="0.24" />
              <Stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </RadialGradient>
            <Mask id="photonEdgeMask">
              <Ellipse
                cx="200"
                cy="130"
                rx="91"
                ry="85"
                fill="url(#photonEdge)"
              />
            </Mask>
          </Defs>
          <Ellipse cx="200" cy="130" rx="98" ry="92" fill="url(#discColor)" />
          <Ellipse
            cx="200"
            cy="130"
            rx="91"
            ry="85"
            fill="url(#photonGlow)"
            mask="url(#photonEdgeMask)"
          />
        </Svg>
      </Animated.View>

      <Animated.View
        style={[
          styles.layer,
          { opacity: bloomOpacity, transform: [{ rotate: spin }] },
        ]}
      >
        <Svg width="100%" height="100%" viewBox="0 0 400 260">
          <Defs>
            <RadialGradient id="whiteBloom" cx="36%" cy="31%" rx="64%" ry="64%">
              <Stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <Stop offset="16%" stopColor="#ffffff" stopOpacity="0.98" />
              <Stop offset="34%" stopColor="#fffbe8" stopOpacity="0.72" />
              <Stop offset="58%" stopColor="#ffd781" stopOpacity="0.3" />
              <Stop offset="82%" stopColor="#ff8a3d" stopOpacity="0.08" />
              <Stop offset="100%" stopColor="#ff542c" stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id="bloomEdge" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <Stop offset="52%" stopColor="#ffffff" stopOpacity="1" />
              <Stop offset="72%" stopColor="#ffffff" stopOpacity="0.62" />
              <Stop offset="88%" stopColor="#ffffff" stopOpacity="0.18" />
              <Stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </RadialGradient>
            <Mask id="bloomEdgeMask">
              <Ellipse
                cx="200"
                cy="130"
                rx="91"
                ry="85"
                fill="url(#bloomEdge)"
              />
            </Mask>
          </Defs>
          <Ellipse
            cx="200"
            cy="130"
            rx="91"
            ry="85"
            fill="url(#whiteBloom)"
            mask="url(#bloomEdgeMask)"
          />
        </Svg>
      </Animated.View>

      <Svg
        style={styles.layer}
        width="100%"
        height="100%"
        viewBox="0 0 400 260"
      >
        <Defs>
          <RadialGradient id="shadow" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0%" stopColor="#000000" stopOpacity="1" />
            <Stop offset="72%" stopColor="#000001" stopOpacity="1" />
            <Stop offset="88%" stopColor="#080309" stopOpacity="0.99" />
            <Stop offset="100%" stopColor="#2a1015" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Ellipse cx="200" cy="130" rx="73" ry="69" fill="url(#shadow)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: "50%",
    left: "50%",
  },
  layer: {
    ...StyleSheet.absoluteFillObject,
  },
});
