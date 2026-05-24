import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { textStyles } from "@/styles/textStyles";
import { flexStyles } from "@/styles/flexStyles";
import { Colors } from "@/styles/styles";
import { Icon } from "@/icons";
import { settingsStyles } from "@/styles/settingsStyles";

type SettingControlProps<T> = {
  label: string;
  value: T;
  onChange: (val: T) => void;
  type: "boolean" | "string";
  booleanType?: "toggle" | "checkbox";
  options?: { label: string; value: T }[];
};

export function SettingControl<T>({
  label,
  value,
  onChange,
  type,
  booleanType = "toggle",
  options,
}: SettingControlProps<T>) {
  if (type === "boolean") {
    const isTrue = Boolean(value);

    return (
      <View style={settingsStyles.container}>
        <Text style={textStyles.default}>{label}</Text>
        <Pressable
          style={
            booleanType === "toggle"
              ? settingsStyles.toggleWrap
              : settingsStyles.checkboxWrap
          }
          onPress={() => onChange(!value as any)}
        >
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
      </View>
    );
  }

  if (type === "string" && options) {
    return (
      <View style={settingsStyles.containerCol}>
        <Text style={textStyles.default}>{label}</Text>
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
                <Text style={textStyles.default}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }

  return null;
}
