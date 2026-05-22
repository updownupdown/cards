import { StyleSheet } from "react-native";
import { flexStyles } from "./layoutStyles";
import { Colors, FontWeight } from "@/styles/styles";

export const cardStyles = StyleSheet.create({
  cardsCols: {
    ...flexStyles.colCentered,
    flex: 1,
    justifyContent: "center",
  },
  cardsRows: {
    ...flexStyles.rowCentered,
    flexWrap: "wrap",
    alignItems: "flex-start",
  },
  // Card itself
  card: {
    transitionDuration: "0.1s",
    transitionProperty: "all",
    transitionTimingFunction: "ease",
    height: "auto",
  },
  // Deck
  deck: {
    position: "relative",
  },
  deckCard: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  deckCardBottom: {
    position: "relative",
  },
  deckCardTop: {},
  deckCardTopOnly: {
    position: "relative",
    transform: "unset",
  },
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
