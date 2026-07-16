import { Text } from "@/components/common/Text";
import { HomeCard } from "@/components/Home/HomeCard";
import ModalFull from "@/components/Modals/ModalFull";
import type { HomeGameEntry } from "@/hooks/useHomeData";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { Icon } from "@/icons";
import { Colors, FontWeight, rgba } from "@/styles/styles";
import { useEffect, useMemo, useRef } from "react";
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

  const hasQuery = query.trim().length > 0;
  const inputBgColor = rgba(Colors.K950, 0.7);
  const inputHeight = spacing(52);
  const borderRadius = spacing(12);
  const iconSize = spacing(52 * 0.4);
  const webSearchInputProps =
    Platform.OS === "web"
      ? ({ id: "home-search-input", name: "home-search" } as any)
      : undefined;

  return (
    <ModalFull title="Search" onClose={onClose}>
      <View style={{ flex: 1, paddingHorizontal: spacing(24) }}>
        {/* Search input */}
        <View
          style={{
            minHeight: inputHeight,
            borderRadius,
            backgroundColor: inputBgColor,
            flexDirection: "row",
            alignItems: "center",
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
            placeholder="Search games..."
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

          {results.map(([path, game]) => (
            <HomeCard
              key={path}
              path={path}
              game={game}
              size="large"
              onToggleFavorite={onToggleFavorite}
              isFavorite={favorites.has(path)}
              style={{ width: "100%" }}
              onOpen={onClose} // Close the modal when a game is opened
            />
          ))}
        </ScrollView>
      </View>
    </ModalFull>
  );
}
