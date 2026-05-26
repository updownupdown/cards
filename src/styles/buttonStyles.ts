import { Colors, FontWeight, rgba } from "@/styles/styles";
import { StyleSheet } from "react-native";

const buttonTransition = {
  transitionDuration: "0.4s",
  transitionProperty: "all",
  transitionTimingFunction: "ease",
};

export const headerButtonSize = 44;

export const buttonStyles = StyleSheet.create({
  fullWidth: {
    width: "100%",
  },
  button: {
    ...buttonTransition,
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,

    backgroundColor: Colors.accentBlue,
    outlineWidth: 0,
  },

  // Sizes
  sizeText: {
    backgroundColor: "unset",
  },
  sizeTextLarge: {
    backgroundColor: "unset",
    padding: 20,
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
    transitionDuration: "0.4s",
    transitionProperty: "all",
    transitionTimingFunction: "ease",
    textAlign: "center",
    fontFamily: FontWeight[400],
  },
  textSizeText: {
    fontSize: 16,
    color: Colors.accentBlue,
  },
  textSizeTextLarge: {
    fontSize: 15,
    color: Colors.accentBlue,
    textTransform: "uppercase",
    fontFamily: FontWeight[500],
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
    width: headerButtonSize,
    height: headerButtonSize,
    boxShadow: "unset",
    borderRadius: "unset",
    backgroundColor: "unset",
  },
  closeModalButton: {
    backgroundColor: Colors.K850,
    borderRadius: headerButtonSize / 2,
  },
  icon: {
    ...buttonTransition,
    flexShrink: 0,
  },
});
