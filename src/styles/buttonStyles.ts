import { Colors } from "@/constants/theme";
import { StyleSheet } from "react-native";

export const buttonStyles = StyleSheet.create({
  button: {
    transitionDuration: "0.1s",
    transitionProperty: "all",
    transitionTimingFunction: "ease",
    padding: 6,
    fontSize: 14,

    backgroundColor: Colors.accentBtn,
    borderRadius: 8,

    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  buttonDisabled: {
    backgroundColor: Colors.K300,
  },
  buttonText: {
    fontFamily: "Outfit_500Medium",
    color: Colors.white,
  },
  headerButton: {
    // backgroundColor: Colors.K200,
    padding: 12,
  },
});
