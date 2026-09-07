import { Button } from "@/components/Button/Button";
import { getCollectibleCardImageSource } from "@/components/Cards/CardAssets";
import { Text } from "@/components/common/Text";
import {
  getQuote,
  getQuoteCard,
  getTaoChapter,
  type CollectibleReward,
} from "@/data/collectibles";
import { GAMES_DATA } from "@/data/games-registry";
import { getNodeDefinition, getNodeVisualState } from "@/data/nodes-map";
import type { NodesWinResult } from "@/data/nodes-progress";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { Icon } from "@/icons";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, rgba } from "@/styles/styles";
import { Image } from "expo-image";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
  ViewStyle,
} from "react-native";

type NodesWinOverlayProps = {
  path: string;
  result: NodesWinResult;
  onClose: () => void;
};

function isRewardEarned(reward: CollectibleReward, result: NodesWinResult) {
  const earned =
    reward.type === "tao"
      ? result.progress.collectedTaoIds.includes(reward.id)
      : result.progress.collectedQuoteIds.includes(reward.id);
  return earned;
}

type RewardCardProps = {
  reward: CollectibleReward;
  chapter: ReturnType<typeof getTaoChapter>;
  quote: ReturnType<typeof getQuote>;
  quoteCard: ReturnType<typeof getQuoteCard>;
};

function RewardCard({ reward, chapter, quote, quoteCard }: RewardCardProps) {
  const { spacing } = useResponsiveMetrics();
  const { width } = useWindowDimensions();
  const [isRevealed, setIsRevealed] = useState(false);
  const flip = useRef(new Animated.Value(0)).current;
  const cardWidth = Math.min(width - spacing(80), spacing(280));
  const quoteCardName = quoteCard
    ? `${quoteCard.rank}${quoteCard.suit.charAt(0).toUpperCase()}`
    : undefined;
  const quoteCardImage =
    quoteCard && quoteCardName
      ? getCollectibleCardImageSource(quoteCard.deck, quoteCardName)
      : undefined;
  const frontRotation = flip.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });
  const backRotation = flip.interpolate({
    inputRange: [0, 1],
    outputRange: ["180deg", "360deg"],
  });

  const toggleReveal = () => {
    Animated.timing(flip, {
      toValue: isRevealed ? 0 : 1,
      duration: 500,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: Platform.OS !== "web",
    }).start();
    setIsRevealed((revealed) => !revealed);
  };

  const cardStyle: ViewStyle = {
    position: "absolute",
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backfaceVisibility: "hidden",
    borderRadius: spacing(12),
    backgroundColor: Colors.K950,
    boxShadow: `${spacing(1)}px ${spacing(2)}px ${spacing(12)}px ${rgba(Colors.K950, 0.2)}, ${spacing(2)}px ${spacing(4)}px ${spacing(20)}px ${rgba(Colors.K950, 0.2)}`,
  };

  return (
    <Pressable
      accessibilityLabel={
        isRevealed ? "Hide collectible" : "Reveal collectible"
      }
      accessibilityRole="button"
      onPress={toggleReveal}
      style={{
        alignSelf: "center",
        width: cardWidth,
        aspectRatio: 2.5 / 3.5,
        outline: "none",
      }}
    >
      <Animated.View
        style={{
          ...cardStyle,
          transform: [{ perspective: 1000 }, { rotateY: frontRotation }],
        }}
      >
        {reward.type === "tao" ? (
          <View style={{ alignItems: "center", gap: spacing(16) }}>
            <Icon name="tao" size={spacing(120)} color={Colors.K200} />
            <Text size="xl" weight={300} color={Colors.K500}>
              Chapter {reward.id}
            </Text>
          </View>
        ) : (
          quoteCardImage && (
            <Image
              source={quoteCardImage}
              contentFit="cover"
              style={{ width: "100%", height: "100%" }}
            />
          )
        )}
        <View
          style={{
            position: "absolute",
            right: spacing(14),
            bottom: spacing(14),
            width: spacing(60),
            height: spacing(60),
            borderRadius: spacing(30),
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: Colors.K200,
            boxShadow: `${spacing(1)}px ${spacing(2)}px ${spacing(12)}px ${Colors.K900}`,
          }}
        >
          <Icon name="touch" size={spacing(30)} color={Colors.K800} />
        </View>
      </Animated.View>

      <Animated.View
        style={{
          ...cardStyle,
          transform: [{ perspective: 1000 }, { rotateY: backRotation }],
        }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            padding: spacing(30),
          }}
          showsVerticalScrollIndicator={false}
        >
          {chapter && reward.type === "tao" && (
            <Text size="md" weight={300} color={Colors.K100}>
              {chapter.text}
            </Text>
          )}
          {quote && reward.type === "quote" && (
            <View style={{ gap: spacing(12) }}>
              <Text size="md" weight={300} color={Colors.K100}>
                {quote.text}
              </Text>
              {quote.author && (
                <Text size="sm" weight={400} color={Colors.K200}>
                  {quote.author}
                </Text>
              )}
              {quote.source && (
                <Text size="sm" weight={300} color={Colors.K400}>
                  {quote.source}
                </Text>
              )}
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </Pressable>
  );
}

