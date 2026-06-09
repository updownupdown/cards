import { StyleSheet } from "react-native";
import { flexStyles, transitionStyles } from "./flexStyles";
import { Colors } from "./styles";

const cardTransition = {
  ...transitionStyles.sec03,
  transitionProperty: "bottom, left, right, top, transform",
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
  cardGrid: {
    display: "flex",
    flexWrap: "wrap",
    flexDirection: "row-reverse",
    justifyContent: "flex-end",
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
    zIndex: 3,
    outlineWidth: 0,
  },

  cardSelectOverlay: {
    position: "absolute",
    zIndex: 4,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  cardPlaceholderUnderlay: {
    position: "absolute",
    zIndex: 1,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.K860,
  },
  animHide: {
    opacity: 0,
    pointerEvents: "none",
  },
  placeholderContentWrap: {
    position: "absolute",
    zIndex: 5,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    ...flexStyles.colCentered,
  },
});
