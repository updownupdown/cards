import { getCollectibleCardImageSource } from "@/components/Cards/CardAssets";
import { Text } from "@/components/common/Text";
import ModalFull from "@/components/Modals/ModalFull";
import {
  getQuote,
  getQuoteCard,
  getQuoteCardName,
  getTaoChapter,
} from "@/data/collectibles";
import { GAMES_DATA } from "@/data/games-registry";
import { getNodeDefinition } from "@/data/nodes-map";
import type { NodesWinResult } from "@/data/nodes-progress";
import { useGlobalSettings } from "@/hooks/useGlobalSettings";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useDisplayLanguage, useTranslation } from "@/i18n";
import {
  isQuoteTranslated,
  isTaoChapterTranslated,
  localizeQuote,
  localizeTaoChapter,
} from "@/i18n/content";
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
  View,
} from "react-native";
import { ShowOriginalToggle } from "./ShowOriginalToggle";

type NodesWinOverlayProps = {
  path: string;
  result: NodesWinResult;
  onClose: () => void;
};

type RewardDetailsProps = {
  reward: NonNullable<NodesWinResult["awardedReward"]>;
  chapter: ReturnType<typeof getTaoChapter>;
  quote: ReturnType<typeof getQuote>;
};

type RotatingRewardProps = {
  reward: NonNullable<NodesWinResult["awardedReward"]>;
  onPress: () => void;
};

function RotatingReward({ reward, onPress }: RotatingRewardProps) {
  const { spacing } = useResponsiveMetrics();
  const { t } = useTranslation("nodes");
  const rotation = useRef(new Animated.Value(0)).current;
  const quoteCard =
    reward.type === "quote" ? getQuoteCard(reward.id) : undefined;
  const quoteCardImage = quoteCard
    ? getCollectibleCardImageSource(quoteCard.deck, getQuoteCardName(quoteCard))
    : undefined;
  const tokenSize = spacing(92);
  const cardHeight = spacing(92);
  const cardWidth = (cardHeight * 2.5) / 3.5;
  const itemWidth = reward.type === "tao" ? tokenSize : cardWidth;
  const itemHeight = reward.type === "tao" ? tokenSize : cardHeight;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 4200,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== "web",
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [rotation]);

  const rotateY = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });
  const backRotateY = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["180deg", "540deg"],
  });
  const frontOpacity = rotation.interpolate({
    inputRange: [0, 0.249, 0.25, 0.749, 0.75, 1],
    outputRange: [1, 1, 0, 0, 1, 1],
  });
  const backOpacity = rotation.interpolate({
    inputRange: [0, 0.249, 0.25, 0.749, 0.75, 1],
    outputRange: [0, 0, 1, 1, 0, 0],
  });
  const itemStyle =
    reward.type === "tao"
      ? { width: itemWidth, height: itemHeight, borderRadius: itemWidth / 2 }
      : {
          width: itemWidth,
          height: itemHeight,
          borderRadius: spacing(8),
        };
  const faceStyle = {
    position: "absolute" as const,
    inset: 0,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: itemStyle.borderRadius,
    overflow: "hidden" as const,
    backgroundColor: Colors.K875,
    boxShadow: `${spacing(2)}px ${spacing(2)}px ${spacing(12)}px ${rgba(Colors.black, 0.2)}`,
    backfaceVisibility: "hidden" as const,
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("reward.earned")}
      onPress={onPress}
      style={{ outline: "none" }}
    >
      <View style={itemStyle}>
        <Animated.View
          style={[
            faceStyle,
            {
              opacity: frontOpacity,
              transform: [{ perspective: 700 }, { rotateY }],
            },
          ]}
        >
          {reward.type === "tao" ? (
            <Icon name="tao" size={spacing(68)} color={Colors.K200} />
          ) : quoteCardImage ? (
            <Image
              source={quoteCardImage}
              contentFit="cover"
              style={{ width: "100%", height: "100%" }}
            />
          ) : null}
        </Animated.View>

        <Animated.View
          style={[
            faceStyle,
            {
              opacity: backOpacity,
              transform: [{ perspective: 700 }, { rotateY: backRotateY }],
            },
          ]}
        >
          {reward.type === "tao" ? (
            <Icon name="tao" size={spacing(68)} color={Colors.K200} />
          ) : quoteCardImage ? (
            <Image
              source={quoteCardImage}
              contentFit="cover"
              style={{ width: "100%", height: "100%" }}
            />
          ) : null}
        </Animated.View>
      </View>
    </Pressable>
  );
}

type NodesWinRewardPreviewProps = {
  result: NodesWinResult;
  onPress: () => void;
};

