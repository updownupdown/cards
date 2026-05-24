import { Colors, FontWeight, rgba } from "@/styles/styles";
import { StyleSheet } from "react-native";
import { flexStyles } from "./flexStyles";
import { modalBorderRadius } from "./modalStyles";

export const menuStyles = StyleSheet.create({
  // Intro
  intro: {
    ...flexStyles.colCentered,
    position: "absolute",
    zIndex: 10,
    bottom: 0,
    right: 0,
    left: 0,
    minHeight: 200,

    padding: 30,
    gap: 30,

    borderRadius: modalBorderRadius,
    backgroundColor: rgba(Colors.K900, 0.97),
  },
  introHowToPlay: {
    ...flexStyles.colCentered,
    ...flexStyles.fullWidth,
    gap: 20,
  },
  introHowToPlayText: {
    ...flexStyles.colCentered,
    ...flexStyles.fullWidth,
    alignItems: "flex-start",
    maxWidth: 300,
  },

  // Win/lose message
  wlmOverlay: {
    position: "absolute",
    zIndex: 9, // just under the game header
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: rgba(Colors.K850, 0.5),
  },
  winLoseMessage: {
    position: "absolute",
    zIndex: 500,
    bottom: 0,
    right: 0,
    left: 0,
    gap: 30,

    ...flexStyles.rowCentered,
    justifyContent: "space-between",

    borderRadius: modalBorderRadius,
    backgroundColor: rgba(Colors.K900, 0.97),
  },
  winLoseMessageWin: {
    backgroundColor: rgba(Colors.win, 0.95),
    boxShadow: `0 0 20px ${rgba(Colors.win, 0.6)}, 0 0 40px ${rgba(Colors.win, 0.6)}`,
  },
  winLoseMessageLose: {
    backgroundColor: rgba(Colors.lose, 0.9),
    boxShadow: `0 0 20px ${rgba(Colors.lose, 0.6)}, 0 0 40px ${rgba(Colors.lose, 0.6)}`,
  },
  winLoseMessageLeft: {
    ...flexStyles.colCentered,
    paddingHorizontal: 24,
    paddingVertical: 20,
    alignItems: "flex-start",
    gap: 2,
  },
  wlmTitle: {
    fontSize: 24,
    fontFamily: FontWeight[300],
    color: Colors.white,
  },
  wlmScore: {
    fontSize: 18,
    fontFamily: FontWeight[500],
    color: Colors.white,
  },
  playBtn: {
    textTransform: "uppercase",
    paddingHorizontal: 30,
    paddingVertical: 20,
    fontSize: 18,
    color: Colors.white,
    fontFamily: FontWeight[500],
  },
});
