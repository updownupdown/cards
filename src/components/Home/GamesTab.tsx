import { Icon } from "@/icons";
import { homeStyles } from "@/styles/homeStyles";
import { Colors } from "@/styles/styles";
import { Link, type Href } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, UIManager, View } from "react-native";
import Animated, { LinearTransition } from "react-native-reanimated";
import {
  homeGameList,
  loadFavoriteGames,
  sortHomeGames,
  toggleFavoriteGame,
} from "@/data/game-menu";
import { Sparks } from "../common/Sparks";

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
    <ScrollView contentContainerStyle={homeStyles.scrollContent}>
      <View style={homeStyles.linkCol}>
        {orderedGames.map((game) => {
          const isFav = favorites.has(game.path);
          return (
            <Animated.View
              key={game.path}
              style={homeStyles.gameRow}
              layout={LinearTransition.springify()
                .damping(14)
                .stiffness(50)
                .duration(500)}
            >
              <Link href={game.path as Href} style={homeStyles.gameButton}>
                {game.title}
              </Link>
              <Pressable
                style={[homeStyles.starBtn, isFav && homeStyles.starBtnOn]}
                onPress={() => onToggleFavorite(game.path)}
              >
                <View style={{ position: "relative" }}>
                  <Icon
                    name={isFav ? "star" : "star-outline"}
                    color={isFav ? Colors.favoriteStar : Colors.K500}
                  />
                  <Sparks active={lastFavorited === game.path} />
                </View>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
    </ScrollView>
  );
};
