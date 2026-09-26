/* eslint-disable i18next/no-literal-string -- English-only dev review page */
import { CoverArt } from "@/components/common/CoverArt";
import { Text } from "@/components/common/Text";
import { GAME_THUMBNAIL_ASSETS } from "@/data/game-thumbnails";
import { GameTag, type GameDefinition } from "@/data/games-data";
import { GAME_DEFINITIONS } from "@/data/games-registry";
import { useTranslation } from "@/i18n";
import { isLocalDevEnvironment } from "@/utils/utils";
import { Image } from "expo-image";
import { Redirect } from "expo-router";
import {
  Linking,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const COLORS = {
  page: "#0f1114",
  card: "#1a1d22",
  border: "#2a2f36",
  text: "#e8e6e1",
  muted: "#9a9ea6",
  link: "#8ab4ff",
  warning: "#ff8a7a",
};
const GAP = 16;
const MIN_CARD_WIDTH = 260;
const ART_HEIGHT = 260;
/** Roughly a medium Home card, to show how the art is cropped there. */
const CARD_PREVIEW_ASPECT = 2.6;

/** The categories games are collected under, in the Collect tab's order. */
const CATEGORIES = Object.values(GameTag).slice(
  0,
  Object.values(GameTag).indexOf(GameTag.ModernMechanics) + 1,
);

/**
 * Dev-only review page for the games' cover art: every game, local-only ones
 * included, grouped by category, with its artwork whole, how it crops on a
 * Home card, and its credit. Not linked from the app; open /art-gallery.
 */
export default function ArtGalleryScreen() {
  const { width } = useWindowDimensions();
  const { t } = useTranslation("home");

  if (!isLocalDevEnvironment()) return <Redirect href="/" />;

  const columns = Math.max(
    1,
    Math.floor((Math.min(width, 1600) - GAP) / (MIN_CARD_WIDTH + GAP)),
  );
  const cardWidth =
    (Math.min(width, 1600) - GAP * (columns + 1)) / columns - 0.5;
  const uncredited = GAME_DEFINITIONS.filter(
    (game) => !game.thumbnail || !game.thumbnailCredit,
  );

  return (
    <SafeAreaView style={styles.page} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text size="xxxl" weight={600} color={COLORS.text}>
          Cover art
        </Text>
        <Text size="sm" weight={300} color={COLORS.muted}>
          {GAME_DEFINITIONS.length} games. Each artwork is shown whole, with a
          strip below showing how a Home card crops it.
        </Text>
        {uncredited.length > 0 && (
          <Text size="sm" weight={500} color={COLORS.warning}>
            Missing art or credit:{" "}
            {uncredited.map((game) => game.title).join(", ")}
          </Text>
        )}

        {CATEGORIES.map((category) => {
          const games = GAME_DEFINITIONS.filter(
            (game) => game.tags[0] === category,
          ).sort((a, b) => a.title.localeCompare(b.title));
          if (games.length === 0) return null;
          return (
            <View key={category} style={styles.section}>
              <Text size="xl" weight={500} color={COLORS.text}>
                {t(`tags.${category}`)}{" "}
                <Text size="sm" weight={300} color={COLORS.muted}>
                  {games.length}
                </Text>
              </Text>
              <View style={styles.grid}>
                {games.map((game) => (
                  <ArtCard key={game.path} game={game} width={cardWidth} />
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

function ArtCard({ game, width }: { game: GameDefinition; width: number }) {
  const credit = game.thumbnailCredit;
  const inner = width - 24;

  return (
    <View style={[styles.card, { width }]}>
      {game.thumbnail ? (
        <>
          <CoverArt
            thumbnail={game.thumbnail}
            maxHeight={ART_HEIGHT}
            borderRadius={4}
          />
          <Image
            source={GAME_THUMBNAIL_ASSETS[game.thumbnail]}
            cachePolicy="memory"
            contentFit="cover"
            style={{
              width: inner,
              height: inner / CARD_PREVIEW_ASPECT,
              borderRadius: 6,
              backgroundColor: game.gameColorDark,
            }}
          />
        </>
      ) : (
        <View
          style={[
            styles.missing,
            { height: ART_HEIGHT, backgroundColor: game.gameColorDark },
          ]}
        >
          <Text size="md" weight={600} color={COLORS.warning}>
            No cover art
          </Text>
        </View>
      )}

      <Text size="md" weight={600} color={COLORS.text}>
        {game.title}
        {game.enabledOnLocalOnly ? (
          <Text size="xs" weight={400} color={COLORS.muted}>
            {"  "}local only
          </Text>
        ) : null}
      </Text>

      {credit ? (
        <View style={styles.credit}>
          <Text size="sm" weight={500} color={COLORS.text}>
            {credit.title}
          </Text>
          <Text size="xs" weight={300} color={COLORS.muted}>
            {credit.artistName}
            {credit.date ? `, ${credit.date}` : ""}
          </Text>
          <Text
            size="xs"
            weight={400}
            color={COLORS.link}
            onPress={() => void Linking.openURL(credit.sourceLink)}
          >
            {credit.sourceName} ↗
          </Text>
        </View>
      ) : (
        <Text size="xs" weight={500} color={COLORS.warning}>
          No credit
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: COLORS.page,
  },
  content: {
    padding: GAP,
    gap: 8,
    maxWidth: 1600,
    width: "100%",
    alignSelf: "center",
  },
  section: {
    marginTop: 28,
    gap: 12,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GAP,
  },
  card: {
    padding: 12,
    gap: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  missing: {
    width: "100%",
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  credit: {
    gap: 2,
  },
});
