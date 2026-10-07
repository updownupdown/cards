import { Text } from "@/components/common/Text";
import { CARD_FACTS, getLaunchCardFactIndex } from "@/data/card-facts";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useDisplayLanguage, useTranslation } from "@/i18n";
import { localizeCardFact } from "@/i18n/content";
import { Icon } from "@/icons";
import { theme } from "@/styles/styles";
import { View } from "react-native";

type HomeCardFactProps = {
  pageSidePadding: number;
  contentMaxWidth: number;
};

/** A piece of playing card trivia at the foot of the Home tab, new each launch. */
export function HomeCardFact({
  pageSidePadding,
  contentMaxWidth,
}: HomeCardFactProps) {
  const { spacing } = useResponsiveMetrics();
  const { t } = useTranslation("home");
  const language = useDisplayLanguage();
  const factIndex = getLaunchCardFactIndex();

  return (
    <View
      style={{
        width: "100%",
        maxWidth: contentMaxWidth,
        alignSelf: "center",
        paddingHorizontal: pageSidePadding,
        paddingVertical: pageSidePadding * 4,
      }}
    >
      <View
        style={{
          paddingHorizontal: spacing(12),
          alignItems: "center",
          gap: spacing(10),
        }}
      >
        {/* Twice a tab bar icon. */}
        <Icon
          name="fact"
          size={spacing(60)}
          color={theme.accent}
          accessibilityLabel={t("sections.fact")}
        />
        <Text
          size="md"
          weight={300}
          color={theme.ink}
          lineHeight={1.45}
          style={{ textAlign: "center" }}
        >
          {localizeCardFact(factIndex, CARD_FACTS[factIndex], language)}
        </Text>
      </View>
    </View>
  );
}
