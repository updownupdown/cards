import { getCardBackImage } from "@/components/Cards/CardAssets";
import { Text } from "@/components/common/Text";
import { GAME_DEFINITIONS } from "@/data/games-registry";
import { Colors } from "@/styles/styles";
import { Image } from "expo-image";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const CARD_WIDTH = 96;
const CARD_HEIGHT = 134;

export default function CardBackColorsScreen() {
  const games = [...GAME_DEFINITIONS].sort((first, second) =>
    first.title.localeCompare(second.title),
  );

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text size="xxxl" weight="bold" color={Colors.headings}>
          Card Back Colors
        </Text>
        <View style={styles.grid}>
          {games.map((game) => (
            <View
              key={game.path}
              style={[styles.item, { backgroundColor: game.gameColorDark }]}
            >
              <View style={styles.card}>
                <Image
                  source={getCardBackImage(game.path)}
                  contentFit="fill"
                  style={styles.image}
                />
              </View>
              <Text
                size="sm"
                weight="semibold"
                color={game.gameColorPale}
                style={styles.title}
              >
                {game.title}
              </Text>
              <Text size="xs" color={game.gameColorPale} style={styles.color}>
                {game.gameColorMid}
              </Text>
            </View>
          ))}
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
    width: CARD_WIDTH + 20,
    padding: 10,
    gap: 4,
    borderRadius: 8,
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
  title: {
    marginTop: 4,
  },
  color: {
    fontFamily: "monospace",
  },
});
