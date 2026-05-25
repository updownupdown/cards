import {
  Colors,
  FontWeight,
  MaxContentHeight,
  MaxContentWidth,
  rgba,
} from "@/styles/styles";
import { StyleSheet } from "react-native";
import { flexStyles } from "./flexStyles";

export const modalBorderRadius = 20;

const modalSidePadding = 30;

export const modalStyles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: rgba(Colors.K800, 0.2),
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  modalCard: {
    width: "100%",
    maxWidth: MaxContentWidth,
    height: "100%",
    maxHeight: MaxContentHeight,
    backgroundColor: rgba(Colors.K900, 1),
    borderRadius: modalBorderRadius,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: modalSidePadding,
  },
  scrollContent: {
    flex: 1,
    padding: modalSidePadding,
    gap: 30,
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
