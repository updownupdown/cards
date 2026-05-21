import {
  Colors,
  ContentSidePadding,
  MaxContentHeight,
  MaxContentWidth,
} from "@/constants/theme";
import { StyleSheet } from "react-native";

export const flexStyles = StyleSheet.create({
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
});

export const layoutStyles = StyleSheet.create({
  // App
  appView: {
    flex: 1,
    justifyContent: "center",
    fontFamily: "Outfit_500Medium",
    backgroundColor: Colors.K200,
  },
  safeArea: {
    ...flexStyles.fullWidthHeight,
    flex: 1,
    flexGrow: 1,
    alignItems: "stretch",
    alignSelf: "center",
    padding: ContentSidePadding,
    maxWidth: MaxContentWidth + ContentSidePadding * 2,
    maxHeight: MaxContentHeight + ContentSidePadding * 2,
    backgroundColor: Colors.K100,
    borderRadius: 30,
    boxShadow: "1px 2px 4px rgba(0,0,0,.1), 2px 4px 16px rgba(0,0,0,.1)",
  },
  background: {
    width: "100%",
    height: "100%",
  },
  // Game Area
  gameHeader: {
    ...flexStyles.rowCentered,
    justifyContent: "space-between",
    width: "100%",
    backgroundColor: Colors.K100,
  },
  gameArea: {
    ...flexStyles.colCentered,
    flex: 1,
    justifyContent: "space-evenly",
    backgroundColor: Colors.K100,
  },
});
