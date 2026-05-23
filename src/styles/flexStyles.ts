import { StyleSheet } from "react-native";

export const flexStyles = StyleSheet.create({
  positionAbsolute: {
    position: "absolute",
  },
  rowCentered: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  colCentered: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
  },
  fullWidthHeight: {
    width: "100%",
    height: "100%",
  },
  fullWidth: {
    width: "100%",
  },
  fullHeight: {
    height: "100%",
  },
  justifyEvenly: {
    justifyContent: "space-evenly",
  },
  flex1: {
    flex: 1,
  },
  gap2: {
    gap: 2,
  },
  gap4: {
    gap: 4,
  },
  gap6: {
    gap: 6,
  },
  gap8: {
    gap: 8,
  },
  gap10: {
    gap: 10,
  },
  gap12: {
    gap: 12,
  },
  gap20: {
    gap: 20,
  },
});
