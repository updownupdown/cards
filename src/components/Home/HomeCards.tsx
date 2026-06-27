import { GAME_THUMBNAIL_ASSETS } from "@/data/game-thumbnails";
import { GameMenuInfo } from "@/data/games-data";
import { Icon } from "@/icons";
import { Colors, FontWeight, rgba } from "@/styles/styles";
import { Link, type Href } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

type GameCardBaseProps = {
  path: string;
  game: GameMenuInfo;
  onToggleFavorite?: (path: string) => void;
};

type LargeGameCardProps = GameCardBaseProps & {
  isFavorite: boolean;
};

type SmallGameCardProps = GameCardBaseProps & {
  width: number;
};

function getGameSource(game: GameMenuInfo) {
  return GAME_THUMBNAIL_ASSETS[game.thumbnail];
}

export function SmallHomeCard({ path, game, width }: SmallGameCardProps) {
  const cardStyle = StyleSheet.flatten([
    styles.smallCard,
    {
      width,
      backgroundColor: game.cardColorBg,
      boxShadow: `0 4px 8px ${rgba(game.cardColorBg, 0.6)}`,
    },
  ]);

  return (
    <Link href={path as Href} asChild>
      <Pressable style={cardStyle}>
        <Image
          source={getGameSource(game)}
          style={styles.smallCardImage}
          resizeMode="cover"
        />
        <View style={styles.cardOverlay} />
        <Text
          style={[
            styles.smallCardTitle,
            {
              color: game.cardColorText,
            },
          ]}
        >
          {game.title}
        </Text>
      </Pressable>
    </Link>
  );
}

function StatBar({
  label,
  value,
  fillColor,
}: {
  label: string;
  value: number;
  fillColor: string;
}) {
  return (
    <View style={styles.statColumn}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statTrack}>
        <View
          style={[
            styles.statFill,
            {
              width: `${value}%`,
              backgroundColor: fillColor,
            },
          ]}
        />
      </View>
    </View>
  );
}

export function LargeHomeCard({
  path,
  game,
  onToggleFavorite,
  isFavorite,
}: LargeGameCardProps) {
  const playButtonStyle = StyleSheet.flatten([
    styles.playButton,
    {
      backgroundColor: game.cardColorText,
    },
  ]);

  const playButtonTextStyle = StyleSheet.flatten([
    styles.playButtonText,
    {
      color: game.cardColorBg,
    },
  ]);

  return (
    <View
      style={[
        styles.largeCard,
        {
          backgroundColor: game.cardColorBg,
          boxShadow: `2px 4px 20px ${rgba(Colors.K950, 0.8)}`,
        },
      ]}
    >
      <View style={styles.largeCardTopRow}>
        <View style={styles.largeCardTextColumn}>
          <Text
            style={[
              styles.largeCardTitle,
              {
                color: game.cardColorText,
              },
            ]}
          >
            {game.title}
          </Text>

          <Text style={[styles.largeCardDescription]}>
            {game.cardDescription}
          </Text>
        </View>

        <View style={styles.largeCardImageWrap}>
          <Image
            source={getGameSource(game)}
            style={styles.largeCardImage}
            resizeMode="cover"
          />
          <View style={styles.cardOverlay} />
        </View>
      </View>

      <View style={styles.statsRow}>
        <StatBar
          label="Complexity"
          value={game.stats.complexity}
          fillColor={rgba(game.cardColorText, 0.78)}
        />
        <StatBar
          label="Difficulty"
          value={game.stats.difficulty}
          fillColor={rgba(game.cardColorText, 0.68)}
        />
        <StatBar
          label="Luck"
          value={game.stats.luck}
          fillColor={rgba(game.cardColorText, 0.58)}
        />
      </View>

      <View style={styles.largeCardActions}>
        <Pressable
          style={styles.starBtn}
          onPress={() => onToggleFavorite?.(path)}
          disabled={!onToggleFavorite}
        >
          <Icon
            name={isFavorite ? "star" : "star-outline"}
            color={isFavorite ? Colors.favoriteStar : Colors.K500}
            size={30}
          />
        </Pressable>

        <Link href={path as Href} asChild>
          <Pressable style={playButtonStyle}>
            <Text style={playButtonTextStyle}>Play</Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  smallCard: {
    minHeight: 52,
    borderRadius: 10,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 18,
  },
  smallCardImage: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    opacity: 0.2,
  },
  smallCardTitle: {
    textAlign: "center",
    fontFamily: FontWeight[400],
    fontSize: 16,
    letterSpacing: 0.3,
  },
  largeCard: {
    borderRadius: 12,
    overflow: "hidden",
    padding: 14,
    gap: 12,
  },
  largeCardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  largeCardTextColumn: {
    flex: 1,
    gap: 6,
    paddingTop: 2,
  },
  largeCardImageWrap: {
    width: "35%",
    aspectRatio: 1,
    borderRadius: 8,
    overflow: "hidden",
  },
  largeCardImage: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    opacity: 1,
  },
  largeCardTitle: {
    textAlign: "left",
    fontFamily: FontWeight[500],
    fontSize: 24,
    letterSpacing: 0.2,
  },
  largeCardDescription: {
    fontFamily: FontWeight[300],
    fontSize: 14,
    lineHeight: 20,
    color: Colors.K400,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statColumn: {
    flex: 1,
    gap: 5,
  },
  statLabel: {
    color: Colors.K300,
    fontFamily: FontWeight[300],
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  statTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: rgba(Colors.white, 0.12),
    overflow: "hidden",
  },
  statFill: {
    height: "100%",
    borderRadius: 999,
  },
  largeCardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  starBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: rgba(Colors.black, 0.12),
  },
  playButton: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: rgba(Colors.white, 0.12),
  },
  playButtonText: {
    fontFamily: FontWeight[600],
    fontSize: 15,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  cardOverlay: {
    position: "absolute",
    inset: 0,
    backgroundColor: rgba(Colors.black, 0.18),
  },
});
