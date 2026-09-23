import { LoadingOverlay } from "@/components/common/LoadingOverlay";
import { CollectTab } from "@/components/Home/CollectTab";
import { HomeHeader } from "@/components/Home/HomeHeader";
import { HomeStarfieldBackground } from "@/components/Home/HomeStarfieldBackground";
import { HomeTab } from "@/components/Home/HomeTab";
import { HomeTabBar } from "@/components/Home/HomeTabBar";
import { SearchTab } from "@/components/Home/SearchTab";
import { NodesTab } from "@/components/Nodes/NodesTab";
import {
  COLLECT_HOME_TAB_INDEX,
  getActiveHomeTab,
  HOME_HOME_TAB_INDEX,
  LAST_HOME_TAB_INDEX,
  NODES_HOME_TAB_INDEX,
  SEARCH_HOME_TAB_INDEX,
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
import { Animated, Platform, View, type LayoutChangeEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIsFocused, useLocalSearchParams } from "expo-router";

const TAB_FADE_DURATION = 150;

export default function Home() {
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const isFocused = useIsFocused();
  const initialActiveTab = useRef(getActiveHomeTab()).current;
  const insets = useSafeAreaInsets();
  const { ui, spacing } = useResponsiveMetrics();
  const { width: viewportWidth, height: viewportHeight } =
    useViewportDimensions();
  const isWeb = Platform.OS === "web";

  const [isLoaded, setIsLoaded] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [homeDataRefreshToken, setHomeDataRefreshToken] = useState(0);
  const [activeTab, setActiveTab] = useState<HomeTabIndex>(initialActiveTab);
  const [showHeaderBackground, setShowHeaderBackground] = useState(false);
  const activeTabRef = useRef<HomeTabIndex>(initialActiveTab);
  const pendingTabRef = useRef<HomeTabIndex>(initialActiveTab);
  const tabContentOpacity = useRef(new Animated.Value(1)).current;
  const { settings, updateSettings } = useGlobalSettings();
  const cardSize = settings.discoverCardSize ?? "large";

  const [containerHeight, setContainerHeight] = useState(0);

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
  // Clear the floating tab bar, which grows by the bottom safe-area inset
  // (Android's navigation bar), with a comfortable gap after the last item.
  const contentPaddingBottom =
    spacing(layoutDims.tabBarHeight + layoutDims.pagePadding * 0.5 + 48) +
    insets.bottom;
  const searchControlBottom =
    spacing(layoutDims.tabBarHeight + layoutDims.pagePadding) + insets.bottom;

  const onInvalidateHomeData = () => {
    setHomeDataRefreshToken((current) => current + 1);
  };

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
    if (index === pendingTabRef.current) return;
    pendingTabRef.current = index;
    setShowHeaderBackground(false);
    tabContentOpacity.stopAnimation();
    Animated.timing(tabContentOpacity, {
      toValue: 0,
      duration: TAB_FADE_DURATION,
      useNativeDriver: !isWeb,
    }).start(({ finished }) => {
      if (!finished || pendingTabRef.current !== index) return;
      activeTabRef.current = index;
      setActiveHomeTab(index);
      setActiveTab(index);
      Animated.timing(tabContentOpacity, {
        toValue: 1,
        duration: TAB_FADE_DURATION,
        useNativeDriver: !isWeb,
      }).start();
    });
  };

  useEffect(() => {
    if (tab === "nodes" && activeTabRef.current !== NODES_HOME_TAB_INDEX) {
      onSelectTab(NODES_HOME_TAB_INDEX);
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

      <View style={containerStyle} onLayout={onContainerLayout}>
        {isScreenReady && (
          <View style={{ flex: 1, height: screenHeight || undefined }}>
            <HomeStarfieldBackground
              animationsEnabled={settings.showAnimations}
              width={viewportWidth}
              height={viewportHeight}
            />

            <Animated.View
              style={{ flex: 1, opacity: tabContentOpacity }}
              testID="home-tab-content"
            >
              {activeTab === HOME_HOME_TAB_INDEX && (
                <HomeTab
                  onSelectTab={onSelectTab}
                  allEnabledGames={allEnabledGames}
                  allEnabledGamePaths={allEnabledGamePaths}
                  favorites={favorites}
                  recentPaths={recentPaths}
                  onToggleFavorite={toggleFavorite}
                  onScrolledChange={setShowHeaderBackground}
                  contentPaddingTop={contentPaddingTop}
                  contentPaddingBottom={contentPaddingBottom}
                />
              )}
              {isFocused && activeTab === NODES_HOME_TAB_INDEX && (
                <NodesTab
                  settingsMap={settingsMap}
                  contentPaddingTop={contentPaddingTop}
                />
              )}
              {activeTab === COLLECT_HOME_TAB_INDEX && (
                <CollectTab
                  allEnabledGames={allEnabledGames}
                  settingsMap={settingsMap}
                  favorites={favorites}
                  onToggleFavorite={toggleFavorite}
                  cardSize={cardSize}
                  onCardSizeChange={(value) =>
                    updateSettings({ discoverCardSize: value })
                  }
                  onScrolledChange={setShowHeaderBackground}
                  contentPaddingTop={contentPaddingTop}
                  contentPaddingBottom={contentPaddingBottom}
                />
              )}
              {activeTab === SEARCH_HOME_TAB_INDEX && (
                <SearchTab
                  allEnabledGames={allEnabledGames}
                  unplayedGamePaths={unplayedGamePaths}
                  favorites={favorites}
                  onToggleFavorite={toggleFavorite}
                  cardSize={cardSize}
                  onCardSizeChange={(value) =>
                    updateSettings({ discoverCardSize: value })
                  }
                  onScrolledChange={setShowHeaderBackground}
                  contentPaddingTop={contentPaddingTop}
                  contentPaddingBottom={contentPaddingBottom}
                  searchControlBottom={searchControlBottom}
                />
              )}
            </Animated.View>
          </View>
        )}

        <HomeHeader
          onOpenSettings={() => setShowSettingsModal(true)}
          onOpenStats={() => setShowStatsModal(true)}
          showBackground={
            activeTab !== NODES_HOME_TAB_INDEX && showHeaderBackground
          }
        />

        <HomeTabBar
          activeIndex={activeTab}
          onSelectTab={onSelectTab}
          showBackground={
            activeTab !== NODES_HOME_TAB_INDEX && showHeaderBackground
          }
        />
      </View>
    </>
  );
}
