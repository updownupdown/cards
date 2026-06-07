import { Colors, ContentSidePadding, FontWeight, rgba } from "@/styles/styles";
import { StyleSheet } from "react-native";
import { flexStyles } from "./flexStyles";
import { modalBorderRadius } from "./modalStyles";

export const menuStyles = StyleSheet.create({
  introHowToPlayText: {
    ...flexStyles.colCentered,
    ...flexStyles.fullWidth,
    alignItems: "flex-start",
    fontSize: 17,
    fontFamily: FontWeight[300],
    color: Colors.K200,
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
    margin: ContentSidePadding,
    paddingHorizontal: 12,
    bottom: 0,
    right: 0,
    left: 0,
    ...flexStyles.colCentered,
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
    paddingTop: 20,
    gap: 2,
  },
  wlmTitle: {
    fontSize: 24,
    fontFamily: FontWeight[400],
    color: Colors.white,
  },
  wlmScore: {
    fontSize: 16,
    fontFamily: FontWeight[300],
    color: Colors.white,
    textAlign: "center",
  },
  playBtn: {
    textTransform: "uppercase",
    paddingVertical: 30,
    fontSize: 18,
    color: Colors.white,
    fontFamily: FontWeight[500],
  },
});
