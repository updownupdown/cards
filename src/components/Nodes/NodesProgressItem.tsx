import { Text } from "@/components/common/Text";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { Icon, type IconName } from "@/icons";
import { homeSurfaceShadow } from "@/styles/homeSurfaceShadow";
import { Colors, rgba } from "@/styles/styles";
import { Pressable, View } from "react-native";

type NodesProgressItemProps = {
  label: string;
  iconName: IconName;
  progress: number;
  onPress?: () => void;
  accessibilityLabel?: string;
};

export function NodesProgressItem({
  label,
  iconName,
  progress,
  onPress,
  accessibilityLabel,
}: NodesProgressItemProps) {
  const { spacing } = useResponsiveMetrics();
  const progressPercent: `${number}%` = `${Math.max(0, Math.min(1, progress)) * 100}%`;
  const content = (
    <>
      <Text
        size="sm"
        weight={400}
        color={Colors.accentBlue}
        style={{ position: "relative", zIndex: 2, flex: 1 }}
      >
        {label}
      </Text>

      <Icon
        name={iconName}
        size={spacing(18)}
        color={Colors.accentBlue}
        style={{ position: "relative", zIndex: 2 }}
      />

      <View
        style={{
          position: "absolute",
          zIndex: 1,
          top: 0,
          bottom: 0,
          left: 0,
          width: progressPercent,
          backgroundColor: rgba(Colors.accentBlue, 0.2),
        }}
      />
    </>
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={{
        flex: 1,
        overflow: "hidden",
        flexDirection: "row",
        alignItems: "center",
        outline: "none",
        gap: spacing(6),
        minHeight: spacing(30),
        borderRadius: spacing(30),
        paddingLeft: spacing(12),
        paddingRight: spacing(8),
        backgroundColor: rgba(Colors.K900, 0.9),
        ...homeSurfaceShadow(spacing),
      }}
    >
      {content}
    </Pressable>
  );
}
