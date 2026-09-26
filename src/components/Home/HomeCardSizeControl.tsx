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
  const height = spacing(layoutDims.searchControlHeight);
  const buttonHeight = height - spacing(12);

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
          borderRadius: buttonHeight / 2,
          height: buttonHeight,
        }}
        containerStyle={{
          width: "100%",
          height,
          borderRadius: height / 2,
          backgroundColor: rgba(Colors.K900, 0.95),
          ...homeSurfaceShadow(spacing),
        }}
      />
    </View>
  );
}
