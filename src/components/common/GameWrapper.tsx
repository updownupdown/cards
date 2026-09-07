import { BackgroundAnimation } from "@/animations/BackgroundAnimation";
import {
  clearLastGameSession,
  getGameInfo,
  normalizeGamePath,
  recordAttempt,
  recordResult,
  undoRecordedLoss,
} from "@/data/game-menu";
import { recordNodesWin, type NodesWinResult } from "@/data/nodes-progress";
import { DEFAULT_GAME_BACKGROUND } from "@/data/games-data";
import { useFade } from "@/hooks/useFade";
import { useGameSettings } from "@/hooks/useGameSettings";
import { useGlobalSettings } from "@/hooks/useGlobalSettings";
import { getActiveGameSessionId } from "@/hooks/useStateManager";
import {
  TABLET_BREAKPOINT,
  useResponsiveUiLayoutFromWidth,
} from "@/hooks/useResponsiveLayout";
import { useViewportDimensions } from "@/hooks/useViewportDimensions";
import { selectNodesHomeTab } from "@/components/Home/home-view-state";
import { NodesWinOverlay } from "@/components/Nodes/NodesWinOverlay";
import { flexStyles } from "@/styles/flexStyles";
import {
  Colors,
  getHeaderHeightWithInset,
  LayerZIndexes,
  layoutDims,
  rgba,
} from "@/styles/styles";
import { router, useLocalSearchParams, usePathname } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Animated, ImageBackground, Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "../Button/Button";
import GameModal from "../Modals/GameModal";
import { RulesModal } from "../Modals/RulesModal";
import { DeviceRotateHint } from "./DeviceRotateHint";
import { LoadingOverlay } from "./LoadingOverlay";
import { ResetButton } from "./ResetButton";
import { TipsBox } from "./TipsBox";
import { WinLoseBox } from "./WinLoseBox";

const TIPS_MORPH_DURATION = 350;

export type GameOutcome = "playing" | "won" | "lost";

interface Props {
  isLoaded?: boolean;
  outcome: GameOutcome;
  score?: number | string;
  winLoseMessage?: string;
  reset: () => void;
  children: React.ReactNode;
  /** Current tip phase key; maps to gameInfo.tip[phase]. */
  canUndo?: boolean;
  undo?: () => void;
  openMenu?: boolean;
  onMenuClose?: () => void;
  showDeviceRotateHint?: boolean;
}

