import { Text } from "@/components/common/Text";
import type { HomeSectionConfig } from "@/components/Home/GamesList";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { flexStyles } from "@/styles/flexStyles";
import { menuStyles } from "@/styles/menuStyles";
import { Colors, HomePadding } from "@/styles/styles";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "../Button/Button";
import { LoadingOverlay } from "../common/LoadingOverlay";
import { GamesList } from "./GamesList";
import { SettingsModal } from "./SettingsModal";
import { StatsModal } from "./StatsModal";
import SoloSuiteLogo from "@/assets/images/SoloSuiteLogo.svg";

const FEATURED_GAME_PATHS: string[] = [
  "/scoundrel",
  "/regicide",
  "/loot-the-loop",
  "/dead-center",
  "/area-52",
  "/monte-carlo",
];

const HOME_SECTIONS: HomeSectionConfig[] = [
  {
    key: "recent",
    title: "Recently Played",
    variant: "medium",
    iconName: "recent",
  },
  {
    key: "favorites",
    title: "Favorites",
    variant: "medium",
    iconName: "star",
  },
  {
    key: "featured",
    title: "Featured",
    variant: "medium",
    gamePaths: FEATURED_GAME_PATHS,
    iconName: "featured",
  },
  {
    key: "discover",
    title: "Discover",
    variant: "medium",
    iconName: "explore",
  },
];

export default function Home() {
  const insets = useSafeAreaInsets();
  const { ui, spacing } = useResponsiveMetrics();

  const [isLoaded, setIsLoaded] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [homeDataRefreshToken, setHomeDataRefreshToken] = useState(0);

  const onInvalidateHomeData = () => {
    setHomeDataRefreshToken((current) => current + 1);
  };

  const headerOffsetTop = insets.top + Math.round(spacing(HomePadding) * 0.5);
  const headerHeight = ui.gameHeaderHeight;

  useEffect(() => {
    // Delay rendering heavy components so the UI can mount and fade in first.
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <LoadingOverlay isLoaded={!!isLoaded} />

      {showStatsModal && (
        <StatsModal onClose={() => setShowStatsModal(false)} />
      )}
      {showSettingsModal && (
        <SettingsModal
          onClose={() => setShowSettingsModal(false)}
          onHomeDataInvalidated={onInvalidateHomeData}
        />
      )}

      <View
        style={[
          {
            flex: 1,
            backgroundColor: Colors.background,
          },
        ]}
      >
        <GamesList
          sections={HOME_SECTIONS}
          refreshToken={homeDataRefreshToken}
          header={
            <View
              key="home-header"
              style={[
                {
                  pointerEvents: "box-none",
                  width: "100%",
                  maxWidth: ui.contentMaxWidth,
                  paddingTop: headerOffsetTop,
                  paddingBottom: headerOffsetTop * 4,
                  alignSelf: "center",
                },
              ]}
            >
              <View
                style={[
                  flexStyles.rowCentered,
                  {
                    pointerEvents: "box-none",
                    height: headerHeight,
                    paddingLeft: spacing(HomePadding),
                    // Less right padding to account for button padding
                    paddingRight: Math.round(spacing(HomePadding) * 0.5),
                  },
                ]}
              >
                <SoloSuiteLogo
                  width={140}
                  height={32}
                  style={{ marginRight: "auto" }}
                />

                <Button
                  iconName="chart"
                  onPress={() => setShowStatsModal(true)}
                  style={[styles.headerBtn, menuStyles.headerButton]}
                />

                <Button
                  iconName="settings"
                  onPress={() => setShowSettingsModal(true)}
                  style={[styles.headerBtn, menuStyles.headerButton]}
                />
              </View>
            </View>
          }
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  headerBtn: {
    backgroundColor: "unset",
    boxShadow: "unset",
    paddingHorizontal: 12,
  },
});
