import { LoadingOverlay } from "@/components/common/LoadingOverlay";
import { DiscoverTab } from "@/components/Home/DiscoverTab";
import { HomeHeader } from "@/components/Home/HomeHeader";
import { HomeTab } from "@/components/Home/HomeTab";
import { HomeTabBar } from "@/components/Home/HomeTabBar";
import { SearchModal } from "@/components/Home/SearchModal";
import { SettingsModal } from "@/components/Home/SettingsModal";
import { StatsTab } from "@/components/Home/StatsTab";
import { useHomeData } from "@/hooks/useHomeData";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useViewportDimensions } from "@/hooks/useViewportDimensions";
import { floatingBarDims } from "@/styles/menuStyles";
import { Colors, HomePadding } from "@/styles/styles";
import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView } from "react-native-gesture-handler";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Home() {
  const insets = useSafeAreaInsets();
  const { ui, spacing } = useResponsiveMetrics();
  const { width: viewportWidth, height: viewportHeight } =
    useViewportDimensions();
  const isWeb = Platform.OS === "web";

  const pagerRef = useRef<ScrollView>(null);

  const [isLoaded, setIsLoaded] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [homeDataRefreshToken, setHomeDataRefreshToken] = useState(0);
  const [activeTab, setActiveTab] = useState(0);
  const activeTabRef = useRef(0);
  const isTabPressScrollRef = useRef(false);

  const renderedContentWidth = Math.min(ui.contentMaxWidth, viewportWidth);

  const [pageWidth, setPageWidth] = useState(renderedContentWidth);
  const [pagerHeight, setPagerHeight] = useState(0);

  const {
    favorites,
    recentPaths,
    settingsMap,
    attemptsByPath,
    allEnabledGames,
    allEnabledGamePaths,
    hasLoaded,
    toggleFavorite,
  } = useHomeData(homeDataRefreshToken);

  const unplayedGamePaths = useMemo(
    () =>
      allEnabledGamePaths.filter((path) => (attemptsByPath[path] ?? 0) === 0),
    [allEnabledGamePaths, attemptsByPath],
  );

  const headerReserved =
    insets.top +
    spacing(HomePadding * 0.5) +
    ui.gameHeaderHeight +
    spacing(HomePadding * 0.5);
  const contentPaddingTop = headerReserved + spacing(10);
  const contentPaddingBottom = spacing(floatingBarDims.height + 40);

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
    const index = Math.round(offsetX / pageWidth);
    if (index === activeTabRef.current) {
      isTabPressScrollRef.current = false;
      return;
    }
    // Ignore the intermediate pages a tab-tap animation scrolls through so the
    // highlight doesn't flicker.
    if (isTabPressScrollRef.current) return;
    activeTabRef.current = index;
    setActiveTab(index);
  };

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    syncActiveTab(event.nativeEvent.contentOffset.x);
  };

  const onSelectTab = (index: number) => {
    if (index === activeTabRef.current) return;
    isTabPressScrollRef.current = true;
    activeTabRef.current = index;
    setActiveTab(index);
    pagerRef.current?.scrollTo({ x: index * pageWidth, animated: true });
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
      <HomeTab
        allEnabledGames={allEnabledGames}
        allEnabledGamePaths={allEnabledGamePaths}
        favorites={favorites}
        recentPaths={recentPaths}
        onToggleFavorite={toggleFavorite}
        contentPaddingTop={contentPaddingTop}
        contentPaddingBottom={contentPaddingBottom}
        unplayedGamePaths={unplayedGamePaths}
        hasLoaded={hasLoaded}
      />
    </View>,
    <View key="tab-explore" style={[pageStyle, webSnapChild]}>
      <DiscoverTab
        allEnabledGames={allEnabledGames}
        unplayedGamePaths={unplayedGamePaths}
        favorites={favorites}
        onToggleFavorite={toggleFavorite}
        contentPaddingBottom={contentPaddingBottom}
      />
    </View>,
    <View key="tab-stats" style={[pageStyle, webSnapChild]}>
      <StatsTab
        settingsMap={settingsMap}
        favorites={favorites}
        onToggleFavorite={toggleFavorite}
        contentPaddingTop={contentPaddingTop}
        contentPaddingBottom={contentPaddingBottom}
      />
    </View>,
  ];

  return (
    <>
      <LoadingOverlay isLoaded={!!isLoaded} />

      {showSearchModal && (
        <SearchModal
          allEnabledGames={allEnabledGames}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          query={searchQuery}
          onQueryChange={setSearchQuery}
          onClose={() => setShowSearchModal(false)}
        />
      )}

      {showSettingsModal && (
        <SettingsModal
          onClose={() => setShowSettingsModal(false)}
          onHomeDataInvalidated={onInvalidateHomeData}
        />
      )}

      <View style={containerStyle} onLayout={onPagerLayout}>
        {isScreenReady && (
          <ScrollView
            ref={pagerRef}
            horizontal
            pagingEnabled={!isWeb}
            showsHorizontalScrollIndicator={false}
            onScroll={onScroll}
            onMomentumScrollEnd={onScroll}
            scrollEventThrottle={16}
            style={[{ flex: 1 }, webSnapContainer]}
            contentContainerStyle={{ height: screenHeight || "100%" }}
          >
            {pages}
          </ScrollView>
        )}

        <HomeHeader
          onOpenSearch={() => setShowSearchModal(true)}
          onOpenSettings={() => setShowSettingsModal(true)}
        />

        <HomeTabBar activeIndex={activeTab} onSelect={onSelectTab} />
      </View>
    </>
  );
}
