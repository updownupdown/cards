import { Text } from "@/components/common/Text";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { Icon, type IconName } from "@/icons";
import { Colors, rgba, transitionStyles } from "@/styles/styles";
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
      <Text size="sm" weight={400} color={Colors.K200} style={{ flex: 1 }}>
        {label}
      </Text>

      <Icon name={iconName} size={spacing(18)} color={Colors.K200} />

      <View
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          width: progressPercent,
          backgroundColor: rgba(Colors.K100, 0.25),
        }}
      />
    </>
  );
  const style = {
    flex: 1,
    overflow: "hidden" as const,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: spacing(6),
    minHeight: spacing(30),
    borderRadius: spacing(30),
    paddingLeft: spacing(12),
    paddingRight: spacing(8),
    backgroundColor: rgba(Colors.black, 0.6),
    boxShadow: `1px 2px 8px ${rgba(Colors.black, 0.3)}, 2px 4px 20px ${rgba(Colors.black, 0.3)}`,
  };

  return onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={style}
    >
      {content}
    </Pressable>
  ) : (
    <View style={style}>{content}</View>
  );
}
