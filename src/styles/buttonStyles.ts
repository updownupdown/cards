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

    justifyContent: "center",
    alignItems: "center",

    backgroundColor: rgba(Colors.accentBlueDark, 0.2),
    boxShadow: `inset 0 1px 1px ${rgba(Colors.accentBluePale, 0.3)},
            inset 1px 2px 10px ${rgba(Colors.accentBlue, 0.2)},
            inset 2px 4px 30px ${rgba(Colors.K700, 0.6)},
            -2px -2px 12px ${rgba(Colors.accentBlueDark, 0.6)},
            2px 2px 12px ${rgba(Colors.K950, 0.4)}`,

    fontFamily: FontWeight[300],
    color: Colors.accentBluePale,
    textAlign: "center",
    textTransform: "uppercase",
  },

  // Sizes
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
  textSizeSmall: {
    fontSize: 12,
    fontFamily: FontWeight[400],
  },
  textSizeMedium: {
    fontSize: 16,
    fontFamily: FontWeight[600],
  },
  textSizeLarge: {
    fontSize: 18,
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
  },
  icon: {},
  text: {
    color: Colors.accentBluePale,
  },
});
