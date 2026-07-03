import { Text } from "@/components/common/Text";
import { getGameInfo, normalizeGamePath } from "@/data/game-menu";
import { useFade } from "@/hooks/useFade";
import { useGameSettings } from "@/hooks/useGameSettings";
import { flexStyles } from "@/styles/flexStyles";
import { modalBorderRadius, modalShadow } from "@/styles/modalStyles";
import {
  Colors,
  ContentSidePadding,
  HeaderHeight,
  MaxContentWidth,
  rgba,
} from "@/styles/styles";
import { usePathname } from "expo-router";
import { Animated, ScrollView, View } from "react-native";
import { Button } from "../Button/Button";
import { useResponsiveScale } from "@/hooks/useResponsiveLayout";
import { useViewportDimensions } from "@/hooks/useViewportDimensions";

interface Props {
  setShowMenu: (show: boolean) => void;
  showIntro: boolean | undefined;
  setShowIntro: (show: boolean | undefined) => void;
  titleColor?: string;
  backgroundColor?: string;
}

export function GameIntro({ showIntro, setShowIntro, setShowMenu }: Props) {
  const pathname = normalizeGamePath(usePathname());
  const gameInfo = getGameInfo(pathname);
  const responsiveScale = useResponsiveScale();
  const { width: screenWidthActual } = useViewportDimensions();

  const containerWidth = Math.min(
    screenWidthActual,
    MaxContentWidth * responsiveScale,
  );

  const { updateSettings: updateGameSettings } = useGameSettings(pathname);

  const { isRendered: renderIntro, opacity: introOpacity } = useFade(
    showIntro === true,
    300,
  );

  return renderIntro ? (
    <>
      {/* Overlay */}
      <Animated.View
        style={[
          {
            opacity: introOpacity,
            position: "absolute",
            zIndex: 10,
            top: HeaderHeight,
            bottom: 0,
            right: 0,
            left: 0,
          },
        ]}
      />

      {/* Intro box */}
      <Animated.View
        style={[
          flexStyles.colCentered,
          {
            opacity: introOpacity,
            position: "absolute",
            zIndex: 10,
            top: HeaderHeight,
            bottom: 0,
            right: 0,
            left: 0,
            justifyContent: "flex-end",
            padding: ContentSidePadding,
          },
        ]}
      >
        <View
          style={[
            flexStyles.colCentered,
            {
              maxHeight: "100%",
              borderRadius: modalBorderRadius,
              backgroundColor: rgba(Colors.K900, 0.97),
              boxShadow: modalShadow,
              width: "100%",
              maxWidth: containerWidth,
            },
          ]}
        >
          <ScrollView
            style={{ width: "100%", alignSelf: "stretch" }}
            contentContainerStyle={[
              flexStyles.colCentered,
              {
                justifyContent: "space-evenly",
                flexGrow: 1,
                alignItems: "stretch",
                alignSelf: "stretch",
                padding: 30,
                gap: 30,
              },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <View
              style={[
                flexStyles.colStart,
                flexStyles.fullWidth,
                flexStyles.gap12,
              ]}
            >
              <Text size="lg" weight={500} style={{ color: Colors.K100 }}>
                How to Play
              </Text>

              {gameInfo.briefRules.map((info, key) => (
                <Text
                  key={`info-${key}`}
                  weight={300}
                  size="sm"
                  color={Colors.K200}
                  style={[
                    flexStyles.colCentered,
                    flexStyles.fullWidth,
                    {
                      alignItems: "flex-start",
                    },
                  ]}
                >
                  {info}
                </Text>
              ))}

              <Button
                onPress={() => {
                  setShowIntro(false);
                  setShowMenu(true);
                }}
                text="Read detailed rules"
                size="medium"
                textOnly
                uppercase={false}
                style={{ marginTop: 10 }}
              />
            </View>

            <Button
              onPress={() => {
                setShowIntro(false);
              }}
              size="large"
              text="Play"
              fullWidth
            />

            <Button
              text="Close and skip intro next time"
              size="medium"
              textOnly
              onPress={() => {
                updateGameSettings({ showIntro: false });
                setShowIntro(false);
              }}
              uppercase={false}
            />
          </ScrollView>
        </View>
      </Animated.View>
    </>
  ) : null;
}
