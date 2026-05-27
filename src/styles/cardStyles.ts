import { StyleSheet } from "react-native";
import { flexStyles } from "./flexStyles";

const cardTransition = {
  transitionDuration: "0.5s",
  transitionProperty:
    "box-shadow, border-color, border-width, bottom, left, right, top",
  transitionTimingFunction: "ease",
};

export const cardStyles = StyleSheet.create({
  row: {
    ...flexStyles.rowCentered,
    width: "100%",
    flexWrap: "wrap",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  rowAlignDown: {
    alignItems: "flex-end",
    alignContent: "flex-end",
  },
  rowGap4: {
    gap: 10,
  },
  colDownwards: {
    ...flexStyles.colCentered,
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  colUpwards: {
    ...flexStyles.colCentered,
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  transition: {
    ...cardTransition,
  },
  // Card itself
  card: {
    ...cardTransition,
    overflow: "hidden",
    position: "relative",
    outlineWidth: 0,
  },
  cardSelectOverlay: {
    ...cardTransition,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  animHide: {
    opacity: 0,
    pointerEvents: "none",
  },
});
