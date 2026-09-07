import { LoadingOverlay } from "@/components/common/LoadingOverlay";
import { CollectTab } from "@/components/Home/CollectTab";
import { HomeHeader } from "@/components/Home/HomeHeader";
import { HomeTab } from "@/components/Home/HomeTab";
import { HomeTabBar } from "@/components/Home/HomeTabBar";
import { SearchTab } from "@/components/Home/SearchTab";
import { NodesTab } from "@/components/Nodes/NodesTab";
import {
  getActiveHomeTab,
  NODES_HOME_TAB_INDEX,
  setActiveHomeTab,
  type HomeTabIndex,
} from "./home-view-state";
import { HomeModal } from "@/components/Modals/HomeModal";
import { StatsModal } from "@/components/Modals/StatsModal";
import { useHomeData } from "@/hooks/useHomeData";
import { useGlobalSettings } from "@/hooks/useGlobalSettings";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useViewportDimensions } from "@/hooks/useViewportDimensions";
import { Colors, layoutDims } from "@/styles/styles";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIsFocused, useLocalSearchParams } from "expo-router";

export default function Home() {
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const isFocused = useIsFocused();
  const initialActiveTab = useRef(getActiveHomeTab()).current;
  const insets = useSafeAreaInsets();
  const { ui, spacing } = useResponsiveMetrics();
  const { width: viewportWidth, height: viewportHeight } =
    useViewportDimensions();
  const isWeb = Platform.OS === "web";

  const pagerRef = useRef<ScrollView>(null);

  const [isLoaded, setIsLoaded] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [homeDataRefreshToken, setHomeDataRefreshToken] = useState(0);
  const [activeTab, setActiveTab] = useState<HomeTabIndex>(initialActiveTab);
  const [mountedTabs, setMountedTabs] = useState<Set<HomeTabIndex>>(
    () =>
      new Set(
        [initialActiveTab - 1, initialActiveTab, initialActiveTab + 1].filter(
          (index): index is HomeTabIndex =>
            index >= 0 && index <= NODES_HOME_TAB_INDEX,
        ),
      ),
  );
  const activeTabRef = useRef<HomeTabIndex>(initialActiveTab);
  const isTabPressScrollRef = useRef(false);

  const renderedContentWidth = Math.min(ui.contentMaxWidth, viewportWidth);
  const { settings, updateSettings } = useGlobalSettings();
  const cardSize = settings.discoverCardSize ?? "large";

  const [pageWidth, setPageWidth] = useState(renderedContentWidth);
  const [pagerHeight, setPagerHeight] = useState(0);

  const {
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

  const headerReserved =
    insets.top +
    spacing(layoutDims.pagePadding * 0.5) +
    ui.gameHeaderHeight +
    spacing(layoutDims.pagePadding * 0.5);
  const contentPaddingTop = headerReserved + spacing(10);
  const contentPaddingBottom = spacing(layoutDims.menuBarHeight + 40);

  const onInvalidateHomeData = () => {
    setHomeDataRefreshToken((current) => current + 1);
  };

  useEffect(() => {
    // Delay rendering heavy components so the UI can mount and fade in first.
    const timer = setTimeout(() => setIsLoaded(true), 150);
    return () => clearTimeout(timer);
  }, []);

  // Realign the pager to the active tab when its width changes (resize /
  // orientation). Reading the tab from a ref avoids re-running on tab changes,
  // which would cancel the animated scroll started by a tab tap.
  useEffect(() => {
    isTabPressScrollRef.current = true;
    pagerRef.current?.scrollTo({
      x: activeTabRef.current * pageWidth,
      animated: false,
    });
  }, [pageWidth]);

  const onPagerLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && Math.abs(width - pageWidth) > 1) {
      setPageWidth(width);
    }
    if (height > 0 && Math.abs(height - pagerHeight) > 1) {
      setPagerHeight(height);
    }
  };

  // Update the highlighted tab as the pager settles. Native paging and CSS
  // scroll-snap both guarantee it rests on a page; `scroll-snap-stop: always`
  // (web) additionally stops a single swipe from skipping past a neighbour.
  const syncActiveTab = (offsetX: number) => {
    if (pageWidth <= 0) return;
    const index = Math.max(
      0,
      Math.min(NODES_HOME_TAB_INDEX, Math.round(offsetX / pageWidth)),
    ) as HomeTabIndex;
    if (index === activeTabRef.current) {
      isTabPressScrollRef.current = false;
      return;
    }
    // Ignore the intermediate pages a tab-tap animation scrolls through so the
    // highlight doesn't flicker.
    if (isTabPressScrollRef.current) return;
    activeTabRef.current = index;
    mountTab(index);
    setActiveHomeTab(index);
    setActiveTab(index);
  };

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    syncActiveTab(event.nativeEvent.contentOffset.x);
  };

  const onPagerSettled = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    onScroll(event);
    mountTabAndNeighbours(activeTabRef.current);
  };

  const onSelectTab = (requestedIndex: number) => {
    const index = Math.max(
      0,
      Math.min(NODES_HOME_TAB_INDEX, requestedIndex),
    ) as HomeTabIndex;
    if (index === activeTabRef.current) return;
    mountTab(index);
    isTabPressScrollRef.current = true;
    activeTabRef.current = index;
    setActiveHomeTab(index);
    setActiveTab(index);
    pagerRef.current?.scrollTo({ x: index * pageWidth, animated: true });
  };

  useEffect(() => {
    if (tab === "nodes" && activeTabRef.current !== NODES_HOME_TAB_INDEX) {
      onSelectTab(NODES_HOME_TAB_INDEX);
    }
  }, [pageWidth, tab]);

  const mountTab = (index: HomeTabIndex) => {
    setMountedTabs((current) => {
      if (current.has(index)) return current;
      const next = new Set(current);
      next.add(index);
      return next;
    });
  };

  const mountTabAndNeighbours = (index: HomeTabIndex) => {
    setMountedTabs((current) => {
      const next = new Set(current);
      for (const candidate of [index - 1, index, index + 1]) {
        if (candidate >= 0 && candidate <= NODES_HOME_TAB_INDEX) {
          next.add(candidate as HomeTabIndex);
        }
      }
      return next.size === current.size ? current : next;
    });
  };

  // On web the screen height comes from window.innerHeight and is applied via a
  // fixed-position container. Mobile Chrome fails to resolve the CSS height
  // cascade (flex / dvh) on first paint and ancestor RN views clip with
  // overflow:hidden, so relying on the cascade left the tabs collapsed until an
  // orientation change. Native uses the reliably measured layout height.
  const screenHeight = isWeb ? viewportHeight : pagerHeight;
  const isScreenReady = !isWeb || screenHeight > 0;

  // Web-only CSS scroll-snap passthrough (RNW forwards unknown style props to
  // the DOM). Mandatory snap keeps pages from resting half-way; snap-stop
  // limits each swipe to a single page.
  const webSnapContainer = (
    isWeb ? { scrollSnapType: "x mandatory" } : null
  ) as Record<string, unknown> | null;
  const webSnapChild = (
    isWeb ? { scrollSnapAlign: "start", scrollSnapStop: "always" } : null
  ) as Record<string, unknown> | null;

  const containerStyle = (
    isWeb
      ? {
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: screenHeight || "100%",
          backgroundColor: Colors.background,
        }
      : { flex: 1, backgroundColor: Colors.background }
  ) as Record<string, unknown>;

  const pageStyle = {
    width: pageWidth,
    height: screenHeight || undefined,
    flex: screenHeight ? undefined : 1,
  } as const;

  const pages = [
    <View key="tab-home" style={[pageStyle, webSnapChild]}>
      {mountedTabs.has(0) && (
        <HomeTab
          onSelectTab={onSelectTab}
          allEnabledGames={allEnabledGames}
          allEnabledGamePaths={allEnabledGamePaths}
          favorites={favorites}
          recentPaths={recentPaths}
          onToggleFavorite={toggleFavorite}
          contentPaddingTop={contentPaddingTop}
          contentPaddingBottom={contentPaddingBottom}
        />
      )}
    </View>,
    <View key="tab-collect" style={[pageStyle, webSnapChild]}>
      {mountedTabs.has(1) && (
        <CollectTab
          allEnabledGames={allEnabledGames}
          settingsMap={settingsMap}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          cardSize={cardSize}
          onCardSizeChange={(value) =>
            updateSettings({ discoverCardSize: value })
          }
          contentPaddingTop={contentPaddingTop}
          contentPaddingBottom={contentPaddingBottom}
        />
      )}
    </View>,
    <View key="tab-search" style={[pageStyle, webSnapChild]}>
      {mountedTabs.has(2) && (
        <SearchTab
          allEnabledGames={allEnabledGames}
          unplayedGamePaths={unplayedGamePaths}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          cardSize={cardSize}
          onCardSizeChange={(value) =>
            updateSettings({ discoverCardSize: value })
          }
          contentPaddingTop={contentPaddingTop}
          contentPaddingBottom={contentPaddingBottom}
        />
      )}
    </View>,
    <View key="tab-nodes" style={[pageStyle, webSnapChild]}>
      {isFocused && activeTab === NODES_HOME_TAB_INDEX && (
        <NodesTab
          settingsMap={settingsMap}
          contentPaddingTop={contentPaddingTop}
        />
      )}
    </View>,
  ];

  return (
    <>
      <LoadingOverlay isLoaded={!!isLoaded} />

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

      <View style={containerStyle} onLayout={onPagerLayout}>
        {isScreenReady && (
          <ScrollView
            ref={pagerRef}
            horizontal
            scrollEnabled={activeTab !== NODES_HOME_TAB_INDEX}
            pagingEnabled={!isWeb}
            showsHorizontalScrollIndicator={false}
            onScroll={onScroll}
            onMomentumScrollEnd={onPagerSettled}
            scrollEventThrottle={16}
            style={[{ flex: 1 }, webSnapContainer]}
            contentContainerStyle={{ height: screenHeight || "100%" }}
          >
            {pages}
          </ScrollView>
        )}

        <HomeHeader
          onOpenSettings={() => setShowSettingsModal(true)}
          onOpenStats={() => setShowStatsModal(true)}
          hideBackground={activeTab === NODES_HOME_TAB_INDEX}
        />

        <HomeTabBar activeIndex={activeTab} onSelectTab={onSelectTab} />
      </View>
    </>
  );
}
