import { Text } from "@/components/common/Text";
import { useResponsiveScale } from "@/hooks/useResponsiveLayout";
import { flexStyles } from "@/styles/flexStyles";
import { modalBorderRadius } from "@/styles/modalStyles";
import {
  Colors,
  ContentSidePadding,
  HeaderHeight,
  MaxContentWidth,
  rgba,
} from "@/styles/styles";
import { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";
import { Button } from "../Button/Button";
import { useGameZoneBackground } from "@/hooks/useGameZoneBackground";

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
  const responsiveScale = useResponsiveScale();
  const { cardBg } = useGameZoneBackground();

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
          zIndex: 9,
          top: HeaderHeight * responsiveScale,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: rgba(cardBg, 0.4),
        }}
      />

      <Animated.View
        style={[
          flexStyles.colCentered,
          {
            opacity: wlmAnim,
            position: "absolute",
            zIndex: 500,
            padding: 20 * responsiveScale,
            gap: 20 * responsiveScale,
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
              outputRange: [-200, ContentSidePadding * responsiveScale],
            }),
          },
        ]}
      >
        <View
          style={[
            flexStyles.colCentered,
            {
              gap: 14 * responsiveScale,
            },
          ]}
        >
          <Text size="xl" weight={400} color={Colors.white}>
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
          {score !== undefined && (
            <Text
              size="md"
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
            {
              gap: 12 * responsiveScale,
            },
          ]}
        >
          {handleUndo && !won && (
            <Button
              onPress={() => fadeOutWLM(handleUndo)}
              size="medium"
              text="Undo"
              theme={"red"}
            />
          )}

          <Button
            onPress={() => fadeOutWLM(reset)}
            size="medium"
            text={won ? "Play again" : "Try again"}
            theme={won ? "green" : "red"}
          />
        </View>
      </Animated.View>
    </>
  ) : null;
};
