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
  rgba,
} from "@/styles/styles";
import { usePathname } from "expo-router";
import { Animated, ScrollView, View } from "react-native";
import { Button } from "../Button/Button";
import {
  getConstrainedUiWidth,
  useResponsiveUiLayoutFromWidth,
} from "@/hooks/useResponsiveLayout";
import { useViewportDimensions } from "@/hooks/useViewportDimensions";

interface Props {
  setShowMenu: (show: boolean) => void;
  showIntro: boolean | undefined;
  setShowIntro: (show: boolean | undefined) => void;
}

export function GameIntro({ showIntro, setShowIntro, setShowMenu }: Props) {
  const pathname = normalizeGamePath(usePathname());
  const gameInfo = getGameInfo(pathname);
  const { width: screenWidthActual } = useViewportDimensions();
  const ui = useResponsiveUiLayoutFromWidth(screenWidthActual);

  const containerWidth = getConstrainedUiWidth(
    screenWidthActual,
    ui.contentMaxWidth,
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
              backgroundColor: Colors.K900,
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
                size="sm"
                textOnly
                uppercase={false}
                style={{ marginTop: 10 }}
              />
            </View>

            <Button
              onPress={() => {
                setShowIntro(false);
              }}
              size="xl"
              text="Play"
              fullWidth
            />

            <Button
              text="Don't show again (for this game)"
              size="sm"
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
