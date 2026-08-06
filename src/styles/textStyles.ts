import { Colors, FontWeight } from "@/styles/styles";
import { Platform, StyleSheet, TextStyle } from "react-native";

export const textStyles = StyleSheet.create({
  shadowText: {
    ...Platform.select({
      // Web uses the unified standard CSS textShadow string
      web: {
        textShadow: "0 1px 3px rgba(0, 0, 0, 0.3)",
      },
      // iOS and Android use the separate mobile style props
      default: {
        textShadowColor: "rgba(0, 0, 0, 0.4)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
      },
    }),
  },
});

export const rotatedText: TextStyle[] = [
  {
    fontSize: 14,
    fontFamily: FontWeight[300],
    color: Colors.K200,
    pointerEvents: "none",
    width: 80,
    height: 80,
    position: "absolute",
    top: "50%",
    left: 4,
    textAlign: "center",
    transformOrigin: "top center",
    transform: [{ rotate: `-90deg` }, { translateY: "-50%" }],
  },
];
