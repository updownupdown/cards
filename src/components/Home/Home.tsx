import { Text } from "@/components/common/Text";
import type { HomeSectionConfig } from "@/components/Home/GamesList";
import { useResponsiveScale } from "@/hooks/useResponsiveLayout";
import { flexStyles } from "@/styles/flexStyles";
import { menuStyles } from "@/styles/menuStyles";
import { Colors, HomePadding, MaxContentWidth } from "@/styles/styles";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "../Button/Button";
import { LoadingOverlay } from "../common/LoadingOverlay";
import { GamesList } from "./GamesList";
import { SettingsModal } from "./SettingsModal";
import { StatsModal } from "./StatsModal";

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
  const responsiveScale = useResponsiveScale();

  const [isLoaded, setIsLoaded] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);

  const headerOffsetTop =
    insets.top + Math.round(HomePadding * responsiveScale * 0.5);
  const headerHeight = Math.round(52 * responsiveScale);

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
        <SettingsModal onClose={() => setShowSettingsModal(false)} />
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
          header={
            <View
              key="home-header"
              style={[
                {
                  pointerEvents: "box-none",
                  width: "100%",
                  maxWidth: MaxContentWidth * responsiveScale,
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
                    paddingLeft: HomePadding * responsiveScale,
                    // Less right padding to account for button padding
                    paddingRight: HomePadding * responsiveScale * 0.5,
                  },
                ]}
              >
                <Text size="xl" weight={200} style={[flexStyles.flex1]}>
                  Solo Suite
                </Text>

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
