import { Text } from "@/components/common/Text";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, ContentSidePadding, rgba } from "@/styles/styles";
import { useEffect, useRef } from "react";
import { Animated, Easing, Platform, View } from "react-native";
import { Button } from "../Button/Button";
import { useGameZoneBackground } from "@/hooks/useGameZoneBackground";
import { LinearGradient } from "expo-linear-gradient";

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
  const { ui, spacing } = useResponsiveMetrics();
  const { cardBg } = useGameZoneBackground();

  // Win/lose animations
  const wlmAnim = useRef(new Animated.Value(0)).current;

  const fadeInWLM = () => {
    Animated.timing(wlmAnim, {
      toValue: 1,
      duration: 750,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: Platform.OS !== "web",
    }).start();
  };
  const fadeOutWLM = (actionAfterFadeout?: () => void) => {
    Animated.timing(wlmAnim, {
      toValue: 0,
      duration: 400,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: Platform.OS !== "web",
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
          top: ui.gameHeaderHeight,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      >
        <LinearGradient
          colors={[rgba(cardBg, 0), rgba(cardBg, 0.8)]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "100%",
            height: "160%",
            pointerEvents: "none",
          }}
        />
      </Animated.View>

      <Animated.View
        style={[
          flexStyles.colCentered,
          {
            opacity: wlmAnim,
            position: "absolute",
            zIndex: 500,
            padding: spacing(20),
            gap: spacing(20),
            left: "50%",
            transform: [{ translateX: "-50%" }],
            borderRadius: spacing(20),
            backgroundColor: won
              ? rgba(Colors.win, 0.95)
              : rgba(Colors.lose, 0.9),
            boxShadow: won
              ? `0 0 20px ${rgba(Colors.win, 0.6)}, 0 0 40px ${rgba(Colors.win, 0.6)}`
              : `0 0 20px ${rgba(Colors.lose, 0.6)}, 0 0 40px ${rgba(Colors.lose, 0.6)}`,
            width: "100%",
            maxWidth: ui.contentMaxWidth - ContentSidePadding * 2,
            bottom: wlmAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [-200, spacing(ContentSidePadding)],
            }),
          },
        ]}
      >
        <View
          style={[
            flexStyles.colCentered,
            {
              gap: spacing(14),
            },
          ]}
        >
          <Text size="xl" weight={400} color={Colors.white}>
            {won ? "You won!" : "You lost"}
          </Text>

          {message && (
            <Text
              size="md"
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
              gap: spacing(12),
            },
          ]}
        >
          {handleUndo && !won && (
            <Button
              onPress={() => fadeOutWLM(handleUndo)}
              size="sm"
              text="Undo"
              theme={"lose"}
              taller
              style={{
                flex: 1,
              }}
            />
          )}

          <Button
            onPress={() => fadeOutWLM(reset)}
            size="sm"
            text={won ? "Play again" : "Try again"}
            theme={won ? "win" : "lose"}
            taller
            style={{
              flex: 1,
            }}
          />
        </View>
      </Animated.View>
    </>
  ) : null;
};
