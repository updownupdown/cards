import { Colors, FontWeight } from "@/styles/styles";
import { Platform, StyleSheet, TextStyle } from "react-native";

export const textStyles = StyleSheet.create({
  default: {
    fontSize: 17,
    fontFamily: FontWeight[300],
    color: Colors.K200,
  },
  caps: {
    fontSize: 14,
    fontFamily: FontWeight[300],
    color: Colors.K200,
    textTransform: "uppercase",
  },
  h4: {
    fontSize: 20,
    fontFamily: FontWeight[400],
    color: Colors.K200,
    textTransform: "uppercase",
  },
  h5: {
    fontSize: 16,
    fontFamily: FontWeight[300],
    color: Colors.K200,
    textTransform: "uppercase",
  },
  h6: {
    fontSize: 14,
    fontFamily: FontWeight[300],
    color: Colors.K200,
    textTransform: "uppercase",
  },
  shadowText: {
    ...Platform.select({
      // Web uses the unified standard CSS textShadow string
      web: {
        textShadow: "0 1px 2px rgba(0, 0, 0, 0.4)",
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
    left: 8,
    textAlign: "center",
    transformOrigin: "top center",
    transform: [{ rotate: `-90deg` }, { translateY: "-50%" }],
  },
];
