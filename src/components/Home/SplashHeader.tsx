import { flexStyles } from "@/styles/flexStyles";
import { Colors, FontWeight } from "@/styles/styles";
import { textStyles } from "@/styles/textStyles";
import React, { useEffect, useRef } from "react";
import { ActivityIndicator, Animated, StyleSheet, View } from "react-native";

interface Props {
  onAnimationComplete: () => void;
  children: (animationState: {
    isLoaded: boolean;
    contentOpacity: Animated.AnimatedInterpolation<number>;
    tabTranslate: Animated.AnimatedInterpolation<number>;
  }) => React.ReactNode;
}

let hasAppLoadedInitially = false;

export const SplashHeader = ({ onAnimationComplete, children }: Props) => {
  const [isLoaded, setIsLoaded] = React.useState(hasAppLoadedInitially);
  const fadeAnim = useRef(
    new Animated.Value(hasAppLoadedInitially ? 1 : 0),
  ).current;

  useEffect(() => {
    if (hasAppLoadedInitially) {
      onAnimationComplete();
      return;
    }

    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: false,
      }).start(() => {
        hasAppLoadedInitially = true;
        setIsLoaded(true);
        onAnimationComplete();
      });
    }, 600);

    return () => clearTimeout(timer);
  }, [fadeAnim, onAnimationComplete]);

  const contentOpacity = fadeAnim;

  const tabTranslate = fadeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [50, 0],
    extrapolate: "clamp",
  });

  const loadingOpacity = fadeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  return (
    <>
      <View style={styles.headerWrapper}>
        <View style={flexStyles.colCentered}>
          <Animated.Text style={styles.appTitle}>Solo Suite</Animated.Text>
        </View>
      </View>

      {!isLoaded && (
        <Animated.View
          style={[styles.loadingContainer, { opacity: loadingOpacity }]}
          pointerEvents="none"
        >
          <ActivityIndicator size="large" color={Colors.accentBlue} />
        </Animated.View>
      )}

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
    paddingTop: 10,
    paddingBottom: 10,
  },
  appTitle: {
    ...textStyles.h2,
    color: Colors.K200,
    fontSize: 24,
    letterSpacing: 0.5,
    fontFamily: FontWeight[300],
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
  },
});
