import { Text } from "@/components/common/Text";
import { HomeCard } from "@/components/Home/HomeCard";
import ModalFull from "@/components/Modals/ModalFull";
import type { HomeGameEntry } from "@/hooks/useHomeData";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { Icon } from "@/icons";
import { Colors, FontWeight, rgba } from "@/styles/styles";
import { router, type Href } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Platform, ScrollView, TextInput, View } from "react-native";

type SearchModalProps = {
  allEnabledGames: HomeGameEntry[];
  favorites: Set<string>;
  onToggleFavorite: (path: string) => void;
  query: string;
  onQueryChange: (query: string) => void;
  onClose: () => void;
};

export function SearchModal({
  allEnabledGames,
  favorites,
  onToggleFavorite,
  query,
  onQueryChange,
  onClose,
}: SearchModalProps) {
  const { spacing, font } = useResponsiveMetrics();
  const inputRef = useRef<TextInput>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 120);
    return () => clearTimeout(timer);
  }, []);

  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return [] as HomeGameEntry[];
    }

    return allEnabledGames.filter(([, game]) =>
      game.title.toLowerCase().includes(normalizedQuery),
    );
  }, [allEnabledGames, query]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [query]);

  const openHighlightedGame = () => {
    const highlightedGame = results[highlightedIndex];
    if (!highlightedGame) return;

    onClose();
    router.push(highlightedGame[0] as Href);
  };

  const handleKeyPress = (event: { nativeEvent: { key: string } }) => {
    if (results.length === 0) return;

    if (event.nativeEvent.key === "ArrowDown") {
      setHighlightedIndex((current) =>
        Math.min(current + 1, results.length - 1),
      );
    } else if (event.nativeEvent.key === "ArrowUp") {
      setHighlightedIndex((current) => Math.max(current - 1, 0));
    }
  };

  const hasQuery = query.trim().length > 0;
  const inputBgColor = rgba(Colors.K950, 0.7);
  const inputHeight = spacing(52);
  const borderRadius = spacing(12);
  const iconSize = spacing(52 * 0.5);
  const webSearchInputProps =
    Platform.OS === "web"
      ? ({ id: "home-search-input", name: "home-search" } as any)
      : undefined;

  return (
    <ModalFull title="Search Games" onClose={onClose}>
      <View style={{ flex: 1, paddingTop: spacing(12) }}>
        {/* Search input */}
        <View
          style={{
            minHeight: inputHeight,
            borderRadius,
            backgroundColor: inputBgColor,
            flexDirection: "row",
            alignItems: "center",
            marginHorizontal: spacing(24),
            paddingHorizontal: spacing(52 * 0.24),
            gap: spacing(52 * 0.2),
            minWidth: 0,
          }}
        >
          <Icon
            name="search"
            size={iconSize}
            color={Colors.K500}
            style={{ flexShrink: 0 }}
          />

          <TextInput
            ref={inputRef}
            {...webSearchInputProps}
            autoFocus
            autoCapitalize="none"
            returnKeyType="search"
            returnKeyLabel="Search"
            clearButtonMode="while-editing"
            textContentType="none"
            value={query}
            onChangeText={onQueryChange}
            onKeyPress={handleKeyPress}
            onSubmitEditing={openHighlightedGame}
            placeholder="Search..."
            placeholderTextColor={Colors.K600}
            style={{
              flex: 1,
              flexShrink: 1,
              minWidth: 0,
              color: Colors.K100,
              fontSize: font(17),
              fontFamily: FontWeight[300],
              paddingVertical: 0,
              outline: "none",
              height: "100%",
            }}
          />
        </View>

        {/* Results */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingTop: spacing(20),
            paddingBottom: spacing(40),
            paddingHorizontal: spacing(24),
            gap: spacing(12),
          }}
        >
          {hasQuery && results.length === 0 && (
            <Text
              size="md"
              color={Colors.K400}
              style={{ textAlign: "center", paddingVertical: spacing(24) }}
            >
              No games found
            </Text>
          )}

          {results.map(([path, game], index) => (
            <HomeCard
              key={path}
              path={path}
              game={game}
              size="large"
              onToggleFavorite={onToggleFavorite}
              isFavorite={favorites.has(path)}
              style={{
                width: "100%",
                boxShadow:
                  index === highlightedIndex
                    ? `0 0 0 ${spacing(3)}px ${rgba(game.gameColorPale, 0.5)}`
                    : "none",
              }}
              onOpen={onClose}
            />
          ))}
        </ScrollView>
      </View>
    </ModalFull>
  );
}
