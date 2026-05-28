import {
  Colors,
  ContentSidePadding,
  MaxContentHeight,
  MaxContentWidth,
  rgba,
} from "@/styles/styles";
import { StyleSheet } from "react-native";
import { headerButtonSize } from "./buttonStyles";
import { flexStyles } from "./flexStyles";

export const layoutStyles = StyleSheet.create({
  // App
  appView: {
    flex: 1,
    justifyContent: "center",
    fontFamily: "Outfit_500Medium",
    backgroundColor: Colors.K850,
    userSelect: "none",
  },
  appViewWide: {
    backgroundColor: Colors.K900,
  },
  safeArea: {
    ...flexStyles.fullWidthHeight,
    flex: 1,
    flexGrow: 1,
    alignItems: "stretch",
    alignSelf: "center",
    maxWidth: MaxContentWidth + ContentSidePadding * 2,
    maxHeight: MaxContentHeight + ContentSidePadding * 2,
    backgroundColor: Colors.K900,
  },
  safeAreaWide: {
    boxShadow: `1px 2px 4px ${rgba(Colors.black, 0.3)}, 2px 4px 16px ${rgba(Colors.black, 0.3)}`,
  },
  background: {
    width: "100%",
    height: "100%",
  },
  // Game Area
  gameHeader: {
    position: "relative",
    zIndex: 12, // above the game overlay
    ...flexStyles.rowCentered,
    justifyContent: "space-between",
    width: "100%",
    height: headerButtonSize + ContentSidePadding,
    backgroundColor: Colors.K850,
    padding: ContentSidePadding,
  },
  gameLoadingOverlay: {
    position: "absolute",
    zIndex: 11, // under the header but over the intro
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    ...flexStyles.rowCentered,
    backgroundColor: Colors.K850,
  },
  gameArea: {
    position: "relative",
    zIndex: 1,
    ...flexStyles.colCentered,
    ...flexStyles.fullWidth,
    flex: 1,
    justifyContent: "space-evenly",
    backgroundColor: Colors.K850,
    alignItems: "stretch",
  },
  gameAreaScroll: {
    ...flexStyles.colCentered,
    justifyContent: "space-evenly",
    paddingVertical: 20,
    gap: 30,
    flex: 1,
    alignItems: "stretch",
    padding: ContentSidePadding,
  },
});
