import { CardComponents as CardsRegular } from "@/assets/cards/regular";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, View } from "react-native";

const BackCard = CardsRegular.BackD;
const NUM_CARDS = 30;

export const LoadingShuffle = () => {
  const progress = useRef(new Animated.Value(0)).current;
  const [interlaced, setInterlaced] = useState(false);
  const animationRef = useRef<boolean>(true);

  const cards = useMemo(() => {
    return Array.from({ length: NUM_CARDS }).map((_, i) => {
      const isLeft = i < 15;
      const splitIndex = isLeft ? i : i - 15;

      const dxIdle = (Math.random() - 0.5) * 4;
      const dyIdle = (Math.random() - 0.5) * 4;
      const daIdle = (Math.random() - 0.5) * 4;

      const splitDx = isLeft
        ? -40 - Math.random() * 10
        : 40 + Math.random() * 10;
      const splitDy = (splitIndex - 7) * 2 + Math.random() * 5;
      const splitDa = isLeft ? -2 - Math.random() * 15 : 2 + Math.random() * 15;

      const bridgeDx = isLeft ? -15 : 15;
      const bridgeDy = splitDy * 0.5;
      const bridgeDa = isLeft ? -5 : 5;

      return {
        i,
        initialZ: i,
        interlacedZ: isLeft ? i * 2 : (i - 15) * 2 + 1,
        dxIdle,
        dyIdle,
        daIdle,
        splitDx,
        splitDy,
        splitDa,
        bridgeDx,
        bridgeDy,
        bridgeDa,
      };
    });
  }, []);

  useEffect(() => {
    animationRef.current = true;

    const animate = () => {
      if (!animationRef.current) return;

      progress.setValue(0);
      setInterlaced(false);

      Animated.timing(progress, {
        toValue: 1, // Split
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished || !animationRef.current) return;
        setInterlaced(true);

        Animated.timing(progress, {
          toValue: 2, // Bridge
          duration: 200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (!finished || !animationRef.current) return;

          Animated.timing(progress, {
            toValue: 3, // Square up
            duration: 300,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }).start(({ finished }) => {
            if (!finished || !animationRef.current) return;
            setTimeout(animate, 300);
          });
        });
      });
    };

    animate();

    return () => {
      animationRef.current = false;
      progress.stopAnimation();
    };
  }, [progress]);

  return (
    <View
      style={{
        width: 250,
        height: 100,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {cards.map((c) => {
        const x = progress.interpolate({
          inputRange: [0, 1, 2, 3],
          outputRange: [c.dxIdle, c.splitDx, c.bridgeDx, c.dxIdle],
        });
        const y = progress.interpolate({
          inputRange: [0, 1, 2, 3],
          outputRange: [c.dyIdle, c.splitDy, c.bridgeDy, c.dyIdle],
        });
        const rotation = progress.interpolate({
          inputRange: [0, 1, 2, 3],
          outputRange: [
            `${c.daIdle}deg`,
            `${c.splitDa}deg`,
            `${c.bridgeDa}deg`,
            `${c.daIdle}deg`,
          ],
        });

        return (
          <Animated.View
            key={`shuffle-card-${c.i}`}
            style={{
              position: "absolute",
              zIndex: interlaced ? c.interlacedZ : c.initialZ,
              transform: [
                { translateX: x },
                { translateY: y },
                { rotate: rotation },
              ],
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.3,
              shadowRadius: 2,
              elevation: 4,
            }}
          >
            <BackCard width={250 / 5} height={350 / 5} />
          </Animated.View>
        );
      })}
    </View>
  );
};
