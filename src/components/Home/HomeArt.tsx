import { launchGame } from "@/components/common/GameLaunchOverlay";
import { Text } from "@/components/common/Text";
import { ActionButton } from "@/components/ui/Nocturne";
import { GAME_GLOW_ASSETS, GLOW_CORE, GLOW_MARGIN } from "@/data/game-glows";
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
import { useState } from "react";
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
export const CARD_RADIUS = 6;
export function useCardFrame() {
  const { spacing } = useResponsiveMetrics();
  return { borderRadius: spacing(CARD_RADIUS), overflow: "hidden" } as const;
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
  const frame = useCardFrame();
  const language = useDisplayLanguage();
  const source = gameArt(game);
  const ready = useTabReadyImage(source);
  const title = localizeGameTitle(game, path, language);
  return (
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

/** The side of a square game tile, and the gap between tiles in a row. */
export const TILE_SIZE = 140;
export const TILE_GAP = 12;

/** How far a glow reaches past its card, which a shelf leaves room for. */
const GLOW_ROOM = 48;
/** Glows sit a little low, as light falling from the card. */
const GLOW_DROP = 8;

/**
 * A card's aurora: its art, baked into a soft halo (see
 * scripts/generate-card-glows.mjs), laid behind the card's box so the
 * painting seems to cast its own light.
 */
export function CardGlow({
  game,
  left,
  top,
  width,
  height,
}: {
  game: GameMenuInfo;
  left: number;
  top: number;
  width: number;
  height: number;
}) {
  const { spacing } = useResponsiveMetrics();
  const source = game.thumbnail ? GAME_GLOW_ASSETS[game.thumbnail] : null;
  if (!source) return null;
  // The halo's margin, scaled so its art covers the card exactly.
  const marginX = (width / GLOW_CORE) * GLOW_MARGIN;
  const marginY = (height / GLOW_CORE) * GLOW_MARGIN;
  return (
    <Image
      source={source}
      cachePolicy="memory"
      contentFit="fill"
      style={{
        position: "absolute",
        left: left - marginX,
        top: top - marginY + spacing(GLOW_DROP),
        width: width + marginX * 2,
        height: height + marginY * 2,
        opacity: 0.5,
      }}
    />
  );
}

/**
 * The glows for a row of cards, as one layer under all of them, so no glow
 * falls across a neighbouring card.
 */
function ShelfGlows({
  games,
  widths,
  height,
  left,
  top,
  gap,
}: {
  games: HomeGameEntry[];
  widths: number[];
  height: number;
  left: number;
  top: number;
  gap: number;
}) {
  let x = left;
  return (
    <View
      style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}
    >
      {games.map(([path, game], index) => {
        const glow = (
          <CardGlow
            key={path}
            game={game}
            left={x}
            top={top}
            width={widths[index]}
            height={height}
          />
        );
        x += widths[index] + gap;
        return glow;
      })}
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
  const room = spacing(GLOW_ROOM);
  const size = spacing(TILE_SIZE);
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      // Room above and below for the glows, taken back from the layout.
      style={{ marginVertical: -room }}
      contentContainerStyle={{
        paddingHorizontal: pageSidePadding,
        paddingVertical: room,
        gap: spacing(TILE_GAP),
      }}
    >
      <ShelfGlows
        games={games}
        widths={games.map(() => size)}
        height={size}
        left={pageSidePadding}
        top={room}
        gap={spacing(TILE_GAP)}
      />
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
 * The games played last, to pick up again: the latest with a Resume button,
 * as wide as two tiles and their gap, so it lines up with the shelves below,
 * and the ones before a tile wide.
 */
export function ContinueShelf({
  games,
  pageSidePadding,
}: {
  games: HomeGameEntry[];
  pageSidePadding: number;
}) {
  const { spacing } = useResponsiveMetrics();
  const gap = spacing(TILE_GAP);
  const tile = spacing(TILE_SIZE);
  const firstWidth = tile * 2 + gap;
  const height = spacing(200);
  const room = spacing(GLOW_ROOM);
  const widths = games.map((_, index) => (index === 0 ? firstWidth : tile));
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginVertical: -room }}
      contentContainerStyle={{
        paddingHorizontal: pageSidePadding,
        paddingVertical: room,
        gap,
      }}
    >
      <ShelfGlows
        games={games}
        widths={widths}
        height={height}
        left={pageSidePadding}
        top={room}
        gap={gap}
      />
      {games.map(([path, game], index) => (
        <ContinueCard
          key={path}
          path={path}
          game={game}
          width={index === 0 ? firstWidth : tile}
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
  const [resumeWidth, setResumeWidth] = useState(0);
  const frame = useCardFrame();
  return (
    <View
      style={{ ...frame, width, height, backgroundColor: game.gameColorDark }}
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
            padding: spacing(latest ? 14 : 12),
            flexDirection: "row",
            alignItems: "flex-end",
            gap: spacing(10),
          }}
        >
          <Text
            weight={500}
            size={latest ? "xl" : "lg"}
            lineHeight={1.15}
            numberOfLines={2}
            style={{ flex: 1 }}
          >
            {title}
          </Text>
          {/* Room for the Resume button, which sits beside the title. */}
          {latest && <View style={{ width: resumeWidth }} />}
        </View>
      </Pressable>
      {latest && (
        <ActionButton
          small
          iconName="play"
          label={t("sections.resume")}
          onPress={open}
          onLayout={(event) =>
            setResumeWidth(Math.ceil(event.nativeEvent.layout.width))
          }
          style={{
            position: "absolute",
            right: spacing(14),
            bottom: spacing(14),
          }}
        />
      )}
    </View>
  );
}
