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
});
