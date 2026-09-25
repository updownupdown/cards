import { Text } from "@/components/common/Text";
import { getLaunchCardFact } from "@/data/card-facts";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { Icon } from "@/icons";
import { Colors } from "@/styles/styles";
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

  return (
    <View
      style={{
        width: "100%",
        maxWidth: contentMaxWidth,
        alignSelf: "center",
        paddingHorizontal: pageSidePadding,
      }}
    >
      <View
        style={{
          borderRadius: spacing(16),
          paddingHorizontal: spacing(32),
          paddingVertical: spacing(22),
          alignItems: "center",
          gap: spacing(6),
        }}
      >
        <Icon name="rainbow" size={spacing(80)} color={Colors.K500} />
        <Text
          size="sm"
          weight={300}
          color={Colors.K400}
          lineHeight={1.4}
          style={{ textAlign: "center" }}
        >
          {getLaunchCardFact()}
        </Text>
      </View>
    </View>
  );
}
