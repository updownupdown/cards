import { Colors, FontWeight, rgba } from "@/styles/styles";
import { StyleSheet } from "react-native";
import { flexStyles } from "./layoutStyles";
import { buttonStyles } from "./buttonStyles";

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
    fontFamily: "Outfit_600SemiBold",
  },
  gameButton: {
    ...buttonStyles.button,
    flex: 1,
    textTransform: "none",
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
  gameStats: {
    ...flexStyles.colCentered,
    // justifyContent: "flex-start",
    alignItems: "flex-start",
    padding: 20,
    textAlign: "left",
    gap: 8,
  },
});
