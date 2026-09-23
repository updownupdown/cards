import { getCardBackImage } from "@/components/Cards/CardAssets";
import { Text } from "@/components/common/Text";
import {
  ALL_CARD_BACK_COLORS,
  CARD_BACK_INKS,
  type CardBackColor,
} from "@/data/card-backs";
import { GAME_DEFINITIONS } from "@/data/games-registry";
import { Colors } from "@/styles/styles";
import { Image } from "expo-image";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const CARD_WIDTH = 96;
const CARD_HEIGHT = 134;

/**
 * Dev preview of the shared card backs: one tile per ink, with the games
 * printed in it. Card backs are no longer per game, so this is the screen to
 * check after editing CardBack.svg or the ink list and re-running
 * `npm run card-backs:generate`.
 */
export default function CardBackColorsScreen() {
  const gamesByInk = new Map<CardBackColor, string[]>(
    ALL_CARD_BACK_COLORS.map((color) => [color, []]),
  );
  for (const game of GAME_DEFINITIONS) {
    gamesByInk.get(game.cardBack)?.push(game.title);
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.grid}>
          {ALL_CARD_BACK_COLORS.map((color) => {
            const titles = (gamesByInk.get(color) ?? []).sort((a, b) =>
              a.localeCompare(b),
            );
            return (
              <View key={color} style={styles.item}>
                <View style={styles.card}>
                  <Image
                    source={getCardBackImage(color.toLowerCase())}
                    contentFit="fill"
                    style={styles.image}
                  />
                </View>
                <Text size="sm" weight="semibold" color={Colors.white}>
                  {color}
                </Text>
                <Text size="xs" color={Colors.K300} style={styles.color}>
                  {CARD_BACK_INKS[color]} · {titles.length}
                </Text>
                <Text size="xs" color={Colors.K400}>
                  {titles.join(", ")}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    width: "100%",
    maxWidth: 1000,
    alignSelf: "center",
    padding: 20,
    gap: 20,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 20,
  },
  item: {
    width: CARD_WIDTH + 80,
    padding: 10,
    gap: 4,
    borderRadius: 8,
    backgroundColor: Colors.K900,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    overflow: "hidden",
    borderRadius: 7,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  color: {
    fontFamily: "monospace",
  },
});
