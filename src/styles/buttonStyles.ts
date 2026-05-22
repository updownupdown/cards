import { Colors, FontWeight, rgba } from "@/styles/styles";
import { StyleSheet } from "react-native";

export const buttonStyles = StyleSheet.create({
  button: {
    transitionDuration: "0.1s",
    transitionProperty: "all",
    transitionTimingFunction: "ease",
    padding: 6,
    height: 44,
    // flex: 1,
    justifyContent: "center",
    alignContent: "center",
    paddingHorizontal: 18,

    borderRadius: 22,
    backgroundColor: rgba(Colors.accentBlueDark, 0.2),
    boxShadow: `inset 0 1px 1px ${rgba(Colors.accentBluePale, 0.3)},
            inset 1px 2px 10px ${rgba(Colors.accentBlue, 0.2)},
            inset 2px 4px 30px ${rgba(Colors.K700, 0.6)},
            -2px -2px 12px ${rgba(Colors.accentBlueDark, 0.6)},
            2px 2px 12px ${rgba(Colors.K950, 0.4)}`,

    fontSize: 16,
    fontFamily: FontWeight[300],
    color: Colors.accentBluePale,
    textAlign: "center",
    textTransform: "uppercase",
  },
  buttonDisabled: {
    opacity: 0.5,
    color: Colors.K900,
    // backgroundColor: rgba(Colors.K200, 0.2),
    backgroundColor: Colors.K800,
    boxShadow: "unset",
  },

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
    fontFamily: FontWeight[500],
    color: Colors.accentBluePale,
  },
  textDisabled: {
    color: Colors.K400,
  },
});
