import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { Colors } from "@/styles/styles";

export const Sparks = ({ active }: { active: boolean }) => {
  const [show, setShow] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  // 5 particles: top, top-right, right, bottom-right, bottom-left, left, top-left
  // just generate 6 particles around a circle
  const particles = Array.from({ length: 6 }).map((_, i) => {
    const angle = (i * Math.PI * 2) / 6;
    return {
      x: Math.cos(angle) * 20,
      y: Math.sin(angle) * 20,
    };
  });

  useEffect(() => {
    if (active) {
      setShow(true);
      anim.setValue(0);
      Animated.timing(anim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: false,
      }).start(() => {
        setShow(false);
      });
    }
  }, [active, anim]);

  if (!show) return null;

  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        {
          pointerEvents: "none",
        },
      ]}
    >
      {particles.map((p, i) => {
        const translateX = anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, p.x],
        });
        const translateY = anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, p.y],
        });
        const opacity = anim.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [1, 1, 0],
        });
        const scale = anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.5, 1.5],
        });
        return (
          <Animated.View
            key={i}
            style={[
              styles.spark,
              {
                opacity,
                transform: [{ translateX }, { translateY }, { scale }],
              },
            ]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  spark: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -3,
    marginLeft: -3,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.favoriteStar,
  },
});
