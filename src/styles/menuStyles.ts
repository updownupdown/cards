import { HeaderButtonSize } from "@/styles/styles";
import { StyleSheet } from "react-native";

export const floatingBarDims = {
  padding: 6,
  gap: 6,
  height: 58,
};

export const menuStyles = StyleSheet.create({
  headerButton: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: 0,
    width: HeaderButtonSize,
    height: HeaderButtonSize,
    boxShadow: "unset",
    borderWidth: 0,
    borderRadius: "unset",
    backgroundColor: "unset",
  },
  headerButtonFlex: {
    flex: 1,
  },
});
