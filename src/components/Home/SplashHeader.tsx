import { flexStyles } from "@/styles/flexStyles";
import { Colors, FontWeight } from "@/styles/styles";
import { textStyles } from "@/styles/textStyles";
import React, { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";

interface Props {
  onAnimationComplete: () => void;
  children: (animationState: {
    isLoaded: boolean;
    contentOpacity: Animated.AnimatedInterpolation<number>;
    tabTranslate: Animated.AnimatedInterpolation<number>;
  }) => React.ReactNode;
}

export const SplashHeader = ({ onAnimationComplete, children }: Props) => {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const splashAnim = useRef(new Animated.Value(0)).current;
  const { height: screenHeight } = useWindowDimensions();

  useEffect(() => {
    Animated.sequence([
      Animated.timing(splashAnim, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: false,
      }),
      Animated.delay(1000),
      Animated.timing(splashAnim, {
        toValue: 2,
        duration: 700,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false,
      }),
    ]).start(() => {
      setIsLoaded(true);
      onAnimationComplete();
    });
  }, [splashAnim, onAnimationComplete]);

  const topSpacer = splashAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [screenHeight * 0.35, screenHeight * 0.35, 10],
  });

  const headerScale = splashAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [1.8, 1.8, 1],
  });

  const contentOpacity = splashAnim.interpolate({
    inputRange: [1, 1.5, 2],
    outputRange: [0, 0, 1],
  });

  const tabTranslate = splashAnim.interpolate({
    inputRange: [1, 2],
    outputRange: [50, 0],
    extrapolate: "clamp",
  });

  const indicatorOpacity = splashAnim.interpolate({
    inputRange: [0, 1, 1.5],
    outputRange: [1, 1, 0],
    extrapolate: "clamp",
  });

  return (
    <>
      {/* Header / Splash */}
      <Animated.View style={[styles.headerWrapper, { paddingTop: topSpacer }]}>
        <Animated.View
          style={[
            flexStyles.colCentered,
            { transform: [{ scale: headerScale }] },
          ]}
        >
          <Animated.Text style={styles.appTitle}>Solo Suite</Animated.Text>

          {!isLoaded && (
            <Animated.View
              style={[styles.loadingContainer, { opacity: indicatorOpacity }]}
            >
              <ActivityIndicator size="large" color={Colors.accentBlue} />
            </Animated.View>
          )}
        </Animated.View>
      </Animated.View>

      {children({ isLoaded, contentOpacity, tabTranslate })}
    </>
  );
};

const styles = StyleSheet.create({
  headerWrapper: {
    alignItems: "center",
    width: "100%",
    zIndex: 10,
    backgroundColor: Colors.K850,
  },

  appTitle: {
    ...textStyles.h2,
    color: Colors.K200,
    fontSize: 24,
    letterSpacing: 0.5,
    fontFamily: FontWeight[300],
  },
  loadingContainer: {
    top: "10%",
    alignItems: "center",
    zIndex: 20,
  },
});
