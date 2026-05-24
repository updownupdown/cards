import { Colors, FontWeight, rgba } from "@/styles/styles";
import { StyleSheet } from "react-native";

export const buttonStyles = StyleSheet.create({
  fullWidth: {
    width: "100%",
  },
  button: {
    transitionDuration: "0.1s",
    transitionProperty: "all",
    transitionTimingFunction: "ease",
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,

    backgroundColor: Colors.accentBlue,
  },

  // Sizes
  sizeText: {
    backgroundColor: "unset",
  },
  sizeSmall: {
    height: 34,
    borderRadius: 17,
    paddingHorizontal: 14,
  },
  sizeMedium: {
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 18,
  },
  sizeLarge: {
    height: 60,
    borderRadius: 30,
    paddingHorizontal: 28,
  },

  // Text sizes
  text: {
    textAlign: "center",
    fontFamily: FontWeight[400],
  },
  textSizeText: {
    fontSize: 16,
    color: Colors.accentBlue,
  },
  textSizeSmall: {
    fontSize: 12,
    textTransform: "uppercase",
    color: Colors.K900,
  },
  textSizeMedium: {
    fontSize: 16,
    textTransform: "uppercase",
    color: Colors.K900,
  },
  textSizeLarge: {
    fontSize: 18,
    textTransform: "uppercase",
    color: Colors.K900,
    fontFamily: FontWeight[600],
  },

  // Disabled
  disabled: {
    opacity: 0.5,
    color: Colors.K900,
    backgroundColor: Colors.K800,
    boxShadow: "unset",
  },
  textDisabled: {
    color: Colors.K400,
  },

  // Header button
  headerButton: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: 0,
    width: 44,
    height: 44,
    boxShadow: "unset",
    backgroundColor: "unset",
  },
  icon: {
    flexShrink: 0,
  },
});
