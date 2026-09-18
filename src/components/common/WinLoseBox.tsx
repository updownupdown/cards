import { Text } from "@/components/common/Text";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useTranslation } from "@/i18n";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, LayerZIndexes, layoutDims, rgba } from "@/styles/styles";
import { useEffect, useRef } from "react";
import { Animated, Easing, Platform, View } from "react-native";
import { Button } from "../Button/Button";
import { useGameColors } from "@/hooks/useGameColors";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
  gameEnded: boolean;
  headerBottom: number;
  score?: string | number;
  message?: string;
  won: boolean;
  reset: () => void;
  handleUndo?: () => void;
  isNodesMode?: boolean;
  onExit?: () => void;
}

export const WinLoseBox = ({
  headerBottom,
  score,
  message,
  won,
  gameEnded,
  reset,
  handleUndo,
  isNodesMode = false,
  onExit,
}: Props) => {
  const { ui, spacing } = useResponsiveMetrics();
  const { t } = useTranslation("game");
  const { colorDark } = useGameColors();
  const insets = useSafeAreaInsets();
  const restingBottom = spacing(layoutDims.pagePadding) + insets.bottom;

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
          zIndex: LayerZIndexes.winLoseBackdrop,
          top: headerBottom,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      >
        <LinearGradient
          colors={[rgba(colorDark, 0), rgba(colorDark, 0.9)]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            top: 0,
            right: 0,
            width: "100%",
            // height: "160%",
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
            zIndex: LayerZIndexes.winLoseCard,
            padding: spacing(20),
            gap: spacing(20),
            alignSelf: "center",
            borderRadius: spacing(20),
            backgroundColor: won
              ? rgba(Colors.win, 0.95)
              : rgba(Colors.lose, 0.9),
            boxShadow: won
              ? `0 0 20px ${rgba(Colors.win, 0.6)}, 0 0 40px ${rgba(Colors.win, 0.6)}`
              : `0 0 20px ${rgba(Colors.lose, 0.6)}, 0 0 40px ${rgba(Colors.lose, 0.6)}`,
            width: "100%",
            maxWidth: ui.contentMaxWidth - spacing(layoutDims.pagePadding) * 2,
            // Clear of the bottom safe area (Android's navigation bar).
            bottom: restingBottom,
            // Slides up via transform: the native driver can't animate
            // `bottom` (it threw an error on native).
            transform: [
              {
                translateY: wlmAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [restingBottom + 200, 0],
                }),
              },
            ],
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
            {won ? t("result.won") : t("result.lost")}
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
              {message.replace(/\\n/g, "\n")}
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
              {t("result.score", { score })}
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
          <Button
            size="md"
            accessibilityLabel={isNodesMode ? t("menu.nodes") : t("menu.home")}
            onPress={() => fadeOutWLM(onExit)}
            taller
            iconName={isNodesMode ? "nodes" : "home"}
            theme={won ? "winDark" : "loseDark"}
          />

          {handleUndo && !won && (
            <Button
              onPress={() => fadeOutWLM(handleUndo)}
              iconName="undo"
              size="md"
              theme="loseDark"
              taller
            />
          )}

          <Button
            onPress={() => fadeOutWLM(reset)}
            size="md"
            iconName="reset"
            text={won ? t("result.playAgain") : t("result.tryAgain")}
            theme={won ? "winDark" : "loseDark"}
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
