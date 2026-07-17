import { GAME_BACKGROUND_ASSETS } from "@/data/game-backgrounds";
import {
  clearLastGameSession,
  GameSettings,
  getGameInfo,
  normalizeGamePath,
  recordAttempt,
  recordResult,
} from "@/data/game-menu";
import { DEFAULT_GAME_BACKGROUND } from "@/data/games-data";
import { useGameSettings } from "@/hooks/useGameSettings";
import { useResponsiveUiLayoutFromWidth } from "@/hooks/useResponsiveLayout";
import { useTipsBoxLayout } from "@/hooks/useTipsLayout";
import { useViewportDimensions } from "@/hooks/useViewportDimensions";
import { flexStyles } from "@/styles/flexStyles";
import { Layers } from "@/styles/layers";
import {
  floatingBarDims,
  getGameHeaderBottom,
  menuStyles,
} from "@/styles/menuStyles";
import {
  Colors,
  HeaderButtonIconSize,
  HomePadding,
  rgba,
} from "@/styles/styles";
import { router, usePathname } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { ImageBackground, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "../Button/Button";
import GameModal from "../Modals/GameModal";
import { LoadingOverlay } from "./LoadingOverlay";
import { ResetButton } from "./ResetButton";
import { TipsBox } from "./TipsBox";
import { WinLoseBox } from "./WinLoseBox";

interface Props {
  isLoaded?: boolean;
  ended: boolean;
  won: boolean;
  score?: number | string;
  winLoseMessage?: string;
  reset: () => void;
  children: React.ReactNode;
  /** Current tip phase key; maps to gameInfo.tip[phase]. */
  tipPhase?: string;
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
  tipPhase,
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

  const { updateSettings } = useGameSettings(pathname);

  function setTipsMode(value: boolean) {
    void updateSettings({ tipsMode: value } as Partial<GameSettings>);
  }

  const { active } = useTipsBoxLayout();

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
  const headerHeight = getGameHeaderBottom(insets.top, ui.scale);
  const backgroundSource =
    GAME_BACKGROUND_ASSETS[gameInfo.background ?? DEFAULT_GAME_BACKGROUND];

  return (
    <>
      <LoadingOverlay isLoaded={!!isLoaded} />

      <TipsBox phase={tipPhase} topOffset={headerHeight} />

      <WinLoseBox
        gameEnded={ended}
        headerBottom={headerHeight}
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

        {/* Background color overlay */}
        <View
          style={{
            position: "absolute",
            zIndex: Layers.boardBackgroundOverlay,
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: rgba(backgroundColor, 1),
            pointerEvents: "none",
            mixBlendMode: "color",
          }}
        />

        {/* Game header */}
        <View
          style={{
            position: "relative",
            zIndex: Layers.header,
            width: "100%",
            maxWidth: ui.contentMaxWidth,
            alignSelf: "center",
            padding: spacing(HomePadding / 2),
          }}
        >
          <View
            style={[
              flexStyles.rowCentered,
              {
                width: "100%",
                gap: spacing(floatingBarDims.gap),
                height: spacing(floatingBarDims.height),
                paddingHorizontal: spacing(HomePadding / 2),
                borderRadius: spacing(floatingBarDims.height / 2),
                backgroundColor: rgba(backgroundColor, 0.8),
                boxShadow: `${spacing(1)}px ${spacing(2)}px ${spacing(6)}px ${rgba(Colors.black, 0.3)}, ${spacing(2)}px ${spacing(4)}px ${spacing(10)}px ${rgba(
                  Colors.black,
                  0.3,
                )}`,
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
              iconName={"home"}
              iconColor={titleColor}
              iconSize={spacing(HeaderButtonIconSize)}
            />

            <Button
              style={[menuStyles.headerButton]}
              onPress={() => setTipsMode(!active)}
              iconName={"info-outline"}
              iconColor={active ? rgba(Colors.white, 0.3) : titleColor}
              iconSize={spacing(HeaderButtonIconSize)}
            />

            {handleUndo && (
              <Button
                style={[menuStyles.headerButton]}
                onPress={handleUndo}
                iconName="undo"
                iconColor={canUndo ? titleColor : rgba(Colors.white, 0.3)}
                iconSize={spacing(HeaderButtonIconSize)}
                disabled={!canUndo}
              />
            )}

            <ResetButton
              reset={reset}
              iconColor={titleColor}
              pressedIconColor={rgba(titleColor, 0.7)}
              iconSize={spacing(HeaderButtonIconSize)}
            />

            <Button
              style={[menuStyles.headerButton]}
              onPress={() => setShowMenu(true)}
              iconName="more-vertical"
              iconColor={titleColor}
              iconSize={spacing(HeaderButtonIconSize)}
            />
          </View>
        </View>

        <View
          style={[
            flexStyles.colCentered,
            flexStyles.fullWidth,
            {
              position: "relative",
              zIndex: Layers.boardContent,
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
