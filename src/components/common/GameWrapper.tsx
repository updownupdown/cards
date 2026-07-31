import {
  clearLastGameSession,
  GameSettings,
  getGameInfo,
  normalizeGamePath,
  recordAttempt,
  recordResult,
} from "@/data/game-menu";
import { DEFAULT_GAME_BACKGROUND } from "@/data/games-data";
import { useFade } from "@/hooks/useFade";
import { useGameSettings } from "@/hooks/useGameSettings";
import { useResponsiveUiLayoutFromWidth } from "@/hooks/useResponsiveLayout";
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
import { Animated, ImageBackground, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "../Button/Button";
import GameModal from "../Modals/GameModal";
import { LoadingOverlay } from "./LoadingOverlay";
import { ResetButton } from "./ResetButton";
import { TipsBox } from "./TipsBox";
import { WinLoseBox } from "./WinLoseBox";
import { RulesModal } from "../Modals/RulesModal";

interface Props {
  isLoaded?: boolean;
  ended: boolean;
  won: boolean;
  score?: number | string;
  winLoseMessage?: string;
  reset: () => void;
  children: React.ReactNode;
  /** Current tip phase key; maps to gameInfo.tip[phase]. */
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
  const ui = useResponsiveUiLayoutFromWidth(viewportWidth, viewportHeight);
  const { settings, isLoading } = useGameSettings(pathname);
  const spacing = (value: number) => value * ui.scale;

  const [showMenu, setShowMenu] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [tipsDismissed, setTipsDismissed] = useState(false);

  // Wait for settings before deciding whether the tips box should appear.
  const hasPlayedGame =
    settings && (settings.stats.wins > 0 || settings.stats.losses > 0);
  const showTipsBox = !isLoading && !hasPlayedGame && !tipsDismissed;

  const tipsFade = useFade(showTipsBox);
  const headerFade = useFade(!showTipsBox);

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
  const background = gameInfo.background ?? DEFAULT_GAME_BACKGROUND;

  return (
    <>
      <LoadingOverlay isLoaded={!!isLoaded} />

      {tipsFade.isRendered && (
        <Animated.View
          style={{
            position: "absolute",
            zIndex: LayerZIndexes.tipsContainer,
            top: tipsFade.opacity.interpolate({
              inputRange: [0, 1],
              outputRange: [
                -100,
                insets.top + spacing(layoutDims.pagePadding / 2),
              ],
            }),
            right: 0,
            left: 0,
            opacity: tipsFade.opacity,
            pointerEvents: "box-none",
          }}
        >
          <TipsBox
            onClose={() => setTipsDismissed(true)}
            showRulesModal={() => setShowRulesModal(true)}
          />
        </Animated.View>
      )}

      {showRulesModal && (
        <RulesModal
          onClose={() => setShowRulesModal(false)}
          showMenu={() => setShowMenu(true)}
        />
      )}

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
          showRulesModal={() => setShowRulesModal(true)}
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
          source={background.source}
          resizeMode="cover"
          blurRadius={3}
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
            pointerEvents: "none",
            position: "absolute",
            zIndex: LayerZIndexes.boardBackgroundOverlay,
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor,
            opacity: 0.6,
          }}
        />

        {/* Game header */}
        <Animated.View
          style={{
            opacity: headerFade.opacity,
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
                boxShadow: `${spacing(1)}px ${spacing(2)}px ${spacing(6)}px ${rgba(Colors.black, 0.2)}, ${spacing(2)}px ${spacing(4)}px ${spacing(10)}px ${rgba(
                  Colors.black,
                  0.2,
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
                setShowRulesModal(true);
              }}
              iconName={"instructions"}
              iconColor={titleColor}
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
        </Animated.View>

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
