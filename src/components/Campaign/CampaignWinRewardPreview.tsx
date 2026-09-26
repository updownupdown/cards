import { Text } from "@/components/common/Text";
import type { CampaignWinResult } from "@/data/campaign-progress";
import { getQuote } from "@/data/collectibles";
import { GAMES_DATA } from "@/data/games-registry";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useTranslation } from "@/i18n";
import { Icon } from "@/icons";
import { flexStyles } from "@/styles/flexStyles";
import { Colors } from "@/styles/styles";
import { View } from "react-native";

type Props = {
  result: CampaignWinResult;
};

/**
 * Announces a campaign reward above the win box (its `topPanel`): a Tao
 * chapter by number, a quote by its author, and any games it unlocked. The
 * reward itself is revealed over the whole screen (TaoReveal, QuoteReveal),
 * and kept in the Campaign tab's collections.
 */
export function CampaignWinRewardPreview({ result }: Props) {
  const { spacing } = useResponsiveMetrics();
  const { t } = useTranslation("campaign");
  const reward = result.awardedReward;
  if (!reward) return null;
  const quote = reward.type === "quote" ? getQuote(reward.id) : undefined;

  return (
    <View style={[flexStyles.colCentered, { gap: spacing(14) }]}>
      <Icon
        name={reward.type === "tao" ? "tao" : "quote"}
        size={spacing(80)}
        color={Colors.K200}
      />
      <Text
        size="xl"
        weight={500}
        color={Colors.white}
        style={{ textAlign: "center" }}
      >
        {reward.type === "tao"
          ? t("reward.taoChapter", { number: reward.id })
          : t("reward.quoteBy", { author: quote?.author ?? "" })}
      </Text>
      {result.newlyUnlockedPaths.length > 0 && (
        <Text
          size="sm"
          weight={500}
          color={Colors.K200}
          style={{ textAlign: "center" }}
        >
          {t("reward.unlockedGames", {
            count: result.newlyUnlockedPaths.length,
          })}
          {"\n"}
          {result.newlyUnlockedPaths
            .map((unlockedPath) => GAMES_DATA[unlockedPath]?.title)
            .filter((title): title is string => !!title)
            .join(", ")}
        </Text>
      )}
    </View>
  );
}
