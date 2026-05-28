import { Colors, FontWeight, rgba } from "@/styles/styles";
import { StyleSheet } from "react-native";

const buttonTransition = {
  transitionDuration: "0.4s",
  transitionProperty: "all",
  transitionTimingFunction: "ease",
};

export const headerButtonSize = 48;
export const headerButtonIconSize = 30;

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

    backgroundColor: rgba(Colors.buttonColor, 0.1),
    borderWidth: 1,
    borderColor: Colors.buttonColor,
    outlineWidth: 0,
  },

  // Sizes
  sizeText: {
    backgroundColor: "unset",
    borderWidth: 0,
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
  themeRed: {
    borderColor: Colors.btnRed,
    backgroundColor: rgba(Colors.btnRed, 0.1),
  },
  themeBlue: {
    borderColor: Colors.btnBlue,
    backgroundColor: rgba(Colors.btnBlue, 0.1),
  },
  themeYellow: {
    borderColor: Colors.btnYellow,
    backgroundColor: rgba(Colors.btnYellow, 0.1),
  },
  themeGreen: {
    borderColor: Colors.btnGreen,
    backgroundColor: rgba(Colors.btnGreen, 0.1),
  },
  themeOrange: {
    borderColor: Colors.btnOrange,
    backgroundColor: rgba(Colors.btnOrange, 0.1),
  },
  themePurple: {
    borderColor: Colors.btnPurple,
    backgroundColor: rgba(Colors.btnPurple, 0.1),
  },

  themeTextRed: {
    color: Colors.btnRed,
  },
  themeTextBlue: {
    color: Colors.btnBlue,
  },
  themeTextYellow: {
    color: Colors.btnYellow,
  },
  themeTextGreen: {
    color: Colors.btnGreen,
  },
  themeTextOrange: {
    color: Colors.btnOrange,
  },
  themeTextPurple: {
    color: Colors.btnPurple,
  },

  // Disabled
  disabled: {
    color: Colors.K900,
    borderColor: rgba(Colors.K500, 0.5),
    backgroundColor: rgba(Colors.K500, 0.1),
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
    borderWidth: 0,
    borderColor: "unset",
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
