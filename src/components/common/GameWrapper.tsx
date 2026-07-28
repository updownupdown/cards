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
import {
  Colors,
  rgba,
  layoutDims,
  LayerZIndexes,
  getHeaderHeightWithInset,
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
  openMenu?: boolean;
  onMenuClose?: () => void;
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
  openMenu = false,
  onMenuClose,
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
  const [tipsExpandRequest, setTipsExpandRequest] = useState(0);

  const { updateSettings } = useGameSettings(pathname);

  function setTipsMode(value: boolean) {
    void updateSettings({ tipsMode: value } as Partial<GameSettings>);
  }

  const { active: tipsActive } = useTipsBoxLayout();

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
  const headerHeight = getHeaderHeightWithInset(insets.top, ui.scale);
  const backgroundSource =
    GAME_BACKGROUND_ASSETS[gameInfo.background ?? DEFAULT_GAME_BACKGROUND];

  return (
    <>
      <LoadingOverlay isLoaded={!!isLoaded} />

      <TipsBox
        phase={tipPhase}
        topOffset={headerHeight}
        expandRequest={tipsExpandRequest}
      />

      <WinLoseBox
        gameEnded={ended}
        headerBottom={headerHeight}
        won={won}
        score={score}
        reset={reset}
        message={winLoseMessage}
        handleUndo={handleUndo}
      />

      {(showMenu || openMenu) && (
        <GameModal
          onClose={() => {
            setShowMenu(false);
            onMenuClose?.();
          }}
          onReloadGame={reset}
        />
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
            zIndex: LayerZIndexes.boardBackgroundOverlay,
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
            zIndex: LayerZIndexes.header,
            width: "100%",
            maxWidth: ui.contentMaxWidth,
            alignSelf: "center",
            padding: spacing(layoutDims.pagePadding / 2),
          }}
        >
          <View
            style={[
              flexStyles.rowCentered,
              {
                width: "100%",
                height: spacing(layoutDims.menuBarHeight),
                paddingHorizontal: spacing(layoutDims.pagePadding / 2),
                borderRadius: spacing(layoutDims.menuBarHeight / 2),
                backgroundColor: rgba(backgroundColor, 0.8),
                boxShadow: `${spacing(1)}px ${spacing(2)}px ${spacing(6)}px ${rgba(Colors.black, 0.3)}, ${spacing(2)}px ${spacing(4)}px ${spacing(10)}px ${rgba(
                  Colors.black,
                  0.3,
                )}`,
              },
            ]}
          >
            <Button
              headerButton
              onPress={async () => {
                try {
                  await clearLastGameSession();
                } finally {
                  router.push("/");
                }
              }}
              iconName={"home"}
              iconColor={titleColor}
            />

            <Button
              headerButton
              onPress={() => {
                if (!tipsActive) {
                  setTipsExpandRequest((request) => request + 1);
                  setTipsMode(true);
                } else {
                  setTipsMode(false);
                }
              }}
              iconName={"instructions"}
              iconColor={tipsActive ? rgba(Colors.white, 0.3) : titleColor}
            />

            {handleUndo && (
              <Button
                headerButton
                onPress={handleUndo}
                iconName="undo"
                iconColor={canUndo ? titleColor : rgba(Colors.white, 0.3)}
                disabled={!canUndo}
              />
            )}

            <ResetButton
              reset={reset}
              iconColor={titleColor}
              pressedIconColor={rgba(titleColor, 0.7)}
            />

            <Button
              headerButton
              onPress={() => setShowMenu(true)}
              iconName="more-vertical"
              iconColor={titleColor}
            />
          </View>
        </View>

        <View
          style={[
            flexStyles.colCentered,
            flexStyles.fullWidth,
            {
              position: "relative",
              zIndex: LayerZIndexes.boardContent,
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
