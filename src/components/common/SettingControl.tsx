import { Text } from "@/components/common/Text";
import { Icon } from "@/icons";
import { settingsStyles } from "@/styles/settingsStyles";
import { Colors, rgba } from "@/styles/styles";
import React from "react";
import { Pressable, View } from "react-native";

type SettingControlProps<T> = {
  label: string;
  labelColor?: string;
  helpText?: string;
  value: T;
  onChange: (val: T) => void;
  type: "boolean" | "string";
  booleanType?: "toggle" | "checkbox";
  options?: { label: string; value: T }[];
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
  if (type === "boolean") {
    const isTrue = Boolean(value);

    return (
      <View style={[settingsStyles.container]}>
        <Pressable
          style={
            booleanType === "toggle"
              ? settingsStyles.toggleWrap
              : settingsStyles.checkboxWrap
          }
          onPress={() => onChange(!value as any)}
        >
          <Text weight={500} size="lg" color={labelColor}>
            {label}
          </Text>

          {booleanType === "toggle" ? (
            <View
              style={[
                settingsStyles.toggleBg,
                isTrue && settingsStyles.toggleBgOn,
              ]}
            >
              <View
                style={[
                  settingsStyles.toggleKnob,
                  isTrue && settingsStyles.toggleKnobOn,
                ]}
              />
            </View>
          ) : (
            <View style={[settingsStyles.checkboxBg]}>
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
      <View style={settingsStyles.containerCol}>
        <Text weight={500} size="lg" color={labelColor}>
          {label}
        </Text>

        {helpText && (
          <Text
            size="sm"
            color={rgba(Colors.white, 0.7)}
            style={{ width: "100%" }}
          >
            {helpText}
          </Text>
        )}

        <View style={settingsStyles.optionsWrap}>
          {options.map((opt) => {
            const isSelected = value === opt.value;
            return (
              <Pressable
                key={String(opt.value)}
                style={settingsStyles.radioRow}
                onPress={() => onChange(opt.value)}
              >
                <View style={settingsStyles.radioOuter}>
                  {isSelected && <View style={settingsStyles.radioInner} />}
                </View>
                <Text size="sm">{opt.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }

  return null;
}
