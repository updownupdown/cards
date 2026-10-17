import { launchGame } from "@/components/common/GameLaunchOverlay";
import { Text } from "@/components/common/Text";
import { GAME_THUMBNAIL_ASSETS } from "@/data/game-thumbnails";
import type { GameMenuInfo } from "@/data/games-data";
import type { HomeGameEntry } from "@/hooks/useHomeData";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useDisplayLanguage, useTranslation } from "@/i18n";
import { localizeGameTitle } from "@/i18n/content";
import { gamePalette, PaletteContext, usePalette } from "@/styles/palette";
import { cardShadow, Colors, rgba, theme } from "@/styles/styles";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import type { Href } from "expo-router";
import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { FavButton } from "./FavButton";
import { useStagedSource, useTabReadyImage } from "./TabReady";

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
    ...cardShadow(
      `0 ${spacing(6)}px ${spacing(18)}px ${rgba(Colors.black, 0.5)}`,
      spacing(8),
    ),
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
      colors={[rgba(theme.night, 0.5), rgba(theme.night, 0.96)]}
      locations={[from, 1]}
      style={StyleSheet.absoluteFill}
    />
  );
}

/** The favourite star's button on a game card, and the star inside it. */
const FAV_SIZE = 36;
const FAV_ICON_SIZE = 20;
/**
 * How far the star sits in from a game card's top and right edges, the same
 * both ways, on every card from the shelves' tiles to Game of the Day.
 */
const FAV_INSET = 10;

/**
 * Where a game card's favourite button goes: its star FAV_INSET in from the
 * card's top and right edges, whatever the size of the button around it.
 */
export function favCorner(
  spacing: (value: number) => number,
  size: number,
  iconSize: number,
) {
  const offset = spacing(FAV_INSET) - (size - iconSize) / 2;
  return { position: "absolute", top: offset, right: offset } as const;
}

/**
 * A game as a card of its art, its name over a fade at the foot and a
 * favourite star in the corner. The star sits beside the pressable art rather
 * than inside it, since a button can't hold another button.
 */
export function GameTile({
  path,
  game,
  size,
  height = size,
  isFavorite,
  onToggleFavorite,
  onOpen,
}: {
  path: string;
  game: GameMenuInfo;
  /** Its width, and its height too unless that is given: a square. */
  size: number;
  height?: number;
  isFavorite?: boolean;
  onToggleFavorite?: (path: string) => void;
  /** Called as the game launches (a modal can close). */
  onOpen?: () => void;
}) {
  const { spacing } = useResponsiveMetrics();
  const frame = useCardFrame();
  const language = useDisplayLanguage();
  const source = useStagedSource(gameArt(game));
  const ready = useTabReadyImage(source);
  const title = localizeGameTitle(game, path, language);
  const palette = useGamePalette(game);
  return (
    <PaletteContext.Provider value={palette}>
      <View
        style={{
          ...frame,
          width: size,
          height,
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
            style={favCorner(
              spacing,
              spacing(FAV_SIZE),
              spacing(FAV_ICON_SIZE),
            )}
            isFavorite={!!isFavorite}
            onToggleFavorite={() => onToggleFavorite(path)}
            size={spacing(FAV_SIZE)}
            iconSize={spacing(FAV_ICON_SIZE)}
            activeColor={theme.accent}
            inactiveColor={palette.ink}
            shadow={false}
          />
        )}
      </View>
    </PaletteContext.Provider>
  );
}

/**
 * The height of a shelf's game cards (Continue, Favorites, the easy games),
 * their width at 4:3, and the gap between cards in a row.
 */
export const TILE_SIZE = 140;
export const TILE_WIDTH = (TILE_SIZE * 4) / 3;
export const TILE_GAP = 12;

/**
 * Stands in for a shelf with no games yet, exactly as tall as the shelf's
 * cards, so the first game added fills it without moving anything below.
 */
export function ShelfPlaceholder({
  height,
  pageSidePadding,
  text,
  testID,
}: {
  height: number;
  pageSidePadding: number;
  text: string;
  testID?: string;
}) {
  const { spacing } = useResponsiveMetrics();
  return (
    <View
      testID={testID}
      style={{
        height,
        marginHorizontal: pageSidePadding,
        borderRadius: spacing(CARD_RADIUS),
        backgroundColor: rgba(theme.night, 0.45),
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: spacing(24),
      }}
    >
      <Text
        size="sm"
        weight={400}
        color={theme.dim}
        style={{ textAlign: "center" }}
      >
        {text}
      </Text>
    </View>
  );
}

/**
 * A row of games that scrolls sideways, edge to edge, every card the same
 * size: Continue, Favorites and the easy games.
 */
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
          size={spacing(TILE_WIDTH)}
          height={spacing(TILE_SIZE)}
          isFavorite={favorites.has(path)}
          onToggleFavorite={onToggleFavorite}
        />
      ))}
    </ScrollView>
  );
}
