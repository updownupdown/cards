import { Text } from "@/components/common/Text";
import { RichText } from "@/components/common/RichText";
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
import { LinearGradient } from "expo-linear-gradient";
import { useGameZoneBackground } from "@/hooks/useGameZoneBackground";

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
  const { cardBg } = useGameZoneBackground();

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
              backgroundColor: rgba(Colors.K950, 0.95),
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

              <RichText
                content={gameInfo.briefRules}
                size="sm"
                weight={300}
                gap={12}
              />

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
