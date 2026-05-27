import { menuStyles } from "@/styles/menuStyles";
import { useEffect, useRef } from "react";
import { Animated, Easing, Text, View } from "react-native";
import { Button } from "../Button/Button";

interface Props {
  gameEnded: boolean;
  score?: string | number;
  message?: string;
  won: boolean;
  reset: () => void;
}

export const WinLoseBox = ({
  score,
  message,
  won,
  gameEnded,
  reset,
}: Props) => {
  // Win/lose animations
  const wlmAnim = useRef(new Animated.Value(0)).current;

  const fadeInWLM = () => {
    Animated.timing(wlmAnim, {
      toValue: 1,
      duration: 750,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start();
  };
  const fadeOutWLM = (actionAfterFadeout?: () => void) => {
    Animated.timing(wlmAnim, {
      toValue: 0,
      duration: 400,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished && actionAfterFadeout) {
        actionAfterFadeout();
      }
    });
  };

  useEffect(() => {
    if (gameEnded) {
      fadeInWLM();
    } else {
      fadeOutWLM();
    }
  }, [gameEnded]);

  return gameEnded ? (
    <>
      <Animated.View style={[menuStyles.wlmOverlay, { opacity: wlmAnim }]} />

      <Animated.View
        style={[
          menuStyles.winLoseMessage,
          won ? menuStyles.winLoseMessageWin : menuStyles.winLoseMessageLose,
          {
            opacity: wlmAnim,
            bottom: wlmAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [-100, 0],
            }),
          },
        ]}
      >
        <View style={menuStyles.winLoseMessageLeft}>
          <Text style={menuStyles.wlmTitle}>
            {won ? "You won!" : "You lost"}
          </Text>

          {message && <Text style={menuStyles.wlmScore}>{message}</Text>}
          {score && <Text style={menuStyles.wlmScore}>Score: {score}</Text>}
        </View>

        <Button
          onPress={() => fadeOutWLM(reset)}
          size="text"
          text={won ? "Play again" : "Try again"}
          textStyle={menuStyles.playBtn}
        />
      </Animated.View>
    </>
  ) : null;
};