export const GameWrapper = ({
  isLoaded,
  outcome,
  score,
  winLoseMessage,
  reset,
  children,
  canUndo,
  undo: handleUndo,
  openMenu = false,
  onMenuClose,
  showDeviceRotateHint = false,
}: Props) => {
  const pathname = normalizeGamePath(usePathname());
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isNodesMode = mode === "nodes";
  const gameInfo = getGameInfo(pathname);
  const insets = useSafeAreaInsets();
  const { width: viewportWidth, height: viewportHeight } =
    useViewportDimensions();
  const ui = useResponsiveUiLayoutFromWidth(viewportWidth, viewportHeight);
  const { settings, isLoading } = useGameSettings(pathname);
  const { settings: globalSettings } = useGlobalSettings();
  const spacing = (value: number) => value * ui.scale;
  const [isDevWin, setIsDevWin] = useState(false);
  const displayedOutcome = isDevWin ? "won" : outcome;
  const ended = displayedOutcome !== "playing";
  const won = displayedOutcome === "won";
  const canUndoLoss = outcome === "lost" && canUndo && !!handleUndo;
  const handleReset = () => {
    setIsDevWin(false);
    reset();
  };

  const handleLossUndo = canUndoLoss
    ? async () => {
        const sessionId = getActiveGameSessionId(pathname);
        try {
          if (sessionId) {
            await undoRecordedLoss(pathname, sessionId);
          }
        } finally {
          handleUndo();
        }
      }
    : undefined;

  const [showMenu, setShowMenu] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [nodesWinResult, setNodesWinResult] = useState<NodesWinResult | null>(
    null,
  );
  const [tipsDismissed, setTipsDismissed] = useState(false);
  const tipsMorphProgress = useRef(new Animated.Value(0)).current;
  const instructionsHighlight = useRef(new Animated.Value(0)).current;

  // Wait for settings before deciding whether the tips box should appear.
  const hasPlayedGame =
    settings && (settings.stats.wins > 0 || settings.stats.losses > 0);
  const showTipsBox =
    !isLoading &&
    globalSettings.showTipsForNewGames &&
    !hasPlayedGame &&
    !tipsDismissed;

  const tipsFade = useFade(showTipsBox, TIPS_MORPH_DURATION);
  const headerFade = useFade(!showTipsBox, TIPS_MORPH_DURATION);

  useEffect(() => {
    if (showTipsBox) {
      tipsMorphProgress.setValue(1);
      return;
    }

    Animated.timing(tipsMorphProgress, {
      toValue: 0,
      duration: TIPS_MORPH_DURATION,
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, [showTipsBox, tipsMorphProgress]);

  useEffect(() => {
    if (!tipsDismissed) return;

    instructionsHighlight.setValue(0);
    Animated.timing(instructionsHighlight, {
      toValue: 1,
      duration: TIPS_MORPH_DURATION,
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, [instructionsHighlight, tipsDismissed]);

  // Record stats
  const resultStateRef = useRef({ pathname, outcome: displayedOutcome });
  const attemptedPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (attemptedPathRef.current === pathname) return;
    attemptedPathRef.current = pathname;

    recordAttempt(pathname).catch(() => {});
  }, [pathname]);

  useEffect(() => {
    let active = true;
    const previous = resultStateRef.current;
    const didEnd =
      previous.pathname === pathname &&
      previous.outcome === "playing" &&
      displayedOutcome !== "playing";

    resultStateRef.current = { pathname, outcome: displayedOutcome };
    if (displayedOutcome === "playing") {
      setNodesWinResult(null);
    }
    if (!didEnd) {
      return () => {
        active = false;
      };
    }

    const sessionId = getActiveGameSessionId(pathname);
    recordResult(pathname, displayedOutcome === "won", score, sessionId).catch(
      () => {},
    );
    if (isNodesMode && displayedOutcome === "won") {
      recordNodesWin(pathname, sessionId)
        .then((result) => {
          if (
            active &&
            !result.duplicate &&
            (result.awardedReward || result.newlyUnlockedPaths.length > 0)
          ) {
            setNodesWinResult(result);
          }
        })
        .catch(() => {});
    }

    return () => {
      active = false;
    };
  }, [displayedOutcome, isNodesMode, pathname, score]);

  if (!gameInfo) return null;

  const titleColor = gameInfo.gameColorPale;
  const backgroundColor = gameInfo.gameColorDark;
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
            top: insets.top + spacing(layoutDims.pagePadding / 2),
            right: 0,
            left: 0,
            opacity: tipsFade.opacity,
            pointerEvents: "box-none",
          }}
        >
          <TipsBox
            onClose={() => setTipsDismissed(true)}
            showRulesModal={() => setShowRulesModal(true)}
            morphProgress={tipsMorphProgress}
          />
        </Animated.View>
      )}

      {showRulesModal && (
        <RulesModal onClose={() => setShowRulesModal(false)} />
      )}

      <WinLoseBox
        gameEnded={ended}
        headerBottom={headerHeight}
        won={won}
        score={score}
        reset={handleReset}
        message={winLoseMessage}
        handleUndo={handleLossUndo}
        isNodesMode={isNodesMode}
        onExit={async () => {
          setNodesWinResult(null);
          try {
            await clearLastGameSession();
          } finally {
            if (isNodesMode) selectNodesHomeTab();
            router.push(isNodesMode ? "/?tab=nodes" : "/");
          }
        }}
      />
      {nodesWinResult && (
        <NodesWinOverlay
          path={pathname}
          result={nodesWinResult}
          onClose={() => setNodesWinResult(null)}
        />
      )}

      {(showMenu || openMenu) && (
        <GameModal
          onClose={() => {
            setShowMenu(false);
            onMenuClose?.();
          }}
          onReloadGame={handleReset}
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

        {globalSettings.showAnimations && (
          <View
            style={{
              position: "absolute",
              zIndex: LayerZIndexes.boardAnimation,
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              overflow: "hidden",
              pointerEvents: "none",
            }}
          >
            <BackgroundAnimation
              animation={gameInfo.animation}
              width={viewportWidth}
              height={viewportHeight}
            />
          </View>
        )}

        <DeviceRotateHint enabled={showDeviceRotateHint} />

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
              accessibilityLabel={isNodesMode ? "Nodes" : "Home"}
              onPress={async () => {
                try {
                  await clearLastGameSession();
                } finally {
                  if (isNodesMode) selectNodesHomeTab();
                  router.push(isNodesMode ? "/?tab=nodes" : "/");
                }
              }}
              iconName={isNodesMode ? "nodes" : "home"}
              iconColor={titleColor}
              style={{ flex: 1, paddingHorizontal: 0 }}
            />

            {/* Local only instant win test button */}
            {__DEV__ && (
              <Button
                headerButton
                accessibilityLabel="Instant win"
                onPress={() => setIsDevWin(true)}
                iconName="trophy"
                iconColor={titleColor}
                disabled={ended}
                style={{ flex: 1, paddingHorizontal: 0 }}
              />
            )}

            <View
              style={{
                position: "relative",
                height: "100%",
                alignItems: "center",
                justifyContent: "center",
                flex: 1,
                paddingHorizontal: 0,
              }}
            >
              <View
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  bottom: 0,
                  left: 0,
                  alignItems: "center",
                  justifyContent: "center",
                  pointerEvents: "none",
                }}
              >
                <Animated.View
                  style={{
                    width: spacing(layoutDims.menuButtonSize),
                    height: spacing(layoutDims.menuButtonSize),
                    borderRadius: spacing(layoutDims.menuButtonSize / 2),
                    backgroundColor: titleColor,
                    opacity: instructionsHighlight.interpolate({
                      inputRange: [0, 0.2, 0.7, 1],
                      outputRange: [0, 0.8, 0.7, 0],
                    }),
                    transform: [
                      {
                        scale: instructionsHighlight.interpolate({
                          inputRange: [0, 0.6, 0.7, 1],
                          outputRange: [1.5, 1.5, 0.8, 0],
                        }),
                      },
                    ],
                  }}
                />
              </View>

              <Button
                headerButton
                onPress={() => {
                  setShowRulesModal(true);
                }}
                iconName={"instructions"}
                iconColor={titleColor}
              />
            </View>

            <Button
              headerButton
              onPress={() => {
                handleUndo?.();
              }}
              iconName="undo"
              iconColor={
                !ended && canUndo ? titleColor : rgba(Colors.white, 0.3)
              }
              disabled={ended || !canUndo || handleUndo === undefined}
              style={{ flex: 1, paddingHorizontal: 0 }}
            />

            <ResetButton
              reset={handleReset}
              iconColor={titleColor}
              pressedIconColor={rgba(titleColor, 0.7)}
            />

            <Button
              headerButton
              onPress={() => setShowMenu(true)}
              iconName="more-vertical"
              iconColor={titleColor}
              style={{ flex: 1, paddingHorizontal: 0 }}
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
