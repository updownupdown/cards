import { Text } from "@/components/common/Text";
import { GameCategory, GameCategoryNames } from "@/data/games-data";
import type { HomeTabConfig } from "@/components/Home/GamesList";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, FontWeight, HomePadding, rgba } from "@/styles/styles";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button } from "../Button/Button";
import { LoadingOverlay } from "../common/LoadingOverlay";
import { GamesList } from "./GamesList";
import { SettingsModal } from "./SettingsModal";
import { StatsModal } from "./StatsModal";
import { menuStyles } from "@/styles/menuStyles";

const HOME_TABS: HomeTabConfig[] = [
  {
    key: "home",
    title: "Home",
    iconName: "home",
    sections: [
      {
        key: "recent",
        title: "Recently Played",
        variant: "small",
        firstCardLarge: true,
      },
      { key: "favorites", title: "Favorites", variant: "small" },
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
  const [isLoaded, setIsLoaded] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);

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
            flexStyles.rowCentered,
            {
              position: "relative",
              zIndex: 2,
              padding: HomePadding,
              paddingBottom: HomePadding * 0.5,
              boxShadow: `0 0 20px ${rgba(Colors.background, 1)}`,
            },
          ]}
        >
          <Text
            size="sm"
            style={[
              flexStyles.flex1,
              {
                paddingLeft: HomePadding,
                fontFamily: FontWeight[200],
                fontSize: 22,
              },
            ]}
          >
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
