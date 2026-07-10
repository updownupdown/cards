import { Text } from "@/components/common/Text";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { Colors, FontWeight, rgba } from "@/styles/styles";
import { textStyles } from "@/styles/textStyles";
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
  label: string;
  disabled?: boolean;
  selectedBackgroundColor?: string;
};

type RadioButtonsProps<T extends string> = {
  options: RadioOption<T>[];
  selectedValue: T;
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
  selectedBackgroundColor = Colors.K200,
}: RadioButtonsProps<T>) {
  const { spacing } = useResponsiveMetrics();

  return (
    <View
      style={[
        {
          display: "flex",
          flexDirection: "row",
          width: "100%",
          borderRadius: spacing(8),
          padding: spacing(6),
          gap: spacing(6),
          backgroundColor: Colors.K900,
          boxShadow: `inset 0 0 20px ${rgba(Colors.black, 0.2)}`,
        },
        containerStyle,
      ]}
    >
      {options.map((option) => {
        const isSelected = option.value === selectedValue;
        const selectedBg =
          option.selectedBackgroundColor ?? selectedBackgroundColor;

        return (
          <Pressable
            key={option.value}
            style={[
              {
                ...BTN_TRANSITION_STYLE,
                flex: 1,
                borderRadius: spacing(6),
                paddingVertical: spacing(2),
                paddingHorizontal: spacing(16),
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
            <Text
              size="sm"
              lineHeight={1.14}
              style={[
                {
                  ...BTN_TRANSITION_STYLE,
                  fontFamily: FontWeight[500],
                  textAlign: "center",
                  color: Colors.K400,
                },
                textStyles.shadowText,
                textStyle,
                isSelected ? [{ color: Colors.K100 }, selectedTextStyle] : null,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
