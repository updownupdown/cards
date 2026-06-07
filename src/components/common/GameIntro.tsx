import { getGameInfo, normalizeGamePath } from "@/data/game-menu";
import { useFade } from "@/hooks/useFade";
import { useGameSettings } from "@/hooks/useGameSettings";
import { menuStyles } from "@/styles/menuStyles";
import { textStyles } from "@/styles/textStyles";
import { usePathname } from "expo-router";
import { useEffect } from "react";
import { Animated, Text, View } from "react-native";
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

  useEffect(() => {
    if (gameSettings !== undefined) {
      setShowIntro(gameSettings.showIntro);
    }
  }, [gameSettings]);

  return renderIntro ? (
    <>
      {/* Overlay */}
      <Animated.View
        style={[menuStyles.wlmOverlay, { opacity: introOpacity }]}
      />

      {/* Intro box */}
      <Animated.View style={[menuStyles.intro, { opacity: introOpacity }]}>
        <View style={[menuStyles.introHowToPlay]}>
          <Text style={textStyles.h1}>How to Play</Text>

          {gameInfo.briefRules.map((info, key) => (
            <Text key={`info-${key}`} style={[menuStyles.introHowToPlayText]}>
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

        <SettingControl
          label="Skip intro next time"
          type="boolean"
          booleanType="checkbox"
          value={!gameSettings?.showIntro}
          onChange={(val) => updateGameSettings({ showIntro: !val })}
        />
      </Animated.View>
    </>
  ) : null;
}
