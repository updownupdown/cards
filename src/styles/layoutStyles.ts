import {
  Colors,
  ContentSidePadding,
  MaxContentHeight,
  MaxContentWidth,
} from "@/styles/styles";
import { StyleSheet } from "react-native";
import { flexStyles } from "./flexStyles";

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
    gap: 30,
    paddingVertical: 20,
  },
});
