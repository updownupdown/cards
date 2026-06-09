import { getGameInfo, normalizeGamePath } from "@/data/game-menu";
import { useFade } from "@/hooks/useFade";
import { useGameSettings } from "@/hooks/useGameSettings";
import { flexStyles } from "@/styles/flexStyles";
import { headerHeight } from "@/styles/layoutStyles";
import { menuStyles } from "@/styles/menuStyles";
import { modalBorderRadius, modalShadow } from "@/styles/modalStyles";
import { Colors, ContentSidePadding, rgba } from "@/styles/styles";
import { textStyles } from "@/styles/textStyles";
import { usePathname } from "expo-router";
import { Animated, ScrollView, Text, View } from "react-native";
import { Button } from "../Button/Button";
import { SettingControl } from "./SettingControl";

interface Props {
  setShowMenu: (show: boolean) => void;
  showIntro: boolean | undefined;
  setShowIntro: (show: boolean | undefined) => void;
}

export function GameIntro({ showIntro, setShowIntro, setShowMenu }: Props) {
  const pathname = normalizeGamePath(usePathname());
  const gameInfo = getGameInfo(pathname);

  const { settings: gameSettings, updateSettings: updateGameSettings } =
    useGameSettings(pathname);

  const { isRendered: renderIntro, opacity: introOpacity } = useFade(
    showIntro === true,
    300,
  );

  return renderIntro ? (
    <>
      {/* Overlay */}
      <Animated.View
        style={[menuStyles.wlmOverlay, { opacity: introOpacity }]}
      />

      {/* Intro box */}
      <Animated.View
        style={[
          flexStyles.colCentered,
          {
            opacity: introOpacity,
            position: "absolute",
            zIndex: 10,
            top: headerHeight,
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
            },
          ]}
        >
          <ScrollView
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
                flexStyles.gap20,
              ]}
            >
              <Text style={textStyles.h1}>How to Play</Text>
              {gameInfo.briefRules.map((info, key) => (
                <Text
                  key={`info-${key}`}
                  style={[menuStyles.introHowToPlayText]}
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
                size="text"
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
              size="text"
              onPress={() => {
                updateGameSettings({ showIntro: false });
                setShowIntro(false);
              }}
            />
          </ScrollView>
        </View>
      </Animated.View>
    </>
  ) : null;
}
