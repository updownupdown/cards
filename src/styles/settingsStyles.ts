import { Colors } from "@/styles/styles";
import { StyleSheet } from "react-native";
import { flexStyles } from "./flexStyles";

export const settingsStyles = StyleSheet.create({
  container: {
    ...flexStyles.rowCentered,
    justifyContent: "space-between",
    width: "100%",
  },
  containerCol: {
    ...flexStyles.rowCentered,
    justifyContent: "space-between",
    width: "100%",
    gap: 12,
  },
  toggleWrap: {
    ...flexStyles.rowCentered,
    ...flexStyles.fullWidth,
    justifyContent: "space-between",
    padding: 4,
  },
  toggleBg: {
    width: 60,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.K800,
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  toggleBgOn: {
    backgroundColor: Colors.win,
  },
  toggleKnob: {
    transitionDuration: "0.5s",
    transitionProperty: "all",
    transitionTimingFunction: "ease",
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.white,
    transform: [{ translateX: 4 }],
  },
  toggleKnobOn: {
    transform: [{ translateX: 30 }],
  },
  checkboxWrap: {
    padding: 4,
    flexDirection: "row-reverse",
    gap: 8,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
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
