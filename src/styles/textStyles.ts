import { Colors } from "@/constants/theme";
import { StyleSheet } from "react-native";

export const textStyles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: "Outfit_500Medium",
    color: Colors.K800,
  },
  title: {
    fontSize: 24,
    fontFamily: "Outfit_600SemiBold",
    color: Colors.K800,
  },
});
