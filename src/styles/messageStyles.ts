import { StyleSheet } from "react-native";
import { flexStyles } from "./layoutStyles";
import { Colors, FontWeight, rgba } from "@/styles/styles";

export const messageStyles = StyleSheet.create({
  box: {
    ...flexStyles.colCentered,
    width: "100%",
    minHeight: 80,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: Colors.K900,
  },
  boxWin: {
    borderWidth: 2,
    borderColor: rgba(Colors.accentGreen, 0.5),
  },
  boxLose: {
    borderWidth: 2,
    borderColor: rgba(Colors.accentRed, 0.5),
  },
  text: {
    fontSize: 15,
    fontFamily: FontWeight[300],
    color: Colors.K200,
    textAlign: "center",
  },
  textWin: {
    color: Colors.accentGreen,
  },
  textLose: {
    color: Colors.accentRed,
  },
});
