import { launchGame } from "@/components/common/GameLaunchOverlay";
import { Text } from "@/components/common/Text";
import { GAME_THUMBNAIL_ASSETS } from "@/data/game-thumbnails";
import type { GameMenuInfo } from "@/data/games-data";
import type { HomeGameEntry } from "@/hooks/useHomeData";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useDisplayLanguage, useTranslation } from "@/i18n";
import { localizeGameTitle } from "@/i18n/content";
import { gamePalette, PaletteContext, usePalette } from "@/styles/palette";
import { Colors, rgba, theme } from "@/styles/styles";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import type { Href } from "expo-router";
import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { FavButton } from "./FavButton";
import { useTabReadyImage } from "./TabReady";

export function gameArt(game: GameMenuInfo) {
  return game.thumbnail ? GAME_THUMBNAIL_ASSETS[game.thumbnail] : null;
}

/**
 * The frame every game card shares, tile to full width: rounded corners and
 * no outline, so the art itself makes the edge. The one place to change it.
 */
export const CARD_RADIUS = 8;
export function useCardFrame() {
  const { spacing } = useResponsiveMetrics();
  return {
    borderRadius: spacing(CARD_RADIUS),
    overflow: "hidden",
    // Lifts the card off the sky.
    boxShadow: `0 ${spacing(6)}px ${spacing(18)}px ${rgba(Colors.black, 0.5)}`,
  } as const;
}

/** How much room a shelf leaves above and below its cards for their shadow. */
const SHADOW_ROOM = 20;

/** A game's own palette, for its card: text, ratings and buttons in its colours. */
export function useGamePalette(game: GameMenuInfo) {
  return useMemo(
    () =>
      gamePalette(game.gameColorDark, game.gameColorPale, game.gameColorAccent),
    [game],
  );
}

/** The name of a game's family, its first tag. */
export function useGameCategory() {
  const { t } = useTranslation("home");
  return (game: GameMenuInfo) => t(`tags.${game.tags[0]}`);
}

/** The dark fade at the foot of a picture, so its caption reads. */
export function ArtFade({ from = 0.35 }: { from?: number }) {
  // On a game's card, the fade is the game's own dark colour.
  const theme = usePalette();
  return (
    <LinearGradient
      colors={[rgba(theme.night, 0.6), rgba(theme.night, 0.96)]}
      locations={[from, 1]}
      style={StyleSheet.absoluteFill}
    />
  );
}

/**
 * A game as a square of its art, its name over a fade at the foot and a
 * favourite star in the corner. The star sits beside the pressable art rather
 * than inside it, since a button can't hold another button.
 */
export function GameTile({
  path,
  game,
  size,
  isFavorite,
  onToggleFavorite,
  onOpen,
}: {
  path: string;
  game: GameMenuInfo;
  size: number;
  isFavorite?: boolean;
  onToggleFavorite?: (path: string) => void;
  /** Called as the game launches (a modal can close). */
  onOpen?: () => void;
}) {
  const { spacing } = useResponsiveMetrics();
  const frame = useCardFrame();
  const language = useDisplayLanguage();
  const source = gameArt(game);
  const ready = useTabReadyImage(source);
  const title = localizeGameTitle(game, path, language);
  const palette = useGamePalette(game);
  return (
    <PaletteContext.Provider value={palette}>
      <View
        style={{
          ...frame,
          width: size,
          height: size,
          backgroundColor: game.gameColorDark,
        }}
      >
        <Pressable
          onPress={() => {
            onOpen?.();
            launchGame(path as Href);
          }}
          accessibilityRole="button"
          accessibilityLabel={title}
          style={StyleSheet.absoluteFill}
        >
          <Image
            source={source}
            cachePolicy="memory"
            contentFit="cover"
            style={StyleSheet.absoluteFill}
            {...ready}
          />
          <ArtFade from={0} />
          <View
            style={{
              marginTop: "auto",
              paddingHorizontal: spacing(10),
              paddingBottom: spacing(14),
            }}
          >
            <Text
              size="lg"
              weight={500}
              lineHeight={1.15}
              numberOfLines={2}
              style={{ textAlign: "center" }}
            >
              {title}
            </Text>
          </View>
        </Pressable>
        {onToggleFavorite && (
          <FavButton
            style={{ position: "absolute", top: 0, right: 0 }}
            isFavorite={!!isFavorite}
            onToggleFavorite={() => onToggleFavorite(path)}
            size={spacing(36)}
            iconSize={spacing(20)}
            activeColor={theme.accent}
            inactiveColor={palette.ink}
          />
        )}
      </View>
    </PaletteContext.Provider>
  );
}

