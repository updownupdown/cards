import { launchGame } from "@/components/common/GameLaunchOverlay";
import { Text } from "@/components/common/Text";
import { ActionButton, hairline } from "@/components/ui/Nocturne";
import { GAME_THUMBNAIL_ASSETS } from "@/data/game-thumbnails";
import type { GameMenuInfo } from "@/data/games-data";
import type { HomeGameEntry } from "@/hooks/useHomeData";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useDisplayLanguage, useTranslation } from "@/i18n";
import { localizeGameTitle } from "@/i18n/content";
import { rgba, theme } from "@/styles/styles";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import type { Href } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { FavButton } from "./FavButton";
import { useTabReadyImage } from "./TabReady";

export function gameArt(game: GameMenuInfo) {
  return game.thumbnail ? GAME_THUMBNAIL_ASSETS[game.thumbnail] : null;
}

/** The name of a game's family, its first tag. */
export function useGameCategory() {
  const { t } = useTranslation("home");
  return (game: GameMenuInfo) => t(`tags.${game.tags[0]}`);
}

/** The dark fade at the foot of a picture, so its caption reads. */
export function ArtFade({ from = 0.35 }: { from?: number }) {
  return (
    <LinearGradient
      colors={[rgba(theme.night, 0), rgba(theme.night, 0.9)]}
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
  const language = useDisplayLanguage();
  const source = gameArt(game);
  const ready = useTabReadyImage(source);
  const title = localizeGameTitle(game, path, language);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: spacing(6),
        overflow: "hidden",
        backgroundColor: game.gameColorDark,
        borderWidth: 1,
        borderColor: hairline(),
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
        <ArtFade from={0.4} />
        <View
          style={{
            marginTop: "auto",
            paddingHorizontal: spacing(10),
            paddingBottom: spacing(9),
          }}
        >
          <Text size="lg" weight={500} lineHeight={1.15} numberOfLines={2}>
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
          inactiveColor={theme.ink}
          backdrop
        />
      )}
    </View>
  );
}

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
      contentContainerStyle={{
        paddingHorizontal: pageSidePadding,
        gap: spacing(12),
      }}
    >
      {games.map(([path, game]) => (
        <GameTile
          key={path}
          path={path}
          game={game}
          size={spacing(140)}
          isFavorite={favorites.has(path)}
          onToggleFavorite={onToggleFavorite}
        />
      ))}
    </ScrollView>
  );
}

/**
 * The games played last, to pick up again: the latest large, with a Resume
 * button, and the ones before at half its width. The first card leaves the
 * next one peeking in, so the row reads as one that scrolls.
 */
export function ContinueShelf({
  games,
  pageSidePadding,
  pageWidth,
}: {
  games: HomeGameEntry[];
  pageSidePadding: number;
  /** The width the shelf is laid out in, padding included. */
  pageWidth: number;
}) {
  const { spacing } = useResponsiveMetrics();
  const gap = spacing(12);
  const innerWidth = pageWidth - pageSidePadding * 2;
  const firstWidth =
    games.length > 1 ? Math.round(innerWidth * 0.74) : innerWidth;
  const height = spacing(200);
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: pageSidePadding, gap }}
    >
      {games.map(([path, game], index) => (
        <ContinueCard
          key={path}
          path={path}
          game={game}
          width={index === 0 ? firstWidth : Math.round(firstWidth / 2)}
          height={height}
          latest={index === 0}
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
}: {
  path: string;
  game: GameMenuInfo;
  width: number;
  height: number;
  /** The last game played: a larger title and a Resume button. */
  latest: boolean;
}) {
  const { t } = useTranslation("home");
  const { spacing } = useResponsiveMetrics();
  const language = useDisplayLanguage();
  const source = gameArt(game);
  const ready = useTabReadyImage(source);
  const title = localizeGameTitle(game, path, language);
  const open = () => launchGame(path as Href);
  return (
    <View
      style={{
        width,
        height,
        borderRadius: spacing(10),
        overflow: "hidden",
        backgroundColor: game.gameColorDark,
        borderWidth: 1,
        borderColor: hairline(),
      }}
    >
      <Pressable
        onPress={open}
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
        <ArtFade from={latest ? 0.35 : 0.45} />
        <View
          style={{
            marginTop: "auto",
            padding: spacing(latest ? 16 : 12),
            // Clears the Resume button, which sits beside this.
            paddingBottom: latest
              ? spacing(16) + spacing(38) + spacing(10)
              : undefined,
          }}
        >
          <Text
            weight={500}
            size={latest ? "xxl" : "lg"}
            lineHeight={1.15}
            numberOfLines={2}
          >
            {title}
          </Text>
        </View>
      </Pressable>
      {latest && (
        <ActionButton
          small
          iconName="play"
          label={t("sections.resume")}
          onPress={open}
          style={{
            position: "absolute",
            left: spacing(16),
            bottom: spacing(16),
          }}
        />
      )}
    </View>
  );
}
