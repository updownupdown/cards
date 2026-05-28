import {
  homeGameList,
  loadFavoriteGames,
  sortHomeGames,
  toggleFavoriteGame,
} from "@/data/game-menu";
import { Icon } from "@/icons";
import { buttonStyles } from "@/styles/buttonStyles";
import { flexStyles } from "@/styles/flexStyles";
import { homeStyles } from "@/styles/homeStyles";
import { Colors, FontWeight } from "@/styles/styles";
import { Link, type Href } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import Animated, { LinearTransition } from "react-native-reanimated";

export const GamesTab = () => {
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

  const orderedGames = useMemo(
    () => sortHomeGames(homeGameList, favorites),
    [favorites],
  );

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

  if (!isLoaded) {
    return <View style={homeStyles.scrollContent} />;
  }

  return (
    <ScrollView
      contentContainerStyle={homeStyles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={[
          flexStyles.colCentered,
          flexStyles.fullWidth,
          flexStyles.gap12,
          {
            alignItems: "stretch",
            paddingHorizontal: 12,
          },
        ]}
      >
        {orderedGames.map((game) => {
          const isFav = favorites.has(game.path);
          return (
            <View
              key={game.path}
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
                href={game.path as Href}
                style={[
                  buttonStyles.button,
                  buttonStyles.sizeMedium,
                  buttonStyles.fullWidth,
                  {
                    paddingVertical: 10,
                    height: "auto",
                    textTransform: "none",
                    fontFamily: FontWeight[400],
                    backgroundColor: Colors.K800,
                    color: Colors.K200,
                    fontSize: 19,
                    textAlign: "center",
                    borderWidth: 0,
                    borderColor: "unset",
                  },
                ]}
              >
                {game.title}
              </Link>
              <Pressable
                style={[homeStyles.starBtn]}
                onPress={() => onToggleFavorite(game.path)}
              >
                <Icon
                  name={isFav ? "star" : "star-outline"}
                  color={isFav ? Colors.favoriteStar : Colors.K500}
                  size={30}
                />
              </Pressable>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
};
