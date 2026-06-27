import { Text } from "@/components/common/Text";
import {
  loadFavoriteGames,
  loadRecentlyPlayedGames,
  toggleFavoriteGame,
} from "@/data/game-menu";
import {
  GameCategory,
  GameCategoryNames,
  GameMenuInfo,
  GAMES_DATA,
} from "@/data/games-data";
import { Colors, HomePadding } from "@/styles/styles";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { LargeHomeCard, SmallHomeCard } from "./HomeCards";

type CardVariant = "small" | "large";

type HomeSectionKey = GameCategory | "favorites" | "recent";

type HomeSectionConfig = {
  key: HomeSectionKey;
  title: string;
  variant: CardVariant;
};

const HOME_SECTIONS: HomeSectionConfig[] = [
  { key: "recent", title: "Recently Played", variant: "small" },
  { key: "favorites", title: "Favorites", variant: "small" },
  {
    key: GameCategory.Isaludo,
    title: GameCategoryNames[GameCategory.Isaludo],
    variant: "large",
  },
  {
    key: GameCategory.ClassicSolitaire,
    title: GameCategoryNames[GameCategory.ClassicSolitaire],
    variant: "large",
  },
  {
    key: GameCategory.Beta,
    title: GameCategoryNames[GameCategory.Beta],
    variant: "large",
  },
];

export const GamesList = () => {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [recentPaths, setRecentPaths] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    Promise.all([loadFavoriteGames(), loadRecentlyPlayedGames()]).then(
      ([loadedFavorites, loadedRecent]) => {
        if (!cancelled) {
          setFavorites(loadedFavorites);
          setRecentPaths(loadedRecent.map((entry) => entry.path));
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, []);

  async function onToggleFavorite(path: string) {
    const updated = await toggleFavoriteGame(path);
    setFavorites(new Set(updated));
  }

  const GamesCategory = ({ section }: { section: HomeSectionConfig }) => {
    const gameEntries = Object.entries(GAMES_DATA);
    let gameList: [string, GameMenuInfo][] = [];

    if (section.key === "recent") {
      gameList = recentPaths
        .map((path) => [path, GAMES_DATA[path]] as [string, GameMenuInfo])
        .filter(([_, game]) => !!game && game.enabled !== false)
        .slice(0, 3);
    } else if (section.key === "favorites") {
      gameList = gameEntries.filter(
        ([key, val]) => favorites.has(key) && val.enabled !== false,
      );
    } else {
      gameList = gameEntries.filter(
        ([key, val]) => val.category === section.key && val.enabled !== false,
      );
    }

    if (section.key !== "recent") {
      gameList.sort((a, b) => a[1].title.localeCompare(b[1].title));
    }

    if (gameList.length === 0) return null;

    return (
      <View style={[{ gap: 10 }]}>
        <Text
          style={[
            {
              alignItems: "flex-start",
              paddingLeft: HomePadding,
              paddingTop: HomePadding * 1.5,
              paddingBottom: 6,
            },
          ]}
          weight={300}
          size="sm"
          textTransform={"uppercase"}
          color={Colors.K500}
        >
          {section.title}
        </Text>

        {section.variant === "small" ? (
          <View style={styles.smallCardGrid}>
            {gameList.map(([path, game]) => (
              <SmallHomeCard
                key={path}
                path={path}
                game={game}
                onToggleFavorite={onToggleFavorite}
                isFavorite={favorites.has(path)}
              />
            ))}
          </View>
        ) : (
          <View style={styles.cardList}>
            {gameList.map(([path, game]) => (
              <LargeHomeCard
                key={path}
                path={path}
                game={game}
                onToggleFavorite={onToggleFavorite}
                isFavorite={favorites.has(path)}
              />
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <ScrollView
      contentContainerStyle={{
        paddingHorizontal: HomePadding,
        paddingBottom: HomePadding * 2.5,
      }}
      showsVerticalScrollIndicator={false}
    >
      {HOME_SECTIONS.map((section) => {
        if (section.key === "recent" && recentPaths.length === 0) return null;
        if (section.key === "favorites" && favorites.size === 0) return null;
        return (
          <GamesCategory key={`section-${section.key}`} section={section} />
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  smallCardGrid: {
    flexDirection: "column",
    alignItems: "stretch",
    rowGap: 10,
  },
  cardList: {
    gap: 26,
  },
});
