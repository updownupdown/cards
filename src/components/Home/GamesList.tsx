import { loadFavoriteGames, toggleFavoriteGame } from "@/data/game-menu";
import {
  GameCategory,
  GameCategoryNames,
  GameMenuInfo,
  GAMES_DATA,
} from "@/data/games-data";
import { Icon } from "@/icons";
import { buttonStyles, buttonTransition } from "@/styles/buttonStyles";
import { debugStyles } from "@/styles/debugStyles";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, FontWeight, HomePadding, rgba } from "@/styles/styles";
import { textStyles } from "@/styles/textStyles";
import { Link, type Href } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

export const GamesList = () => {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [lastFavorited, setLastFavorited] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    loadFavoriteGames().then((loaded) => {
      if (!cancelled) {
        setFavorites(loaded);
        setIsLoaded(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  async function onToggleFavorite(path: string) {
    const isAdding = !favorites.has(path);

    // Optimistic UI update to prevent layout jumps/lag
    const newFavs = new Set(favorites);
    if (isAdding) {
      newFavs.add(path);
      setLastFavorited(path);
    } else {
      newFavs.delete(path);
      if (lastFavorited === path) {
        setLastFavorited(null);
      }
    }
    setFavorites(newFavs);

    // Save in background
    const updated = await toggleFavoriteGame(path);
    setFavorites(new Set(updated));
  }

  const GameLink = ({ path, game }: { path: string; game: GameMenuInfo }) => {
    const isFav = favorites.has(path);

    return (
      <View
        style={[
          flexStyles.rowCentered,
          {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          },
        ]}
      >
        <Link
          href={path as Href}
          style={[
            buttonStyles.sizeMedium,
            buttonTransition,
            {
              display: "flex",
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              gap: 6,

              outlineWidth: 0,
              boxShadow: `inset 0 1px 1px ${rgba(Colors.white, 0.2)}, inset 1px 2px 14px ${rgba(Colors.K500, 0.2)}, inset 2px 4px 20px ${rgba(Colors.K600, 0.2)}, -2px -2px 12px ${rgba(Colors.K750, 0.8)}, 2px 2px 16px ${rgba(Colors.K950, 0.5)}`,

              paddingVertical: 10,
              height: "auto",
              textTransform: "none",
              fontFamily: FontWeight[300],
              backgroundColor: Colors.K800,
              color: Colors.K200,
              fontSize: 19,
              textAlign: "center",
              borderWidth: 0,
              borderColor: "unset",
              width: "100%",
            },
          ]}
        >
          {game.title}
        </Link>
        <Pressable
          style={[styles.starBtn]}
          onPress={() => onToggleFavorite(path)}
        >
          <Icon
            name={isFav ? "star" : "star-outline"}
            color={isFav ? Colors.favoriteStar : Colors.K500}
            size={30}
          />
        </Pressable>
      </View>
    );
  };

  const GamesCategory = ({
    category,
  }: {
    category: GameCategory | "favorites";
  }) => {
    let gameEntries = Object.entries(GAMES_DATA);
    // const isFav = favorites.has(game.path);
    let gameList: [string, GameMenuInfo][] = [];

    if (category === "favorites") {
      gameList = gameEntries.filter(
        ([key, val]) => favorites.has(key) && val.enabled !== false,
      );
    } else {
      gameList = gameEntries.filter(
        ([key, val]) =>
          val.category === category &&
          val.enabled !== false &&
          !favorites.has(key),
      );
    }

    gameList.sort((a, b) => a[1].title.localeCompare(b[1].title));

    if (gameList.length === 0) return null;

    return (
      <View style={[flexStyles.colCentered, flexStyles.gap10]}>
        {/* Category Name */}
        <Text
          style={[
            flexStyles.colCentered,
            textStyles.default,
            flexStyles.fullWidth,
            {
              alignItems: "flex-start",
              paddingLeft: HomePadding,
              paddingTop: HomePadding * 1.5,
              paddingBottom: 6,

              fontFamily: FontWeight[300],
              fontSize: 14,
              textTransform: "uppercase",
              color: Colors.K500,
            },
          ]}
        >
          {category === "favorites" ? "Favorites" : GameCategoryNames[category]}
        </Text>

        {/* Game List (in category) */}
        <View
          style={[
            flexStyles.colCentered,
            flexStyles.fullWidth,
            flexStyles.gap16,
            {
              alignItems: "stretch",
            },
          ]}
        >
          {gameList.map(([path, game]) => {
            return <GameLink key={path} path={path} game={game} />;
          })}
        </View>
      </View>
    );
  };

  return (
    <ScrollView
      contentContainerStyle={[
        {
          paddingHorizontal: HomePadding,
          paddingBottom: HomePadding * 2.5,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={[
          flexStyles.colCentered,
          flexStyles.fullWidth,
          flexStyles.gap16,
          {
            alignItems: "stretch",
          },
        ]}
      >
        {favorites.size > 0 && <GamesCategory category="favorites" />}

        {Object.values(GameCategory).map((cat) => (
          <GamesCategory key={`cat-${cat}`} category={cat} />
        ))}
        {/* {orderedGames.map((game) => {
          return <GameLink key={game.path} game={game} />;
        })} */}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  starBtn: {
    width: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
});
