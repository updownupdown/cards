import { Text } from "@/components/common/Text";
import { GameInfoPanel } from "@/components/ui/GameInfoPanel";
import { hairline } from "@/components/ui/Nocturne";
import { TaoView } from "./TaoView";
import { VoicesView } from "./VoicesView";

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
import { Platform, Pressable, View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { layoutDims, rgba, theme } from "@/styles/styles";
import { CampaignMap } from "./CampaignMap";
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
  const [view, setView] = useState<OdysseyView>("games");
  const insets = useSafeAreaInsets();
  const [toggleHeight, setToggleHeight] = useState(0);
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
  const mapCovered = view !== "games";
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

  const counts: Record<OdysseyView, string> = {
    games: `${wonPaths.size}/${GAME_DOT_DEFINITIONS.length}`,
    tao: `${collectedTaoIds.size}/${TAO_CHAPTER_COUNT}`,
    voices: `${collectedQuoteIds.size}/${QUOTE_COUNT}`,
  };
  const labels: Record<OdysseyView, string> = {
    games: t("progress.games"),
    tao: t("progress.chapters"),
    voices: t("progress.quotes"),
  };
  const collectionTop = contentPaddingTop + toggleHeight + spacing(8);

  return (
    <View style={{ flex: 1 }}>
      {view === "games" && (
        <>
          <CampaignMap
            selectedPath={selectedGameDot.path}
            ready={isMapReady}
            onSelectGameDot={selectGameDot}
            wonPaths={wonPaths}
            collectedTaoIds={collectedTaoIds}
            collectedQuoteIds={collectedQuoteIds}
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
              leading="thumbnail"
              campaign
              locked={state === "locked"}
              collectedTaoIds={collectedTaoIds}
              collectedQuoteIds={collectedQuoteIds}
              style={{
                width: "100%",
                maxWidth:
                  ui.contentMaxWidth - spacing(layoutDims.pagePadding),
                backgroundColor: rgba(theme.surface, 0.92),
                ...(Platform.OS === "web"
                  ? ({ backdropFilter: "blur(14px)" } as ViewStyle)
                  : null),
              }}
            />
          </View>
        </>
      )}
      {view === "tao" && (
        <TaoView collectedIds={collectedTaoIds} topInset={collectionTop} />
      )}
      {view === "voices" && (
        <VoicesView collectedIds={collectedQuoteIds} topInset={collectionTop} />
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
            paddingHorizontal: spacing(layoutDims.pagePadding / 2),
          },
        ]}
      >
        <View
          onLayout={(event) =>
            setToggleHeight(Math.ceil(event.nativeEvent.layout.height))
          }
          style={{
            width: "100%",
            maxWidth: ui.contentMaxWidth - spacing(layoutDims.pagePadding),
            flexDirection: "row",
            gap: spacing(4),
            padding: spacing(4),
            borderRadius: spacing(18),
            backgroundColor: rgba(theme.surface, 0.9),
            borderWidth: 1,
            borderColor: hairline(),
            ...(Platform.OS === "web"
              ? ({ backdropFilter: "blur(14px)" } as ViewStyle)
              : null),
          }}
        >
          {(["games", "tao", "voices"] as const).map((key) => {
            const selected = view === key;
            return (
              <Pressable
                key={key}
                onPress={() => setView(key)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={{
                  flex: 1,
                  alignItems: "center",
                  paddingVertical: spacing(7),
                  borderRadius: spacing(14),
                  backgroundColor: selected
                    ? rgba(theme.ink, 0.09)
                    : "transparent",
                  outline: "none",
                }}
              >
                <Text
                  size="sm"
                  weight={500}
                  color={selected ? theme.ink : theme.dim}
                >
                  {labels[key]}
                </Text>
                <Text
                  size="xxs"
                  weight={400}
                  color={selected ? theme.accent : theme.faint}
                  style={{ fontVariant: ["tabular-nums"] }}
                >
                  {counts[key]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {showIntro && view === "games" && (
          <View
            style={{
              width: "100%",
              maxWidth: ui.contentMaxWidth - spacing(layoutDims.pagePadding),
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
    </View>
  );
}

type OdysseyView = "games" | "tao" | "voices";
