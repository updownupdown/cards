import { QuotesCollectionModal } from "@/components/Modals/QuotesCollectionModal";
import { TaoCollectionModal } from "@/components/Modals/TaoCollectionModal";
import { GamesCollectionModal } from "@/components/Modals/GamesCollectionModal";

import { useGlobalSettings } from "@/hooks/useGlobalSettings";
import { QUOTE_COUNT, TAO_CHAPTER_COUNT } from "@/data/collectibles";
import {
  getGameDotDefinition,
  getGameDotState,
  GAME_DOT_DEFINITIONS,
  CAMPAIGN_START_PATH,
  type GameDotDefinition,
} from "@/data/campaign-map";
import { useCampaignProgress } from "@/hooks/useCampaignProgress";
import { grantMercySkip } from "@/data/campaign-progress";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useTranslation } from "@/i18n";
import { useCallback, useContext, useEffect, useState } from "react";
import { Platform, View } from "react-native";
import { GameDetailsPanel } from "./GameDetailsPanel";
import { CampaignMap } from "./CampaignMap";
import { CampaignProgressItem } from "./CampaignProgressItem";
import { CampaignIntroPanel } from "./CampaignIntroPanel";
import { UfoContext } from "./UfoContext";
import { clearMercySkipVisit, isMercySkipVisitOwed } from "./ufo-visit";
import { flexStyles } from "@/styles/flexStyles";
import { pointerEventsStyles } from "@/styles/pointerEventsStyles";

type Props = {
  contentPaddingTop: number;
};

