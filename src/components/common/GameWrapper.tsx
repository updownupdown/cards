import { BackgroundAnimation } from "@/animations/BackgroundAnimation";
import {
  clearLastGameSession,
  getGameInfo,
  recordAttempt,
  recordResult,
  undoRecordedLoss,
} from "@/data/game-menu";
import { recordNodesWin, type NodesWinResult } from "@/data/nodes-progress";
import { DEFAULT_GAME_BACKGROUND } from "@/data/games-data";
import { useFade } from "@/hooks/useFade";
import { useGameSettings } from "@/hooks/useGameSettings";
import { useGlobalSettings } from "@/hooks/useGlobalSettings";
import {
  getActiveGameSessionId,
  getSessionPlayTimeMs,
} from "@/hooks/useStateManager";
import { maybeRequestStoreReview } from "@/utils/review-prompt";
import { useResponsiveUiLayoutFromWidth } from "@/hooks/useResponsiveLayout";
import { useViewportDimensions } from "@/hooks/useViewportDimensions";
import { haptics } from "@/utils/haptics";
import { selectNodesHomeTab } from "@/components/Home/home-view-state";
import { NodesWinOverlay } from "@/components/Nodes/NodesWinOverlay";
import { flexStyles } from "@/styles/flexStyles";
import {
  getHeaderHeightWithInset,
  LayerZIndexes,
  layoutDims,
} from "@/styles/styles";
import { router, useLocalSearchParams } from "expo-router";
import { useGamePath } from "@/hooks/useGamePath";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  BackHandler,
  ImageBackground,
  Platform,
  Pressable,
  View,
} from "react-native";
import { setBoardInputLocked } from "@/components/Cards/input-lock";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import GameModal from "../Modals/GameModal";
import { RulesModal } from "../Modals/RulesModal";
import { DeviceRotateHint } from "./DeviceRotateHint";
import { LoadingOverlay } from "./LoadingOverlay";
import { TipsBox } from "./TipsBox";
import { WinLoseBox } from "./WinLoseBox";
import { GameHeader } from "./GameHeader";
import { useStableCallback } from "@/hooks/useStableCallback";

const TIPS_MORPH_DURATION = 350;
const KEEP_AWAKE_TAG = "solosuite-game";
const KEEP_AWAKE_MS = 10 * 60 * 1000;
// Scene effects start after the game has loaded and its deal has played.
const SCENE_START_DELAY_MS = 1000;

export type GameOutcome = "playing" | "won" | "lost";

/**
 * Return to the home screen already underneath the game instead of pushing a
 * new one: pushing stacked another home (and kept the finished game mounted)
 * on every round trip, which added memory and background work over a session.
 */
