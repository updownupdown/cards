import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Platform } from "react-native";

export const useFade = (
  visible: boolean,
  duration: number = 300,
  delayFadeIn?: number,
  delayFadeOut?: number,
) => {
  const [isRendered, setIsRendered] = useState(visible);
  const opacity = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    if (visible) {
      setIsRendered(true);
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay: delayFadeIn,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: Platform.OS !== "web",
      }).start();
    } else {
      Animated.timing(opacity, {
        toValue: 0,
        duration,
        delay: delayFadeOut,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: Platform.OS !== "web",
      }).start(({ finished }) => {
        if (finished) {
          setIsRendered(false);
        }
      });
    }
  }, [visible, duration, opacity]);

  return { isRendered, opacity };
};
