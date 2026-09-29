import { Text } from "@/components/common/Text";
import { usePalette } from "@/styles/palette";
import { segmentChosen, segmentTrack } from "@/components/ui/Nocturne";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { Icon, IconName } from "@/icons";
import { flexStyles } from "@/styles/flexStyles";
import { FontWeight, transitionStyles, theme } from "@/styles/styles";
import {
  Pressable,
  type StyleProp,
  type TextStyle,
  View,
  type ViewStyle,
} from "react-native";

type RadioOption<T extends string> = {
  value: T;
  label?: string;
  accessibilityLabel?: string;
  iconName?: IconName;
  disabled?: boolean;
  selectedBackgroundColor?: string;
};

type RadioButtonsProps<T extends string> = {
  options: RadioOption<T>[];
  selectedValue: T;
  iconSize?: number;
  vertical?: boolean;
  flexAllButFirst?: boolean;
  onChange: (value: T) => void;
  containerStyle?: StyleProp<ViewStyle>;
  buttonStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  selectedTextStyle?: StyleProp<TextStyle>;
  selectedBackgroundColor?: string;
};

export function RadioButtons<T extends string>({
  options,
  selectedValue,
  onChange,
  containerStyle,
  buttonStyle,
  textStyle,
  selectedTextStyle,
  iconSize,
  vertical = false,
  flexAllButFirst = false,
  selectedBackgroundColor = segmentChosen(),
}: RadioButtonsProps<T>) {
  const { spacing } = useResponsiveMetrics();
  const theme = usePalette();

  return (
    <View
      style={[
        {
          display: "flex",
          flexDirection: vertical ? "column" : "row",
          // The segmented toggle's look (see Segmented in Nocturne).
          ...segmentTrack(),
          borderRadius: spacing(16),
          padding: spacing(4),
          gap: spacing(4),
        },
        containerStyle,
      ]}
    >
      {options.map((option, i) => {
        const isSelected = option.value === selectedValue;
        const selectedBg =
          option.selectedBackgroundColor ?? selectedBackgroundColor;
        // Text on the accent takes the accent's own ink.
        const itemColor = isSelected
          ? selectedBg === theme.accent
            ? theme.accentInk
            : theme.ink
          : theme.dim;

        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityLabel={option.accessibilityLabel ?? option.label}
            accessibilityState={{ selected: isSelected }}
            style={[
              flexStyles.rowCentered,
              {
                ...transitionStyles.limited04sec,
                flex: flexAllButFirst && i !== 0 ? 1 : undefined,
                borderRadius: spacing(12),
                paddingVertical: spacing(2),
                paddingHorizontal: spacing(12),
                gap: spacing(8),
                height: "100%",
                backgroundColor: isSelected ? selectedBg : "transparent",
              },
              buttonStyle,
            ]}
            onPress={() => onChange(option.value)}
            disabled={option.disabled}
          >
            {option.iconName && (
              <Icon
                name={option.iconName}
                size={iconSize ?? 24}
                color={itemColor}
              />
            )}
            {option.label && (
              <Text
                size="sm"
                lineHeight={1.14}
                style={[
                  {
                    ...transitionStyles.limited04sec,
                    fontFamily: FontWeight[400],
                    textAlign: "center",
                    color: itemColor,
                  },
                  textStyle,
                  isSelected ? [{ color: itemColor }, selectedTextStyle] : null,
                ]}
              >
                {option.label}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
