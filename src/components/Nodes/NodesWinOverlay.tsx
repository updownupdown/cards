import { Button } from "@/components/Button/Button";
import { Text } from "@/components/common/Text";
import { getQuote, getTaoChapter } from "@/data/collectibles";
import { GAMES_DATA } from "@/data/games-registry";
import { getNodeDefinition } from "@/data/nodes-map";
import type { NodesWinResult } from "@/data/nodes-progress";
import { useGlobalSettings } from "@/hooks/useGlobalSettings";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useDisplayLanguage, useTranslation } from "@/i18n";
import {
  isQuoteTranslated,
  isTaoChapterTranslated,
  localizeGameTitle,
  localizeQuote,
  localizeTaoChapter,
} from "@/i18n/content";
import { Icon } from "@/icons";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, rgba } from "@/styles/styles";
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

function RewardDetails({ reward, chapter, quote }: RewardDetailsProps) {
  const { spacing } = useResponsiveMetrics();
  const { t } = useTranslation("nodes");
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
      {/* Icon and Title */}
      <View style={[flexStyles.rowCentered, { gap: spacing(8) }]}>
        <Icon
          name={reward.type === "tao" ? "tao" : "quote"}
          size={spacing(24)}
          color={Colors.K500}
        />
        <Text size="lg" weight={300} color={Colors.K500}>
          {reward.type === "tao"
            ? t("reward.chapter", { number: reward.id })
            : t("reward.quote", { number: reward.id })}
        </Text>
      </View>

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
  const { spacing, ui } = useResponsiveMetrics();
  const { t } = useTranslation("nodes");
  const language = useDisplayLanguage();
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
        accessibilityLabel={t("reward.dismiss")}
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
            padding: spacing(30),
            gap: spacing(30),
            borderRadius: spacing(12),
            backgroundColor: rgba(Colors.K875, 1),
            boxShadow: `0 0 ${spacing(20)}px ${rgba(Colors.K875, 0.55)}`,
          },
        ]}
      >
        <Button
          accessibilityLabel={t("reward.dismiss")}
          iconName="close"
          size="lg"
          theme="transparent"
          iconColor={Colors.K700}
          iconSize={spacing(30)}
          onPress={onClose}
          style={{
            position: "absolute",
            zIndex: 1,
            top: spacing(8),
            right: spacing(8),
            width: spacing(36),
            paddingHorizontal: 0,
            boxShadow: "none",
          }}
        />

        <Text size="xl" weight={500} color={Colors.K200}>
          {reward ? t("reward.earned") : t("reward.unlocked")}
        </Text>

        {reward && (chapter || quote) && (
          <RewardDetails reward={reward} chapter={chapter} quote={quote} />
        )}

        {/* Unlocked games */}
        {result.newlyUnlockedPaths.length > 0 && (
          <Text size="md" weight={500} color={Colors.K200}>
            {t("reward.unlockedGames", {
              count: result.newlyUnlockedPaths.length,
            })}{" "}
            <Text size="md" color={Colors.K400}>
              {result.newlyUnlockedPaths
                .map((unlockedPath) =>
                  localizeGameTitle(
                    GAMES_DATA[unlockedPath],
                    unlockedPath,
                    language,
                  ),
                )
                .join(", ")}
            </Text>
          </Text>
        )}
      </View>
    </Animated.View>
  );
}
