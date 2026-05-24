import { Colors } from "@/styles/styles";
import { StyleSheet } from "react-native";
import { flexStyles } from "./flexStyles";

export const settingsStyles = StyleSheet.create({
  container: {
    ...flexStyles.rowCentered,
    justifyContent: "space-between",
    width: "100%",
    paddingVertical: 12,
  },
  containerCol: {
    width: "100%",
    paddingVertical: 12,
    gap: 12,
  },
  toggleWrap: {
    padding: 4,
  },
  toggleBg: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.K800,
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  toggleBgOn: {
    backgroundColor: Colors.accentBlue,
  },
  toggleKnob: {
    transitionDuration: "0.5s",
    transitionProperty: "all",
    transitionTimingFunction: "ease",
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.white,
    transform: [{ translateX: 0 }],
  },
  toggleKnobOn: {
    transform: [{ translateX: 20 }],
  },
  checkboxWrap: {
    padding: 4,
  },
  checkboxBg: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  optionsWrap: {
    ...flexStyles.rowCentered,
    gap: 20,
  },
  radioRow: {
    ...flexStyles.rowCentered,
    gap: 8,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.K600,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.K400,
  },
});
