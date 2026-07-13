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
import { Colors, HomePadding } from "@/styles/styles";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Home() {
  const insets = useSafeAreaInsets();
  const { ui, spacing } = useResponsiveMetrics();
  const { width: viewportWidth } = useViewportDimensions();

  const pagerRef = useRef<ScrollView>(null);

  const [isLoaded, setIsLoaded] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [homeDataRefreshToken, setHomeDataRefreshToken] = useState(0);
  const [activeTab, setActiveTab] = useState(0);
  const activeTabRef = useRef(0);
  const isTabPressScrollRef = useRef(false);

  const contentMaxWidth = ui.contentMaxWidth;
  const pageSidePadding = spacing(HomePadding);
  const renderedContentWidth = Math.min(contentMaxWidth, viewportWidth);

  const [pageWidth, setPageWidth] = useState(renderedContentWidth);
  const [pagerHeight, setPagerHeight] = useState(0);
  const [tabBarHeight, setTabBarHeight] = useState(96);

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
  const contentPaddingBottom = tabBarHeight + spacing(30);

  const onInvalidateHomeData = () => {
    setHomeDataRefreshToken((current) => current + 1);
  };

  useEffect(() => {
    // Delay rendering heavy components so the UI can mount and fade in first.
    const timer = setTimeout(() => setIsLoaded(true), 150);
    return () => clearTimeout(timer);
  }, []);

  // Realign only when the pager width changes (e.g. resize / orientation).
  // Reading the active tab from a ref keeps this effect from firing on tab
  // changes, which would otherwise cancel the animated scroll on tab taps.
  useEffect(() => {
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
    // Drive the pager off a measured pixel height rather than height: "100%".
    // On mobile web the horizontal ScrollView can measure a stale/zero size at
    // first paint (before the dynamic viewport height settles), leaving pages
    // collapsed until an orientation change. Measuring the container height
    // self-heals via the layout observer once the viewport resolves.
    if (height > 0 && Math.abs(height - pagerHeight) > 1) {
      setPagerHeight(height);
    }
  };

  const syncActiveTabFromOffset = (offsetX: number) => {
    if (pageWidth <= 0) return;
    const index = Math.round(offsetX / pageWidth);

    // While a tab-tap animation is in flight, ignore the intermediate pages it
    // scrolls through (that's what caused the highlight to flicker). Only clear
    // the guard once the animation settles on the target page.
    if (isTabPressScrollRef.current) {
      if (index === activeTabRef.current) {
        isTabPressScrollRef.current = false;
      }
      return;
    }

    if (index !== activeTabRef.current) {
      activeTabRef.current = index;
      setActiveTab(index);
    }
  };

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    syncActiveTabFromOffset(event.nativeEvent.contentOffset.x);
  };

  const onSelectTab = (index: number) => {
    if (index === activeTabRef.current) return;
    isTabPressScrollRef.current = true;
    activeTabRef.current = index;
    setActiveTab(index);
    pagerRef.current?.scrollTo({ x: index * pageWidth, animated: true });
  };

  const pageStyle = {
    width: pageWidth,
    height: pagerHeight || undefined,
    flex: pagerHeight ? undefined : 1,
  } as const;

  const pages = [
    <View key="tab-home" style={pageStyle}>
      <HomeTab
        allEnabledGames={allEnabledGames}
        allEnabledGamePaths={allEnabledGamePaths}
        favorites={favorites}
        recentPaths={recentPaths}
        settingsMap={settingsMap}
        onToggleFavorite={toggleFavorite}
        contentPaddingTop={contentPaddingTop}
        contentPaddingBottom={contentPaddingBottom}
      />
    </View>,
    <View key="tab-explore" style={pageStyle}>
      <DiscoverTab
        allEnabledGames={allEnabledGames}
        allEnabledGamePaths={allEnabledGamePaths}
        unplayedGamePaths={unplayedGamePaths}
        favorites={favorites}
        onToggleFavorite={toggleFavorite}
        hasLoaded={hasLoaded}
        contentPaddingTop={contentPaddingTop}
        contentPaddingBottom={contentPaddingBottom}
      />
    </View>,
    <View key="tab-stats" style={pageStyle}>
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

      <View
        style={{ flex: 1, backgroundColor: Colors.background }}
        onLayout={onPagerLayout}
      >
        <ScrollView
          ref={pagerRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          onMomentumScrollEnd={onScroll}
          scrollEventThrottle={16}
          style={{ flex: 1 }}
          contentContainerStyle={{ height: pagerHeight || "100%" }}
        >
          {pages}
        </ScrollView>

        <HomeHeader
          contentMaxWidth={contentMaxWidth}
          pageSidePadding={pageSidePadding}
          onOpenSearch={() => setShowSearchModal(true)}
          onOpenSettings={() => setShowSettingsModal(true)}
        />

        <HomeTabBar
          tabBarHeight={tabBarHeight}
          contentMaxWidth={contentMaxWidth}
          pageSidePadding={pageSidePadding}
          activeIndex={activeTab}
          onSelect={onSelectTab}
          onHeightChange={(height) => {
            if (Math.abs(height - tabBarHeight) > 1) {
              setTabBarHeight(height);
            }
          }}
        />
      </View>
    </>
  );
}
