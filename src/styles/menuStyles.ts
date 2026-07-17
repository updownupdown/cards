import { HeaderButtonSize, HomePadding } from "@/styles/styles";
import { StyleSheet } from "react-native";
import { roundToPixel } from "@/utils/utils";
import { flexStyles } from "./flexStyles";

export const floatingBarDims = {
  padding: 6,
  gap: 6,
  height: 58,
};

export function getGameHeaderBottom(insetsTop: number, scale: number): number {
  return roundToPixel(
    insetsTop + (floatingBarDims.height + HomePadding) * scale,
  );
}

export const menuStyles = StyleSheet.create({
  headerButton: {
    ...flexStyles.rowCentered,
    flex: 1,
    padding: 0,
    width: HeaderButtonSize,
    height: HeaderButtonSize,
    boxShadow: "unset",
    borderWidth: 0,
    borderRadius: "unset",
    backgroundColor: "unset",
  },
});
