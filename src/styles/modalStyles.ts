import {
  Colors,
  ContentSidePadding,
  FontWeight,
  MaxContentHeight,
  MaxContentWidth,
  rgba,
} from "@/styles/styles";
import { StyleSheet } from "react-native";
import { flexStyles } from "./flexStyles";

export const modalBorderRadius = 20;

const modalSidePadding = 30;

export const modalShadow = `1px 2px 10px ${rgba(Colors.K900, 0.6)}, 2px 4px 20px ${rgba(Colors.K900, 0.4)}`;

export const modalStyles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: rgba(Colors.K800, 0.7),
    alignItems: "center",
    justifyContent: "center",
    padding: ContentSidePadding / 1.5,
  },
  modalCard: {
    width: "100%",
    maxWidth: MaxContentWidth,
    height: "100%",
    maxHeight: MaxContentHeight,
    backgroundColor: Colors.K900,
    borderRadius: modalBorderRadius,
    overflow: "hidden",
    boxShadow: modalShadow,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingRight: 16,
    paddingLeft: modalSidePadding,
    paddingVertical: 12,
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: modalSidePadding,
  },
  scrollContent: {
    ...flexStyles.colCentered,
    padding: modalSidePadding,
    paddingTop: 10,
    paddingBottom: 40,
    justifyContent: "space-evenly",
    gap: 30,
    // Careful editing these styles below!
    // Expand content when scrolling is needed, but don't shrink
    // Stretch children elements by default, to fill width
    alignItems: "stretch",
    // Stretch self if needed
    alignSelf: "stretch",
  },

  // By line
  byLine: {
    fontFamily: FontWeight[300],
    fontSize: 15,
    color: Colors.K500,
  },

  // Stats and favourite
  statsAndFav: {
    ...flexStyles.rowCentered,
    ...flexStyles.fullWidth,
    justifyContent: "space-between",
    gap: 20,
  },
  stats: {
    ...flexStyles.rowCentered,
    gap: 20,
  },
  stat: {
    ...flexStyles.colCentered,
  },
  statsTextLabel: {
    fontSize: 14,
    color: Colors.K300,
    fontFamily: FontWeight[300],
  },
  statsTextValue: {
    fontSize: 20,
    color: Colors.K100,
    fontFamily: FontWeight[500],
  },
  rules: {
    ...flexStyles.colCentered,
    ...flexStyles.fullWidth,
    alignItems: "flex-start",
    paddingVertical: 12,
    gap: 20,
  },

  // Text
  aboutText: {
    fontSize: 17,
    fontFamily: FontWeight[500],
    color: Colors.K200,
  },
  rulesText: {
    fontSize: 17,
    fontFamily: FontWeight[300],
    color: Colors.K200,
  },

  // Settings
  gameSettings: {
    ...flexStyles.colCentered,
    ...flexStyles.fullWidth,
    alignItems: "flex-start",
    gap: 12,
  },
});