/** The side of a square game tile, and the gap between tiles in a row. */
export const TILE_SIZE = 140;
export const TILE_GAP = 12;

/** A row of games that scrolls sideways, edge to edge. */
export function ArtShelf({
  games,
  pageSidePadding,
  favorites,
  onToggleFavorite,
}: {
  games: HomeGameEntry[];
  pageSidePadding: number;
  favorites: Set<string>;
  onToggleFavorite: (path: string) => void;
}) {
  const { spacing } = useResponsiveMetrics();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      // Room for the cards' shadows, taken back from the layout.
      style={{ marginVertical: -spacing(SHADOW_ROOM) }}
      contentContainerStyle={{
        paddingHorizontal: pageSidePadding,
        paddingVertical: spacing(SHADOW_ROOM),
        gap: spacing(TILE_GAP),
      }}
    >
      {games.map(([path, game]) => (
        <GameTile
          key={path}
          path={path}
          game={game}
          size={spacing(TILE_SIZE)}
          isFavorite={favorites.has(path)}
          onToggleFavorite={onToggleFavorite}
        />
      ))}
    </ScrollView>
  );
}

/**
 * The games played last, to pick up again: the latest with a larger title,
 * as wide as two tiles and their gap, so it lines up with the shelves below,
 * and the ones before a tile wide.
 */
export function ContinueShelf({
  games,
  pageSidePadding,
  favorites,
  onToggleFavorite,
}: {
  games: HomeGameEntry[];
  pageSidePadding: number;
  favorites: Set<string>;
  onToggleFavorite: (path: string) => void;
}) {
  const { spacing } = useResponsiveMetrics();
  const gap = spacing(TILE_GAP);
  const tile = spacing(TILE_SIZE);
  const firstWidth = tile * 2 + gap;
  const height = spacing(200);
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginVertical: -spacing(SHADOW_ROOM) }}
      contentContainerStyle={{
        paddingHorizontal: pageSidePadding,
        paddingVertical: spacing(SHADOW_ROOM),
        gap,
      }}
    >
      {games.map(([path, game], index) => (
        <ContinueCard
          key={path}
          path={path}
          game={game}
          width={index === 0 ? firstWidth : tile}
          height={height}
          latest={index === 0}
          isFavorite={favorites.has(path)}
          onToggleFavorite={onToggleFavorite}
        />
      ))}
    </ScrollView>
  );
}

function ContinueCard({
  path,
  game,
  width,
  height,
  latest,
  isFavorite,
  onToggleFavorite,
}: {
  path: string;
  game: GameMenuInfo;
  width: number;
  height: number;
  /** The last game played: a larger title. */
  latest: boolean;
  isFavorite: boolean;
  onToggleFavorite: (path: string) => void;
}) {
  const { spacing } = useResponsiveMetrics();
  const language = useDisplayLanguage();
  const source = gameArt(game);
  const ready = useTabReadyImage(source);
  const title = localizeGameTitle(game, path, language);
  const frame = useCardFrame();
  const palette = useGamePalette(game);
  return (
    <PaletteContext.Provider value={palette}>
      <View
        style={{ ...frame, width, height, backgroundColor: game.gameColorDark }}
      >
        <Pressable
          onPress={() => launchGame(path as Href)}
          accessibilityRole="button"
          accessibilityLabel={title}
          style={StyleSheet.absoluteFill}
        >
          <Image
            source={source}
            cachePolicy="memory"
            contentFit="cover"
            style={StyleSheet.absoluteFill}
            {...ready}
          />
          <ArtFade from={0} />
          <View
            style={{
              marginTop: "auto",
              padding: spacing(14),
            }}
          >
            <Text
              weight={500}
              size={"lg"}
              lineHeight={1.15}
              numberOfLines={2}
              style={{ textAlign: "center" }}
            >
              {title}
            </Text>
          </View>
        </Pressable>
        <FavButton
          style={{ position: "absolute", top: 0, right: 0 }}
          isFavorite={isFavorite}
          onToggleFavorite={() => onToggleFavorite(path)}
          size={spacing(36)}
          iconSize={spacing(20)}
          activeColor={theme.accent}
          inactiveColor={palette.ink}
        />
      </View>
    </PaletteContext.Provider>
  );
}