export function NodesWinOverlay({
  path,
  result,
  onClose,
}: NodesWinOverlayProps) {
  const { spacing, ui } = useResponsiveMetrics();
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const node = getNodeDefinition(path);
  const reward = result.awardedReward;

  useEffect(() => {
    overlayOpacity.setValue(0);
    Animated.timing(overlayOpacity, {
      toValue: 1,
      delay: 250,
      duration: 350,
      easing: Easing.out(Easing.ease),
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, [overlayOpacity, result]);

  if (!node) return null;

  const quote = reward?.type === "quote" ? getQuote(reward.id) : undefined;
  const quoteCard =
    reward?.type === "quote" ? getQuoteCard(reward.id) : undefined;
  const chapter = reward?.type === "tao" ? getTaoChapter(reward.id) : undefined;

  return (
    <Animated.View
      style={{
        position: "absolute",
        zIndex: 70,
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        alignItems: "center",
        justifyContent: "center",
        padding: spacing(20),
        pointerEvents: "box-none",
        opacity: overlayOpacity,
      }}
    >
      <Pressable
        accessibilityLabel="Dismiss collectible notification"
        onPress={onClose}
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          backgroundColor: rgba(Colors.K875, 0.5),
          outline: "none",
        }}
      />
      <View
        style={[
          flexStyles.colCentered,
          {
            zIndex: 1,
            width: "100%",
            height: "100%",
            maxWidth: ui.contentMaxWidth - spacing(24),
            maxHeight: spacing(620),
            padding: spacing(20),
            gap: spacing(30),
            borderRadius: spacing(12),
            backgroundColor: rgba(Colors.K875, 1),
            boxShadow: `0 0 ${spacing(20)}px ${rgba(Colors.K875, 0.55)}`,
          },
        ]}
      >
        <Button
          accessibilityLabel="Dismiss collectible notification"
          iconName="close"
          size="sm"
          theme="transparent"
          onPress={onClose}
          style={{
            position: "absolute",
            zIndex: 1,
            top: spacing(8),
            right: spacing(8),
            width: spacing(36),
            paddingHorizontal: 0,
            boxShadow: "unset",
          }}
        />

        <Text size="xxl" weight={300} color={Colors.K200}>
          {reward ? "New collectible earned!" : "New nodes unlocked!"}
        </Text>

        {reward && (chapter || quote) && (
          <RewardCard
            reward={reward}
            chapter={chapter}
            quote={quote}
            quoteCard={quoteCard}
          />
        )}

        {/* Unlocked games */}
        {result.newlyUnlockedPaths.length > 0 && (
          <Text size="md" weight={500} color={Colors.K200}>
            Unlocked game{result.newlyUnlockedPaths.length > 1 ? "s" : ""}:{" "}
            <Text size="md" color={Colors.K400}>
              {result.newlyUnlockedPaths
                .map((unlockedPath) => GAMES_DATA[unlockedPath].title)
                .join(", ")}
            </Text>
          </Text>
        )}
      </View>
    </Animated.View>
  );
}
