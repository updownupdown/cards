import {
  Colors,
  ContentSidePadding,
  FontWeight,
  MaxContentHeight,
  MaxContentWidth,
} from "@/styles/styles";
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

export const layoutStyles = StyleSheet.create({
  // App
  appView: {
    flex: 1,
    justifyContent: "center",
    fontFamily: "Outfit_500Medium",
    backgroundColor: Colors.K900,
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
    backgroundColor: Colors.K850,
    borderRadius: 30,
    boxShadow: `1px 2px 4px ${Colors.black}1A, 2px 4px 16px ${Colors.black}1A`,
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
    backgroundColor: Colors.K850,
  },
  gameArea: {
    ...flexStyles.colCentered,
    flex: 1,
    justifyContent: "space-evenly",
    backgroundColor: Colors.K850,
    gap: 20,
    paddingVertical: 20,
  },
  gameMessageBox: {
    ...flexStyles.colCentered,
    width: "100%",
    minHeight: 80,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: Colors.K900,
  },
  gameMessageText: {
    fontSize: 15,
    fontFamily: FontWeight[300],
    color: Colors.K200,
    textAlign: "center",
  },
});
