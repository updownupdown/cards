import { Text } from "@/components/common/Text";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { Icon } from "@/icons";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, rgba, transitionStyles } from "@/styles/styles";
import { darkenHexColor } from "@/utils/utils";
import React from "react";
import { Pressable, View } from "react-native";

const MAX_DESCRIPTION_LENGTH = 70;

type SettingControlProps<T> = {
  label: string;
  labelColor?: string;
  helpText?: string;
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
  value,
  onChange,
  type,
  booleanType = "toggle",
  options,
}: SettingControlProps<T>) {
  const { spacing } = useResponsiveMetrics();

  if (type === "boolean") {
    const isTrue = Boolean(value);

    return (
      <View
        style={[
          flexStyles.colCentered,
          {
            justifyContent: "space-between",
            width: "100%",
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
                    : darkenHexColor(Colors.accentBlue, 0.8),
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

        {helpText && (
          <Text
            size="sm"
            color={rgba(Colors.white, 0.7)}
            style={{ paddingTop: 8, width: "100%" }}
          >
            {helpText}
          </Text>
        )}
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
        <View
          style={[
            flexStyles.rowCentered,
            flexStyles.spaceBetween,
            flexStyles.fullWidth,
          ]}
        >
          <Text weight={500} size="lg" color={labelColor}>
            {label}
          </Text>
          <Icon name="settings" size={28} color={labelColor} />
        </View>

        {helpText && (
          <Text
            size="sm"
            color={rgba(Colors.white, 0.7)}
            style={{ width: "100%" }}
          >
            {helpText}
          </Text>
        )}

        <View
          style={{
            ...flexStyles.colStart,
            width: "100%",
            gap: spacing(20),
          }}
        >
          {options.map((opt) => {
            const isSelected = value === opt.value;
            const optionDescription = opt.description
              ? isSelected || opt.description.length <= MAX_DESCRIPTION_LENGTH
                ? opt.description
                : `${opt.description.slice(0, MAX_DESCRIPTION_LENGTH - 3)}...`
              : undefined;
            return (
              <View
                key={String(opt.value)}
                style={{ ...flexStyles.colStart, gap: spacing(4) }}
              >
                <Pressable
                  // key={String(opt.value)}
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

                {optionDescription && (
                  <Text
                    size="sm"
                    color={rgba(Colors.white, isSelected ? 1 : 0.7)}
                    style={{ paddingLeft: spacing(28), userSelect: "none" }}
                  >
                    {optionDescription}
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
