import { Text } from "@/components/common/Text";
import type { HomeTabConfig } from "@/components/Home/GamesList";
import { GameCategory, GameCategoryNames } from "@/data/games-data";
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
  "/loot-the-loop",
  "/dead-center",
  "/area-52",
  "/monte-carlo",
];

const HOME_TABS: HomeTabConfig[] = [
  {
    key: "home",
    title: "Home",
    iconName: "home",
    sections: [
      {
        key: "recent",
        title: "Recently Played",
        emptyMessage: "No recently played games.",
        variant: "small",
        firstCardLarge: true,
      },
      {
        key: "favorites",
        title: "Favorites",
        emptyMessage: "No favorite games.",
        variant: "small",
      },
      {
        key: "featured",
        title: "Featured",
        emptyMessage: "No featured games configured.",
        variant: "small",
        firstCardLarge: true,
        gamePaths: FEATURED_GAME_PATHS,
      },
      // ...(Object.values(GameCategory) as GameCategory[]).map((category) => ({
      //   key: category,
      //   title: GameCategoryNames[category],
      //   variant: "small" as const,
      //   randomSample: true,
      //   sampleSize: 3,
      // })),
    ],
  },
  {
    key: "modern",
    title: "Modern",
    iconName: "collections",
    sections: [
      {
        key: GameCategory.Isaludo,
        title: GameCategoryNames[GameCategory.Isaludo],
        variant: "large",
      },
    ],
  },
  {
    key: "classic",
    title: "Classic",
    iconName: "solitaire",
    sections: [
      {
        key: GameCategory.ClassicSolitaire,
        title: GameCategoryNames[GameCategory.ClassicSolitaire],
        variant: "large",
      },
    ],
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
        <View
          style={[
            {
              pointerEvents: "box-none",
              width: "100%",
              maxWidth: MaxContentWidth * responsiveScale,
              paddingTop: headerOffsetTop,
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
                paddingHorizontal: HomePadding * responsiveScale,
              },
            ]}
          >
            <Text size="lg" weight={300} style={[flexStyles.flex1]}>
              Solo Suite
            </Text>

            <Button
              iconName="chart"
              onPress={() => setShowStatsModal(true)}
              style={[styles.headerBtn, menuStyles.headerButton]}
            />

            {/* <Button
              iconName="settings"
              onPress={() => setShowSettingsModal(true)}
              style={[styles.headerBtn, menuStyles.headerButton]}
            /> */}
          </View>
        </View>

        <GamesList tabs={HOME_TABS} />
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
