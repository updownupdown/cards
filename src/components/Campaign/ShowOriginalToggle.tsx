import { Text } from "@/components/common/Text";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useTranslation } from "@/i18n";
import { Colors, rgba } from "@/styles/styles";
import { Pressable, View } from "react-native";

type Props = {
  showOriginal: boolean;
  onToggle: () => void;
};

/**
 * A small switch under a translated quote or Tao Te Ching chapter that shows
 * the English original instead.
 */
export function ShowOriginalToggle({ showOriginal, onToggle }: Props) {
  const { spacing } = useResponsiveMetrics();
  const { t } = useTranslation("campaign");
  const trackWidth = spacing(40);
  const thumbSize = spacing(18);
  const trackPadding = spacing(2);

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: showOriginal }}
      onPress={onToggle}
      hitSlop={spacing(8)}
      style={{
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        gap: spacing(10),
        outline: "none",
      }}
    >
      <View
        style={{
          width: trackWidth,
          height: thumbSize + trackPadding * 2,
          borderRadius: (thumbSize + trackPadding * 2) / 2,
          paddingHorizontal: trackPadding,
          justifyContent: "center",
          backgroundColor: showOriginal ? Colors.win : rgba(Colors.white, 0.2),
        }}
      >
        <View
          style={{
            width: thumbSize,
            height: thumbSize,
            borderRadius: thumbSize / 2,
            backgroundColor: Colors.white,
            transform: [
              {
                translateX: showOriginal
                  ? trackWidth - thumbSize - trackPadding * 2
                  : 0,
              },
            ],
          }}
        />
      </View>
      <Text size="sm" weight={400} color={Colors.K300}>
        {t("original.label")}
      </Text>
    </Pressable>
  );
}
