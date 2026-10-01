import { preloadCardImageSet } from "@/components/Cards/CardAssets";
import { DeviceRotateHint } from "@/components/common/DeviceRotateHint";
import { GAME_BACKGROUNDS } from "@/data/game-backgrounds";
import type { WildGameDefinition } from "@/data/wild-cards";
import { useGlobalSettings } from "@/hooks/useGlobalSettings";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useViewportDimensions } from "@/hooks/useViewportDimensions";
import { rgba } from "@/styles/styles";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fitStage } from "./engine/stage";
import { WILD_GAME_COMPONENTS } from "./games";
import { createHud, WildHeader } from "./hud";

const KEEP_AWAKE_TAG = "wild-cards";

/**
 * A Wild Card game: its background picture, the game itself scaled to fit
 * the screen, and the header. No rules, no menu; each game explains itself
 * through its prompt.
 */
export function WildGameScreen({ game }: { game: WildGameDefinition }) {
  const { width, height } = useViewportDimensions();
  const insets = useSafeAreaInsets();
  const { spacing } = useResponsiveMetrics();
  const { settings, isLoading } = useGlobalSettings();
  const [hud] = useState(createHud);

  useEffect(() => () => hud.dispose(), [hud]);

  // Cards are dealt at random, so every face is loaded up front.
  useEffect(() => {
    preloadCardImageSet("small").catch(() => {});
  }, []);

  useEffect(() => {
    if (isLoading || !settings.keepScreenAwake) return;
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
    return () => {
      deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
    };
  }, [isLoading, settings.keepScreenAwake]);

  const onBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  const GameComponent = WILD_GAME_COMPONENTS[game.id];
  const stage =
    width > 0 && height > 0
      ? fitStage({
          width,
          height,
          orientation: game.orientation,
          headerHeight: insets.top + spacing(52),
          bottomInset: insets.bottom,
        })
      : null;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor:
          typeof game.background === "string"
            ? "#07080d"
            : game.background.color,
        overflow: "hidden",
      }}
    >
      {typeof game.background === "string" && (
        <>
          <Image
            source={GAME_BACKGROUNDS[game.background].source}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={200}
          />
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: rgba("#07080d", 0.42) },
            ]}
          />
        </>
      )}
      {stage && (
        // A new size (the phone turned) starts the game afresh.
        <GameComponent
          key={`${Math.round(stage.W)}x${Math.round(stage.H)}`}
          stage={stage}
          hud={hud}
        />
      )}
      <WildHeader hud={hud} insetTop={insets.top} onBack={onBack} />
      <DeviceRotateHint orientation={game.orientation} />
    </View>
  );
}
