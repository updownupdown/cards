import { Logo } from "@/components/common/Logo";
import { RoundButton } from "@/components/ui/Nocturne";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useTranslation } from "@/i18n";
import { layoutDims } from "@/styles/styles";
import { View } from "react-native";

/** Stats and Settings: a fifth larger than a RoundButton's usual 40. */
export const HEADER_BUTTON_SIZE = 42;

/**
 * The top of the Home and Campaign tabs: the logo, with the Stats and
 * Settings buttons at the end.
 */
export function HomeHeader({
  onOpenStats,
  onOpenSettings,
}: {
  onOpenStats?: () => void;
  onOpenSettings?: () => void;
}) {
  const { t } = useTranslation("home");
  const { ui, spacing } = useResponsiveMetrics();
  return (
    <View
      style={{
        width: "100%",
        maxWidth: ui.contentMaxWidth,
        alignSelf: "center",
        paddingHorizontal: spacing(layoutDims.pagePadding),
        flexDirection: "row",
        alignItems: "center",
        gap: spacing(16),
      }}
    >
      <View style={{ flex: 1 }}>
        <Logo height={spacing(30)} />
      </View>
      <RoundButton
        iconName="chart"
        size={HEADER_BUTTON_SIZE}
        glass
        accessibilityLabel={t("header.stats")}
        onPress={() => onOpenStats?.()}
      />
      <RoundButton
        iconName="settings"
        size={HEADER_BUTTON_SIZE}
        glass
        accessibilityLabel={t("header.settings")}
        onPress={() => onOpenSettings?.()}
      />
    </View>
  );
}
