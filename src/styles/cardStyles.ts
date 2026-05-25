import { StyleSheet } from "react-native";
import { Colors, FontWeight } from "@/styles/styles";
import { flexStyles } from "./flexStyles";

const cardTransition = {
  transitionDuration: "0.5s",
  transitionProperty: "box-shadow, border-color, border-width",
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
    position: "relative",
    ...cardTransition,
  },
  cardSelectOverlay: {
    ...cardTransition,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  // Deck wrap
  deckWrap: {
    display: "flex",
    backgroundColor: Colors.K900,
  },
  deckWrapCountOver: {},
  deckWrapCountAbove: {
    alignItems: "center",
    flexDirection: "column",
  },
  deckWrapCountBelow: {
    alignItems: "center",
    flexDirection: "column-reverse",
  },
  deckWrapCountLeft: {
    flexDirection: "row",
    justifyContent: "center",
  },
  deckWrapCountRight: {
    flexDirection: "row-reverse",
    justifyContent: "center",
  },
  // Deck
  deck: {
    position: "relative",
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
    zIndex: 100,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 8,
    maxWidth: "100%",
  },
  // To the side
  deckCountAbove: {
    ...flexStyles.rowCentered,
    width: "100%",
    left: "50%",
    transform: "translateX(-50%)",
    flexDirection: "row",
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  deckCountBelow: {
    ...flexStyles.rowCentered,
    width: "100%",
    left: "50%",
    transform: "translateX(-50%)",
    flexDirection: "row",
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  deckCountLeft: {
    ...flexStyles.colCentered,
    flexDirection: "column",
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  deckCountRight: {
    ...flexStyles.colCentered,
    flexDirection: "column",
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },

  // Over
  deckCountOver: {
    ...flexStyles.colCentered,
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    backgroundColor: Colors.deckRed,
  },
  deckCountTitle: {
    fontSize: 13,
    fontFamily: FontWeight[500],
    color: Colors.K300,
  },
  deckCountIcon: {
    width: 24,
    height: 24,
    flexShrink: 0,
  },
  deckCountValue: {
    fontSize: 18,
    fontFamily: FontWeight[500],
    color: Colors.K300,
  },
});
