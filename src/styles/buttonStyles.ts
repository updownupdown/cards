import { Colors, FontWeight, HeaderButtonSize, rgba } from "@/styles/styles";
import { StyleSheet } from "react-native";

export const buttonTransition = {
  transitionDuration: "0.4s",
  transitionProperty: "all",
  transitionTimingFunction: "ease",
};

export const buttonStyles = StyleSheet.create({
  cardPlaceholderContentBtn: {
    ...buttonTransition,
    width: "88%",
    height: "90%",
    padding: 0,
  },

  // Sizes
  sizeText: {
    backgroundColor: "unset",
    borderWidth: 0,
    boxShadow: "unset",
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
    lineHeight: 16,
  },
  textSizeTextLarge: {
    fontSize: 15,
    color: Colors.accentBlue,
    textTransform: "uppercase",
    fontFamily: FontWeight[500],
    lineHeight: 15,
  },
  textSizeSmall: {
    fontSize: 12,
    textTransform: "uppercase",
    color: Colors.accentBlue,
    lineHeight: 12,
  },
  textSizeMedium: {
    fontSize: 16,
    textTransform: "uppercase",
    color: Colors.accentBlue,
    fontFamily: FontWeight[500],
    lineHeight: 16,
  },
  textSizeLarge: {
    fontSize: 18,
    textTransform: "uppercase",
    color: Colors.accentBlue,
    fontFamily: FontWeight[600],
    lineHeight: 18,
  },

  // Themes

  // Disabled
  disabled: {
    opacity: 0.4,
  },
  textDisabled: {
    opacity: 0.6,
  },

  // Header button
  headerButton: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: 0,
    width: HeaderButtonSize,
    height: HeaderButtonSize,
    boxShadow: "unset",
    borderRadius: "unset",
    backgroundColor: "unset",
  },
  closeModalButton: {
    marginLeft: "auto",
    backgroundColor: Colors.K850,
    borderRadius: HeaderButtonSize / 2,
  },
  icon: {
    ...buttonTransition,
    flexShrink: 0,
  },
});
