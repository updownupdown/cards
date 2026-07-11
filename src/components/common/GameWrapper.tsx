import { Text } from "@/components/common/Text";
import {
  clearLastGameSession,
  getGameInfo,
  normalizeGamePath,
  recordAttempt,
  recordResult,
} from "@/data/game-menu";
import { useResponsiveUiLayoutFromWidth } from "@/hooks/useResponsiveLayout";
import { useViewportDimensions } from "@/hooks/useViewportDimensions";
import { flexStyles } from "@/styles/flexStyles";
import { menuStyles } from "@/styles/menuStyles";
import {
  ContentSidePadding,
  HeaderButtonIconSize,
  rgba,
} from "@/styles/styles";
import { router, usePathname } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { ImageBackground, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GAME_BACKGROUND_ASSETS } from "@/data/game-backgrounds";
import { Button } from "../Button/Button";
import GameModal from "../Modals/GameModal";
import { GameIntro } from "./GameIntro";
import { LoadingOverlay } from "./LoadingOverlay";
import { ResetButton } from "./ResetButton";
import { WinLoseBox } from "./WinLoseBox";
import { DEFAULT_GAME_BACKGROUND } from "@/data/games-data";
import { lightenHexColor } from "@/utils/utils";

interface Props {
  isLoaded?: boolean;
  ended: boolean;
  won: boolean;
  score?: number | string;
  winLoseMessage?: string;
  reset: () => void;
  children: React.ReactNode;
  showIntro: boolean | undefined;
  setShowIntro: (show: boolean | undefined) => void;
  canUndo?: boolean;
  undo?: () => void;
}

export const GameWrapper = ({
  isLoaded,
  ended,
  won,
  score,
  winLoseMessage,
  reset,
  children,
  showIntro,
  setShowIntro,
  canUndo,
  undo: handleUndo,
}: Props) => {
  const pathname = normalizeGamePath(usePathname());
  const gameInfo = getGameInfo(pathname);
  const insets = useSafeAreaInsets();
  const { width: viewportWidth, height: viewportHeight } =
    useViewportDimensions();
  const ui = useResponsiveUiLayoutFromWidth(
    Math.min(viewportWidth, viewportHeight),
  );
  const spacing = (value: number) => value * ui.scale;

  const [showMenu, setShowMenu] = useState(false);

  // Record stats
  const prevEndedRef = useRef(false);
  const attemptedPathRef = useRef<string | null>(null);

  useEffect(() => {
    prevEndedRef.current = false;
  }, [pathname]);

  useEffect(() => {
    if (attemptedPathRef.current === pathname) return;
    attemptedPathRef.current = pathname;

    recordAttempt(pathname).catch(() => {});
  }, [pathname]);

  useEffect(() => {
    if (!ended || prevEndedRef.current) return;
    prevEndedRef.current = true;
    if (typeof won !== "boolean") return;

    recordResult(pathname, won, score).catch(() => {});
  }, [ended, pathname, score, won]);

  if (!gameInfo) return null;

  const titleColor = gameInfo.cardColorText;
  const backgroundColor = gameInfo.cardColorBg;
  const headerHeight = ui.gameHeaderHeight + insets.top;
  const backgroundSource =
    GAME_BACKGROUND_ASSETS[gameInfo.background ?? DEFAULT_GAME_BACKGROUND];

  return (
    <>
      <LoadingOverlay isLoaded={!!isLoaded} />

      <GameIntro
        showIntro={showIntro}
        setShowIntro={setShowIntro}
        setShowMenu={setShowMenu}
      />

      <WinLoseBox
        gameEnded={ended}
        won={won}
        score={score}
        reset={reset}
        message={winLoseMessage}
        handleUndo={handleUndo}
      />

      {showMenu && (
        <GameModal onClose={() => setShowMenu(false)} onReloadGame={reset} />
      )}

      <View
        style={{
          flex: 1,
          position: "relative",
          backgroundColor,
        }}
      >
        <ImageBackground
          source={backgroundSource}
          resizeMode="repeat"
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            width: "100%",
            height: "100%",
            opacity: 1,
          }}
        />

        <View
          style={{
            position: "absolute",
            zIndex: 1,
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: rgba(backgroundColor, 1),
            pointerEvents: "none",
            mixBlendMode: "color",
          }}
        />

        <View
          style={[
            {
              position: "relative",
              zIndex: 12, // above the game overlay
              ...flexStyles.rowCentered,
              justifyContent: "space-between",
              width: "100%",
              height: headerHeight,
              paddingTop: insets.top + spacing(ContentSidePadding * 0.3),
              paddingBottom: spacing(ContentSidePadding * 0.5),
              paddingHorizontal: spacing(ContentSidePadding * 0.75),
              backgroundColor: "transparent",
            },
          ]}
        >
          <Button
            style={[menuStyles.headerButton]}
            onPress={async () => {
              try {
                await clearLastGameSession();
              } finally {
                router.push("/");
              }
            }}
            iconName={"arrow-back"}
            iconColor={titleColor}
            iconSize={spacing(HeaderButtonIconSize)}
          />

          <Text
            size="md"
            weight={400}
            color={titleColor}
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[
              {
                flex: 1,
                overflow: "hidden",
              },
            ]}
          >
            {gameInfo.title}
          </Text>

          {handleUndo && (
            <Button
              style={[menuStyles.headerButton]}
              textStyle={[menuStyles.headerButton]}
              onPress={handleUndo}
              iconName="undo"
              iconColor={canUndo ? titleColor : rgba(titleColor, 0.5)}
              iconSize={spacing(HeaderButtonIconSize)}
              disabled={!canUndo}
            />
          )}

          <ResetButton
            reset={reset}
            iconColor={titleColor}
            pressedIconColor={rgba(titleColor, 0.7)}
          />

          <Button
            style={[menuStyles.headerButton]}
            textStyle={[menuStyles.headerButton]}
            onPress={() => setShowMenu(true)}
            iconName="menu"
            iconColor={titleColor}
            iconSize={spacing(HeaderButtonIconSize)}
          />
        </View>

        <View
          style={[
            {
              position: "relative",
              zIndex: 2,
              ...flexStyles.colCentered,
              ...flexStyles.fullWidth,
              flex: 1,
              pointerEvents: "box-none",
            },
          ]}
        >
          {children}
        </View>
      </View>
    </>
  );
};
