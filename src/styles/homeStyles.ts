import { Colors, FontWeight } from "@/styles/styles";
import { StyleSheet } from "react-native";
import { buttonStyles } from "./buttonStyles";
import { flexStyles } from "./flexStyles";

export const homeStyles = StyleSheet.create({
  scrollContent: {
    paddingVertical: 30,
    backgroundColor: Colors.K850,
  },
  linkCol: {
    ...flexStyles.colCentered,
    alignItems: "stretch",
    gap: 12,
    width: "100%",
    paddingHorizontal: 12,
  },
  gameRow: {
    ...flexStyles.rowCentered,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionHeaderRow: {
    marginTop: 20,
    marginBottom: 6,
  },
  sectionHeader: {
    fontSize: 14,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: Colors.K200,
    fontFamily: FontWeight[600],
  },
  gameButton: {
    ...buttonStyles.button,
    ...buttonStyles.sizeMedium,
    ...buttonStyles.fullWidth,
    ...buttonStyles.textSizeMedium,
    // flex: 1,
    textTransform: "none",
    fontFamily: FontWeight[400],
  },
  starBtn: {
    width: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    // backgroundColor: Colors.K500,
  },
  starBtnOn: {
    // backgroundColor: Colors.accentOrange,
  },
  starBtnOnSvg: {
    color: Colors.accentOrange,
  },
});
