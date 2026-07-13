import { LoadingOverlay } from "@/components/common/LoadingOverlay";
import { DiscoverTab } from "@/components/Home/DiscoverTab";
import { HomeHeader } from "@/components/Home/HomeHeader";
import { HomeTab } from "@/components/Home/HomeTab";
import { HomeTabBar, HOME_TABS } from "@/components/Home/HomeTabBar";
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
  Platform,
  ScrollView,
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
  const isUserScrollingRef = useRef(false);
  const gestureStartIndexRef = useRef(0);
  const scrollXRef = useRef(0);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const clearSettleTimer = () => {
    if (settleTimerRef.current !== null) {
      clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
  };

  useEffect(() => clearSettleTimer, []);

  // Realign only when the pager width changes (e.g. resize / orientation).
  // Reading the active tab from a ref keeps this effect from firing on tab
  // changes, which would otherwise cancel the animated scroll on tab taps.
  useEffect(() => {
    isTabPressScrollRef.current = true;
    isUserScrollingRef.current = false;
    clearSettleTimer();
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
    // Native measures its height reliably; web height is driven from
    // window.innerHeight instead (see resolvedPagerHeight) because mobile
    // Chrome fails to resolve the CSS height cascade (100dvh / flex) on first
    // paint, leaving pages collapsed until an orientation change.
    if (height > 0 && Math.abs(height - pagerHeight) > 1) {
      setPagerHeight(height);
    }
  };

  const scrollToTab = (index: number, animated = true) => {
    const clamped = Math.max(0, Math.min(index, HOME_TABS.length - 1));
    clearSettleTimer();
    isUserScrollingRef.current = false;
    isTabPressScrollRef.current = true;
    activeTabRef.current = clamped;
    setActiveTab(clamped);
    pagerRef.current?.scrollTo({ x: clamped * pageWidth, animated });
  };

  // Let the pager's native/CSS paging snap to a page, then clamp so a single
  // swipe never advances more than one tab (a fast flick could otherwise skip
  // from the first tab straight to the third).
  const settlePager = () => {
    if (pageWidth <= 0 || !isUserScrollingRef.current) return;
    const startIndex = gestureStartIndexRef.current;
    const landed = Math.round(scrollXRef.current / pageWidth);
    const target = Math.max(
      0,
      Math.min(
        HOME_TABS.length - 1,
        Math.max(startIndex - 1, Math.min(landed, startIndex + 1)),
      ),
    );
    if (target !== landed) {
      // Overshot past the allowed single step: animate back to the neighbour.
      scrollToTab(target);
      return;
    }
    isUserScrollingRef.current = false;
    if (target !== activeTabRef.current) {
      activeTabRef.current = target;
      setActiveTab(target);
    }
  };

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    scrollXRef.current = offsetX;
    if (pageWidth <= 0) return;

    // Ignore scroll events produced by our own animated snap / tab tap until
    // the pager settles on the target page.
    if (isTabPressScrollRef.current) {
      if (Math.abs(offsetX - activeTabRef.current * pageWidth) < 1) {
        isTabPressScrollRef.current = false;
      }
      return;
    }

    // Record where the gesture began so the swipe distance is measured from
    // the tab the user started on.
    if (!isUserScrollingRef.current) {
      isUserScrollingRef.current = true;
      gestureStartIndexRef.current = activeTabRef.current;
    }

    // Web has no drag-end event, so snap once scrolling has come to rest.
    clearSettleTimer();
    settleTimerRef.current = setTimeout(settlePager, 100);
  };

  const onMomentumScrollEnd = () => {
    settlePager();
  };

  const onSelectTab = (index: number) => {
    if (index === activeTabRef.current) return;
    scrollToTab(index);
  };

  const resolvedPagerHeight = isWeb
    ? viewportHeight || pagerHeight
    : pagerHeight;

  const pageStyle = {
    width: pageWidth,
    height: resolvedPagerHeight || undefined,
    flex: resolvedPagerHeight ? undefined : 1,
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
        style={{
          height: isWeb ? resolvedPagerHeight || undefined : undefined,
          flex: isWeb && resolvedPagerHeight ? undefined : 1,
          backgroundColor: Colors.background,
        }}
        onLayout={onPagerLayout}
      >
        <ScrollView
          ref={pagerRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          onMomentumScrollEnd={onMomentumScrollEnd}
          scrollEventThrottle={16}
          style={{ flex: 1 }}
          contentContainerStyle={{ height: resolvedPagerHeight || "100%" }}
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
