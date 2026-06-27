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
import {
  Colors,
  FontWeight,
  HomePadding,
  MaxContentWidth,
} from "@/styles/styles";
import { textStyles } from "@/styles/textStyles";
import { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { LargeHomeCard, SmallHomeCard } from "./HomeCards";

const SMALL_CARD_GAP = 16;

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
  const { width: screenWidth } = useWindowDimensions();

  const containerWidth =
    Math.min(screenWidth, MaxContentWidth) - HomePadding * 2;
  const smallCardWidth = (containerWidth - SMALL_CARD_GAP) / 2;

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
        .filter(([_, game]) => !!game && game.enabled !== false);
    } else if (section.key === "favorites") {
      gameList = gameEntries.filter(
        ([key, val]) => favorites.has(key) && val.enabled !== false,
      );
    } else {
      gameList = gameEntries.filter(
        ([key, val]) => val.category === section.key && val.enabled !== false,
        //  &&          !favorites.has(key),
      );
    }

    if (section.key !== "recent") {
      gameList.sort((a, b) => a[1].title.localeCompare(b[1].title));
    }

    if (gameList.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={[textStyles.default, styles.sectionTitle]}>
          {section.title}
        </Text>

        {section.variant === "small" ? (
          <View style={styles.smallCardGrid}>
            {gameList.map(([path, game]) => (
              <SmallHomeCard
                key={path}
                path={path}
                game={game}
                width={smallCardWidth}
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
  section: {
    gap: 10,
  },
  sectionTitle: {
    alignItems: "flex-start",
    paddingLeft: HomePadding,
    paddingTop: HomePadding * 1.5,
    paddingBottom: 6,
    fontFamily: FontWeight[300],
    fontSize: 14,
    textTransform: "uppercase",
    color: Colors.K500,
  },
  smallCardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "stretch",
    justifyContent: "space-between",
    rowGap: SMALL_CARD_GAP,
    columnGap: SMALL_CARD_GAP,
    paddingVertical: 12,
  },
  cardList: {
    gap: 16,
  },
});
