import { StyleSheet } from "react-native";
import { flexStyles } from "./layoutStyles";
import { Colors, FontWeight } from "@/styles/styles";

export const cardStyles = StyleSheet.create({
  row: {
    ...flexStyles.rowCentered,
    width: "100%",
    flexWrap: "wrap",
    alignItems: "flex-start",
    justifyContent: "space-between",
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
    height: "100%",
    alignItems: "center",
    justifyContent: "flex-end",
  },

  // Card itself
  card: {
    transitionDuration: "0.2s",
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
  // deckCardTopOnly: {
  //   position: "relative",
  //   transform: "unset",
  // },
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
