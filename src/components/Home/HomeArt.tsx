import { launchGame } from "@/components/common/GameLaunchOverlay";
import { Text } from "@/components/common/Text";
import { ActionButton, hairline, Kicker } from "@/components/ui/Nocturne";
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
import { Pressable, ScrollView, View } from "react-native";
import { useTabReadyImage } from "./TabReady";

export function gameArt(game: GameMenuInfo) {
  return game.thumbnail ? GAME_THUMBNAIL_ASSETS[game.thumbnail] : null;
}

/** The name of a game's family, its first tag. */
export function useGameCategory() {
  const { t } = useTranslation("home");
  return (game: GameMenuInfo) => t(`tags.${game.tags[0]}`);
}

/** A game on a shelf: its art, and its name underneath. */
export function ArtTile({
  path,
  game,
  width,
}: {
  path: string;
  game: GameMenuInfo;
  width: number;
}) {
  const { spacing } = useResponsiveMetrics();
  const language = useDisplayLanguage();
  const category = useGameCategory();
  const source = gameArt(game);
  const ready = useTabReadyImage(source);
  return (
    <Pressable
      onPress={() => launchGame(path as Href)}
      accessibilityRole="button"
      style={{ width, gap: spacing(8) }}
    >
      <Image
        source={source}
        cachePolicy="memory"
        contentFit="cover"
        style={{
          width,
          height: width * 1.25,
          borderRadius: spacing(6),
          borderWidth: 1,
          borderColor: hairline(),
          backgroundColor: game.gameColorDark,
        }}
        {...ready}
      />
      <View style={{ gap: spacing(2) }}>
        <Text size="sm" weight={500} numberOfLines={1}>
          {localizeGameTitle(game, path, language)}
        </Text>
        <Text size="xxs" weight={300} color={theme.dim} numberOfLines={1}>
          {category(game)}
        </Text>
      </View>
    </Pressable>
  );
}

/** A row of games that scrolls sideways, edge to edge. */
export function ArtShelf({
  games,
  pageSidePadding,
}: {
  games: HomeGameEntry[];
  pageSidePadding: number;
}) {
  const { spacing } = useResponsiveMetrics();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: pageSidePadding,
        gap: spacing(14),
      }}
    >
      {games.map(([path, game]) => (
        <ArtTile key={path} path={path} game={game} width={spacing(112)} />
      ))}
    </ScrollView>
  );
}

/** The last game played, large, to pick up again. */
export function ContinueCard({
  path,
  game,
}: {
  path: string;
  game: GameMenuInfo;
}) {
  const { t } = useTranslation("home");
  const { spacing } = useResponsiveMetrics();
  const language = useDisplayLanguage();
  const category = useGameCategory();
  const source = gameArt(game);
  const ready = useTabReadyImage(source);
  const radius = spacing(18);
  return (
    <Pressable
      onPress={() => launchGame(path as Href)}
      accessibilityRole="button"
      style={{
        borderRadius: radius,
        overflow: "hidden",
        aspectRatio: 16 / 11,
        backgroundColor: game.gameColorDark,
        borderWidth: 1,
        borderColor: hairline(),
      }}
    >
      <Image
        source={source}
        cachePolicy="memory"
        contentFit="cover"
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        {...ready}
      />
      <LinearGradient
        colors={[rgba(theme.night, 0), rgba(theme.night, 0.92)]}
        locations={[0.35, 1]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <View
        style={{
          marginTop: "auto",
          padding: spacing(16),
          flexDirection: "row",
          alignItems: "flex-end",
          gap: spacing(12),
        }}
      >
        <View style={{ flex: 1, gap: spacing(6) }}>
          <Kicker>{t("sections.continue")}</Kicker>
          <Text weight={500} size="xxl" numberOfLines={1}>
            {localizeGameTitle(game, path, language)}
          </Text>
          <Text size="xs" weight={300} color={theme.dim} numberOfLines={1}>
            {category(game)}
          </Text>
        </View>
        <ActionButton
          small
          iconName="play"
          label={t("sections.resume")}
          onPress={() => launchGame(path as Href)}
        />
      </View>
    </Pressable>
  );
}
