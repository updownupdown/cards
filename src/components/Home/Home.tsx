import { Icon } from "@/icons";
import { homeStyles } from "@/styles/homeStyles";
import { Colors } from "@/styles/styles";
import { Link, type Href } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import {
  homeGameList,
  loadFavoriteGames,
  sortHomeGames,
  toggleFavoriteGame,
} from "../../data/game-menu";
import { Button } from "../Button/Button";
import { StatsModal } from "../Modals/StatsModal";
import { SettingsModal } from "../Modals/SettingsModal";

export default function Home() {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    loadFavoriteGames().then((loaded) => {
      if (!cancelled) setFavorites(loaded);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const orderedGames = useMemo(
    () => sortHomeGames(homeGameList, favorites),
    [favorites],
  );
  const favoriteGames = useMemo(
    () => orderedGames.filter((game) => favorites.has(game.path)),
    [orderedGames, favorites],
  );
  const nonFavoriteGames = useMemo(
    () => orderedGames.filter((game) => !favorites.has(game.path)),
    [orderedGames, favorites],
  );

  async function onToggleFavorite(path: string) {
    const updated = await toggleFavoriteGame(path);
    setFavorites(new Set(updated));
  }

  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  return (
    <>
      {showStatsModal && (
        <StatsModal onClose={() => setShowStatsModal(false)} />
      )}
      {showSettingsModal && (
        <SettingsModal onClose={() => setShowSettingsModal(false)} />
      )}

      <ScrollView contentContainerStyle={homeStyles.scrollContent}>
        <View style={{ gap: 10, width: "100%", marginBottom: 10 }}>
          <Button
            onPress={() => setShowStatsModal(true)}
            text="View all game stats"
            size="text"
            fullWidth
          />
          <Button
            onPress={() => setShowSettingsModal(true)}
            text="App Settings"
            size="text"
            fullWidth
          />
        </View>

        <View style={homeStyles.linkCol}>
          {favoriteGames.length > 0 ? (
            <>
              {/* "Favorites" Header */}
              <View style={homeStyles.sectionHeaderRow}>
                <Text style={homeStyles.sectionHeader}>Favorites</Text>
              </View>

              {/* Favourites */}
              {favoriteGames.map((game) => (
                <View key={game.path} style={homeStyles.gameRow}>
                  <Link href={game.path as Href} style={homeStyles.gameButton}>
                    {game.title}
                  </Link>
                  <Pressable
                    style={[homeStyles.starBtn, homeStyles.starBtnOn]}
                    onPress={() => onToggleFavorite(game.path)}
                  >
                    <Icon name="star" color={Colors.favoriteStar} />
                  </Pressable>
                </View>
              ))}
            </>
          ) : null}

          {/* "All Games" Heading */}
          <View style={homeStyles.sectionHeaderRow}>
            <Text style={homeStyles.sectionHeader}>All Games</Text>
          </View>

          {/* Other Games */}
          {nonFavoriteGames.map((game) => (
            <View key={game.path} style={homeStyles.gameRow}>
              <Link href={game.path as Href} style={homeStyles.gameButton}>
                {game.title}
              </Link>
              <Pressable
                style={homeStyles.starBtn}
                onPress={() => onToggleFavorite(game.path)}
              >
                <Icon name="star-outline" color={Colors.K500} />
              </Pressable>
            </View>
          ))}
        </View>
      </ScrollView>
    </>
  );
}
