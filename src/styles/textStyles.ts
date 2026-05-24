import { Colors, FontWeight } from "@/styles/styles";
import { StyleSheet } from "react-native";

export const textStyles = StyleSheet.create({
  gameHeaderTitle: {
    fontSize: 20,
    fontFamily: FontWeight[300],
    color: Colors.K400,
    flex: 1,
    textAlign: "center",
  },
  default: {
    fontSize: 16,
    fontFamily: FontWeight[300],
    color: Colors.K200,
  },
  h1: {
    fontSize: 24,
    fontFamily: FontWeight[500],
    color: Colors.K100,
  },
  h2: {
    fontSize: 28,
    fontFamily: FontWeight[300],
    color: Colors.K200,
  },
  h3: {
    fontSize: 24,
    fontFamily: FontWeight[300],
    color: Colors.K200,
  },
  h4: {
    fontSize: 20,
    fontFamily: FontWeight[300],
    color: Colors.K200,
  },
  h5: {
    fontSize: 16,
    fontFamily: FontWeight[300],
    color: Colors.K200,
  },
  h6: {
    fontSize: 14,
    fontFamily: FontWeight[300],
    color: Colors.K200,
  },
});
