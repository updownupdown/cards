import { StyleSheet } from "react-native";
import { flexStyles } from "./layoutStyles";
import { Colors, FontWeight } from "@/styles/styles";

const cardTransition = {
  transitionDuration: "0.5s",
  transitionProperty: "all",
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
    overflow: "hidden",
    ...cardTransition,
  },
  // Deck
  deck: {
    position: "relative",
    backgroundColor: Colors.K900,
  },
  deckCard: {
    position: "absolute",
  },
  animHide: {
    opacity: 0,
    pointerEvents: "none",
  },
  // Deck count
  deckCount: {
    ...flexStyles.colCentered,
    position: "absolute",
    zIndex: 100,
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    backgroundColor: Colors.deckRed,
    padding: 6,
    borderRadius: 4,
    gap: 0,
  },
  deckCountTitle: {
    fontSize: 13,
    fontFamily: FontWeight[500],
    color: Colors.white,
  },
  deckCountValue: {
    fontSize: 18,
    fontFamily: FontWeight[500],
    color: Colors.white,
  },
});
