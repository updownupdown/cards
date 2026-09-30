import { LoadingOverlay } from "@/components/common/LoadingOverlay";
import { GalleryTab } from "@/components/Home/GalleryTab";
import { HomeTab } from "@/components/Home/HomeTab";
import { HomeTabBar } from "@/components/Home/HomeTabBar";
import { SearchTab } from "@/components/Home/SearchTab";
import { CampaignTab } from "@/components/Campaign/CampaignTab";
import { CampaignUFO } from "@/components/Campaign/CampaignUFO";
import { UfoContext, type UfoRequest } from "@/components/Campaign/UfoContext";
import {
  StarfieldBackdrop,
  StarfieldProvider,
  useStarfieldMotion,
} from "./Starfield";
import { createTabReadyGate, TabReadyContext } from "./TabReady";
import {
  COLLECT_HOME_TAB_INDEX,
  getActiveHomeTab,
  HOME_HOME_TAB_INDEX,
  LAST_HOME_TAB_INDEX,
  CAMPAIGN_HOME_TAB_INDEX,
  SEARCH_HOME_TAB_INDEX,
  setActiveHomeTab,
  type HomeTabIndex,
} from "./home-view-state";
import { HomeModal } from "@/components/Modals/HomeModal";
import { GlassTarget, GlassTargetContext } from "@/components/ui/Glass";
import { StatsModal } from "@/components/Modals/StatsModal";
import { consumeReopenSettings } from "@/components/common/ThemePicker";
import { useHomeData } from "@/hooks/useHomeData";
import { useGlobalSettings } from "@/hooks/useGlobalSettings";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useViewportDimensions } from "@/hooks/useViewportDimensions";
import { Colors, layoutDims } from "@/styles/styles";
import {
  type ReactNode,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import { flexStyles } from "@/styles/flexStyles";
import { pointerEventsStyles } from "@/styles/pointerEventsStyles";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIsFocused, useLocalSearchParams } from "expo-router";

/**
 * Tabs not kept once left: the Campaign map animates while shown and holds a
 * lot of views. (Anything kept costs GPU memory on Android even while hidden,
 * and when that runs short every frame slows down, so a heavy tab belongs
 * here: Collect only fits since its stickers use small thumbnails.)
 */
const UNMOUNTED_WHEN_LEFT: HomeTabIndex[] = [CAMPAIGN_HOME_TAB_INDEX];
/** How far aside a hidden tab is moved, well clear of any screen. */
const OUT_OF_VIEW = 10000;
// CSS visibility, which React Native's style types leave out but the web
// passes through.
const HIDDEN_ON_WEB = { visibility: "hidden" } as ViewStyle;
/**
 * Built in the background, one after another this far apart, soon after
 * Home opens, so that even the first visit to one is quick: built on the
 * spot, Collect took three quarters of a second to appear.
 */
const PREBUILT_TABS: HomeTabIndex[] = [
  COLLECT_HOME_TAB_INDEX,
  SEARCH_HOME_TAB_INDEX,
];
const PREBUILD_INTERVAL = 1500;
/** A tab still not ready after this long is shown anyway. */
const MAX_TAB_WAIT = 1500;
/** Switches to a kept tab quicker than this show no spinner at all. */
const SPINNER_DELAY = 150;
const HOME_TAB_INDICES = [
  HOME_HOME_TAB_INDEX,
  CAMPAIGN_HOME_TAB_INDEX,
  COLLECT_HOME_TAB_INDEX,
  SEARCH_HOME_TAB_INDEX,
] as const;