export function CampaignTab({ contentPaddingTop }: Props) {
  const { spacing, ui } = useResponsiveMetrics();
  const { t } = useTranslation("campaign");
  const {
    progress,
    isLoading,
    wonPaths,
    unlockedPaths,
    collectedTaoIds,
    collectedQuoteIds,
  } = useCampaignProgress();
  const [selectedPath, setSelectedPath] = useState(CAMPAIGN_START_PATH);
  const [isMapReady, setIsMapReady] = useState(false);
  const [showTao, setShowTao] = useState(false);
  const [showQuotes, setShowQuotes] = useState(false);
  const [showGames, setShowGames] = useState(false);
  const {
    settings,
    updateSettings,
    isLoading: settingsLoading,
  } = useGlobalSettings();
  const showIntro = !settingsLoading && !settings.dismissCampaignIntro;
  // The rare UFO stays hidden for the first stretch on the map each visit,
  // so it never appears the instant the tab opens.
  const [onMapLongEnough, setOnMapLongEnough] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    setSelectedPath(progress.lastPlayedPath);
    setIsMapReady(true);
  }, [isLoading, progress.lastPlayedPath]);

  useEffect(() => {
    const timer = setTimeout(() => setOnMapLongEnough(true), 10000);
    return () => clearTimeout(timer);
  }, []);

  const totalCollectibles = collectedTaoIds.size + collectedQuoteIds.size;
  const ufoGateOpen =
    onMapLongEnough &&
    // Nothing to offer someone who is still holding a skip.
    progress.mercySkipCount === 0 &&
    (progress.mercySkipCollectibleCheckpoint === null ||
      totalCollectibles >= progress.mercySkipCollectibleCheckpoint + 3);
  const handleUfoCaught = useCallback(() => {
    void grantMercySkip();
  }, []);

  // Easter egg, and a handy way to test the UFO: typing "ufo" on the map
  // summons one straight away. Web only, since that is where there is a
  // keyboard. Like a natural visit, it only comes with no skip in hand.
  const [ufoSummons, setUfoSummons] = useState(0);
  const mapCovered = showTao || showQuotes || showGames;
  const canSummonUfo = !mapCovered && progress.mercySkipCount === 0;
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    if (!canSummonUfo) return;

    let typed = "";
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typingInField =
        !!target &&
        (target.isContentEditable ||
          /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
      if (typingInField || event.key.length !== 1) return;

      typed = (typed + event.key.toLowerCase()).slice(-3);
      if (typed === "ufo") {
        typed = "";
        setUfoSummons((count) => count + 1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canSummonUfo]);

  // Back from spending a Mercy Skip: once the map is up, the UFO drops by
  // to acknowledge it.
  const [ufoVisits, setUfoVisits] = useState(0);
  useEffect(() => {
    if (!isMapReady || !isMercySkipVisitOwed()) return;
    const timer = setTimeout(() => {
      clearMercySkipVisit();
      setUfoVisits((count) => count + 1);
    }, 700);
    return () => clearTimeout(timer);
  }, [isMapReady]);

  // Home draws the UFO, above the header; this tab only says when it may fly.
  const requestUfo = useContext(UfoContext);
  useEffect(() => {
    requestUfo({
      gateOpen: ufoGateOpen,
      summons: ufoSummons,
      visits: ufoVisits,
      onCatch: handleUfoCaught,
    });
  }, [handleUfoCaught, requestUfo, ufoGateOpen, ufoSummons, ufoVisits]);
  useEffect(() => () => requestUfo(null), [requestUfo]);

  const selectedGameDot =
    getGameDotDefinition(selectedPath) ??
    getGameDotDefinition(CAMPAIGN_START_PATH)!;
  const state = getGameDotState(
    selectedGameDot,
    wonPaths,
    collectedTaoIds,
    collectedQuoteIds,
    unlockedPaths,
  );
  const unlockedGameDotCount = unlockedPaths.size;
  const selectGameDot = useCallback((gameDot: GameDotDefinition) => {
    setSelectedPath(gameDot.path);
  }, []);

  return (
    <View
      style={{
        flex: 1,
      }}
    >
      {showTao && (
        <TaoCollectionModal
          collectedIds={collectedTaoIds}
          onClose={() => setShowTao(false)}
        />
      )}
      {showQuotes && (
        <QuotesCollectionModal
          collectedIds={collectedQuoteIds}
          onClose={() => setShowQuotes(false)}
        />
      )}
      {showGames && (
        <GamesCollectionModal onClose={() => setShowGames(false)} />
      )}

      <View
        style={[
          pointerEventsStyles.boxNone,
          {
            position: "absolute",
            zIndex: 5,
            top: contentPaddingTop,
            left: 0,
            right: 0,
            alignItems: "center",
            gap: spacing(12),
          },
        ]}
      >
        {!showIntro && (
          <View
            style={[
              pointerEventsStyles.boxNone,
              flexStyles.rowCentered,
              {
                gap: spacing(14),
                paddingHorizontal: spacing(12),
                width: "100%",
                maxWidth: ui.contentMaxWidth,
              },
            ]}
          >
            <CampaignProgressItem
              label={t("progress.games")}
              iconName="trophy"
              progress={unlockedGameDotCount / GAME_DOT_DEFINITIONS.length}
              accessibilityLabel={t("progress.summary", {
                label: t("progress.games"),
                collected: unlockedGameDotCount,
                total: GAME_DOT_DEFINITIONS.length,
              })}
              onPress={() => setShowGames(true)}
            />
            <CampaignProgressItem
              label={t("progress.chapters")}
              iconName="tao"
              progress={collectedTaoIds.size / TAO_CHAPTER_COUNT}
              accessibilityLabel={t("progress.summary", {
                label: t("progress.chapters"),
                collected: collectedTaoIds.size,
                total: TAO_CHAPTER_COUNT,
              })}
              onPress={() => setShowTao(true)}
            />
            <CampaignProgressItem
              label={t("progress.quotes")}
              iconName="quote"
              progress={collectedQuoteIds.size / QUOTE_COUNT}
              accessibilityLabel={t("progress.summary", {
                label: t("progress.quotes"),
                collected: collectedQuoteIds.size,
                total: QUOTE_COUNT,
              })}
              onPress={() => setShowQuotes(true)}
            />
          </View>
        )}
        {showIntro && (
          <View
            style={{
              width: "100%",
              maxWidth: ui.contentMaxWidth,
              paddingHorizontal: spacing(12),
            }}
          >
            <CampaignIntroPanel
              onClose={() =>
                void updateSettings({ dismissCampaignIntro: true })
              }
            />
          </View>
        )}
      </View>

      <CampaignMap
        selectedPath={selectedGameDot.path}
        ready={isMapReady}
        onSelectGameDot={selectGameDot}
        wonPaths={wonPaths}
        collectedTaoIds={collectedTaoIds}
        collectedQuoteIds={collectedQuoteIds}
      />
      <GameDetailsPanel
        gameDot={selectedGameDot}
        state={state}
        collectedTaoIds={collectedTaoIds}
        collectedQuoteIds={collectedQuoteIds}
      />
    </View>
  );
}
