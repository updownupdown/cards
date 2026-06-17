import { Colors, FontWeight } from "@/styles/styles";
import { StyleSheet, TextStyle } from "react-native";

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
  h1: {
    fontSize: 24,
    fontFamily: FontWeight[500],
    color: Colors.K100,
    textTransform: "uppercase",
  },
  h2: {
    fontSize: 28,
    fontFamily: FontWeight[300],
    color: Colors.K200,
    textTransform: "uppercase",
  },
  h3: {
    fontSize: 24,
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
});

export const rotatedText: TextStyle[] = [
  textStyles.default,
  {
    pointerEvents: "none",
    width: 80,
    height: 80,
    fontSize: 14,
    position: "absolute",
    top: "50%",
    left: 8,
    textAlign: "center",
    transformOrigin: "top center",
    transform: [{ rotate: `-90deg` }, { translateY: "-50%" }],
  },
];