function goHome(isNodesMode: boolean) {
  const href = isNodesMode ? "/?tab=nodes" : "/";
  if (router.canGoBack()) {
    router.dismissTo(href);
  } else {
    router.replace(href);
  }
}

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
  /** The game is auto-completing: block card input and undo meanwhile. */
  autoCompleting?: boolean;
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
  autoCompleting = false,
}: Props) => {
  const pathname = useGamePath();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isNodesMode = mode === "nodes";
  const gameInfo = getGameInfo(pathname);
  const insets = useSafeAreaInsets();
  const { width: viewportWidth, height: viewportHeight } =
    useViewportDimensions();
  const ui = useResponsiveUiLayoutFromWidth(viewportWidth, viewportHeight);
  const { settings, isLoading } = useGameSettings(pathname);
  const { settings: globalSettings, isLoading: isGlobalSettingsLoading } =
    useGlobalSettings();
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

  // Stable header callbacks, so the memoized header skips re-rendering when
  // only the board changes.
  const onHeaderHome = useStableCallback(async () => {
    try {
      await clearLastGameSession();
    } finally {
      if (isNodesMode) selectNodesHomeTab();
      goHome(isNodesMode);
    }
  });
  const onHeaderInstantWin = useStableCallback(() => setIsDevWin(true));
  const onHeaderRules = useStableCallback(() => setShowRulesModal(true));
  const onHeaderUndo = useStableCallback(() => handleUndo?.());
  const onHeaderReset = useStableCallback(handleReset);
  const onHeaderMenu = useStableCallback(() => setShowMenu(true));

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

  // Background effects wait for the game to load, and freeze while a modal
  // or overlay (menu, rules, tips, the win/lose box) covers the board.
  const [isSceneReady, setIsSceneReady] = useState(false);
  useEffect(() => {
    if (!isLoaded) return;
    const timer = setTimeout(() => setIsSceneReady(true), SCENE_START_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isLoaded]);
  const isScenePaused =
    showMenu ||
    openMenu ||
    showRulesModal ||
    !!nodesWinResult ||
    tipsFade.isRendered ||
    ended;

  useEffect(() => {
    setBoardInputLocked(autoCompleting);
    return () => setBoardInputLocked(false);
  }, [autoCompleting]);

  // "Keep screen awake during games": the screen stays on for 10 minutes after
  // the game opens or the board was last touched.
  const keepAwakeEnabled =
    globalSettings.keepScreenAwake && !isGlobalSettingsLoading;
  const keepAwakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keepAwakeActiveRef = useRef(false);

  const releaseKeepAwake = () => {
    if (keepAwakeTimerRef.current) clearTimeout(keepAwakeTimerRef.current);
    keepAwakeTimerRef.current = null;
    if (!keepAwakeActiveRef.current) return;
    keepAwakeActiveRef.current = false;
    deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
  };

  const extendKeepAwake = () => {
    if (!keepAwakeEnabled) return;
    if (!keepAwakeActiveRef.current) {
      keepAwakeActiveRef.current = true;
      activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
    }
    if (keepAwakeTimerRef.current) clearTimeout(keepAwakeTimerRef.current);
    keepAwakeTimerRef.current = setTimeout(releaseKeepAwake, KEEP_AWAKE_MS);
  };

  useEffect(() => {
    if (!keepAwakeEnabled) return;
    extendKeepAwake();
    return releaseKeepAwake;
  }, [keepAwakeEnabled]);
  const headerFade = useFade(!showTipsBox, TIPS_MORPH_DURATION);

  // Android's back button closes the quick-start tips first, instead of
  // leaving the game.
  useEffect(() => {
    if (Platform.OS !== "android" || !showTipsBox) return;

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        setTipsDismissed(true);
        return true;
      },
    );

    return () => subscription.remove();
  }, [showTipsBox]);

  useEffect(() => {
    if (showTipsBox) {
      tipsMorphProgress.setValue(1);
      return;
    }

    Animated.timing(tipsMorphProgress, {
      toValue: 0,
      duration: TIPS_MORPH_DURATION,
      // TipsBox interpolates width/height from this value, which the native
      // driver can't animate.
      useNativeDriver: false,
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

    if (displayedOutcome === "won") haptics.win();

    const sessionId = getActiveGameSessionId(pathname);
    // Only a real win is timed (not the dev instant-win button).
    const winTimeMs =
      outcome === "won" ? getSessionPlayTimeMs(pathname) : null;
    recordResult(
      pathname,
      displayedOutcome === "won",
      score,
      sessionId,
      winTimeMs,
    )
      .then(() => {
        if (displayedOutcome === "won") void maybeRequestStoreReview();
      })
      .catch(() => {});
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
      <LoadingOverlay isLoaded={!!isLoaded} endsGameLaunch />

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
            goHome(isNodesMode);
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
        onTouchStart={extendKeepAwake}
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

        {globalSettings.showAnimations &&
          !isGlobalSettingsLoading &&
          isSceneReady && (
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
              paused={isScenePaused}
            />
          </View>
        )}

        <DeviceRotateHint landscapeRecommended={showDeviceRotateHint} />

        {/* Game header */}
        <GameHeader
          isNodesMode={isNodesMode}
          titleColor={titleColor}
          backgroundColor={backgroundColor}
          scale={ui.scale}
          contentMaxWidth={ui.contentMaxWidth}
          insetTop={insets.top}
          hidden={showTipsBox}
          opacity={headerFade.opacity}
          instructionsHighlight={instructionsHighlight}
          ended={ended}
          canUndo={!!canUndo}
          undoDisabled={
            ended || !canUndo || handleUndo === undefined || autoCompleting
          }
          onHome={onHeaderHome}
          onInstantWin={onHeaderInstantWin}
          onRules={onHeaderRules}
          onUndo={onHeaderUndo}
          onReset={onHeaderReset}
          onMenu={onHeaderMenu}
        />

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

          {/* Swallows touches on the board while auto-complete plays. */}
          {autoCompleting && (
            <Pressable
              accessible={false}
              onPress={() => {}}
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
                zIndex: 10000,
              }}
            />
          )}
        </View>
      </View>
    </>
  );
};
