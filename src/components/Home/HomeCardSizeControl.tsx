import { RadioButtons } from "@/components/common/RadioButtons";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useTranslation } from "@/i18n";
import type { IconName } from "@/icons";
import { Colors, layoutDims } from "@/styles/styles";
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
  contentWidth: number;
  value: HomeCardSize;
  onChange: (value: HomeCardSize) => void;
};

export function HomeCardSizeControl({
  contentWidth,
  value,
  onChange,
}: HomeCardSizeControlProps) {
  const { spacing } = useResponsiveMetrics();
  const { t } = useTranslation("home");

  return (
    <View
      style={{
        width: "100%",
        maxWidth: contentWidth,
        alignSelf: "center",
      }}
    >
      <RadioButtons
        options={CARD_SIZE_OPTIONS.map((option) => ({
          ...option,
          label: t(`cardSize.${option.value}`),
        }))}
        selectedValue={value}
        selectedBackgroundColor={Colors.background}
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
          backgroundColor: Colors.K900,
        }}
      />
    </View>
  );
}
