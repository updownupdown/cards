import { Text } from "@/components/common/Text";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { flexStyles } from "@/styles/flexStyles";
import { modalBorderRadius } from "@/styles/modalStyles";
import {
  Colors,
  ContentSidePadding,
  MaxContentWidth,
  rgba,
} from "@/styles/styles";
import { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";
import { Button } from "../Button/Button";

interface Props {
  gameEnded: boolean;
  score?: string | number;
  message?: string;
  won: boolean;
  reset: () => void;
  handleUndo?: () => void;
}

export const WinLoseBox = ({
  score,
  message,
  won,
  gameEnded,
  reset,
  handleUndo,
}: Props) => {
  const responsiveScale = useResponsiveLayout();

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
      <Animated.View
        style={{
          opacity: wlmAnim,
          position: "absolute",
          zIndex: 9, // just under the game header
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: rgba(Colors.K850, 0.5),
        }}
      />

      <Animated.View
        style={[
          flexStyles.colCentered,
          {
            opacity: wlmAnim,
            position: "absolute",
            zIndex: 500,
            padding: 20,
            gap: 20,
            left: "50%",
            transform: [{ translateX: "-50%" }],
            borderRadius: modalBorderRadius,
            backgroundColor: won
              ? rgba(Colors.win, 0.95)
              : rgba(Colors.lose, 0.9),
            boxShadow: won
              ? `0 0 20px ${rgba(Colors.win, 0.6)}, 0 0 40px ${rgba(Colors.win, 0.6)}`
              : `0 0 20px ${rgba(Colors.lose, 0.6)}, 0 0 40px ${rgba(Colors.lose, 0.6)}`,
            width: "100%",
            maxWidth:
              MaxContentWidth * responsiveScale - ContentSidePadding * 2,
            bottom: wlmAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [-200, ContentSidePadding],
            }),
          },
        ]}
      >
        <View
          style={[
            flexStyles.colCentered,
            {
              gap: 6,
            },
          ]}
        >
          <Text size={24} weight={400} color={Colors.white}>
            {won ? "You won!" : "You lost"}
          </Text>

          {message && (
            <Text
              size={16}
              weight={300}
              color={Colors.white}
              style={{
                textAlign: "center",
              }}
            >
              {message}
            </Text>
          )}
          {score && (
            <Text
              size={16}
              weight={300}
              color={Colors.white}
              style={{
                textAlign: "center",
              }}
            >
              Score: {score}
            </Text>
          )}
        </View>

        <View
          style={[
            flexStyles.rowCentered,
            flexStyles.fullWidth,
            flexStyles.gap12,
          ]}
        >
          {handleUndo && !won && (
            <Button
              onPress={() => fadeOutWLM(handleUndo)}
              size="medium"
              text="Undo"
              theme={Colors.white}
            />
          )}

          <Button
            onPress={() => fadeOutWLM(reset)}
            size="medium"
            text={won ? "Play again" : "Try again"}
            theme={Colors.white}
          />
        </View>
      </Animated.View>
    </>
  ) : null;
};