export default function Home() {
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const isFocused = useIsFocused();
  const [initialActiveTab] = useState(getActiveHomeTab);
  const insets = useSafeAreaInsets();
  const { spacing } = useResponsiveMetrics();
  const { width: viewportWidth, height: viewportHeight } =
    useViewportDimensions();
  const isWeb = Platform.OS === "web";

  const [isLoaded, setIsLoaded] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(
    consumeReopenSettings,
  );
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [homeDataRefreshToken, setHomeDataRefreshToken] = useState(0);
  // The tab last tapped, lit in the tab bar straight away.
  const [activeTab, setActiveTab] = useState<HomeTabIndex>(initialActiveTab);
  const activeTabRef = useRef<HomeTabIndex>(initialActiveTab);
  // The tab on screen. On a switch the old tab goes at once, and the new one
  // is built and drawn out of sight until it is complete (see TabLayer),
  // then shown in a single frame; null in between.
  const [shownTab, setShownTab] = useState<HomeTabIndex | null>(null);
  // Tabs stay mounted once visited, so going back to one is quick and keeps
  // its place, except those in UNMOUNTED_WHEN_LEFT.
  const [mountedTabs, setMountedTabs] = useState<ReadonlySet<HomeTabIndex>>(
    () => new Set([initialActiveTab]),
  );
  const { settings } = useGlobalSettings();
  const starfield = useStarfieldMotion(activeTab);
  // Set by the Campaign tab while the map is open; the UFO itself is drawn here.
  const [ufo, setUfo] = useState<UfoRequest | null>(null);

  const [containerHeight, setContainerHeight] = useState(0);
  const pageGlassRef = useRef<View>(null);
  const skyGlassRef = useRef<View>(null);

  const {
    isLoaded: homeDataLoaded,
    favorites,
    recentPaths,
    settingsMap,
    attemptsByPath,
    allEnabledGames,
    allEnabledGamePaths,
    toggleFavorite,
  } = useHomeData(homeDataRefreshToken);

  const unplayedGamePaths = useMemo(
    () =>
      allEnabledGamePaths.filter((path) => (attemptsByPath[path] ?? 0) === 0),
    [allEnabledGamePaths, attemptsByPath],
  );

  // No header over the tabs: each page starts under the status bar.
  const contentPaddingTop = insets.top + spacing(24);
  // Clear the floating tab bar, which grows by the bottom safe-area inset
  // (Android's navigation bar), with a comfortable gap after the last item.
  const contentPaddingBottom =
    spacing(layoutDims.tabBarHeight + layoutDims.pagePadding * 0.5 + 48) +
    insets.bottom;

  const onInvalidateHomeData = () => {
    setHomeDataRefreshToken((current) => current + 1);
  };

  // Home stays mounted under a game, so what was played or starred there is
  // read again on the way back.
  const wasFocused = useRef(isFocused);
  useEffect(() => {
    if (isFocused && !wasFocused.current) onInvalidateHomeData();
    wasFocused.current = isFocused;
  }, [isFocused]);

  useEffect(() => {
    // Delay rendering heavy components so the UI can mount and fade in first.
    const timer = setTimeout(() => setIsLoaded(true), 150);
    return () => clearTimeout(timer);
  }, []);

  const onContainerLayout = (event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    if (height > 0 && Math.abs(height - containerHeight) > 1) {
      setContainerHeight(height);
    }
  };

  const onSelectTab = (requestedIndex: number) => {
    const index = Math.max(
      0,
      Math.min(LAST_HOME_TAB_INDEX, requestedIndex),
    ) as HomeTabIndex;
    if (index === activeTabRef.current) return;
    // The tab being left is hidden from screen readers, so on the web it
    // must not keep focus (the search box, say).
    if (isWeb) (document.activeElement as HTMLElement | null)?.blur?.();
    activeTabRef.current = index;
    setActiveHomeTab(index);
    setActiveTab(index);
    setShownTab(null);
    // The old tab goes in this render, and anything to build waits for the
    // next, so a tab slow to build (the Campaign map) never holds up the old
    // one leaving. After a frame and then a turn, so that the web browser
    // paints in between as well.
    requestAnimationFrame(() =>
      setTimeout(() => {
        if (activeTabRef.current !== index) return;
        setMountedTabs((current) => {
          const next = new Set(current).add(index);
          UNMOUNTED_WHEN_LEFT.forEach((left) => {
            if (left !== index) next.delete(left);
          });
          return next.size === current.size &&
            [...next].every((tab) => current.has(tab))
            ? current
            : next;
        });
      }),
    );
  };

  useEffect(() => {
    const timers = PREBUILT_TABS.map((index, order) =>
      setTimeout(
        () =>
          setMountedTabs((current) =>
            current.has(index) ? current : new Set(current).add(index),
          ),
        PREBUILD_INTERVAL * (order + 1),
      ),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  const onTabReady = (index: HomeTabIndex) => {
    if (activeTabRef.current === index) setShownTab(index);
  };

  // The map is dropped while a game is open over Home, so coming back it is
  // built again, out of sight like any other switch.
  useEffect(() => {
    if (!isFocused && activeTabRef.current === CAMPAIGN_HOME_TAB_INDEX) {
      setShownTab(null);
    }
  }, [isFocused]);

  useEffect(() => {
    // "nodes" is the tab's old name, still in saved links.
    const campaignTab = tab === "campaign" || tab === "nodes";
    if (campaignTab && activeTabRef.current !== CAMPAIGN_HOME_TAB_INDEX) {
      onSelectTab(CAMPAIGN_HOME_TAB_INDEX);
    }
  }, [tab]);

  // On web the screen height comes from window.innerHeight and is applied via a
  // fixed-position container. Mobile Chrome fails to resolve the CSS height
  // cascade (flex / dvh) on first paint and ancestor RN views clip with
  // overflow:hidden, so relying on the cascade left the tabs collapsed until an
  // orientation change. Native uses the reliably measured layout height.
  const screenHeight = isWeb ? viewportHeight : containerHeight;
  const isScreenReady = !isWeb || screenHeight > 0;

  // The starfield covers this, but it is what fills the system bars for the
  // frame or two before the image paints, so keep it the colour of the overlay
  // that sits on top of that image.
  const containerStyle = (
    isWeb
      ? {
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: screenHeight || "100%",
          backgroundColor: Colors.starfieldOverlay,
        }
      : { flex: 1, backgroundColor: Colors.starfieldOverlay }
  ) as Record<string, unknown>;

  // Each tab's page, built out here rather than in the loop below, so a
  // switch between tabs (which re-renders this) leaves them all untouched.
  const tabContents: Record<HomeTabIndex, ReactNode> = {
    [HOME_HOME_TAB_INDEX]: (
      <HomeTab
        allEnabledGames={allEnabledGames}
        unplayedGamePaths={unplayedGamePaths}
        favorites={favorites}
        recentPaths={recentPaths}
        onToggleFavorite={toggleFavorite}
        dataLoaded={homeDataLoaded}
        onOpenStats={() => setShowStatsModal(true)}
        onOpenSettings={() => setShowSettingsModal(true)}
        contentPaddingTop={contentPaddingTop}
        contentPaddingBottom={contentPaddingBottom}
      />
    ),
    [CAMPAIGN_HOME_TAB_INDEX]: (
      <CampaignTab contentPaddingTop={contentPaddingTop} />
    ),
    [COLLECT_HOME_TAB_INDEX]: (
      <GalleryTab
        allEnabledGames={allEnabledGames}
        settingsMap={settingsMap}
        contentPaddingTop={contentPaddingTop}
        contentPaddingBottom={contentPaddingBottom}
      />
    ),
    [SEARCH_HOME_TAB_INDEX]: (
      <SearchTab
        allEnabledGames={allEnabledGames}
        settingsMap={settingsMap}
        favorites={favorites}
        recentPaths={recentPaths}
        onToggleFavorite={toggleFavorite}
        contentPaddingTop={contentPaddingTop}
        contentPaddingBottom={contentPaddingBottom}
      />
    ),
  };

  return (
    <>
      <LoadingOverlay
        isLoaded={!!isLoaded}
        backgroundColor={Colors.starfieldOverlay}
      />

      {showSettingsModal && (
        <HomeModal
          onClose={() => setShowSettingsModal(false)}
          onHomeDataInvalidated={onInvalidateHomeData}
        />
      )}

      {showStatsModal && (
        <StatsModal
          settingsMap={settingsMap}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          onClose={() => setShowStatsModal(false)}
        />
      )}
      <StarfieldProvider value={starfield}>
        <UfoContext.Provider value={setUfo}>
          <View style={containerStyle} onLayout={onContainerLayout}>
            {isScreenReady && (
              // Everything the tab bar's glass blurs.
              <GlassTarget targetRef={pageGlassRef} style={{ flex: 1 }}>
                <View
                  style={{
                    flex: 1,
                    height: screenHeight || undefined,
                    // Clips the tabs moved aside, so they are skipped entirely.
                    overflow: "hidden",
                  }}
                >
                  {/* One sky behind every tab, moving as you go between them.
                    The glass inside the tabs blurs the sky alone, since
                    Android can't blur what the glass itself is in. */}
                  <GlassTarget
                    targetRef={skyGlassRef}
                    style={StyleSheet.absoluteFill}
                  >
                    <StarfieldBackdrop
                      motion={starfield}
                      activeTab={activeTab}
                      animated={settings.showAnimations}
                      comets={isFocused}
                    />
                  </GlassTarget>

                  <GlassTargetContext.Provider value={skyGlassRef}>
                    {HOME_TAB_INDICES.map((index) => {
                      if (!mountedTabs.has(index)) return null;
                      if (index === CAMPAIGN_HOME_TAB_INDEX && !isFocused)
                        return null;
                      return (
                        <TabLayer
                          key={index}
                          state={
                            index === shownTab
                              ? "shown"
                              : index === activeTab
                                ? "preparing"
                                : "away"
                          }
                          onReady={() => onTabReady(index)}
                        >
                          {tabContents[index]}
                        </TabLayer>
                      );
                    })}
                  </GlassTargetContext.Provider>

                  {shownTab === null && (
                    <TabSpinner immediate={!mountedTabs.has(activeTab)} />
                  )}
                </View>
              </GlassTarget>
            )}

            <GlassTargetContext.Provider value={pageGlassRef}>
              <HomeTabBar activeIndex={activeTab} onSelectTab={onSelectTab} />
            </GlassTargetContext.Provider>

            {/* Last, so it flies over the header and tab bar rather than under
            them. It only exists while the Campaign tab has asked for it. */}
            {ufo && shownTab === CAMPAIGN_HOME_TAB_INDEX && (
              <CampaignUFO
                width={viewportWidth}
                height={viewportHeight}
                animationsEnabled={settings.showAnimations && ufo.gateOpen}
                summons={ufo.summons}
                visits={ufo.visits}
                onCatch={ufo.onCatch}
              />
            )}
          </View>
        </UfoContext.Provider>
      </StarfieldProvider>
    </>
  );
}

/**
 * One tab's page, laid over the others. Only the shown tab takes touches and
 * is read out; the rest are kept, out of sight, for a quick return.
 */
export function TabLayer({
  state,
  onReady,
  children,
}: {
  /**
   * "preparing": being switched to. It is built, laid out and given its
   * pictures while fully transparent, until nothing in it holds it back
   * (see TabReady), then onReady is called and it shows at once. Showing it
   * earlier, or fading it in, showed half-built tabs: bare card shadows,
   * and pictures popping in. (Exactly zero: Android skips drawing it at
   * all, whereas at 1% the card shadows still showed at full strength. And
   * not a zIndex change: Fabric takes and puts back the whole tab for that,
   * which cost a quarter of a second.)
   *
   * "away": moved out of the clipped tab area, so it is not drawn at all (a
   * transparent tab is still drawn on Android, and a kept Collect tab under
   * the Campaign map made every frame take ten times as long). Moving it
   * keeps its layout, and so its scroll position, unlike display: none.
   */
  state: "shown" | "preparing" | "away";
  onReady: () => void;
  children: ReactNode;
}) {
  const [gate] = useState(createTabReadyGate);
  const onTabReady = useEffectEvent(onReady);
  const preparing = state === "preparing";

  useEffect(() => {
    if (!preparing) return;
    let cancelled = false;
    let frame = 0;
    const ready = () => {
      if (!cancelled) onTabReady();
    };
    const settle = () => {
      if (gate.pending() > 0) return;
      cancelAnimationFrame(frame);
      // A frame on, in case anything else still starts loading.
      frame = requestAnimationFrame(() => {
        if (gate.pending() === 0) ready();
      });
    };
    gate.setOnSettled(settle);
    settle();
    const timer = setTimeout(ready, MAX_TAB_WAIT);
    return () => {
      cancelled = true;
      gate.setOnSettled(null);
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [gate, preparing]);

  return (
    <TabReadyContext.Provider value={gate}>
      <View
        // Kept as a real view in every state: flattened away in one and not
        // another, Fabric would move the whole tab between parents.
        collapsable={false}
        testID={state === "shown" ? "home-tab-content" : undefined}
        aria-hidden={state !== "shown"}
        style={[
          StyleSheet.absoluteFill,
          state === "preparing" && { opacity: 0 },
          state === "away" && { left: OUT_OF_VIEW, right: -OUT_OF_VIEW },
          // On the web, fixed-position parts of a tab (the search box, the
          // header fade) ignore the move, and pointerEvents "none" only
          // reaches a view's direct children there, so a hidden tab's search
          // box still took clicks (and focus) meant for the Campaign map.
          // Hidden, nothing in the tab can be seen, clicked or focused. (A
          // preparing tab still lays out and loads its pictures.)
          state !== "shown" && Platform.OS === "web" && HIDDEN_ON_WEB,
          state === "shown"
            ? pointerEventsStyles.boxNone
            : pointerEventsStyles.none,
        ]}
      >
        {children}
      </View>
    </TabReadyContext.Provider>
  );
}

/**
 * Shown while a tab is being built: from the start when it is built from
 * scratch (the first visit to a tab, or any to the Campaign map), since
 * building it keeps the timer below from running on time; otherwise only
 * if it is slow, as a kept tab takes a couple of frames at most.
 */
function TabSpinner({ immediate }: { immediate: boolean }) {
  const [visible, setVisible] = useState(immediate);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), SPINNER_DELAY);
    return () => clearTimeout(timer);
  }, []);
  if (!visible) return null;
  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        flexStyles.rowCentered,
        pointerEventsStyles.none,
      ]}
    >
      <ActivityIndicator size="large" color={Colors.K400} />
    </View>
  );
}
