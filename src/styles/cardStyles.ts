import { StyleSheet } from "react-native";
import { flexStyles } from "./layoutStyles";
import { Colors } from "@/constants/theme";

export const cardStyles = StyleSheet.create({
  cardsCols: {
    ...flexStyles.colCentered,
    flex: 1,
    justifyContent: "center",
  },
  cardsRows: {
    ...flexStyles.rowCentered,
    flexWrap: "wrap",
    // width: "100%",
    justifyContent: "flex-start",
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
  deckCount: {
    ...flexStyles.colCentered,
    position: "absolute",
    zIndex: 100,
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    backgroundColor: Colors.white,
    padding: 6,
    borderRadius: 4,
  },
  deckCountText: {
    fontSize: 18,
    lineHeight: 24,
    fontFamily: "Outfit_500Medium",
    color: Colors.K800,
  },
});
