import { GameInfoPanel } from "@/components/ui/GameInfoPanel";

import {
  getGameDotDefinition,
  getGameDotState,
  isBeyondField,
  CAMPAIGN_START_PATH,
  type GameDotDefinition,
} from "@/data/campaign-map";
import { useCampaignProgress } from "@/hooks/useCampaignProgress";
import { grantMercySkip } from "@/data/campaign-progress";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { layoutDims } from "@/styles/styles";
import { HomeHeader } from "@/components/Home/HomeHeader";
import { CampaignMap } from "./CampaignMap";
import { CampaignIntroPanel, useOdysseyIntro } from "./CampaignIntroPanel";
import { BeyondFieldPanel } from "./BeyondFieldPanel";
import { useFieldUp } from "@/data/odyssey-field";
import { UnlockKeyEntry } from "@/components/common/UnlockKeyEntry";
import { haptics } from "@/utils/haptics";
import { UfoContext } from "./UfoContext";
import { clearMercySkipVisit, isMercySkipVisitOwed } from "./ufo-visit";
import { pointerEventsStyles } from "@/styles/pointerEventsStyles";

type Props = {
  contentPaddingTop: number;
  onOpenStats?: () => void;
  onOpenSettings?: () => void;
};

export function CampaignTab({
  contentPaddingTop,
  onOpenStats,
  onOpenSettings,
}: Props) {
  const { spacing, ui } = useResponsiveMetrics();
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
  const insets = useSafeAreaInsets();
  const { shown: showIntro, dismiss: dismissIntro } = useOdysseyIntro();
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
    // One UFO at a time: none flies past while the guide beams on Klondike.
    !showIntro &&
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
  const canSummonUfo = progress.mercySkipCount === 0;
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
  const fieldUp = useFieldUp();
  const fieldUpRef = useRef(fieldUp);
  fieldUpRef.current = fieldUp;
  const selectGameDot = useCallback((gameDot: GameDotDefinition) => {
    // A light touch on reaching across the field.
    if (fieldUpRef.current && isBeyondField(gameDot)) haptics.validTarget();
    setSelectedPath(gameDot.path);
  }, []);
  // The game lies beyond the standing force field: it can be looked at, not
  // played in the Odyssey.
  const heldBeyondField = fieldUp && isBeyondField(selectedGameDot);
  const [enteringKey, setEnteringKey] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      <CampaignMap
        selectedPath={selectedGameDot.path}
        ready={isMapReady}
        onSelectGameDot={selectGameDot}
        wonPaths={wonPaths}
        unlockedPaths={unlockedPaths}
        collectedTaoIds={collectedTaoIds}
        collectedQuoteIds={collectedQuoteIds}
        guidePath={showIntro && !heldBeyondField ? CAMPAIGN_START_PATH : null}
      />
      <View
        style={[
          pointerEventsStyles.boxNone,
          {
            position: "absolute",
            left: 0,
            right: 0,
            bottom:
              insets.bottom +
              spacing(layoutDims.tabBarHeight + layoutDims.pagePadding),
            alignItems: "center",
            paddingHorizontal: spacing(layoutDims.pagePadding / 2),
          },
        ]}
      >
        <GameInfoPanel
          path={selectedGameDot.path}
          campaign
          locked={state === "locked" || heldBeyondField}
          collectedTaoIds={collectedTaoIds}
          collectedQuoteIds={collectedQuoteIds}
          style={{
            width: "100%",
            maxWidth: ui.contentMaxWidth - spacing(layoutDims.pagePadding),
          }}
        />
      </View>
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
            gap: spacing(16),
          },
        ]}
      >
        {/* The same logo and buttons as Home, over the map. */}
        <HomeHeader onOpenStats={onOpenStats} onOpenSettings={onOpenSettings} />
        {heldBeyondField && (
          <View
            style={{
              width: "100%",
              maxWidth: ui.contentMaxWidth,
              paddingHorizontal: spacing(layoutDims.pagePadding / 2),
            }}
          >
            <BeyondFieldPanel onEnterKey={() => setEnteringKey(true)} />
          </View>
        )}
        {showIntro && !heldBeyondField && (
          <View
            style={{
              width: "100%",
              maxWidth: ui.contentMaxWidth,
              paddingHorizontal: spacing(layoutDims.pagePadding / 2),
            }}
          >
            <CampaignIntroPanel onClose={dismissIntro} />
          </View>
        )}
      </View>
      <UnlockKeyEntry
        visible={enteringKey}
        onClose={() => setEnteringKey(false)}
      />
    </View>
  );
}
