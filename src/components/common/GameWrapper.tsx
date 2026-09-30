import { BoardButtonsContext } from "@/components/Button/Button";
import { CARD_BACK_INKS } from "@/data/card-backs";
import { BackgroundAnimation } from "@/animations/BackgroundAnimation";
import {
  clearLastGameSession,
  getGameInfo,
  isCampaignModeParam,
  recordAttempt,
  recordResult,
  undoRecordedLoss,
} from "@/data/game-menu";
import {
  recordCampaignWin,
  spendMercySkip,
  type CampaignWinResult,
} from "@/data/campaign-progress";
import { useCampaignProgress } from "@/hooks/useCampaignProgress";
import { recordDailyWin } from "@/data/game-of-the-day";
import { DEFAULT_GAME_BACKGROUND } from "@/data/games-data";
import { useFade } from "@/hooks/useFade";
import { useGameSettings } from "@/hooks/useGameSettings";
import { useGlobalSettings } from "@/hooks/useGlobalSettings";
import { TaoReveal } from "@/components/TaoReveal/TaoReveal";
import { QuoteReveal } from "@/components/QuoteReveal/QuoteReveal";
import { getQuote, getTaoChapter } from "@/data/collectibles";
import { useDisplayLanguage } from "@/i18n";
import {
  isQuoteTranslated,
  isTaoChapterTranslated,
  localizeQuote,
  localizeTaoChapter,
  localizeGameTitle,
} from "@/i18n/content";
import {
  getActiveGameSessionId,
  getSessionPlayTimeMs,
} from "@/hooks/useStateManager";
import { maybeRequestStoreReview } from "@/utils/review-prompt";
import { useResponsiveUiLayoutFromWidth } from "@/hooks/useResponsiveLayout";
import { useViewportDimensions } from "@/hooks/useViewportDimensions";
import { haptics } from "@/utils/haptics";
import { addGameBreadcrumb, setCrashContext } from "@/utils/crash-reporting";
import { selectCampaignHomeTab } from "@/components/Home/home-view-state";
import { REVEAL_TIMING } from "@/components/common/reveal-timing";
import { flexStyles } from "@/styles/flexStyles";
import {
  getHeaderHeightWithInset,
  LayerZIndexes,
  layoutDims,
} from "@/styles/styles";
import { router, useLocalSearchParams } from "expo-router";
import { useGamePath } from "@/hooks/useGamePath";
import React, { useEffect, useEffectEvent, useRef, useState } from "react";
import {
  Animated,
  BackHandler,
  ImageBackground,
  Platform,
  Pressable,
  StyleSheet,
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
import { WinLoseBox, type WinTimes } from "./WinLoseBox";
import { AutoCompletePanel } from "./AutoCompletePanel";
import { useAutoCompleteOffer } from "@/hooks/auto-complete-offer";
import { GameHeader } from "./GameHeader";
import { GlassTarget, GlassTargetContext } from "@/components/ui/Glass";
import { useStableCallback } from "@/hooks/useStableCallback";
import { requestMercySkipVisit } from "@/components/Campaign/ufo-visit";
import { pointerEventsStyles } from "@/styles/pointerEventsStyles";

const TIPS_MORPH_DURATION = 350;
const KEEP_AWAKE_TAG = "solitarius-game";
const KEEP_AWAKE_MS = 10 * 60 * 1000;
// Scene effects start after the game has loaded and its deal has played.
const SCENE_START_DELAY_MS = 1000;

export type GameOutcome = "playing" | "won" | "lost";

/**
 * Return to the home screen already underneath the game instead of pushing a
 * new one: pushing stacked another home (and kept the finished game mounted)
 * on every round trip, which added memory and background work over a session.
 */
function goHome(isCampaignMode: boolean) {
  const href = isCampaignMode ? "/?tab=campaign" : "/";
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
  /** Suppress the default score line in the result box, e.g. when winLoseMessage already includes it. */
  hideScore?: boolean;
  winLoseMessage?: string;
  reset: () => void;
  children: React.ReactNode;
  /** Current tip phase key; maps to gameInfo.tip[phase]. */
  canUndo?: boolean;
  undo?: () => void;
  openMenu?: boolean;
  onMenuClose?: () => void;
  showDeviceRotateHint?: "landscape" | "portrait" | null;
  /** The game is auto-completing: block card input and undo meanwhile. */
  autoCompleting?: boolean;
}

export const GameWrapper = ({
  isLoaded,
  outcome,
  score,
  hideScore = false,
  winLoseMessage,
  reset,
  children,
  canUndo,
  undo: handleUndo,
  openMenu = false,
  onMenuClose,
  showDeviceRotateHint = null,
  autoCompleting = false,
}: Props) => {
  const pathname = useGamePath();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isCampaignMode = isCampaignModeParam(mode);
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
      if (isCampaignMode) selectCampaignHomeTab();
      goHome(isCampaignMode);
    }
  });
  const { progress: campaignProgress } = useCampaignProgress();
  const onModalMercySkip = useStableCallback(async () => {
    let applied = false;
    try {
      applied = (await spendMercySkip(pathname)).applied;
      await clearLastGameSession();
    } finally {
      if (isCampaignMode) selectCampaignHomeTab();
      goHome(isCampaignMode);
      // The UFO drops by on the map it lands on, where the skipped game dot is
      // now won.
      if (applied) requestMercySkipVisit();
    }
  });
  const onHeaderInstantWin = useStableCallback(() => setIsDevWin(true));
  const onHeaderRules = useStableCallback(() => setShowRulesModal(true));
  const onHeaderUndo = useStableCallback(() => {
    addGameBreadcrumb("undo");
    handleUndo?.();
  });
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
  const [campaignWinResult, setCampaignWinResult] =
    useState<CampaignWinResult | null>(null);
  // A newly earned Tao chapter or quote is revealed over the whole screen,
  // which locks the game (and leaves out the win box's buttons) until it
  // finishes.
  const [revealedWinResult, setRevealedWinResult] =
    useState<CampaignWinResult | null>(null);
  // The buttons come back while the sky still hides the win box, so the
  // player never sees it change size.
  const [uncoveredWinResult, setUncoveredWinResult] =
    useState<CampaignWinResult | null>(null);
  const displayLanguage = useDisplayLanguage();
  const taoReward =
    campaignWinResult?.awardedReward?.type === "tao"
      ? campaignWinResult.awardedReward
      : null;
  const taoRevealChapter =
    taoReward && revealedWinResult !== campaignWinResult
      ? getTaoChapter(taoReward.id)
      : undefined;
  const taoRevealText =
    taoReward && taoRevealChapter
      ? globalSettings.translateCollectibles &&
        isTaoChapterTranslated(taoReward.id, taoRevealChapter, displayLanguage)
        ? localizeTaoChapter(taoReward.id, taoRevealChapter, displayLanguage)
            .text
        : taoRevealChapter.text
      : null;
  const quoteReward =
    campaignWinResult?.awardedReward?.type === "quote"
      ? campaignWinResult.awardedReward
      : null;
  const quoteRevealEnglish =
    quoteReward && revealedWinResult !== campaignWinResult
      ? getQuote(quoteReward.id)
      : undefined;
  const quoteReveal =
    quoteReward && quoteRevealEnglish
      ? globalSettings.translateCollectibles &&
        isQuoteTranslated(quoteReward.id, quoteRevealEnglish, displayLanguage)
        ? localizeQuote(quoteReward.id, quoteRevealEnglish, displayLanguage)
        : quoteRevealEnglish
      : null;
  const revealing = !!taoRevealText || !!quoteReveal;
  // The win box shows first, its buttons faded, then after a pause the
  // reward's reveal fades in over it.
  const [revealStarted, setRevealStarted] = useState<CampaignWinResult | null>(
    null,
  );
  useEffect(() => {
    if (!campaignWinResult?.awardedReward) return;
    const timer = setTimeout(
      () => setRevealStarted(campaignWinResult),
      REVEAL_TIMING.delayMs,
    );
    return () => clearTimeout(timer);
  }, [campaignWinResult]);
  const [winTimes, setWinTimes] = useState<WinTimes | null>(null);
  const [winCount, setWinCount] = useState<number | undefined>(undefined);
  const autoCompleteOffer = useAutoCompleteOffer();
  // Kept after the offer goes, so the panel can fade out showing it.
  const [lastAutoCompleteOffer, setLastAutoCompleteOffer] =
    useState(autoCompleteOffer);
  if (autoCompleteOffer && autoCompleteOffer !== lastAutoCompleteOffer) {
    setLastAutoCompleteOffer(autoCompleteOffer);
  }
  const autoCompleteFade = useFade(!!autoCompleteOffer && !ended, 500);
  const [tipsDismissed, setTipsDismissed] = useState(false);
  const tipsMorphProgress = useRef(new Animated.Value(0)).current;
  const backgroundGlassRef = useRef<View>(null);
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
    showMenu || openMenu || showRulesModal || !!campaignWinResult || ended;

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

  // The time of a win, and the fastest win counting this one.
  const showWinTime = useEffectEvent((timeMs: number) => {
    const previous = settings?.stats.fastestTimeMs ?? null;
    // This win, on top of those recorded before it.
    setWinCount((settings?.stats.wins ?? 0) + 1);
    setWinTimes({
      timeMs,
      bestMs: previous === null ? timeMs : Math.min(previous, timeMs),
    });
  });

  // Record stats
  const resultStateRef = useRef({ pathname, outcome: displayedOutcome });
  const attemptedPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (attemptedPathRef.current === pathname) return;
    attemptedPathRef.current = pathname;

    recordAttempt(pathname).catch(() => {});
    setCrashContext({ mode: isCampaignMode ? "campaign" : "standard" });
    addGameBreadcrumb("deal");
  }, [isCampaignMode, pathname]);

  useEffect(() => {
    let active = true;
    const previous = resultStateRef.current;
    const didEnd =
      previous.pathname === pathname &&
      previous.outcome === "playing" &&
      displayedOutcome !== "playing";

    resultStateRef.current = { pathname, outcome: displayedOutcome };
    if (displayedOutcome === "playing") {
      setCampaignWinResult(null);
      setWinTimes(null);
    }
    if (!didEnd) {
      return () => {
        active = false;
      };
    }

    if (displayedOutcome === "won") haptics.win();
    addGameBreadcrumb(displayedOutcome === "won" ? "win" : "loss");

    const sessionId = getActiveGameSessionId(pathname);
    // Only a real win records its time; the dev instant-win button still
    // shows it, so the box can be checked.
    const playTimeMs =
      displayedOutcome === "won" ? getSessionPlayTimeMs(pathname) : null;
    if (playTimeMs !== null && playTimeMs > 0) showWinTime(playTimeMs);
    const winTimeMs = outcome === "won" ? playTimeMs : null;
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
    if (displayedOutcome === "won") {
      recordDailyWin(pathname).catch(() => {});
    }
    if (isCampaignMode && displayedOutcome === "won") {
      recordCampaignWin(pathname, sessionId)
        .then((result) => {
          if (
            active &&
            !result.duplicate &&
            (result.awardedReward || result.newlyUnlockedPaths.length > 0)
          ) {
            setCampaignWinResult(result);
          }
        })
        .catch(() => {});
    }

    return () => {
      active = false;
    };
  }, [displayedOutcome, isCampaignMode, pathname, score]);

  if (!gameInfo) return null;

  const titleColor = gameInfo.gameColorPale;
  const backgroundColor = gameInfo.gameColorDark;
  const headerHeight = getHeaderHeightWithInset(insets.top, ui.scale);
  const background = gameInfo.background ?? DEFAULT_GAME_BACKGROUND;

  return (
    <GlassTargetContext.Provider value={backgroundGlassRef}>
      <LoadingOverlay
        isLoaded={!!isLoaded}
        endsGameLaunch
        backgroundColor={backgroundColor}
      />

      {tipsFade.isRendered && (
        <Animated.View
          style={[
            pointerEventsStyles.boxNone,
            {
              position: "absolute",
              zIndex: LayerZIndexes.tipsContainer,
              top: insets.top + spacing(layoutDims.pagePadding / 2),
              right: 0,
              left: 0,
              opacity: tipsFade.opacity,
            },
          ]}
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
        winTimes={won ? winTimes : null}
        score={score}
        hideScore={hideScore}
        reset={handleReset}
        message={winLoseMessage}
        handleUndo={handleLossUndo}
        isCampaignMode={isCampaignMode}
        title={localizeGameTitle(gameInfo, pathname, displayLanguage)}
        winCount={won ? winCount : undefined}
        actionsDisabled={revealing && uncoveredWinResult !== campaignWinResult}
        onExit={async () => {
          setCampaignWinResult(null);
          try {
            await clearLastGameSession();
          } finally {
            if (isCampaignMode) selectCampaignHomeTab();
            goHome(isCampaignMode);
          }
        }}
      />

      {(showMenu || openMenu) && (
        <GameModal
          onClose={() => {
            setShowMenu(false);
            onMenuClose?.();
          }}
          onReloadGame={handleReset}
          showRulesModal={() => setShowRulesModal(true)}
          mercySkipsAvailable={
            isCampaignMode && !campaignProgress.winsByPath[pathname]
              ? campaignProgress.mercySkipCount
              : 0
          }
          onMercySkip={isCampaignMode ? onModalMercySkip : undefined}
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
        {/* The still background, which is what the header's and the
            tips' glass blur on Android. */}
        <GlassTarget
          targetRef={backgroundGlassRef}
          style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}
        >
          <ImageBackground
            source={background.source}
            resizeMode="cover"
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
        </GlassTarget>

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

        <DeviceRotateHint orientation={showDeviceRotateHint} />

        {/* Game header */}
        <GameHeader
          isCampaignMode={isCampaignMode}
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

        {autoCompleteFade.isRendered && lastAutoCompleteOffer && (
          <AutoCompletePanel
            offer={lastAutoCompleteOffer}
            active={!!autoCompleteOffer && !ended}
            opacity={autoCompleteFade.opacity}
            top={headerHeight}
            backgroundColor={backgroundColor}
            color={titleColor}
            buttonTheme={CARD_BACK_INKS[gameInfo.cardBack]}
          />
        )}

        <View
          style={[
            pointerEventsStyles.boxNone,
            flexStyles.colCentered,
            flexStyles.fullWidth,
            {
              position: "relative",
              zIndex: LayerZIndexes.boardContent,
              flex: 1,
            },
          ]}
        >
          <BoardButtonsContext.Provider value={true}>
            {children}
          </BoardButtonsContext.Provider>

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

      {taoReward && taoRevealText && revealStarted === campaignWinResult && (
        <TaoReveal
          key={taoReward.id}
          chapter={taoReward.id}
          text={taoRevealText}
          onUncover={() => setUncoveredWinResult(campaignWinResult)}
          onDone={() => setRevealedWinResult(campaignWinResult)}
        />
      )}

      {quoteReward && quoteReveal && revealStarted === campaignWinResult && (
        <QuoteReveal
          key={quoteReward.id}
          text={quoteReveal.text}
          author={quoteReveal.author}
          source={quoteReveal.source}
          background={background.source}
          overlayColor={backgroundColor}
          onUncover={() => setUncoveredWinResult(campaignWinResult)}
          onDone={() => setRevealedWinResult(campaignWinResult)}
        />
      )}
    </GlassTargetContext.Provider>
  );
};
