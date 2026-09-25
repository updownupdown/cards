import { Text } from "@/components/common/Text";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { Icon, type IconName } from "@/icons";
import { flexStyles } from "@/styles/flexStyles";
import { Colors } from "@/styles/styles";
import { View } from "react-native";

type HomeSectionTitleProps = {
  title: string;
  subtitle?: string;
  iconName?: IconName;
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
  const { spacing } = useResponsiveMetrics();

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
        {iconName && (
          <Icon
            name={iconName}
            size={spacing(27.6)}
            color={Colors.suitsRed}
            shadow
          />
        )}
        <Text
          weight={400}
          size="md"
          style={{ marginRight: "auto", fontSize: spacing(18 * 1.15) }}
          color={Colors.white}
          lineHeight={1}
        >
          {title}
        </Text>
        {subtitle && (
          <Text weight={300} size="xs" color={Colors.K400} lineHeight={1}>
            {subtitle}
          </Text>
        )}
      </View>
    </View>
  );
}
