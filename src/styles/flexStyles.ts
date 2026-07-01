import { StyleSheet } from "react-native";

export const transitionStyles = StyleSheet.create({
  none: {
    transitionDuration: "unset",
    transitionProperty: "unset",
    transitionTimingFunction: "unset",
  },
  sec01: {
    transitionDuration: "0.1s",
    transitionProperty: "all",
    transitionTimingFunction: "ease",
  },
  sec02: {
    transitionDuration: "0.2s",
    transitionProperty: "all",
    transitionTimingFunction: "ease",
  },
  sec03: {
    transitionDuration: "0.3s",
    transitionProperty: "all",
    transitionTimingFunction: "ease",
  },
  sec05: {
    transitionDuration: "0.5s",
    transitionProperty: "all",
    transitionTimingFunction: "ease",
  },
});

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
  rowStart: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "flex-start",
  },
  colCentered: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
  },
  colStart: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start",
    alignItems: "flex-start",
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
  spaceBetween: {
    justifyContent: "space-between",
  },
  spaceAround: {
    justifyContent: "space-around",
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
  gap14: {
    gap: 14,
  },
  gap16: {
    gap: 16,
  },
  gap20: {
    gap: 20,
  },
  gap24: {
    gap: 24,
  },
  gap30: {
    gap: 30,
  },
  gap34: {
    gap: 34,
  },
  gap40: {
    gap: 40,
  },
});
