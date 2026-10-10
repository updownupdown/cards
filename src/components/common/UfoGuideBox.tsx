import { Text, toDisplayUpperCase } from "@/components/common/Text";
import { UfoFrame } from "@/components/common/UfoFrame";
import { ActionButton } from "@/components/ui/Nocturne";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { usePalette } from "@/styles/palette";
import { UfoColors } from "@/styles/styles";
import { View, type StyleProp, type ViewStyle } from "react-native";

/**
 * The UFO showing a new player round: a short note in its box, put away for
 * good with its one button: the Odyssey's introduction (the UFO beams down
 * on Klondike), the Gallery's (it hovers under the note) and Mercy Skip's
 * (it waits under the note). Each sits at the top, under the header.
 */
export function UfoGuideBox({
  title,
  text,
  closeLabel,
  onClose,
  style,
}: {
  /** A heading in the UFO's green. */
  title?: string;
  text: string;
  closeLabel: string;
  onClose: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { spacing } = useResponsiveMetrics();
  const theme = usePalette();
  return (
    <UfoFrame
      radius={spacing(18)}
      style={[
        {
          width: "100%",
          maxWidth: spacing(340),
          alignSelf: "center",
          alignItems: "center",
          gap: spacing(10),
          paddingHorizontal: spacing(20),
          paddingTop: spacing(18),
          paddingBottom: spacing(16),
        },
        style,
      ]}
    >
      {title ? (
        <Text
          size="xs"
          weight={500}
          color={UfoColors.green}
          style={{ letterSpacing: 2, textAlign: "center" }}
        >
          {toDisplayUpperCase(title)}
        </Text>
      ) : null}
      <Text
        size="sm"
        weight={300}
        color={theme.ink}
        lineHeight={1.45}
        style={{ textAlign: "center" }}
      >
        {text}
      </Text>
      <View style={{ paddingTop: spacing(2) }}>
        <ActionButton
          label={closeLabel}
          small
          color={UfoColors.green}
          ink={UfoColors.black}
          onPress={onClose}
        />
      </View>
    </UfoFrame>
  );
}
