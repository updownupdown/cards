import { Text } from "@/components/common/Text";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { Icon, type IconName } from "@/icons";
import { flexStyles } from "@/styles/flexStyles";
import { Colors } from "@/styles/styles";
import { roundToPixel } from "@/utils/utils";
import { View } from "react-native";

type HomeSectionTitleProps = {
  title: string;
  subtitle?: string;
  iconName: IconName;
  pageSidePadding: number;
  contentMaxWidth: number;
};

export function HomeSectionTitle({
  title,
  subtitle,
  iconName,
  pageSidePadding,
  contentMaxWidth,
}: HomeSectionTitleProps) {
  const { ui, spacing } = useResponsiveMetrics();

  return (
    <View
      style={{
        width: "100%",
        maxWidth: contentMaxWidth,
        alignSelf: "center",
      }}
    >
      <View
        style={[
          flexStyles.rowCentered,
          flexStyles.fullWidth,
          {
            gap: spacing(8),
            paddingVertical: spacing(8),
            paddingHorizontal: pageSidePadding,
          },
        ]}
      >
        <Icon
          name={iconName}
          size={roundToPixel(24 * (ui.isTablet ? 1.15 : 1))}
          color={Colors.suitsRed}
        />
        <Text
          weight={400}
          size="md"
          color={Colors.white}
          lineHeight={1}
          style={{ marginRight: "auto" }}
        >
          {title}
        </Text>
        {subtitle && (
          <Text weight={300} size="sm" color={Colors.K400} lineHeight={1}>
            {subtitle}
          </Text>
        )}
      </View>
    </View>
  );
}
