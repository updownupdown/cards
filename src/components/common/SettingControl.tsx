import { Text } from "@/components/common/Text";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { Icon } from "@/icons";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, rgba } from "@/styles/styles";
import { darkenHexColor } from "@/utils/utils";
import React from "react";
import { Pressable, View } from "react-native";

const MAX_DESCRIPTION_LENGTH = 70;

type SettingControlProps<T> = {
  label: string;
  labelColor?: string;
  helpText?: string;
  applyBehaviorText?: string;
  value: T;
  onChange: (val: T) => void;
  type: "boolean" | "string";
  booleanType?: "toggle" | "checkbox";
  options?: { label: string; value: T; description?: string }[];
};

export function SettingControl<T>({
  label,
  labelColor = Colors.K200,
  helpText,
  applyBehaviorText,
  value,
  onChange,
  type,
  booleanType = "toggle",
  options,
}: SettingControlProps<T>) {
  const { spacing } = useResponsiveMetrics();

  const HelpText = () => {
    return (
      <View
        style={[flexStyles.colStart, flexStyles.fullWidth, { gap: spacing(4) }]}
      >
        {helpText && (
          <Text size="sm" weight={400} color={Colors.white}>
            {helpText}
          </Text>
        )}
        {applyBehaviorText && (
          <Text size="sm" weight={300} color={rgba(Colors.white, 0.6)}>
            {applyBehaviorText}
          </Text>
        )}
      </View>
    );
  };

  if (type === "boolean") {
    const isTrue = Boolean(value);

    return (
      <View
        style={[
          flexStyles.colCentered,
          {
            justifyContent: "space-between",
            width: "100%",
            gap: spacing(10),
          },
        ]}
      >
        <Pressable
          style={
            booleanType === "toggle"
              ? {
                  ...flexStyles.rowCentered,
                  ...flexStyles.fullWidth,
                  justifyContent: "space-between",
                }
              : {
                  padding: 4,
                  flexDirection: "row-reverse",
                  gap: 8,
                  justifyContent: "center",
                  alignItems: "center",
                  width: "100%",
                }
          }
          onPress={() => onChange(!value as any)}
        >
          <Text weight={500} size="lg" color={labelColor} lineHeight={1}>
            {label}
          </Text>

          {booleanType === "toggle" ? (
            <View
              style={[
                {
                  transitionDuration: "0.5s",
                  transitionProperty: "all",
                  transitionTimingFunction: "ease",
                  width: 60,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: isTrue
                    ? Colors.win
                    : darkenHexColor(labelColor, 0.56),
                  justifyContent: "center",
                  paddingHorizontal: 2,
                },
              ]}
            >
              <View
                style={{
                  transitionDuration: "0.5s",
                  transitionProperty: "all",
                  transitionTimingFunction: "ease",
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: Colors.white,
                  transform: [{ translateX: isTrue ? 30 : 4 }],
                  boxShadow: `1px 2px 8px ${rgba(Colors.black, 0.3)}`,
                }}
              />
            </View>
          ) : (
            <View
              style={{
                width: spacing(24),
                height: spacing(24),
                borderRadius: spacing(6),
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon
                name={isTrue ? "check-box-on" : "check-box-off"}
                color={Colors.accentBlue}
              />
            </View>
          )}
        </Pressable>

        <HelpText />
      </View>
    );
  }

  if (type === "string" && options) {
    return (
      <View
        style={[
          flexStyles.colStart,
          {
            width: "100%",
            gap: spacing(12),
          },
        ]}
      >
        <Text weight={500} size="lg" color={labelColor}>
          {label}
        </Text>

        <HelpText />

        <View
          style={{
            ...flexStyles.colStart,
            width: "100%",
            gap: spacing(12),
          }}
        >
          {/* Radio Options */}
          {options.map((opt) => {
            const isSelected = value === opt.value;
            return (
              <View
                key={String(opt.value)}
                style={{ ...flexStyles.colStart, gap: spacing(4) }}
              >
                <Pressable
                  style={{
                    ...flexStyles.colStart,
                    gap: spacing(8),
                  }}
                  onPress={() => onChange(opt.value)}
                >
                  <View style={{ ...flexStyles.rowCentered, gap: spacing(8) }}>
                    <View
                      style={{
                        width: spacing(20),
                        height: spacing(20),
                        borderRadius: spacing(10),
                        borderWidth: 2,
                        borderColor: isSelected
                          ? Colors.accentBlue
                          : rgba(Colors.white, 0.5),
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {isSelected && (
                        <View
                          style={{
                            width: spacing(10),
                            height: spacing(10),
                            borderRadius: spacing(5),
                            backgroundColor: Colors.accentBlue,
                          }}
                        />
                      )}
                    </View>
                    <Text
                      size="md"
                      weight={400}
                      color={isSelected ? Colors.accentBlue : Colors.white}
                      style={{ userSelect: "none" }}
                    >
                      {opt.label}
                    </Text>
                  </View>
                </Pressable>

                {opt.description && (
                  <Text
                    size="sm"
                    color={rgba(Colors.white, 0.8)}
                    style={{ paddingLeft: spacing(28), userSelect: "none" }}
                  >
                    {opt.description}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      </View>
    );
  }

  return null;
}
