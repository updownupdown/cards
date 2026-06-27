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
