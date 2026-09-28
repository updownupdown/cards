import { Text } from "@/components/common/Text";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { Icon } from "@/icons";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, rgba, theme } from "@/styles/styles";
import { darkenHexColor } from "@/utils/utils";
import React from "react";
import { Pressable, View } from "react-native";

type SettingControlProps<T> = {
  label: string;
  labelColor?: string;
  /** Short explanation shown directly under the label. */
  description?: string;
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
  labelColor = theme.ink,
  description,
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
          <Text size="sm" weight={400} color={theme.ink}>
            {helpText}
          </Text>
        )}
        {applyBehaviorText && (
          <Text size="sm" weight={300} color={theme.dim}>
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
          <View
            style={[
              flexStyles.colStart,
              booleanType === "toggle" && flexStyles.flex1,
              { gap: spacing(4), paddingRight: spacing(12) },
            ]}
          >
            {/* Default line height: 1 clipped descenders (g, p) on Android. */}
            <Text weight={500} size="md" color={labelColor}>
              {label}
            </Text>
            {description && (
              <Text size="sm" weight={300} color={theme.dim}>
                {description}
              </Text>
            )}
          </View>

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
                    ? theme.accent
                    : rgba(theme.ink, 0.12),
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
                  backgroundColor: isTrue ? theme.accentInk : theme.ink,
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
                color={theme.accent}
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
        <Text weight={500} size="md" color={labelColor}>
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
                          ? theme.accent
                          : rgba(theme.ink, 0.3),
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
                            backgroundColor: theme.accent,
                          }}
                        />
                      )}
                    </View>
                    <Text
                      size="md"
                      weight={400}
                      color={isSelected ? theme.accent : theme.ink}
                      style={{ userSelect: "none" }}
                    >
                      {opt.label}
                    </Text>
                  </View>
                </Pressable>

                {opt.description && (
                  <Text
                    size="sm"
                    color={theme.dim}
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
