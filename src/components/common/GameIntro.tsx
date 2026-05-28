import { useState, useEffect } from "react";
import { Animated, Text, View } from "react-native";
import { useFade } from "@/hooks/useFade";
import { menuStyles } from "@/styles/menuStyles";
import { textStyles } from "@/styles/textStyles";
import { Button } from "../Button/Button";
import { SettingControl } from "./SettingControl";
import { GameMenuInfo } from "@/data/games-data";
import { GameSettings, getGameInfo, normalizeGamePath } from "@/data/game-menu";
import { usePathname } from "expo-router";
import { useGameSettings } from "@/hooks/useGameSettings";

interface Props {
  setShowMenu: (show: boolean) => void;
  isLoaded: boolean;
}

export function GameIntro({ isLoaded, setShowMenu }: Props) {
  const pathname = normalizeGamePath(usePathname());
  const gameInfo = getGameInfo(pathname);

  const [showIntro, setShowIntro] = useState(false);
  const { settings: gameSettings, updateSettings: updateGameSettings } =
    useGameSettings(pathname);

  const { isRendered: renderIntro, opacity: introOpacity } = useFade(
    showIntro,
    300,
  );

  useEffect(() => {
    if (gameSettings?.showIntro) {
      setShowIntro(true);
    }
  }, [gameSettings]);

  return showIntro && renderIntro ? (
    <>
      {/* Overlay */}
      <Animated.View
        style={[menuStyles.wlmOverlay, { opacity: introOpacity }]}
      />

      {/* Intro box */}
      <Animated.View style={[menuStyles.intro, { opacity: introOpacity }]}>
        <View style={[menuStyles.introHowToPlay]}>
          <Text style={textStyles.h1}>How to Play</Text>

          {gameInfo.howToPlay.map((info, key) => (
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
