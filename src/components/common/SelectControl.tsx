import { Text } from "@/components/common/Text";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { Icon } from "@/icons";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, rgba } from "@/styles/styles";
import React from "react";
import { Pressable, View } from "react-native";

type SelectControlProps<T> = {
  value: T;
  options: { label: string; value: T }[];
  onChange: (value: T) => void;
  /** Read by screen readers for the closed menu. */
  accessibilityLabel: string;
};

/**
 * A dropdown: a field showing the selected option, which opens a list of the
 * options below it. The list is part of the layout rather than an overlay, so
 * it scrolls with the settings around it.
 */
export function SelectControl<T>({
  value,
  options,
  onChange,
  accessibilityLabel,
}: SelectControlProps<T>) {
  const { spacing } = useResponsiveMetrics();
  const [isOpen, setIsOpen] = React.useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <View style={[flexStyles.colStart, flexStyles.fullWidth]}>
      <Pressable
        role="button"
        aria-label={accessibilityLabel}
        aria-expanded={isOpen}
        onPress={() => setIsOpen((open) => !open)}
        style={{
          ...flexStyles.rowCentered,
          ...flexStyles.fullWidth,
          justifyContent: "space-between",
          gap: spacing(8),
          paddingVertical: spacing(10),
          paddingHorizontal: spacing(14),
          borderRadius: spacing(8),
          borderWidth: 1,
          borderColor: isOpen ? Colors.accentBlue : rgba(Colors.white, 0.3),
          backgroundColor: rgba(Colors.black, 0.2),
        }}
      >
        <Text size="md" weight={400} color={Colors.white}>
          {selected?.label ?? ""}
        </Text>
        <Icon
          name={isOpen ? "expand-less" : "expand-more"}
          color={Colors.K300}
        />
      </Pressable>

      {isOpen && (
        <View
          role="menu"
          style={{
            ...flexStyles.fullWidth,
            marginTop: spacing(4),
            paddingVertical: spacing(4),
            borderRadius: spacing(8),
            borderWidth: 1,
            borderColor: rgba(Colors.white, 0.15),
            backgroundColor: Colors.K950,
          }}
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <Pressable
                key={String(option.value)}
                role="menuitem"
                aria-selected={isSelected}
                onPress={() => {
                  setIsOpen(false);
                  if (!isSelected) onChange(option.value);
                }}
                style={({ pressed }) => ({
                  ...flexStyles.rowCentered,
                  justifyContent: "space-between",
                  paddingVertical: spacing(10),
                  paddingHorizontal: spacing(14),
                  backgroundColor: pressed
                    ? rgba(Colors.white, 0.08)
                    : "transparent",
                })}
              >
                <Text
                  size="md"
                  weight={isSelected ? 500 : 400}
                  color={isSelected ? Colors.accentBlue : Colors.white}
                  style={{ userSelect: "none" }}
                >
                  {option.label}
                </Text>
                {isSelected && (
                  <Icon
                    name="check-circle"
                    size={spacing(20)}
                    color={Colors.accentBlue}
                  />
                )}
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}
