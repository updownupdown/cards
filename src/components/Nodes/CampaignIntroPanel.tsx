import { Text } from "@/components/common/Text";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useTranslation } from "@/i18n";
import { Icon } from "@/icons";
import { homeSurfaceShadow } from "@/styles/homeSurfaceShadow";
import { Colors, rgba } from "@/styles/styles";
import { Pressable, ScrollView, View } from "react-native";

type CampaignIntroPanelProps = {
  onClose: () => void;
};

/**
 * What the Campaign is, in a small box under the progress pills. It floats
 * over the map without blocking it, so the map can be explored while reading,
 * and stays until closed.
 */
export function CampaignIntroPanel({ onClose }: CampaignIntroPanelProps) {
  const { t } = useTranslation("nodes");
  const { spacing } = useResponsiveMetrics();
  const paragraphs = t("intro.paragraphs", { returnObjects: true }) as string[];

  return (
    <View
      style={{
        width: "100%",
        borderRadius: spacing(12),
        backgroundColor: rgba(Colors.K950, 0.9),
        borderWidth: 1,
        borderColor: Colors.K850,
        overflow: "hidden",
        ...homeSurfaceShadow(spacing),
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: spacing(8),
          paddingLeft: spacing(14),
          paddingRight: spacing(6),
          paddingTop: spacing(6),
        }}
      >
        <Icon name="nodes" size={spacing(20)} color={Colors.suitsRed} />
        <Text size="md" weight={500} color={Colors.white} style={{ flex: 1 }}>
          {t("intro.title")}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("intro.close")}
          onPress={onClose}
          hitSlop={spacing(6)}
          style={{ padding: spacing(8) }}
        >
          <Icon name="close" size={spacing(22)} color={Colors.K500} />
        </Pressable>
      </View>

      <ScrollView
        style={{ maxHeight: spacing(150) }}
        contentContainerStyle={{
          paddingHorizontal: spacing(14),
          paddingTop: spacing(4),
          paddingBottom: spacing(14),
          gap: spacing(10),
        }}
        showsVerticalScrollIndicator
      >
        {paragraphs.map((paragraph) => (
          <Text
            key={paragraph}
            size="sm"
            weight={300}
            color={Colors.K200}
            lineHeight={1.4}
          >
            {paragraph}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
}
