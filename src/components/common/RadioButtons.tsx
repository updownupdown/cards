import { Text } from "@/components/common/Text";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { Icon, IconName } from "@/icons";
import { Colors, FontWeight, rgba } from "@/styles/styles";
import {
  Pressable,
  type StyleProp,
  type TextStyle,
  View,
  type ViewStyle,
} from "react-native";
import { BTN_TRANSITION_STYLE } from "../Button/Button";

type RadioOption<T extends string> = {
  value: T;
  label?: string;
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
  selectedBackgroundColor = Colors.K600,
}: RadioButtonsProps<T>) {
  const { spacing } = useResponsiveMetrics();

  return (
    <View
      style={[
        {
          display: "flex",
          flexDirection: vertical ? "column" : "row",
          borderRadius: spacing(8),
          padding: spacing(6),
          gap: spacing(6),
          backgroundColor: Colors.K900,
          boxShadow: `inset 0 0 20px ${rgba(Colors.black, 0.2)}`,
        },
        containerStyle,
      ]}
    >
      {options.map((option, i) => {
        const isSelected = option.value === selectedValue;
        const selectedBg =
          option.selectedBackgroundColor ?? selectedBackgroundColor;

        return (
          <Pressable
            key={option.value}
            style={[
              {
                ...BTN_TRANSITION_STYLE,
                flex: flexAllButFirst && i !== 0 ? 1 : undefined,
                borderRadius: spacing(6),
                paddingVertical: spacing(2),
                paddingHorizontal: spacing(12),
                height: "100%",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: isSelected ? selectedBg : "transparent",
                boxShadow: isSelected
                  ? `0 1px 2px ${rgba(Colors.K950, 0.18)}`
                  : `0 1px 2px ${rgba(Colors.K950, 0)}`,
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
                color={Colors.K100}
              />
            )}
            {option.label && (
              <Text
                size="sm"
                lineHeight={1.14}
                style={[
                  {
                    ...BTN_TRANSITION_STYLE,
                    fontFamily: FontWeight[400],
                    textAlign: "center",
                    color: Colors.K400,
                  },
                  textStyle,
                  isSelected
                    ? [{ color: Colors.K100 }, selectedTextStyle]
                    : null,
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