export function NodesWinRewardPreview({
  result,
  onPress,
}: NodesWinRewardPreviewProps) {
  const { spacing } = useResponsiveMetrics();
  const { t } = useTranslation("nodes");
  const reward = result.awardedReward;

  if (!reward) return null;

  return (
    <View
      style={[
        flexStyles.colCentered,
        {
          width: "100%",
          gap: spacing(14),
          padding: spacing(12),
          borderRadius: spacing(12),
          backgroundColor: rgba(Colors.K900, 0.2),
          boxShadow: `inset ${spacing(2)}px ${spacing(2)}px ${spacing(12)}px ${rgba(Colors.black, 0.12)}`,
        },
      ]}
    >
      <Text size="lg" weight={500} color={Colors.white}>
        {t("reward.earned")}
      </Text>

      <RotatingReward reward={reward} onPress={onPress} />

      {result.newlyUnlockedPaths.length > 0 && (
        <Text
          size="sm"
          weight={500}
          color={Colors.K200}
          style={{ textAlign: "center" }}
        >
          {t("reward.unlockedGames", {
            count: result.newlyUnlockedPaths.length,
          })}{" "}
          <Text size="sm" color={Colors.white}>
            {result.newlyUnlockedPaths
              .map((unlockedPath) => GAMES_DATA[unlockedPath]?.title)
              .filter((title): title is string => !!title)
              .join(", ")}
          </Text>
        </Text>
      )}
    </View>
  );
}

function RewardDetails({ reward, chapter, quote }: RewardDetailsProps) {
  const { spacing } = useResponsiveMetrics();
  const language = useDisplayLanguage();
  const { translateCollectibles } = useGlobalSettings().settings;
  const [showOriginal, setShowOriginal] = useState(false);
  const toggleOriginal = () => setShowOriginal((current) => !current);

  const chapterTranslated =
    translateCollectibles &&
    !!chapter &&
    isTaoChapterTranslated(reward.id, chapter, language);
  const shownChapter =
    chapter && chapterTranslated && !showOriginal
      ? localizeTaoChapter(reward.id, chapter, language)
      : chapter;
  const quoteTranslated =
    translateCollectibles &&
    !!quote &&
    isQuoteTranslated(reward.id, quote, language);
  const shownQuote =
    quote && quoteTranslated && !showOriginal
      ? localizeQuote(reward.id, quote, language)
      : quote;

  return (
    <View
      style={{
        flex: 1,
        width: "100%",
        alignItems: "center",
        gap: spacing(2),
      }}
    >
      {/* Tao Chapter Text */}
      {shownChapter && reward.type === "tao" && (
        <ScrollView
          contentContainerStyle={{
            gap: spacing(12),
            paddingVertical: spacing(32),
          }}
          style={{ alignSelf: "stretch" }}
          showsVerticalScrollIndicator={false}
        >
          <Text size="lg" weight={300} color={Colors.K100}>
            {shownChapter.text}
          </Text>

          {chapterTranslated && (
            <ShowOriginalToggle
              showOriginal={showOriginal}
              onToggle={toggleOriginal}
            />
          )}
        </ScrollView>
      )}

      {/* Quote Text */}
      {shownQuote && reward.type === "quote" && (
        <ScrollView
          contentContainerStyle={[
            flexStyles.colCentered,
            { gap: spacing(8), flexGrow: 1, alignItems: "flex-start" },
          ]}
          style={{ alignSelf: "stretch", flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          <Text size="xl" weight={300} color={Colors.K100}>
            {shownQuote.text}
          </Text>

          {shownQuote.author && (
            <Text
              size="lg"
              weight={400}
              color={Colors.K500}
              style={{ marginTop: spacing(12) }}
            >
              {shownQuote.author}
            </Text>
          )}
          {shownQuote.source && (
            <Text size="xs" weight={300} color={Colors.K500}>
              {shownQuote.source}
            </Text>
          )}

          {quoteTranslated && (
            <View style={{ marginTop: spacing(12) }}>
              <ShowOriginalToggle
                showOriginal={showOriginal}
                onToggle={toggleOriginal}
              />
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

export function NodesWinOverlay({
  path,
  result,
  onClose,
}: NodesWinOverlayProps) {
  const { spacing } = useResponsiveMetrics();
  const { t } = useTranslation("nodes");
  const node = getNodeDefinition(path);
  const reward = result.awardedReward;

  if (!node) return null;

  const quote = reward?.type === "quote" ? getQuote(reward.id) : undefined;
  const chapter = reward?.type === "tao" ? getTaoChapter(reward.id) : undefined;

  return (
    <ModalFull
      title={
        reward
          ? reward.type === "tao"
            ? t("reward.chapter", { number: reward.id })
            : t("reward.quote", { number: reward.id })
          : t("reward.unlocked")
      }
      iconName={reward?.type === "tao" ? "tao" : "quote"}
      onClose={onClose}
    >
      <View
        style={{
          flex: 1,
          padding: spacing(30),
          minHeight: spacing(320),
        }}
      >
        {reward && (chapter || quote) && (
          <RewardDetails reward={reward} chapter={chapter} quote={quote} />
        )}
      </View>
    </ModalFull>
  );
}
