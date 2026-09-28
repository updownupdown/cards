import { Text } from "@/components/common/Text";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { Icon, type IconName } from "@/icons";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, theme } from "@/styles/styles";
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
  const titleFontSize = spacing(18 * 1.15);

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
            color={theme.accent}
            shadow
          />
        )}
        <Text
          weight={400}
          size="md"
          // The line height is set here, since Text's lineHeight scales the
          // size prop's font size, not this one; any tighter clips the
          // descenders on Android.
          style={{
            marginRight: "auto",
            fontSize: titleFontSize,
            lineHeight: titleFontSize * 1.25,
          }}
          color={Colors.white}
        >
          {title}
        </Text>
        {subtitle && (
          <Text weight={300} size="xs" color={Colors.K400}>
            {subtitle}
          </Text>
        )}
      </View>
    </View>
  );
}
