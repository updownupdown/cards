import { RadioButtons } from "@/components/common/RadioButtons";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useTranslation } from "@/i18n";
import type { IconName } from "@/icons";
import { homeSurfaceShadow } from "@/styles/homeSurfaceShadow";
import { Colors, layoutDims, rgba } from "@/styles/styles";
import { View } from "react-native";

export type HomeCardSize = "small" | "medium" | "large";

const CARD_SIZE_OPTIONS: {
  value: HomeCardSize;
  iconName: IconName;
}[] = [
  {
    value: "small",
    iconName: "list-small",
  },
  {
    value: "medium",
    iconName: "list-medium",
  },
  {
    value: "large",
    iconName: "list-large",
  },
];

type HomeCardSizeControlProps = {
  value: HomeCardSize;
  onChange: (value: HomeCardSize) => void;
};

export function HomeCardSizeControl({
  value,
  onChange,
}: HomeCardSizeControlProps) {
  const { ui, spacing } = useResponsiveMetrics();
  const { t } = useTranslation("home");

  return (
    <View
      style={{
        width: "100%",
        maxWidth: ui.contentMaxWidth,
        alignSelf: "center",
      }}
    >
      <RadioButtons
        options={CARD_SIZE_OPTIONS.map((option) => ({
          ...option,
          label: t(`cardSize.${option.value}`),
        }))}
        selectedValue={value}
        selectedBackgroundColor={Colors.suitsRed}
        onChange={onChange}
        iconSize={spacing(20)}
        buttonStyle={{
          flex: 1,
          borderRadius: spacing(layoutDims.cardToggleHeight / 2),
          height: spacing(layoutDims.cardToggleHeight - 12),
        }}
        containerStyle={{
          width: "100%",
          height: spacing(layoutDims.cardToggleHeight),
          borderRadius: spacing(layoutDims.cardToggleHeight / 2),
          backgroundColor: rgba(Colors.K900, 0.7),
          ...homeSurfaceShadow(spacing),
        }}
      />
    </View>
  );
}
